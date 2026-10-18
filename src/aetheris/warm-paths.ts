/**
 * Warm Path Finder: pure scoring, explanation and query helpers. The database function
 * find_warm_paths (drizzle/migrations/0053_warm_paths.sql) does the ranking; these mirror its
 * rules so the UI can explain a score, and are unit-tested. Keep both in step.
 */

export type Warmth = 'hot' | 'warm' | 'cool'
export type ResponseBand = 'high' | 'medium' | 'low' | 'unknown'
export type PathKind = 'direct' | 'via' | 'own_contact'

export interface WarmPath {
  kind: PathKind
  targetId: string | null
  targetName: string
  targetTitle: string
  targetCompany: string
  connectorId: string | null
  connectorName: string | null
  score: number
  band: Warmth
  reasons: string[]
  connectorReasons: string[]
}

const SUFFIX = /(\s(inc|incorporated|llc|llp|lp|ltd|limited|corp|corporation|co|company|plc|gmbh|ag|sa))+$/

/** Same rules as public.normalize_company_name: case, punctuation and legal suffixes ignored. */
export function normalizeCompanyName(name: string | null | undefined): string {
  const s = (name ?? '').toLowerCase()
    .replace(/[.,'’]/g, '')
    .replace(/[&+/():;!"–—-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return s.replace(SUFFIX, '').trim()
}

export function sameCompany(a: string | null | undefined, b: string | null | undefined) {
  const x = normalizeCompanyName(a)
  return x !== '' && x === normalizeCompanyName(b)
}

/** How often someone accepts intro requests, as a band. Fewer than 3 decisions: unknown. */
export function responseBand(accepted: number, decided: number): ResponseBand {
  if (decided < 3) return 'unknown'
  if (accepted * 4 >= decided * 3) return 'high'
  if (accepted * 5 >= decided * 2) return 'medium'
  return 'low'
}

export function warmth(score: number): Warmth {
  return score >= 60 ? 'hot' : score >= 35 ? 'warm' : 'cool'
}

export const warmthLabel: Record<Warmth, string> = { hot: 'Hot', warm: 'Warm', cool: 'Cool' }

/** The caller's own relationship with someone (first hop). Only the caller's data. */
export interface MyHopFacts {
  connected: boolean
  acceptedIntro: boolean
  meetings90d: number
  calendarLastAt: Date | null
  calendarCount90d: number
}

const DAY = 86_400_000

export function myHop(f: MyHopFacts, now = new Date()): { points: number; reasons: string[] } {
  const age = f.calendarLastAt ? now.getTime() - f.calendarLastAt.getTime() : Infinity
  const recency = age <= 30 * DAY ? 20 : age <= 90 * DAY ? 10 : 0
  const points = Math.min(100, (f.connected ? 15 : 0) + (f.acceptedIntro ? 30 : 0) + Math.min(f.meetings90d, 3) * 10 + recency)
  const reasons: string[] = []
  if (f.acceptedIntro) reasons.push('You were introduced on Ask Intros')
  if (f.meetings90d === 1) reasons.push('You met once in 90 days')
  else if (f.meetings90d > 1) reasons.push(`You met ${f.meetings90d} times in 90 days`)
  if (f.calendarCount90d === 1) reasons.push('Your calendar: 1 meeting in 90 days')
  else if (f.calendarCount90d > 1) reasons.push(`Your calendar: ${f.calendarCount90d} meetings in 90 days`)
  else if (age <= 90 * DAY) reasons.push('On your calendar recently')
  if (f.connected) reasons.push("You're connected")
  return { points, reasons }
}

/** Connector to target (second hop): only facts members can see, plus a coarse band. */
export function connectorHop(f: { verified: boolean; response: ResponseBand; targetFirstName: string }): { points: number; reasons: string[] } {
  const resp = { high: 35, medium: 20, unknown: 10, low: 0 }[f.response]
  const reasons = [`Connected to ${f.targetFirstName}`]
  if (f.verified) reasons.push('Verified member')
  if (f.response === 'high') reasons.push('Accepts most intro requests')
  else if (f.response === 'medium') reasons.push('Accepts some intro requests')
  return { points: 40 + (f.verified ? 25 : 0) + resp, reasons }
}

export function pathScore(kind: 'direct' | 'via', myPoints: number, connectorPoints = 0): number {
  if (kind === 'direct') return Math.min(100, myPoints + 10)
  return Math.round(0.6 * myPoints + 0.3 * connectorPoints)
}

/** Meter fill for a score, 0–100, never empty so a cool path is still visible. */
export function meterWidth(score: number) {
  return Math.max(6, Math.min(100, Math.round(score)))
}

/* ───────────── rows from the database ───────────── */

type Row = {
  kind: string; target_id: string | null; target_name: string | null; target_title: string | null; target_company: string | null
  connector_id: string | null; connector_name: string | null; score: number; band: string; reasons: string[] | null; connector_reasons: string[] | null
}

export function fromRow(r: Row): WarmPath {
  const band: Warmth = r.band === 'hot' || r.band === 'warm' ? r.band : 'cool'
  const kind: PathKind = r.kind === 'direct' || r.kind === 'own_contact' ? r.kind : 'via'
  return {
    kind, band, score: Number(r.score) || 0,
    targetId: r.target_id, targetName: r.target_name || 'A member', targetTitle: r.target_title ?? '', targetCompany: r.target_company ?? '',
    connectorId: r.connector_id, connectorName: r.connector_name,
    reasons: r.reasons ?? [], connectorReasons: r.connector_reasons ?? [],
  }
}

/** Merge results from several searches: one row per path, best first, capped. */
export function mergePaths(lists: WarmPath[][], limit: number): WarmPath[] {
  const seen = new Map<string, WarmPath>()
  for (const p of lists.flat()) {
    const key = `${p.kind}|${p.targetId ?? p.targetName}|${p.connectorId ?? ''}`
    const prev = seen.get(key)
    if (!prev || prev.score < p.score) seen.set(key, p)
  }
  return [...seen.values()]
    .sort((a, b) => b.score - a.score || Number(b.kind === 'direct') - Number(a.kind === 'direct') || a.targetName.localeCompare(b.targetName))
    .slice(0, Math.max(0, limit))
}

/* ───────────── free-text targets ───────────── */

export interface DirectoryPerson {
  id: string; name: string; title: string; company: string; location: string; industry?: string; tags?: string[]; expertise?: string[]
}

const STOP = new Set(['a', 'an', 'the', 'at', 'in', 'of', 'for', 'and', 'or', 'to', 'with', 'from', 'on', 'company', 'companies', 'firm', 'who', 'someone', 'person', 'people', 'based', 'near', 'any'])

const ROLE_SYNONYMS: Record<string, string[]> = {
  ceo: ['chief executive', 'ceo', 'founder', 'president'],
  cfo: ['chief financial', 'cfo', 'finance'],
  cto: ['chief technology', 'cto', 'engineering'],
  coo: ['chief operating', 'coo', 'operations'],
  cmo: ['chief marketing', 'cmo', 'marketing'],
  founder: ['founder', 'co-founder', 'cofounder'],
  vp: ['vp', 'vice president'],
}

export function queryTerms(query: string): string[] {
  return query.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').split(/\s+/).filter(t => t.length > 1 && !STOP.has(t)).slice(0, 12)
}

/**
 * Rank directory members against a free-text description ("CFO at a logistics company in
 * Texas"). Title words count most, then industry and company, then location. Only members the
 * caller can already see are passed in.
 */
export function matchPeople<T extends DirectoryPerson>(query: string, people: T[], max = 5): T[] {
  const terms = queryTerms(query)
  if (!terms.length) return []
  const scored = people.map(p => {
    const title = p.title.toLowerCase()
    const industry = `${p.industry ?? ''} ${(p.tags ?? []).join(' ')} ${(p.expertise ?? []).join(' ')}`.toLowerCase()
    const company = p.company.toLowerCase()
    const location = p.location.toLowerCase()
    let s = 0
    for (const t of terms) {
      const roles = ROLE_SYNONYMS[t]
      if (roles ? roles.some(r => title.includes(r)) : title.includes(t)) s += 4
      if (industry.includes(t)) s += 2
      if (company.includes(t)) s += 2
      if (location.includes(t)) s += 1
    }
    return { p, s }
  }).filter(x => x.s > 0)
  scored.sort((a, b) => b.s - a.s || a.p.name.localeCompare(b.p.name))
  return scored.slice(0, max).map(x => x.p)
}

/** A query names a company when it matches a known member's company once normalised. */
export function companyFromQuery(query: string, people: DirectoryPerson[]): string | null {
  const q = normalizeCompanyName(query)
  if (!q) return null
  const hit = people.find(p => normalizeCompanyName(p.company) === q)
  return hit ? hit.company : null
}

export function firstName(name: string | null | undefined) {
  return (name ?? '').trim().split(/\s+/)[0] || 'them'
}
