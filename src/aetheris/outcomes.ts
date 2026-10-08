/**
 * Introduction outcome spine. An accepted introduction starts a record; participants
 * append what happened afterwards (met → next step → outcome / no outcome) at 7, 30
 * and 90 days. Append-only, participant-scoped and private by default — the server
 * (drizzle/migrations/0022) enforces every rule; this module only reads and appends.
 */
import { supabase } from '@/integrations/supabase/client'

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any

export const OUTCOME_STAGES = ['too_early', 'met', 'next_step', 'outcome', 'no_outcome'] as const
export type OutcomeStage = typeof OUTCOME_STAGES[number]

export const OUTCOME_CATEGORIES = ['customer', 'partnership', 'hire', 'investor', 'advisor', 'board', 'vendor', 'acquisition', 'knowledge', 'other'] as const
export type OutcomeCategory = typeof OUTCOME_CATEGORIES[number]

export const VALUE_BANDS = ['undisclosed', 'under_10k', '10k_100k', '100k_1m', 'over_1m'] as const
export type ValueBand = typeof VALUE_BANDS[number]

export type Attribution = 'direct' | 'influenced' | 'contextual'

export const stageLabel: Record<OutcomeStage, string> = {
  too_early: 'Too early to tell',
  met: 'We met',
  next_step: 'Agreed a next step',
  outcome: 'It produced an outcome',
  no_outcome: 'No outcome',
}

export const categoryLabel: Record<OutcomeCategory, string> = {
  customer: 'Customer', partnership: 'Partnership', hire: 'Hire', investor: 'Investor', advisor: 'Advisor',
  board: 'Board seat', vendor: 'Vendor', acquisition: 'Acquisition', knowledge: 'Knowledge / expertise', other: 'Other',
}

export const valueBandLabel: Record<ValueBand, string> = {
  undisclosed: 'Prefer not to say', under_10k: 'Under $10K', '10k_100k': '$10K–$100K', '100k_1m': '$100K–$1M', over_1m: 'Over $1M',
}

export const attributionLabel: Record<Attribution, string> = {
  direct: 'Directly from this introduction',
  influenced: 'Influenced by it',
  contextual: 'Context only',
}

export interface OutcomeEvent {
  id: string
  introRequestId: string
  authorId: string
  stage: OutcomeStage
  outcomeCategory: OutcomeCategory | null
  attribution: Attribution
  valueBand: ValueBand
  shareable: boolean
  occurredOn: string
  createdAt: string
}

export interface DueCheckin {
  introRequestId: string
  counterpartId: string | null
  acceptedAt: string
  daysSince: number
  checkpoint: 7 | 30 | 90
  lastStage: OutcomeStage | null
}

export interface OutcomeInput {
  introRequestId: string
  stage: OutcomeStage
  outcomeCategory?: OutcomeCategory | null
  attribution?: Attribution
  valueBand?: ValueBand
  privateNote?: string
  shareable?: boolean
}

/** private_note is deliberately excluded: it is readable only by its author, via RPC. */
const COLUMNS = 'id,intro_request_id,author_id,stage,outcome_category,attribution,value_band,shareable,occurred_on,created_at'

const fromRow = (r: any): OutcomeEvent => ({
  id: r.id, introRequestId: r.intro_request_id, authorId: r.author_id, stage: r.stage, outcomeCategory: r.outcome_category ?? null,
  attribution: r.attribution, valueBand: r.value_band, shareable: r.shareable, occurredOn: r.occurred_on, createdAt: r.created_at,
})

/** Normalise an input so it always satisfies the table's check constraints. */
export function normaliseOutcome(input: OutcomeInput) {
  const isOutcome = input.stage === 'outcome'
  return {
    intro_request_id: input.introRequestId,
    stage: input.stage,
    outcome_category: isOutcome ? (input.outcomeCategory ?? 'other') : null,
    attribution: input.attribution ?? 'direct',
    value_band: isOutcome ? (input.valueBand ?? 'undisclosed') : 'undisclosed',
    private_note: (input.privateNote ?? '').slice(0, 1000),
    shareable: Boolean(input.shareable),
  }
}

/** The furthest point an introduction has reached, across every visible event. */
export function furthestStage(events: Pick<OutcomeEvent, 'stage'>[]): OutcomeStage | null {
  const rank: Record<OutcomeStage, number> = { too_early: 0, no_outcome: 1, met: 2, next_step: 3, outcome: 4 }
  let best: OutcomeStage | null = null
  for (const e of events) if (!best || rank[e.stage] > rank[best]) best = e.stage
  return best
}

export interface OutcomeSummary {
  introductions: number
  met: number
  nextStep: number
  outcomes: number
  byCategory: Partial<Record<OutcomeCategory, number>>
}

/** Per-introduction funnel from a member's visible events (own + shared). */
export function summariseOutcomes(events: OutcomeEvent[]): OutcomeSummary {
  const byIntro = new Map<string, OutcomeEvent[]>()
  for (const e of events) byIntro.set(e.introRequestId, [...(byIntro.get(e.introRequestId) ?? []), e])
  const summary: OutcomeSummary = { introductions: byIntro.size, met: 0, nextStep: 0, outcomes: 0, byCategory: {} }
  for (const list of byIntro.values()) {
    const top = furthestStage(list)
    if (top === 'met' || top === 'next_step' || top === 'outcome') summary.met++
    if (top === 'next_step' || top === 'outcome') summary.nextStep++
    if (top === 'outcome') {
      summary.outcomes++
      for (const c of new Set(list.filter(e => e.stage === 'outcome').map(e => e.outcomeCategory ?? 'other'))) {
        summary.byCategory[c] = (summary.byCategory[c] ?? 0) + 1
      }
    }
  }
  return summary
}

export function checkinPrompt(c: Pick<DueCheckin, 'checkpoint' | 'lastStage'>, name: string): string {
  if (c.checkpoint === 7) return `A week since you and ${name} were introduced. Did you meet?`
  if (c.lastStage === 'met' || c.lastStage === 'next_step') return `${c.checkpoint} days on with ${name}. Did it lead anywhere?`
  return `${c.checkpoint} days since your introduction to ${name}. What came of it?`
}

/* ───────────────────────── server calls ───────────────────────── */

export async function loadDueCheckins(): Promise<{ data: DueCheckin[]; error: string }> {
  const r = await db.rpc('my_due_outcome_checkins')
  if (r.error) return { data: [], error: r.error.message }
  return {
    data: (r.data ?? []).map((x: any) => ({
      introRequestId: x.intro_request_id, counterpartId: x.counterpart_id ?? null, acceptedAt: x.accepted_at,
      daysSince: x.days_since, checkpoint: x.checkpoint, lastStage: x.last_stage ?? null,
    })),
    error: '',
  }
}

export async function loadIntroOutcomes(introRequestId: string): Promise<{ data: OutcomeEvent[]; error: string }> {
  const r = await db.from('intro_outcomes').select(COLUMNS).eq('intro_request_id', introRequestId).order('created_at', { ascending: true })
  return r.error ? { data: [], error: r.error.message } : { data: (r.data ?? []).map(fromRow), error: '' }
}

export async function loadMyVisibleOutcomes(): Promise<{ data: OutcomeEvent[]; error: string }> {
  const r = await db.from('intro_outcomes').select(COLUMNS).order('created_at', { ascending: false }).limit(500)
  return r.error ? { data: [], error: r.error.message } : { data: (r.data ?? []).map(fromRow), error: '' }
}

export async function recordOutcome(input: OutcomeInput): Promise<{ error: string }> {
  const r = await db.from('intro_outcomes').insert(normaliseOutcome(input))
  if (r.error) return { error: r.error.message }
  await db.from('entity_events').insert({
    entity_type: 'intro_request', entity_id: input.introRequestId, event: `outcome_${input.stage}`,
    summary: stageLabel[input.stage], detail: {}, source: 'ask-intros',
  })
  return { error: '' }
}

export async function retractOutcome(id: string): Promise<{ error: string }> {
  const r = await db.from('intro_outcomes').delete().eq('id', id)
  return { error: r.error?.message ?? '' }
}

export interface NetworkProof {
  window_days: number
  members: number
  members_asking: number
  weekly_askers: number
  asks: number
  intros_requested: number
  intros_accepted: number
  intros_met: number
  intros_next_step: number
  intros_outcome: number
  intros_no_outcome: number
  outcomes_by_category: Partial<Record<OutcomeCategory, number>>
  median_days_to_outcome: number | null
}

export async function loadNetworkProof(days: number): Promise<{ data: NetworkProof | null; error: string }> {
  const r = await db.rpc('network_proof_metrics', { p_days: days })
  return r.error ? { data: null, error: r.error.message } : { data: r.data as NetworkProof, error: '' }
}

/** Share of `part` in `whole`, as a whole percentage; null when there is no base. */
export const rate = (part: number, whole: number): number | null => (whole > 0 ? Math.round((part / whole) * 100) : null)

/* ───────────────────────── follow-through record ───────────────────────── */

export type Band = 'most' | 'many' | 'some' | 'none' | 'insufficient'

export interface TrackRecord {
  visible: boolean
  is_self?: boolean
  shown_on_profile?: boolean
  accepts_introductions?: Band
  introductions_lead_to_meetings?: Band
  introductions_lead_to_outcomes?: Band
  sample?: string
}

const BAND_WORD: Record<'most' | 'many' | 'some', string> = { most: 'Most', many: 'Many', some: 'Some' }

/** Plain-language line for a banded metric; never a number, never a fabricated rate. */
export function bandLine(band: Band | undefined, subject: string): string {
  if (!band || band === 'insufficient') return `Too few introductions yet to judge: ${subject}.`
  if (band === 'none') return `No ${subject} yet.`
  return `${BAND_WORD[band]} ${subject}.`
}

export async function loadTrackRecord(memberId: string): Promise<{ data: TrackRecord | null; error: string }> {
  const r = await db.rpc('member_track_record', { p_member: memberId })
  return r.error ? { data: null, error: r.error.message } : { data: r.data as TrackRecord, error: '' }
}

export async function setTrackRecordShown(show: boolean): Promise<{ error: string }> {
  const r = await db.from('track_record_settings').upsert({ show_on_profile: show }, { onConflict: 'user_id' })
  return { error: r.error?.message ?? '' }
}
