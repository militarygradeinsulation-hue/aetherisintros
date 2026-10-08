/**
 * "This week": the few actions that are actually waiting on a member, drawn only from live
 * records. Ordered by who is affected: someone waiting on you first, then follow-through,
 * then where you can help, then your own stalled asks, then company risk. Never padded:
 * an empty week renders as empty.
 */
import { supabase } from '@/integrations/supabase/client'
import { STALE_AFTER_DAYS } from './sent-requests'

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any

export { askMatch, buildWeek, helpVocabulary } from './this-week-core'
export type { WeekInputs, WeekItem, WeekKind, WeekTarget } from './this-week-core'
import { askMatch, helpVocabulary, type WeekInputs } from './this-week-core'

const DAY = 86400000

/** Gather this week's inputs from live, RLS-scoped records for the signed-in member. */
export async function loadWeekInputs(): Promise<{ data: WeekInputs | null; error: string }> {
  const { data: auth } = await supabase.auth.getUser()
  const me = auth.user?.id
  if (!me) return { data: null, error: '' }

  const since = new Date(Date.now() - 30 * DAY).toISOString()
  const [pending, due, profile, asks, mine, orgs, sent] = await Promise.all([
    db.from('intro_requests').select('id, user_id, reason, created_at, status').eq('target_user_id', me).eq('member_opt_in', false)
      .neq('status', 'declined').order('created_at', { ascending: true }).limit(20),
    db.rpc('my_due_outcome_checkins'),
    db.from('profiles').select('can_help_with, expertise, what_i_do').eq('id', me).maybeSingle(),
    db.from('asks').select('id, ask, author_id, created_at').eq('is_demo', false).eq('visibility', 'network').neq('status', 'closed')
      .neq('author_id', me).gte('created_at', since).order('created_at', { ascending: false }).limit(60),
    // Replies are counted from ask_responses directly, so this is right even before 0027 is applied.
    db.from('asks').select('id, ask, created_at').eq('author_id', me).neq('status', 'closed')
      .lte('created_at', new Date(Date.now() - 7 * DAY).toISOString()).order('created_at', { ascending: true }).limit(10),
    db.from('org_members').select('org_id, organizations(name)').eq('user_id', me).eq('status', 'active'),
    db.rpc('my_pending_intro_requests'),
  ])
  const firstError = [pending, due, profile, asks, mine, orgs, sent].find((r: any) => r.error)?.error?.message ?? ''

  const vocab = helpVocabulary(profile.data ?? {})
  const helpable = (asks.data ?? []).map((a: any) => ({ ...a, matched: askMatch(a.ask, vocab) })).filter((a: any) => a.matched.length)

  const peopleIds = [...new Set([...(pending.data ?? []).map((r: any) => r.user_id), ...helpable.map((a: any) => a.author_id)])]
  const names = new Map<string, string>()
  if (peopleIds.length) {
    const p = await db.from('profiles').select('id, name').in('id', peopleIds)
    for (const row of p.data ?? []) names.set(row.id, row.name || 'A member')
  }

  const myAskIds = (mine.data ?? []).map((a: any) => a.id)
  const answered = new Set<string>()
  if (myAskIds.length) {
    const replies = await db.from('ask_responses').select('ask_id').in('ask_id', myAskIds)
    for (const row of replies.data ?? []) answered.add(row.ask_id)
  }

  const companyRisk: WeekInputs['companyRisk'] = []
  for (const o of orgs.data ?? []) {
    const cov = await db.rpc('org_relationship_coverage', { p_org: o.org_id })
    const rows = (cov.data ?? []) as Array<{ coverage: string }>
    companyRisk.push({ orgName: o.organizations?.name ?? 'Your company', atRisk: rows.filter(r => r.coverage === 'at_risk').length, singleOwner: rows.filter(r => r.coverage === 'single_owner').length })
  }

  return {
    data: {
      pendingRequests: (pending.data ?? []).map((r: any) => ({ id: r.id, requesterName: names.get(r.user_id) ?? 'A member', reason: r.reason ?? '', createdAt: r.created_at })),
      dueCheckins: (due.data ?? []).length,
      unansweredSent: (sent.data ?? []).filter((r: any) => r.can_nudge || Number(r.days_waiting) >= STALE_AFTER_DAYS)
        .map((r: any) => ({ id: r.id, targetName: r.target_name || 'A member', daysWaiting: Number(r.days_waiting), canNudge: !!r.can_nudge })),
      helpableAsks: helpable.map((a: any) => ({ id: a.id, ask: a.ask, authorName: names.get(a.author_id) ?? 'A member', matched: a.matched })),
      quietAsks: (mine.data ?? []).filter((a: any) => !answered.has(a.id)).map((a: any) => ({ id: a.id, ask: a.ask, daysOld: Math.floor((Date.now() - new Date(a.created_at).getTime()) / DAY) })),
      companyRisk,
    },
    error: firstError,
  }
}
