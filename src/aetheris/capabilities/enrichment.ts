/**
 * Professional enrichment contracts (browser-safe). LinkedIn data only enters Intros
 * as normalized candidates supplied by a real lookup — never generated here.
 */
import { z } from 'zod'

export const ENRICH_CAPABILITY_ID = 'enrich.person.professional'
export const STALE_DAYS = 90
export const LOOKUP_WINDOW_HOURS = 24
export const MAX_CANDIDATES = 10

export type SourceChannel = 'assistant_connector' | 'manual' | 'direct_api'

const text = (max: number) => z.preprocess(v => (typeof v === 'string' ? v.trim().slice(0, max) : v === null ? undefined : v), z.string().max(max).optional())

/** Unknown keys are stripped; only these fields can ever be stored. */
export const CandidateSchema = z.object({
  full_name: text(160),
  first_name: text(80),
  last_name: text(80),
  title: text(200),
  company: text(160),
  location: text(160),
  follower_count: z.preprocess(v => (typeof v === 'string' && /^\d{1,9}$/.test(v.replace(/[,\s]/g, '')) ? Number(v.replace(/[,\s]/g, '')) : v === null ? undefined : v),
    z.number().int().min(0).max(999_999_999).optional()),
  profile_url: text(300),
}).strip()
export type NormalizedCandidate = z.infer<typeof CandidateSchema>

export const CandidateListSchema = z.array(CandidateSchema).min(1).max(MAX_CANDIDATES)

/** Accepts a pasted block: a JSON array, {results|candidates|profiles:[…]}, or one object. Common key aliases are mapped. */
export function parseCandidateBlock(raw: string): { candidates: NormalizedCandidate[]; dropped: number } {
  let json: unknown
  try { json = JSON.parse(raw) } catch { throw new Error('That block is not valid JSON. Paste the lookup result exactly as returned, or use the form.') }
  const list = Array.isArray(json) ? json
    : json && typeof json === 'object'
      ? ((json as Record<string, unknown>)['results'] ?? (json as Record<string, unknown>)['candidates'] ?? (json as Record<string, unknown>)['profiles'] ?? [json])
      : []
  if (!Array.isArray(list) || !list.length) throw new Error('No profiles were found in that block.')
  const mapped = list.slice(0, MAX_CANDIDATES).map(item => {
    const o = (item ?? {}) as Record<string, unknown>
    const pick = (...keys: string[]) => keys.map(k => o[k]).find(v => v !== undefined && v !== null && v !== '')
    return {
      full_name: pick('full_name', 'fullName', 'name'),
      first_name: pick('first_name', 'firstName'),
      last_name: pick('last_name', 'lastName'),
      title: pick('title', 'headline', 'job_title', 'position'),
      company: pick('company', 'company_name', 'companyName', 'current_company'),
      location: pick('location', 'locality'),
      follower_count: pick('follower_count', 'followers', 'followerCount'),
      profile_url: pick('profile_url', 'profileUrl', 'url', 'linkedin_url', 'link'),
    }
  })
  const out: NormalizedCandidate[] = []
  for (const m of mapped) {
    const r = CandidateSchema.safeParse(m)
    if (r.success && (r.data.full_name || r.data.first_name || r.data.profile_url)) out.push(withFullName(r.data))
  }
  if (!out.length) throw new Error('None of the pasted profiles had a name or profile link.')
  return { candidates: out, dropped: list.length - out.length }
}

export const withFullName = (c: NormalizedCandidate): NormalizedCandidate =>
  c.full_name ? c : { ...c, ...(c.first_name || c.last_name ? { full_name: [c.first_name, c.last_name].filter(Boolean).join(' ') } : {}) }

export function linkedinHandle(url: string | undefined | null): string | null {
  const m = String(url ?? '').match(/linkedin\.com\/in\/([A-Za-z0-9_%-]{2,100})/i)
  return m ? m[1]!.toLowerCase() : null
}

/** The only person data that may be used in a lookup: name, company, title, location. Never email, phone or notes. */
export interface LookupQuery { first_name: string; last_name: string; full_name: string; company?: string; title?: string; location?: string }
export function buildLookupQuery(p: { fullName: string; companyName?: string; title?: string; location?: string }): LookupQuery {
  const parts = p.fullName.trim().split(/\s+/)
  const q: LookupQuery = { full_name: p.fullName.trim(), first_name: parts[0] ?? '', last_name: parts.slice(1).join(' ') }
  if (p.companyName?.trim()) q.company = p.companyName.trim()
  if (p.title?.trim()) q.title = p.title.trim()
  if (p.location?.trim()) q.location = p.location.trim()
  return q
}

const norm = (s?: string) => (s ?? '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
const sameish = (a?: string, b?: string) => { const x = norm(a), y = norm(b); return Boolean(x && y && (x === y || x.includes(y) || y.includes(x))) }

export interface ScoredCandidate { candidate: NormalizedCandidate; confidence: number; reasons: string[]; strong: boolean }

export function scoreCandidate(c: NormalizedCandidate, person: { fullName: string; companyName?: string; title?: string; location?: string; linkedinUrl?: string }): ScoredCandidate {
  const reasons: string[] = []
  const existing = linkedinHandle(person.linkedinUrl)
  const handle = linkedinHandle(c.profile_url)
  const handleMatch = Boolean(existing && handle && existing === handle)
  const name = norm(c.full_name) === norm(person.fullName)
  const company = sameish(c.company, person.companyName)
  const title = sameish(c.title, person.title)
  const location = sameish(c.location, person.location)
  if (handleMatch) reasons.push('Same LinkedIn link already on this record')
  if (name) reasons.push('Exact name')
  if (company) reasons.push('Company matches')
  if (title) reasons.push('Title matches')
  if (location) reasons.push('Location matches')
  const strong = handleMatch || (name && company && (title || location))
  let confidence = (handleMatch ? 0.6 : 0) + (name ? 0.25 : 0) + (company ? 0.2 : 0) + (title ? 0.1 : 0) + (location ? 0.05 : 0)
  if (!name && !handleMatch) confidence *= 0.5
  return { candidate: c, confidence: Math.min(1, Math.round(confidence * 100) / 100), reasons, strong }
}

/** Preselect only when exactly one candidate is a strong match. The member still confirms. */
export function rankCandidates(list: NormalizedCandidate[], person: Parameters<typeof scoreCandidate>[1]) {
  const scored = list.map(c => scoreCandidate(c, person)).sort((a, b) => b.confidence - a.confidence)
  const strong = scored.filter(s => s.strong)
  return { scored, preselect: strong.length === 1 ? scored.indexOf(strong[0]!) : -1 }
}

export const isStale = (checkedAt: string | null | undefined, now = Date.now()) =>
  !checkedAt || now - new Date(checkedAt).getTime() > STALE_DAYS * 86_400_000

export const withinLookupWindow = (checkedAt: string | null | undefined, now = Date.now()) =>
  Boolean(checkedAt && now - new Date(checkedAt).getTime() < LOOKUP_WINDOW_HOURS * 3_600_000)

export type EnrichField = 'title' | 'company_name' | 'location' | 'linkedin_url'
export const FIELD_LABEL: Record<EnrichField, string> = { title: 'Title', company_name: 'Company', location: 'Location', linkedin_url: 'LinkedIn link' }

export interface FieldDiff { field: EnrichField; current: string; incoming: string; kind: 'fill' | 'conflict' }
export function diffFields(person: { title?: string; companyName?: string; location?: string; linkedinUrl?: string }, c: NormalizedCandidate): FieldDiff[] {
  const pairs: [EnrichField, string, string][] = [
    ['title', person.title ?? '', c.title ?? ''],
    ['company_name', person.companyName ?? '', c.company ?? ''],
    ['location', person.location ?? '', c.location ?? ''],
    ['linkedin_url', person.linkedinUrl ?? '', c.profile_url ?? ''],
  ]
  return pairs.flatMap(([field, current, incoming]) => {
    if (!incoming.trim()) return []
    if (field === 'linkedin_url' ? linkedinHandle(current) === linkedinHandle(incoming) : norm(current) === norm(incoming)) return []
    return [{ field, current, incoming, kind: current.trim() ? 'conflict' as const : 'fill' as const }]
  })
}

/** Contextual verb for the record's current state. */
export function contextualLabel(state: { confirmed: boolean; lastCheckedAt?: string | null; differs?: boolean }) {
  if (!state.confirmed) return 'Find on LinkedIn'
  if (state.differs) return 'Verify role/company'
  if (isStale(state.lastCheckedAt)) return 'Refresh professional info'
  return 'Verify professional info'
}

/** Provider seam: the same UI/schema serves pasted results now and a licensed direct search later. */
export interface ProfessionalProfileProvider {
  id: SourceChannel
  available: boolean
  unavailableReason?: string
  search(query: LookupQuery): Promise<NormalizedCandidate[]>
}
