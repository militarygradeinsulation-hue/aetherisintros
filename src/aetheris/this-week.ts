/**
 * "This week": the few actions that are actually waiting on a member, drawn only from live
 * records. Ordered by who is affected: someone waiting on you first, then follow-through,
 * then where you can help, then your own stalled asks, then company risk. Never padded:
 * an empty week renders as empty.
 */
import { supabase } from '@/integrations/supabase/client'
import { tokens } from './opportunity-graph'

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any

export type WeekTarget = 'intros' | 'needs' | 'organization'
export type WeekKind = 'respond' | 'checkin' | 'help' | 'quiet_ask' | 'company_risk'

export interface WeekItem {
  key: string
  kind: WeekKind
  title: string
  detail: string
  action: string
  target: WeekTarget
}

export interface WeekInputs {
  pendingRequests: Array<{ id: string; requesterName: string; reason: string; createdAt: string }>
  dueCheckins: number
  helpableAsks: Array<{ id: string; ask: string; authorName: string; matched: string[] }>
  quietAsks: Array<{ id: string; ask: string; daysOld: number }>
  companyRisk: Array<{ orgName: string; atRisk: number; singleOwner: number }>
}

const clip = (s: string, n = 90) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** Words a member's profile says they can help with, for matching against network asks. */
export function helpVocabulary(profile: { can_help_with?: string | null; expertise?: string[] | null; what_i_do?: string | null }): Set<string> {
  return new Set(tokens([profile.can_help_with ?? '', ...(profile.expertise ?? []), profile.what_i_do ?? ''].join(' ')))
}

/** Words an ask and the member's own stated help share; at least two to count as a fit. */
export function askMatch(ask: string, vocab: Set<string>): string[] {
  const hits = tokens(ask).filter(t => vocab.has(t))
  return hits.length >= 2 ? hits.slice(0, 3) : []
}

export function buildWeek(input: WeekInputs, limit = 6): WeekItem[] {
  const items: WeekItem[] = []
  for (const r of input.pendingRequests.slice(0, 3)) {
    items.push({
      key: `respond-${r.id}`, kind: 'respond', target: 'intros',
      title: `${r.requesterName} is waiting on your answer`,
      detail: r.reason ? clip(r.reason) : 'An introduction request with its context capsule.',
      action: 'Review request',
    })
  }
  if (input.pendingRequests.length > 3) {
    items.push({ key: 'respond-more', kind: 'respond', target: 'intros', title: `${input.pendingRequests.length - 3} more introduction requests waiting`, detail: 'Oldest first.', action: 'Open introductions' })
  }
  if (input.dueCheckins > 0) {
    items.push({
      key: 'checkins', kind: 'checkin', target: 'intros',
      title: `${plural(input.dueCheckins, 'introduction')} to follow up`,
      detail: 'Ten seconds each. This is how the network learns which introductions change results.',
      action: 'Record what happened',
    })
  }
  for (const a of input.helpableAsks.slice(0, 2)) {
    items.push({
      key: `help-${a.id}`, kind: 'help', target: 'needs',
      title: `${a.authorName} asked: “${clip(a.ask, 70)}”`,
      detail: `Matches what you say you help with: ${a.matched.join(', ')}.`,
      action: 'See the ask',
    })
  }
  for (const a of input.quietAsks.slice(0, 1)) {
    items.push({
      key: `quiet-${a.id}`, kind: 'quiet_ask', target: 'needs',
      title: `No replies yet to “${clip(a.ask, 70)}”`,
      detail: `Posted ${a.daysOld} days ago. Sharpen it, or route it to specific people.`,
      action: 'Revisit the ask',
    })
  }
  for (const c of input.companyRisk) {
    if (!c.atRisk && !c.singleOwner) continue
    items.push({
      key: `company-${c.orgName}`, kind: 'company_risk', target: 'organization',
      title: c.atRisk ? `${c.orgName}: ${plural(c.atRisk, 'relationship')} no one here holds now` : `${c.orgName}: ${plural(c.singleOwner, 'relationship')} rest on one person`,
      detail: 'Someone should pick these up before they go cold.',
      action: 'Open company workspace',
    })
  }
  return items.slice(0, limit)
}

const DAY = 86400000

/** Gather this week's inputs from live, RLS-scoped records for the signed-in member. */
export async function loadWeekInputs(): Promise<{ data: WeekInputs | null; error: string }> {
  const { data: auth } = await supabase.auth.getUser()
  const me = auth.user?.id
  if (!me) return { data: null, error: '' }

  const since = new Date(Date.now() - 30 * DAY).toISOString()
  const [pending, due, profile, asks, mine, orgs] = await Promise.all([
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
  ])
  const firstError = [pending, due, profile, asks, mine, orgs].find((r: any) => r.error)?.error?.message ?? ''

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
      helpableAsks: helpable.map((a: any) => ({ id: a.id, ask: a.ask, authorName: names.get(a.author_id) ?? 'A member', matched: a.matched })),
      quietAsks: (mine.data ?? []).filter((a: any) => !answered.has(a.id)).map((a: any) => ({ id: a.id, ask: a.ask, daysOld: Math.floor((Date.now() - new Date(a.created_at).getTime()) / DAY) })),
      companyRisk,
    },
    error: firstError,
  }
}
