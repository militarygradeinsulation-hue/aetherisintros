/**
 * Weekly digest sender (server only). For each member who opted in and was not emailed in the
 * last six days, rebuild their "This week" from live records with the service role, render
 * it, and send it through Resend. Nothing is sent when RESEND_API_KEY / DIGEST_FROM_EMAIL are
 * not configured, and empty weeks are never emailed.
 */
import { askMatch, buildWeek, helpVocabulary, type WeekInputs } from '@/aetheris/this-week-core'
import { digestEmail, type DigestEmail, type DigestMeeting } from '@/aetheris/digest-format'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Admin = any

const DAY = 86400000
const CHECKPOINTS = [90, 30, 7]

/** "This week" for one member, computed with the service role (no auth.uid() available). */
export async function gatherDigestInputs(db: Admin, uid: string, now = Date.now()): Promise<{ week: WeekInputs; meetings: DigestMeeting[]; firstName: string }> {
  const since = new Date(now - 30 * DAY).toISOString()
  const [profile, pending, mineIntros, asks, myAsks, sent, parts] = await Promise.all([
    db.from('profiles').select('name, can_help_with, expertise, what_i_do').eq('id', uid).maybeSingle(),
    db.from('intro_requests').select('id, user_id, reason, created_at, status').eq('target_user_id', uid).eq('member_opt_in', false)
      .not('status', 'in', '(declined,closed)').order('created_at', { ascending: true }).limit(20),
    db.from('intro_requests').select('id, accepted_at').or(`user_id.eq.${uid},target_user_id.eq.${uid}`).not('accepted_at', 'is', null),
    db.from('asks').select('id, ask, author_id, created_at').eq('is_demo', false).eq('visibility', 'network').neq('status', 'closed')
      .neq('author_id', uid).gte('created_at', since).order('created_at', { ascending: false }).limit(60),
    db.from('asks').select('id, ask, created_at').eq('author_id', uid).neq('status', 'closed').lte('created_at', new Date(now - 7 * DAY).toISOString()).limit(10),
    db.from('intro_requests').select('id, target_user_id, created_at, status, member_opt_in').eq('user_id', uid).eq('member_opt_in', false)
      .not('target_user_id', 'is', null).not('status', 'in', '(declined,closed)'),
    db.from('meeting_participants').select('meeting_id').eq('user_id', uid),
  ])

  // Follow-ups due at 7 / 30 / 90 days, as my_due_outcome_checkins() computes them.
  const intros = (mineIntros.data ?? []) as Array<{ id: string; accepted_at: string }>
  const outcomes = intros.length
    ? ((await db.from('intro_outcomes').select('intro_request_id, stage, created_at').eq('author_id', uid).in('intro_request_id', intros.map(i => i.id))).data ?? []) as Array<{ intro_request_id: string; stage: string; created_at: string }>
    : []
  const dueCheckins = intros.filter(i => {
    const days = Math.floor((now - new Date(i.accepted_at).getTime()) / DAY)
    const checkpoint = CHECKPOINTS.find(c => days >= c)
    if (!checkpoint || days > 180) return false
    const mine = outcomes.filter(o => o.intro_request_id === i.id).sort((a, b) => b.created_at.localeCompare(a.created_at))
    if (mine[0] && ['outcome', 'no_outcome'].includes(mine[0].stage)) return false
    return !mine[0] || new Date(mine[0].created_at).getTime() < new Date(i.accepted_at).getTime() + checkpoint * DAY
  }).length

  const vocab = helpVocabulary(profile.data ?? {})
  const helpable = ((asks.data ?? []) as any[]).map(a => ({ ...a, matched: askMatch(a.ask, vocab) })).filter(a => a.matched.length)

  const sentRows = (sent.data ?? []) as Array<{ id: string; target_user_id: string; created_at: string }>
  const nudged = sentRows.length
    ? new Set(((await db.from('intro_request_nudges').select('intro_request_id').in('intro_request_id', sentRows.map(s => s.id))).data ?? []).map((n: any) => n.intro_request_id))
    : new Set<string>()

  const people = [...new Set([...((pending.data ?? []) as any[]).map(r => r.user_id), ...helpable.map(a => a.author_id), ...sentRows.map(s => s.target_user_id)])]
  const names = new Map<string, string>()
  if (people.length) for (const p of ((await db.from('profiles').select('id, name').in('id', people)).data ?? [])) names.set(p.id, p.name || 'A member')

  const myAskIds = ((myAsks.data ?? []) as any[]).map(a => a.id)
  const answered = new Set<string>(myAskIds.length ? ((await db.from('ask_responses').select('ask_id').in('ask_id', myAskIds)).data ?? []).map((r: any) => r.ask_id) : [])

  const meetingIds = ((parts.data ?? []) as any[]).map(p => p.meeting_id)
  const meetings: DigestMeeting[] = meetingIds.length
    ? (((await db.from('meetings').select('title, scheduled_for, ended_at').in('id', meetingIds).is('ended_at', null)
        .gte('scheduled_for', new Date(now).toISOString()).lte('scheduled_for', new Date(now + 7 * DAY).toISOString()).order('scheduled_for')).data ?? []) as any[])
        .map(m => ({ title: m.title, startsAt: m.scheduled_for }))
    : []

  return {
    firstName: String(profile.data?.name ?? '').trim().split(/\s+/)[0] ?? '',
    meetings,
    week: {
      pendingRequests: ((pending.data ?? []) as any[]).map(r => ({ id: r.id, requesterName: names.get(r.user_id) ?? 'A member', reason: r.reason ?? '', createdAt: r.created_at })),
      dueCheckins,
      unansweredSent: sentRows.map(s => {
        const daysWaiting = Math.floor((now - new Date(s.created_at).getTime()) / DAY)
        return { id: s.id, targetName: names.get(s.target_user_id) ?? 'A member', daysWaiting, canNudge: daysWaiting >= 5 && !nudged.has(s.id) }
      }).filter(s => s.canNudge || s.daysWaiting >= 14),
      helpableAsks: helpable.map(a => ({ id: a.id, ask: a.ask, authorName: names.get(a.author_id) ?? 'A member', matched: a.matched })),
      quietAsks: ((myAsks.data ?? []) as any[]).filter(a => !answered.has(a.id)).map(a => ({ id: a.id, ask: a.ask, daysOld: Math.floor((now - new Date(a.created_at).getTime()) / DAY) })),
      companyRisk: [],
    },
  }
}

export interface DigestRunResult { considered: number; sent: number; empty: number; failed: number; configured: boolean; previews?: Array<{ to: string; email: DigestEmail }> }

export async function sendWeeklyDigests(opts: { appUrl: string; dryRun?: boolean; limit?: number }): Promise<DigestRunResult> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const db = supabaseAdmin as Admin
  const apiKey = process.env['RESEND_API_KEY']
  const from = process.env['DIGEST_FROM_EMAIL']
  const configured = !!apiKey && !!from
  const result: DigestRunResult = { considered: 0, sent: 0, empty: 0, failed: 0, configured, ...(opts.dryRun ? { previews: [] } : {}) }
  if (!configured && !opts.dryRun) return result

  const cutoff = new Date(Date.now() - 6 * DAY).toISOString()
  const { data: due } = await db.from('email_preferences').select('user_id, unsubscribe_token, last_digest_at')
    .eq('weekly_digest', true).or(`last_digest_at.is.null,last_digest_at.lt.${cutoff}`).limit(opts.limit ?? 200)

  for (const pref of (due ?? []) as Array<{ user_id: string; unsubscribe_token: string }>) {
    result.considered++
    try {
      const { data: user } = await db.auth.admin.getUserById(pref.user_id)
      const to = user?.user?.email as string | undefined
      if (!to) { result.failed++; continue }
      const inputs = await gatherDigestInputs(db, pref.user_id)
      const email = digestEmail({
        firstName: inputs.firstName, items: buildWeek(inputs.week, 8), meetings: inputs.meetings,
        appUrl: opts.appUrl, unsubscribeUrl: `${opts.appUrl}/api/public/digest-unsubscribe?token=${pref.unsubscribe_token}`,
      })
      if (opts.dryRun) { if (email) result.previews!.push({ to, email }); else result.empty++; continue }
      if (!email) {
        result.empty++
      } else {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from, to, subject: email.subject, html: email.html, text: email.text,
            headers: { 'List-Unsubscribe': `<${opts.appUrl}/api/public/digest-unsubscribe?token=${pref.unsubscribe_token}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
          }),
        })
        if (!res.ok) { result.failed++; continue }
        result.sent++
      }
      // Empty weeks count as handled too, so a retry later the same week does not re-check them.
      await db.from('email_preferences').update({ last_digest_at: new Date().toISOString() }).eq('user_id', pref.user_id)
    } catch {
      result.failed++
    }
  }
  return result
}

export async function unsubscribeDigest(token: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return false
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const { data } = await (supabaseAdmin as Admin).from('email_preferences').update({ weekly_digest: false }).eq('unsubscribe_token', token).select('user_id')
  return (data ?? []).length > 0
}

/** Constant-time comparison for the cron secret. */
export function secretMatches(given: string, expected: string): boolean {
  if (!expected || given.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}
