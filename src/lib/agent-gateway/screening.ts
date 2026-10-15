/**
 * Screening for inbound agent requests (POST /api/agent/inbound). Pure: the route gathers the
 * member's Agent Policy and the signals from the database, this decides.
 *
 *   rejected  → the agent gets the reason; nothing is stored and the member is not told
 *   held      → stored for the member to review, no notification
 *   delivered → stored and the member is notified
 */

export type PolicyMode = 'off' | 'verified_only' | 'everyone'

export interface AgentPolicy {
  mode: PolicyMode
  welcome_topics: string[]
  refuse_topics: string[]
  min_context: number
  daily_cap: number
}

export interface InboundRequest {
  to: string
  requester_name: string
  requester_company: string
  requester_email: string
  requester_domain: string
  on_behalf_of: string
  reason: string
  offer: string
  links: string[]
}

export interface ScreenSignals {
  /** Times the same request text was submitted (to anyone) in the last 30 days. */
  duplicates: number
  /** Requests this member already received in the last 24 hours. */
  todayCount: number
  domainBlocked: boolean
  /** The request came through a verified Ask Intros member's assistant key. */
  requesterVerified: boolean
}

export interface ScreenResult {
  outcome: 'rejected' | 'held' | 'delivered'
  /** Plain reasons; for a rejection these are returned to the agent. */
  reasons: string[]
  /** -100…100, shown to the member as a rough quality signal. */
  score: number
}

export const FIELD_LIMITS = {
  to: 40, requester_name: 120, requester_company: 120, requester_email: 254, on_behalf_of: 200,
  reason: 2000, offer: 1000, link: 300, links: 5,
} as const

const EMAIL_RE = /^[^@\s]+@([a-z0-9-]+(?:\.[a-z0-9-]+)+)$/i
const HANDLE_RE = /^[a-z0-9][a-z0-9-]{2,39}$/
const SPAM_PHRASES = ['guaranteed', 'act now', 'limited time', '100% free', 'risk-free', 'risk free', 'click here', 'buy now', 'double your', 'no obligation', 'exclusive deal', 'once in a lifetime']

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : '')

/** Validate and normalise a submitted body. Returns the request, or the problems to report. */
export function parseInbound(body: unknown): { ok: true; request: InboundRequest } | { ok: false; errors: string[] } {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const errors: string[] = []
  const to = str(b['to'], 80).toLowerCase().replace(/^@/, '')
  const email = str(b['requester_email'], 300).toLowerCase()
  const m = EMAIL_RE.exec(email)
  const rawLinks = Array.isArray(b['links']) ? b['links'] : []
  const links = rawLinks.filter((l): l is string => typeof l === 'string').map(l => l.trim()).filter(Boolean)
  const request: InboundRequest = {
    to,
    requester_name: str(b['requester_name'], FIELD_LIMITS.requester_name),
    requester_company: str(b['requester_company'], FIELD_LIMITS.requester_company),
    requester_email: email,
    requester_domain: m ? m[1]!.toLowerCase() : '',
    on_behalf_of: str(b['on_behalf_of'], FIELD_LIMITS.on_behalf_of),
    reason: typeof b['reason'] === 'string' ? b['reason'].trim().slice(0, FIELD_LIMITS.reason) : '',
    offer: typeof b['offer'] === 'string' ? b['offer'].trim().slice(0, FIELD_LIMITS.offer) : '',
    links,
  }
  if (!HANDLE_RE.test(to)) errors.push('`to` must be the member\'s public handle (3-40 lowercase letters, digits or hyphens).')
  if (request.requester_name.length < 2) errors.push('`requester_name` is required: the real person the request is for.')
  if (!m || email.length > FIELD_LIMITS.requester_email) errors.push('`requester_email` must be a valid email address.')
  if (!request.reason) errors.push('`reason` is required: why this person, why now.')
  if (rawLinks.length > FIELD_LIMITS.links) errors.push(`At most ${FIELD_LIMITS.links} links.`)
  if (links.some(l => l.length > FIELD_LIMITS.link || !/^https?:\/\/[^\s]+$/i.test(l))) errors.push('Links must be http(s) URLs of up to 300 characters.')
  return errors.length ? { ok: false, errors } : { ok: true, request }
}

/** The text used for duplicate detection: case, spacing and punctuation do not make a request new. */
export function normalizeForHash(r: Pick<InboundRequest, 'reason' | 'offer'>): string {
  return `${r.reason}\n${r.offer}`.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Topics the text mentions, matched as whole words or phrases, case-insensitively. */
export function matchTopics(text: string, topics: string[]): string[] {
  const hay = text.toLowerCase()
  return topics.filter(t => {
    const needle = t.trim().toLowerCase()
    return needle && new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(needle)}($|[^\\p{L}\\p{N}])`, 'u').test(hay)
  })
}

/** Share of letters that are capitals, over texts with at least 20 letters. */
export function capsRatio(text: string): number {
  const letters = text.match(/\p{L}/gu) ?? []
  if (letters.length < 20) return 0
  return letters.filter(c => c !== c.toLowerCase()).length / letters.length
}

/** Problems that make a request unacceptable to anyone, whatever the member's policy. */
export function genericRejections(r: InboundRequest, duplicates: number): string[] {
  const reasons: string[] = []
  const text = `${r.reason} ${r.offer}`
  if (capsRatio(text) > 0.6) reasons.push('Written mostly in capitals. Rewrite it as a normal message.')
  if (duplicates > 0) reasons.push('The same text was already sent in the last 30 days. Each request must be written for one person.')
  const urls = (text.match(/https?:\/\//gi) ?? []).length + r.links.length
  if (urls > 5) reasons.push('Too many links. Send at most a few that matter.')
  return reasons
}

export function screenRequest(r: InboundRequest, policy: AgentPolicy, s: ScreenSignals): ScreenResult {
  if (policy.mode === 'off') return { outcome: 'rejected', reasons: ['not_accepting'], score: 0 }
  const reject = (reason: string): ScreenResult => ({ outcome: 'rejected', reasons: [reason], score: -100 })
  if (s.domainBlocked) return reject('This member does not accept requests from this sender.')
  if (policy.mode === 'verified_only' && !s.requesterVerified)
    return reject('This member only accepts requests from assistants acting for verified Ask Intros members.')
  if (s.todayCount >= policy.daily_cap) return reject('This member has received their daily limit of agent requests. Try again tomorrow.')
  const generic = genericRejections(r, s.duplicates)
  if (generic.length) return { outcome: 'rejected', reasons: generic, score: -100 }

  const context = `${r.reason} ${r.offer}`.trim()
  if (context.length < policy.min_context)
    return reject(`Not enough context. Explain who this is for, why this member, and what they get, in at least ${policy.min_context} characters.`)
  const all = `${r.requester_company} ${r.on_behalf_of} ${r.reason} ${r.offer}`
  const refused = matchTopics(all, policy.refuse_topics)
  if (refused.length) return reject('This member does not take requests on this topic.')

  const reasons: string[] = []
  let score = 50
  const welcomed = matchTopics(all, policy.welcome_topics)
  if (welcomed.length) { score += 20; reasons.push(`Matches a welcomed topic: ${welcomed.join(', ')}`) }
  else if (policy.welcome_topics.length) { score -= 20; reasons.push('No welcomed topic mentioned') }
  if (s.requesterVerified) { score += 20; reasons.push('Sent for a verified Ask Intros member') }
  if (r.offer.trim().length >= 20) score += 10
  else { score -= 10; reasons.push('Says little about what the member gets') }
  const spam = SPAM_PHRASES.filter(p => context.toLowerCase().includes(p))
  if (spam.length) { score -= 30; reasons.push(`Sales language: ${spam.join(', ')}`) }
  if (/[!?]{3,}/.test(context)) { score -= 10; reasons.push('Excessive punctuation') }
  if (r.links.length > 3) { score -= 10; reasons.push('Many links') }
  if (!r.requester_company) { score -= 5; reasons.push('No company given') }
  score = Math.max(-100, Math.min(100, score))

  const held = spam.length > 0 || score < 50
  return { outcome: held ? 'held' : 'delivered', reasons: reasons.slice(0, 10), score }
}
