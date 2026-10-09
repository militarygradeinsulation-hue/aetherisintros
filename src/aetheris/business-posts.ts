/**
 * Structured business posts in the existing feed: Need, Offer and Proof of work. They are ordinary
 * `posts` rows (kind + a `business` jsonb); this module is the single client-side rule set, mirrored
 * by `public.business_post_valid` (drizzle 0057) so the database rejects anything the form would.
 * Nothing here sends a message, takes a payment or creates a deal.
 */
export const BUSINESS_KINDS = ['Need', 'Offer', 'Proof of work'] as const
export type BusinessKind = typeof BUSINESS_KINDS[number]

export const BUSINESS_CATEGORIES = [
  'Sales & customers', 'Marketing', 'Technology', 'Operations', 'Finance & capital',
  'Legal & compliance', 'Talent & hiring', 'Design & creative', 'Consulting', 'Other',
] as const
export const BUSINESS_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'CHF', 'JPY', 'SGD', 'AED'] as const

export const LIMITS = { titleMin: 3, titleMax: 140, descriptionMin: 10, descriptionMax: 2000, short: 80, maxAmount: 1_000_000_000, maxLinks: 5, linkMax: 2048 } as const

/** The stored shape. Only these keys are ever accepted. */
export interface BusinessDetails {
  category: typeof BUSINESS_CATEGORIES[number]
  budgetMin?: number
  budgetMax?: number
  startingPrice?: number
  currency?: typeof BUSINESS_CURRENCIES[number]
  /** A Need's deadline, YYYY-MM-DD. */
  deadline?: string
  /** An Offer's availability, free text. */
  availability?: string
  geography?: string
  /** Proof of work: https portfolio links. */
  links?: string[]
}

export interface BusinessDraft {
  title: string
  description: string
  category: string
  budgetMin?: string
  budgetMax?: string
  startingPrice?: string
  currency?: string
  deadline?: string
  availability?: string
  geography?: string
  links?: string
}

export type BusinessErrors = Partial<Record<keyof BusinessDraft, string>>
export type BusinessResult =
  | { ok: true; title: string; description: string; details: BusinessDetails }
  | { ok: false; errors: BusinessErrors }

export function isBusinessKind(kind: unknown): kind is BusinessKind {
  return typeof kind === 'string' && (BUSINESS_KINDS as readonly string[]).includes(kind)
}

function amount(raw: string | undefined, label: string, errors: BusinessErrors, key: keyof BusinessDraft): number | undefined {
  const text = (raw ?? '').trim().replace(/,/g, '')
  if (!text) return undefined
  if (!/^\d+(\.\d{1,2})?$/.test(text)) { errors[key] = `${label} must be a positive amount.`; return undefined }
  const value = Number(text)
  if (value <= 0 || value > LIMITS.maxAmount) { errors[key] = `${label} must be more than 0 and at most ${LIMITS.maxAmount.toLocaleString('en-US')}.`; return undefined }
  return value
}

export function isHttpsLink(raw: string): boolean {
  if (raw.length > LIMITS.linkMax || /\s/.test(raw)) return false
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' && !url.username && !url.password && url.hostname.includes('.')
  } catch { return false }
}

function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

/** Validates a composer draft. `today` (YYYY-MM-DD) is injectable so deadlines are testable. */
export function validateBusinessDraft(kind: BusinessKind, draft: BusinessDraft, today = new Date().toISOString().slice(0, 10)): BusinessResult {
  const errors: BusinessErrors = {}
  if (!isBusinessKind(kind)) return { ok: false, errors: { title: 'Choose Need, Offer or Proof of work.' } }
  const title = draft.title.trim()
  const description = draft.description.trim()
  if (title.length < LIMITS.titleMin || title.length > LIMITS.titleMax) errors.title = `Title must be ${LIMITS.titleMin}–${LIMITS.titleMax} characters.`
  if (description.length < LIMITS.descriptionMin || description.length > LIMITS.descriptionMax) errors.description = `Description must be ${LIMITS.descriptionMin}–${LIMITS.descriptionMax} characters.`
  if (!(BUSINESS_CATEGORIES as readonly string[]).includes(draft.category)) errors.category = 'Choose a category.'

  const details: Partial<BusinessDetails> = { category: draft.category as BusinessDetails['category'] }
  const geography = (draft.geography ?? '').trim()
  if (geography.length > LIMITS.short) errors.geography = `Geography must be at most ${LIMITS.short} characters.`
  else if (geography) details.geography = geography

  let money = false
  if (kind === 'Need') {
    const min = amount(draft.budgetMin, 'Minimum budget', errors, 'budgetMin')
    const max = amount(draft.budgetMax, 'Maximum budget', errors, 'budgetMax')
    if (min !== undefined && max !== undefined && min > max) errors.budgetMax = 'Maximum budget must be at least the minimum.'
    if (min !== undefined) details.budgetMin = min
    if (max !== undefined) details.budgetMax = max
    money = min !== undefined || max !== undefined
    const deadline = (draft.deadline ?? '').trim()
    if (deadline) {
      if (!isRealDate(deadline)) errors.deadline = 'Use a real date.'
      else if (deadline < today) errors.deadline = 'The deadline cannot be in the past.'
      else details.deadline = deadline
    }
  } else if (kind === 'Offer') {
    const price = amount(draft.startingPrice, 'Starting price', errors, 'startingPrice')
    if (price !== undefined) details.startingPrice = price
    money = price !== undefined
    const availability = (draft.availability ?? '').trim()
    if (availability.length > LIMITS.short) errors.availability = `Availability must be at most ${LIMITS.short} characters.`
    else if (availability) details.availability = availability
  } else {
    const links = (draft.links ?? '').split(/[\n,]+/).map(item => item.trim()).filter(Boolean)
    if (!links.length) errors.links = 'Add at least one portfolio link.'
    else if (links.length > LIMITS.maxLinks) errors.links = `At most ${LIMITS.maxLinks} links.`
    else if (!links.every(isHttpsLink)) errors.links = 'Links must be complete https:// addresses.'
    else details.links = [...new Set(links)]
  }
  const currency = (draft.currency ?? '').trim()
  if (currency && !(BUSINESS_CURRENCIES as readonly string[]).includes(currency)) errors.currency = 'Unsupported currency.'
  else if (money && !currency) errors.currency = 'Choose a currency for the amount.'
  else if (money) details.currency = currency as NonNullable<BusinessDetails['currency']>

  if (Object.keys(errors).length) return { ok: false, errors }
  return { ok: true, title, description, details: details as BusinessDetails }
}

/** Reads a stored `business` value defensively. Anything that is not exactly valid is dropped. */
export function parseBusinessDetails(kind: string, raw: unknown): BusinessDetails | undefined {
  if (!isBusinessKind(kind) || !raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const b = raw as Record<string, unknown>
  const allowed = ['category', 'budgetMin', 'budgetMax', 'startingPrice', 'currency', 'deadline', 'availability', 'geography', 'links']
  if (Object.keys(b).some(key => !allowed.includes(key))) return undefined
  if (!(BUSINESS_CATEGORIES as readonly string[]).includes(b['category'] as string)) return undefined
  const out: Partial<BusinessDetails> = { category: b['category'] as BusinessDetails['category'] }
  for (const key of ['budgetMin', 'budgetMax', 'startingPrice'] as const) {
    if (b[key] === undefined) continue
    if (typeof b[key] !== 'number' || !(b[key] as number > 0) || (b[key] as number) > LIMITS.maxAmount) return undefined
    out[key] = b[key] as number
  }
  if (out.budgetMin !== undefined && out.budgetMax !== undefined && out.budgetMin > out.budgetMax) return undefined
  if ((kind !== 'Need' && (out.budgetMin !== undefined || out.budgetMax !== undefined)) || (kind !== 'Offer' && out.startingPrice !== undefined)) return undefined
  if (b['currency'] !== undefined) {
    if (!(BUSINESS_CURRENCIES as readonly string[]).includes(b['currency'] as string)) return undefined
    out.currency = b['currency'] as NonNullable<BusinessDetails['currency']>
  }
  if ((out.budgetMin ?? out.budgetMax ?? out.startingPrice) !== undefined && !out.currency) return undefined
  for (const key of ['deadline', 'availability', 'geography'] as const) {
    if (b[key] === undefined) continue
    if (typeof b[key] !== 'string' || (b[key] as string).length > LIMITS.short || (key === 'deadline' && !isRealDate(b[key] as string))) return undefined
    out[key] = b[key] as string
  }
  if (out.deadline && kind !== 'Need') return undefined
  if (out.availability && kind !== 'Offer') return undefined
  if (b['links'] !== undefined) {
    if (!Array.isArray(b['links']) || b['links'].length > LIMITS.maxLinks || !b['links'].every(l => typeof l === 'string' && isHttpsLink(l))) return undefined
    out.links = b['links'] as string[]
  }
  if (kind === 'Proof of work' && !out.links?.length) return undefined
  if (kind !== 'Proof of work' && out.links) return undefined
  return out as BusinessDetails
}

export function formatMoney(value: number, currency: string): string {
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: value % 1 ? 2 : 0 }).format(value) }
  catch { return `${value} ${currency}` }
}

/** The short facts shown on a business post, in reading order. */
export function businessFacts(kind: string, d: BusinessDetails | undefined): Array<{ label: string; value: string }> {
  if (!d) return []
  const facts: Array<{ label: string; value: string }> = [{ label: 'Category', value: d.category }]
  const cur = d.currency ?? ''
  if (kind === 'Need' && (d.budgetMin !== undefined || d.budgetMax !== undefined)) {
    const value = d.budgetMin !== undefined && d.budgetMax !== undefined ? `${formatMoney(d.budgetMin, cur)} – ${formatMoney(d.budgetMax, cur)}`
      : d.budgetMin !== undefined ? `From ${formatMoney(d.budgetMin, cur)}` : `Up to ${formatMoney(d.budgetMax!, cur)}`
    facts.push({ label: 'Budget', value })
  }
  if (kind === 'Offer' && d.startingPrice !== undefined) facts.push({ label: 'Starting at', value: formatMoney(d.startingPrice, cur) })
  if (d.deadline) facts.push({ label: 'Deadline', value: d.deadline })
  if (d.availability) facts.push({ label: 'Availability', value: d.availability })
  if (d.geography) facts.push({ label: 'Where', value: d.geography })
  return facts
}

/** The one contextual action each type offers. All of them open the existing private message thread. */
export function businessAction(kind: string): { label: string; doneLabel: string } | null {
  if (kind === 'Need') return { label: 'Respond to this Need', doneLabel: 'Responded' }
  if (kind === 'Offer') return { label: 'Request a quote', doneLabel: 'Quote requested' }
  if (kind === 'Proof of work') return { label: 'Contact author', doneLabel: 'Contacted' }
  return null
}

/** Whether the contextual action can run: not on your own post, and only for a known member author. */
export function canAct(post: { memberId: string }, author: { id: string } | undefined): boolean {
  return post.memberId !== 'me' && Boolean(author) && author!.id === post.memberId
}

export const FEED_LANES = ['ALL SIGNALS', 'NEEDS', 'OFFERS', 'PROOF OF WORK', 'ASKS', 'INSIGHTS', 'CAPITAL', 'HIRING', 'PARTNERSHIPS'] as const
export type FeedLane = typeof FEED_LANES[number]

/** Whether a feed row belongs in a lane. `type: 'ask'` rows are the Needs-marketplace asks. */
export function matchesLane(lane: FeedLane, row: { type: 'post' | 'ask'; kind?: string | undefined }): boolean {
  if (lane === 'ALL SIGNALS') return true
  if (lane === 'ASKS') return row.type === 'ask' || row.kind === 'Strategic ask'
  if (row.type === 'ask') return false
  switch (lane) {
    case 'NEEDS': return row.kind === 'Need'
    case 'OFFERS': return row.kind === 'Offer'
    case 'PROOF OF WORK': return row.kind === 'Proof of work'
    case 'INSIGHTS': return row.kind === 'Insight'
    case 'CAPITAL': return row.kind === 'Raising capital'
    case 'HIRING': return row.kind === 'Hiring'
    default: return row.kind === 'Partnership'
  }
}
