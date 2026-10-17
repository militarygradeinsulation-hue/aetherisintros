import { createServerFn } from '@tanstack/react-start'
import { requireAuthContract } from './auth-gate'

// ---------------------------------------------------------------------------
// Reputation Score
// ---------------------------------------------------------------------------

export interface ReputationScore {
  id: string
  user_id: string
  score: number
  response_rate: number
  intro_success_rate: number
  follow_through_rate: number
  total_intros: number
  updated_at: string
}

export const getReputationScore = createServerFn({ method: 'GET' })
  .middleware([requireAuthContract])
  .inputValidator((data: unknown) => data as { userId: string })
  .handler(async ({ data, context }) => {
    const db = context.supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any
    const { data: score } = await db
      .from('reputation_scores')
      .select('*')
      .eq('user_id', (data as { userId: string }).userId)
      .maybeSingle()
    return score as ReputationScore | null
  })

export const computeAndSaveScore = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .handler(async ({ context }) => {
    const db = context.supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any
    const userId = context.userId
    // Compute from intro_outcomes (only outcomes authored by peers, not self)
    const { data: outcomes } = await db
      .from('intro_outcomes')
      .select('stage, outcome_category, author_id, intro_request_id')
      .neq('author_id', userId)
    const peerOutcomes = (outcomes ?? []) as Array<{ stage: string; outcome_category: string | null; author_id: string; intro_request_id: string }>
    // Outcomes on intros involving this user
    const { data: myRequests } = await db
      .from('intro_requests')
      .select('id')
      .or(`user_id.eq.${userId},member_id.eq.${userId}`)
    const myRequestIds = new Set(((myRequests ?? []) as Array<{ id: string }>).map(r => r.id))
    const relevant = peerOutcomes.filter(o => myRequestIds.has(o.intro_request_id))
    const total = myRequestIds.size
    const meetings = relevant.filter(o => o.stage === 'met').length
    const outcomes_count = relevant.filter(o => o.stage === 'outcome').length
    const intro_success_rate = total > 0 ? Math.round((meetings / total) * 100) : 0
    const follow_through_rate = meetings > 0 ? Math.round((outcomes_count / meetings) * 100) : 0
    // Composite score: weighted average
    const score = total > 0
      ? Math.min(100, Math.round((intro_success_rate * 0.5) + (follow_through_rate * 0.5)))
      : 50
    await db.from('reputation_scores').upsert(
      {
        user_id: userId,
        score,
        total_intros: total,
        intro_success_rate,
        follow_through_rate,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    return { score, total_intros: total, intro_success_rate, follow_through_rate }
  })

// ---------------------------------------------------------------------------
// Outcome Reactions
// ---------------------------------------------------------------------------

export const reactToOutcome = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .inputValidator((data: unknown) => data as { outcomeId: string; reaction: 'verified' | 'skeptical' | 'amazing' })
  .handler(async ({ data, context }) => {
    const db = context.supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any
    const d = data as { outcomeId: string; reaction: 'verified' | 'skeptical' | 'amazing' }
    const { error } = await db
      .from('outcome_reactions')
      .upsert(
        { outcome_id: d.outcomeId, reactor_id: context.userId, reaction: d.reaction },
        { onConflict: 'outcome_id,reactor_id' },
      )
    if (error) throw new Error(error.message)
    return { ok: true }
  })

export const getTrackRecord = createServerFn({ method: 'GET' })
  .middleware([requireAuthContract])
  .inputValidator((data: unknown) => data as { userId: string })
  .handler(async ({ data, context }) => {
    const db = context.supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any
    const { data: rows } = await db
      .from('track_record_entries')
      .select('*')
      .eq('user_id', (data as { userId: string }).userId)
      .eq('public', true)
      .order('created_at', { ascending: false })
    return (rows ?? []) as TrackRecordEntry[]
  })

export const addTrackRecordEntry = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .inputValidator((data: unknown) => data as { kind: string; title: string; counterpartyName?: string; description?: string; isPublic?: boolean })
  .handler(async ({ data, context }) => {
    const db = context.supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any
    const d = data as { kind: string; title: string; counterpartyName?: string; description?: string; isPublic?: boolean }
    const { data: row, error } = await db
      .from('track_record_entries')
      .insert({
        kind: d.kind,
        title: d.title,
        counterparty_name: d.counterpartyName,
        description: d.description,
        public: d.isPublic ?? true,
      })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return row as TrackRecordEntry
  })

export interface TrackRecordEntry {
  id: string
  user_id: string
  kind: 'deal_closed' | 'milestone_delivered' | 'intro_led_to_deal' | 'service_delivered'
  title: string
  counterparty_name: string | null
  counterparty_user_id: string | null
  deal_room_id: string | null
  value_low: number | null
  value_high: number | null
  currency: string
  description: string | null
  verified: boolean
  public: boolean
  created_at: string
}
