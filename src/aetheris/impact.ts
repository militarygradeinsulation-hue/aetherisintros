/**
 * Network Impact Report helpers: quarter ranges, slugs, the small-number rule and display
 * formatting. Pure functions, shared by the admin panel, the public /impact page and the
 * member's own impact card.
 *
 * The small-number rule mirrors public.impact_freeze (drizzle 0046): any count below 3 is
 * published as "fewer than 3"; the deal total is withheld when fewer than 3 USD deals back it,
 * and the median wait when fewer than 3 introductions met.
 */

export const FEWER_THAN_3 = 'fewer than 3'
export const SMALL_NUMBER_LIMIT = 3

export type MetricValue = number | string | null | undefined | { [k: string]: MetricValue }
const KEYS = ['from', 'to', 'members_verified', 'members_new', 'members_active', 'asks_posted', 'asks_answered',
  'intros_requested', 'intros_accepted', 'meetings_held', 'meetings_from_intros', 'outcomes_reported', 'outcomes_by_category',
  'deals_won', 'deals_won_usd', 'deals_value_usd_cents', 'concierge_suggestions', 'intros_met', 'median_days_intro_to_meeting'] as const
/** The figures admin_impact_report returns (and a frozen snapshot stores). */
export type ImpactMetrics = { [K in (typeof KEYS)[number]]?: MetricValue } & Record<string, MetricValue>

/** Raw keys that are not counts: dates and the two figures withheld on their own rule. */
const NOT_COUNTS = new Set(['from', 'to', 'deals_value_usd_cents', 'median_days_intro_to_meeting'])

function suppressCounts(obj: Record<string, MetricValue>): Record<string, MetricValue> {
  const out: Record<string, MetricValue> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object') out[k] = suppressCounts(v)
    else if (typeof v === 'number') out[k] = v < SMALL_NUMBER_LIMIT ? FEWER_THAN_3 : v
    else out[k] = v
  }
  return out
}

/** What a snapshot of these live numbers will look like once frozen and published. */
export function suppressMetrics(raw: ImpactMetrics): ImpactMetrics {
  const counts: Record<string, MetricValue> = {}
  for (const [k, v] of Object.entries(raw)) if (!NOT_COUNTS.has(k)) counts[k] = v
  const out: ImpactMetrics = suppressCounts(counts)
  const usdDeals = Number(raw.deals_won_usd ?? 0)
  const met = Number(raw.intros_met ?? 0)
  out.from = raw.from ?? null
  out.to = raw.to ?? null
  out.deals_value_usd_cents = usdDeals >= SMALL_NUMBER_LIMIT ? (raw.deals_value_usd_cents ?? null) : null
  out.median_days_intro_to_meeting = met >= SMALL_NUMBER_LIMIT ? (raw.median_days_intro_to_meeting ?? null) : null
  return out
}

/** A count for display: numbers get thousands separators; suppressed values read "Fewer than 3". */
export function formatCount(v: MetricValue): string {
  if (typeof v === 'number') return v.toLocaleString('en-US')
  if (typeof v === 'string' && /^\d+(\.\d+)?$/.test(v)) return Number(v).toLocaleString('en-US')
  if (v === FEWER_THAN_3) return 'Fewer than 3'
  return '—'
}

/** USD from cents, compact for large values ($1.2M, $48K), exact below $10K. */
export function formatUsd(cents: MetricValue): string | null {
  const n = typeof cents === 'number' ? cents : typeof cents === 'string' && /^\d+$/.test(cents) ? Number(cents) : null
  if (n === null) return null
  const dollars = n / 100
  if (dollars >= 1_000_000) return `$${trim(dollars / 1_000_000)}M`
  if (dollars >= 10_000) return `$${trim(dollars / 1_000)}K`
  return `$${Math.round(dollars).toLocaleString('en-US')}`
}
const trim = (x: number) => (Math.round(x * 10) / 10).toFixed(1).replace(/\.0$/, '')

export function formatDays(v: MetricValue): string | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' && /^\d+(\.\d+)?$/.test(v) ? Number(v) : null
  if (n === null) return null
  const r = Math.round(n * 10) / 10
  return `${r} day${r === 1 ? '' : 's'}`
}

export interface Quarter { label: string; from: string; to: string }

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

/** Calendar quarter q (1–4) of year y, as ISO dates inclusive. */
export function quarterRange(year: number, q: number): Quarter {
  const startMonth = (q - 1) * 3 + 1
  const endMonth = startMonth + 2
  const lastDay = new Date(Date.UTC(year, endMonth, 0)).getUTCDate()
  return { label: `Q${q} ${year}`, from: iso(year, startMonth, 1), to: iso(year, endMonth, lastDay) }
}

/** The current quarter and the `count - 1` before it, newest first. */
export function recentQuarters(now: Date, count = 6): Quarter[] {
  let y = now.getUTCFullYear()
  let q = Math.floor(now.getUTCMonth() / 3) + 1
  const out: Quarter[] = []
  for (let i = 0; i < count; i++) {
    out.push(quarterRange(y, q))
    q -= 1
    if (q === 0) { q = 4; y -= 1 }
  }
  return out
}

/** Same rule as admin_save_impact_report: lowercase, non-alphanumerics to single hyphens. */
export function slugify(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
}

export const CATEGORY_LABEL: Record<string, string> = {
  customer: 'New customers', partnership: 'Partnerships', hire: 'Hires', investor: 'Investment',
  advisor: 'Advisors', board: 'Board seats', vendor: 'Vendors', acquisition: 'Acquisitions',
  knowledge: 'Expert knowledge', other: 'Other',
}

/** Category rows for display, largest first; suppressed ("fewer than 3") rows last. */
export function categoryRows(byCategory: MetricValue): Array<{ key: string; label: string; value: string }> {
  if (!byCategory || typeof byCategory !== 'object') return []
  return Object.entries(byCategory)
    .map(([key, v]) => ({ key, label: CATEGORY_LABEL[key] ?? key, n: typeof v === 'number' ? v : -1, value: formatCount(v) }))
    .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label))
    .map(({ key, label, value }) => ({ key, label, value }))
}
