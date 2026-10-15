/**
 * Trusted providers: labels, form validation and small helpers shared by the member page and
 * the admin panel. The lists mirror the CHECK constraints in drizzle/migrations/0045_providers.sql.
 */

export const PROVIDER_CATEGORIES = [
  ['accounting', 'Accounting & tax'],
  ['legal', 'Legal'],
  ['m_and_a', 'M&A advisory'],
  ['finance', 'Finance & capital'],
  ['wealth', 'Wealth management'],
  ['insurance', 'Insurance'],
  ['marketing', 'Marketing & agencies'],
  ['sales', 'Sales'],
  ['technology', 'Technology'],
  ['ai_automation', 'AI & automation'],
  ['operations', 'Operations'],
  ['hr_recruiting', 'People & recruiting'],
  ['fractional_exec', 'Fractional executives'],
  ['consulting', 'Consulting'],
  ['other', 'Other'],
] as const
export type ProviderCategory = typeof PROVIDER_CATEGORIES[number][0]

export const CLIENT_SIZES = [
  ['any', 'Any size'],
  ['under_5m', 'Under $5M revenue'],
  ['5m_50m', '$5M–$50M revenue'],
  ['50m_250m', '$50M–$250M revenue'],
  ['250m_plus', '$250M+ revenue'],
] as const
export type ClientSize = typeof CLIENT_SIZES[number][0]

export const BUDGETS = [
  ['under_10k', 'Under $10k'],
  ['10k_50k', '$10k–$50k'],
  ['50k_250k', '$50k–$250k'],
  ['250k_plus', '$250k+'],
] as const
export type Budget = typeof BUDGETS[number][0]

export const URGENCIES = [
  ['this_week', 'This week'],
  ['this_month', 'This month'],
  ['this_quarter', 'This quarter'],
  ['exploring', 'Just exploring'],
] as const
export type Urgency = typeof URGENCIES[number][0]

export type RequestStatus = 'open' | 'matched' | 'engaged' | 'completed' | 'closed'
export const REQUEST_STATUS: Record<RequestStatus | 'chose_another', string> = {
  open: 'Waiting for the team', matched: 'Matched', engaged: 'Engaged', completed: 'Completed', closed: 'Closed',
  chose_another: 'Went with another provider',
}

const lookup = (list: ReadonlyArray<readonly [string, string]>) => (id: string | null | undefined) =>
  list.find(([k]) => k === id)?.[1] ?? ''
export const categoryLabel = lookup(PROVIDER_CATEGORIES)
export const clientSizeLabel = lookup(CLIENT_SIZES)
export const budgetLabel = lookup(BUDGETS)
export const urgencyLabel = lookup(URGENCIES)

/** "48,000" or "$48k" → cents; null when blank or not a sensible amount. */
export function dollarsToCents(input: string): number | null {
  const s = input.trim().toLowerCase().replace(/[$,\s]/g, '')
  if (!s) return null
  const m = /^(\d+(?:\.\d+)?)(k|m)?$/.exec(s)
  if (!m) return null
  const mult = m[2] === 'm' ? 1_000_000 : m[2] === 'k' ? 1_000 : 1
  const cents = Math.round(Number(m[1]) * mult * 100)
  return Number.isFinite(cents) && cents <= 100_000_000_000 ? cents : null
}

/** Adds https:// when missing; returns '' for blank and null when it is not a usable link. */
export function normalizeWebsite(input: string): string | null {
  const s = input.trim()
  if (!s) return ''
  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`
  if (/\s/.test(withScheme) || withScheme.length > 300) return null
  try {
    const u = new URL(withScheme)
    return u.hostname.includes('.') ? withScheme : null
  } catch { return null }
}

/** "US, UK , us" → ["US", "UK"] (case-insensitive de-dupe, at most 12). */
export function parseRegions(input: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of input.split(',')) {
    const r = raw.trim().slice(0, 40)
    if (!r || seen.has(r.toLowerCase())) continue
    seen.add(r.toLowerCase()); out.push(r)
    if (out.length === 12) break
  }
  return out
}

export interface NominationForm { name: string; category: string; description: string; website: string; regions: string; clientSize: string }

export function nominationError(f: NominationForm): string | null {
  if (f.name.trim().length < 2) return 'Add the firm’s name.'
  if (!categoryLabel(f.category)) return 'Pick a category.'
  if (f.description.trim().length < 20) return 'Describe what they do in a sentence or two (20+ characters).'
  if (f.description.trim().length > 1200) return 'Keep the description under 1,200 characters.'
  if (normalizeWebsite(f.website) === null) return 'That website does not look right.'
  return null
}

export interface RequestForm { category: string; need: string; budget: string; urgency: string }

export function requestError(f: RequestForm): string | null {
  if (!categoryLabel(f.category)) return 'Pick the kind of help you need.'
  if (f.need.trim().length < 20) return 'Say what you need in a sentence or two (20+ characters).'
  if (f.need.trim().length > 1500) return 'Keep it under 1,500 characters.'
  if (f.budget && !budgetLabel(f.budget)) return 'Pick a budget range or leave it blank.'
  if (!urgencyLabel(f.urgency)) return 'Pick how soon you need help.'
  return null
}

export interface DirectoryProvider {
  id: string; name: string; category: string; description: string; website: string | null; regions: string[]
  client_size: string; status: 'pending' | 'approved' | 'suspended'; contact_user_id: string | null; contact_name: string | null
  mine_contact: boolean; endorsement_count: number
  endorsements: Array<{ id: string; user_id: string; note: string; updated_at: string; mine: boolean; name: string; company: string }>
  fee_pct?: number | string | null; nominated_by_name?: string | null; nomination_note?: string | null
}

/** Category and free-text filter for the directory (name, description, regions, endorsers). */
export function filterProviders(list: DirectoryProvider[], category: string, query: string): DirectoryProvider[] {
  const q = query.trim().toLowerCase()
  return list.filter(p => (!category || p.category === category) && (!q || [
    p.name, p.description, categoryLabel(p.category), p.regions.join(' '), p.endorsements.map(e => e.name).join(' '),
  ].join(' ').toLowerCase().includes(q)))
}

/** "Endorsed by Ana Avery, Bea Bramwell and 3 others" */
export function endorsedBy(names: string[], show = 2): string {
  if (!names.length) return 'No endorsements yet'
  if (names.length <= show) return `Endorsed by ${names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`}`
  const rest = names.length - show
  return `Endorsed by ${names.slice(0, show).join(', ')} and ${rest} other${rest === 1 ? '' : 's'}`
}
