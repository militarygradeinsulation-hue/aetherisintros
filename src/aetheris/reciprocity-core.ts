/**
 * Pure rules behind "Give & get" and "Keep warm". The database applies the same rules
 * (drizzle/migrations/0055_reciprocity_nudges.sql); these mirrors keep them testable and let
 * the client explain them. Nothing here touches the network.
 */

export type GiverBand = 'Emerging' | 'Contributor' | 'Pillar'

export type GiveKind = 'answered_ask' | 'intro_accepted' | 'intro_met' | 'intro_outcome' | 'concierge_help'

/** Activity counts 1; a meeting or outcome confirmed by the OTHER person counts far more. */
export const GIVE_WEIGHT: Record<GiveKind, number> = {
  answered_ask: 1, intro_accepted: 1, concierge_help: 1, intro_met: 3, intro_outcome: 6,
}

export const GIVE_LABEL: Record<GiveKind, string> = {
  answered_ask: 'Asks answered',
  intro_accepted: 'Introductions accepted',
  intro_met: 'Introductions that led to a meeting',
  intro_outcome: 'Introductions that led to an outcome',
  concierge_help: 'Suggested matches you followed up',
}

/** Bands, never ranks. Pillar needs breadth and at least one give the other side confirmed. */
export function giverBand(score: number, people: number, confirmed: number): GiverBand {
  if (score >= 15 && people >= 5 && confirmed >= 1) return 'Pillar'
  if (score >= 5 && people >= 2) return 'Contributor'
  return 'Emerging'
}

/**
 * Matching boost for members who chose to show their band. Deliberately small (at most
 * 3 points of 100) so generosity breaks ties without outranking relevance.
 */
export function giverBoost(band: GiverBand | null | undefined): number {
  if (band === 'Pillar') return 3
  if (band === 'Contributor') return 1.5
  return 0
}

export interface Exchange {
  direction: 'give' | 'get'
  counterpart: string
  at: number
  confirmed: boolean
}

export const PING_PONG_DAYS = 30
const DAY = 86400000

/**
 * Anti-gaming dedupe. Confirmed events always count. Unconfirmed activity with the same
 * person, in either direction, within 30 days of the last counted activity counts once, so
 * trading replies back and forth earns nothing extra.
 */
export function dedupeExchanges<T extends Exchange>(events: T[]): T[] {
  const sorted = [...events].sort((a, b) => a.counterpart.localeCompare(b.counterpart) || a.at - b.at || Number(b.confirmed) - Number(a.confirmed))
  const windowStart = new Map<string, number>()
  const out: T[] = []
  for (const e of sorted) {
    if (e.confirmed) { out.push(e); continue }
    const start = windowStart.get(e.counterpart)
    if (start === undefined || e.at >= start + PING_PONG_DAYS * DAY) {
      windowStart.set(e.counterpart, e.at)
      out.push(e)
    }
  }
  return out
}

export interface CoolingStatus {
  cooling: boolean
  touches: number
  cadenceDays: number | null
  quietDays: number | null
  lastTouch: number | null
}

/**
 * A relationship is cooling when it had at least three touch-days in the last year at a cadence
 * of 45 days or tighter, and has since been quiet 60+ days (cadence ≤ 21) or 90+ days.
 */
export function coolingStatus(touches: Array<number | string | Date>, now = Date.now()): CoolingStatus {
  const days = [...new Set(touches
    .map(t => new Date(t).getTime())
    .filter(t => Number.isFinite(t) && t <= now && t > now - 365 * DAY)
    .map(t => Math.floor(t / DAY)))].sort((a, b) => a - b)
  if (days.length < 3) return { cooling: false, touches: days.length, cadenceDays: null, quietDays: null, lastTouch: days.length ? days.at(-1)! * DAY : null }
  const first = days[0]!, last = days.at(-1)!
  const cadenceDays = Math.round((last - first) / (days.length - 1))
  const quietDays = Math.floor((now - last * DAY) / DAY)
  const threshold = cadenceDays <= 21 ? 60 : 90
  return { cooling: cadenceDays <= 45 && quietDays >= threshold, touches: days.length, cadenceDays, quietDays, lastTouch: last * DAY }
}

/** "3 weeks", "2 months" — for cadence and quiet periods in plain words. */
export function spanLabel(days: number): string {
  if (days < 14) return `${days} day${days === 1 ? '' : 's'}`
  if (days < 60) return `${Math.round(days / 7)} weeks`
  return `${Math.round(days / 30)} months`
}
