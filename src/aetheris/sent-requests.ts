/**
 * Introduction requests the signed-in member sent that are still unanswered. A request can
 * get one reminder after five days, and can be withdrawn at any time before it is answered;
 * after two weeks the honest advice is to find another path. Reminders and the pending list
 * are server-guarded (drizzle/migrations/0028).
 */
import { supabase } from '@/integrations/supabase/client'

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any

export const NUDGE_AFTER_DAYS = 5
export const STALE_AFTER_DAYS = 14

export interface SentRequest {
  id: string
  targetId: string
  targetName: string
  reason: string
  createdAt: string
  daysWaiting: number
  nudgedAt: string | null
  canNudge: boolean
}

/** "Sent today", or how long the requester has been waiting once it is more than a day. */
export function waitingLabel(iso: string, now = Date.now()): string {
  const days = Math.floor((now - new Date(iso).getTime()) / 86400000)
  if (days < 1) return 'sent today'
  return `waiting ${days} day${days === 1 ? '' : 's'}`
}

export type SentStage = 'waiting' | 'nudge' | 'nudged' | 'stale'

/** What the requester should see and be offered for one pending request. */
export function sentStage(r: Pick<SentRequest, 'daysWaiting' | 'nudgedAt' | 'canNudge'>): SentStage {
  if (r.daysWaiting >= STALE_AFTER_DAYS && !r.canNudge) return 'stale'
  if (r.canNudge) return 'nudge'
  if (r.nudgedAt) return 'nudged'
  return 'waiting'
}

export function stageLine(r: SentRequest): string {
  const days = r.daysWaiting === 0 ? 'Sent today' : `Waiting ${r.daysWaiting} day${r.daysWaiting === 1 ? '' : 's'}`
  switch (sentStage(r)) {
    case 'nudge': return `${days}. You can send ${r.targetName} one reminder.`
    case 'nudged': return `${days}. Reminder sent ${new Date(r.nudgedAt!).toLocaleDateString()}.`
    case 'stale': return `${days}. ${r.targetName} may not be the right path right now. Withdraw and route the ask to someone else.`
    default: return `${days}. ${r.targetName} decides; nothing happens until they accept.`
  }
}

export function normaliseSent(row: any): SentRequest {
  return {
    id: row.id, targetId: row.target_user_id, targetName: row.target_name || 'A member', reason: row.reason ?? '',
    createdAt: row.created_at, daysWaiting: Number(row.days_waiting ?? 0), nudgedAt: row.nudged_at ?? null, canNudge: !!row.can_nudge,
  }
}

export async function loadSentRequests(): Promise<{ data: SentRequest[]; error: string }> {
  const r = await db.rpc('my_pending_intro_requests')
  return { data: (r.data ?? []).map(normaliseSent), error: r.error?.message ?? '' }
}

export async function nudgeRequest(id: string): Promise<string> {
  const r = await db.rpc('nudge_intro_request', { p_id: id })
  return r.error?.message ?? ''
}

/** Withdraw an unanswered request. Answered introductions cannot be deleted (server-enforced). */
export async function withdrawRequest(id: string): Promise<string> {
  const r = await db.from('intro_requests').delete().eq('id', id).eq('member_opt_in', false).select('id')
  if (r.error) return r.error.message
  return (r.data ?? []).length ? '' : 'This request was already answered.'
}
