/**
 * Ghost CRM sync: every social action (accepted intro, message, outcome, meeting) quietly
 * creates or refreshes a crm_people row for the other member and logs a crm_activities row.
 *
 * Talks to Supabase directly through the RLS client (owner_id = auth.uid()), so it works
 * outside the React store. It never throws: every failure is logged and swallowed so a CRM
 * hiccup can never block the social action that triggered it.
 */
import { supabase } from '@/integrations/supabase/client'

export interface GhostProfile { id: string; name: string; title: string; company: string; location: string }
type ActivityKind = 'intro' | 'message' | 'meeting' | 'note'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const warn = (what: string, error: unknown) => console.warn(`[ghost-sync] ${what}:`, error instanceof Error ? error.message : error)

/** Fill blank fields from the member's public profile so callers that only know an id still get a useful contact. */
async function completeProfile(p: GhostProfile): Promise<GhostProfile> {
  if (p.name && p.title && p.company && p.location) return p
  const { data, error } = await supabase.from('profiles').select('name, title, company, location').eq('id', p.id).maybeSingle()
  if (error || !data) return p
  return {
    id: p.id, name: p.name || data.name || '', title: p.title || data.title || '',
    company: p.company || data.company || '', location: p.location || data.location || '',
  }
}

async function personIdFor(memberUserId: string): Promise<string | null> {
  const { data, error } = await supabase.from('crm_people').select('id').eq('member_id', memberUserId).order('created_at').limit(1).maybeSingle()
  if (error) { warn('contact lookup failed', error.message); return null }
  return data?.id ?? null
}

/** Create the contact for a network member, or refresh its name/title/company/location when they changed. */
export async function ghostUpsertContact(profile: GhostProfile): Promise<string | null> {
  try {
    if (!UUID.test(profile.id)) return null // catalogue/demo members have no real account
    const p = await completeProfile(profile)
    const { data: found, error } = await supabase.from('crm_people')
      .select('id, full_name, title, company_name, location').eq('member_id', p.id).order('created_at').limit(1).maybeSingle()
    if (error) { warn('contact lookup failed', error.message); return null }
    if (found) {
      const changes: { full_name?: string; title?: string; company_name?: string; location?: string } = {}
      if (p.name && p.name !== found.full_name) changes.full_name = p.name
      if (p.title && p.title !== found.title) changes.title = p.title
      if (p.company && p.company !== found.company_name) changes.company_name = p.company
      if (p.location && p.location !== found.location) changes.location = p.location
      if (Object.keys(changes).length) {
        const u = await supabase.from('crm_people').update({ ...changes, updated_at: new Date().toISOString() }).eq('id', found.id)
        if (u.error) warn('contact refresh failed', u.error.message)
      }
      return found.id
    }
    const { data: created, error: insertError } = await supabase.from('crm_people').insert({
      full_name: p.name || 'Network member', title: p.title, company_name: p.company, location: p.location,
      member_id: p.id, source: 'ghost_sync', lifecycle: 'Other',
    }).select('id').single()
    if (insertError) {
      // A concurrent sync may have created it first; reuse that row.
      const again = await personIdFor(p.id)
      if (!again) warn('contact create failed', insertError.message)
      return again
    }
    return created.id
  } catch (e) { warn('upsert contact', e); return null }
}

function dayBounds(iso: string): { start: string; end: string } {
  const d = new Date(iso)
  const start = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  return { start: new Date(start).toISOString(), end: new Date(start + 86_400_000).toISOString() }
}

/**
 * Log one activity against the member's contact. Skips it when the same kind was already logged for
 * the same thread (or intro) on the same UTC day, so chatty threads don't flood the timeline.
 */
export async function ghostLogActivity(opts: {
  memberUserId: string
  kind: ActivityKind
  subject: string
  detail?: string
  occurredAt?: string
  introRequestId?: string
  threadId?: string
  calendarEventId?: string
}): Promise<void> {
  try {
    const personId = await personIdFor(opts.memberUserId)
    if (!personId) return
    const occurredAt = opts.occurredAt ?? new Date().toISOString()
    const introRequestId = opts.introRequestId && UUID.test(opts.introRequestId) ? opts.introRequestId : null
    const calendarEventId = opts.calendarEventId && UUID.test(opts.calendarEventId) ? opts.calendarEventId : null
    if (opts.threadId || introRequestId) {
      const { start, end } = dayBounds(occurredAt)
      let q = supabase.from('crm_activities').select('id').eq('kind', opts.kind).gte('occurred_at', start).lt('occurred_at', end)
      q = opts.threadId ? q.eq('thread_id', opts.threadId) : q.eq('intro_request_id', introRequestId as string)
      const { data, error } = await q.limit(1)
      if (error) { warn('dedup check failed', error.message); return }
      if (data?.length) return
    }
    const ins = await supabase.from('crm_activities').insert({
      kind: opts.kind, subject: opts.subject, detail: opts.detail ?? '', occurred_at: occurredAt, person_id: personId,
      intro_request_id: introRequestId, thread_id: opts.threadId ?? null, calendar_event_id: calendarEventId,
    })
    if (ins.error) { warn('activity insert failed', ins.error.message); return }
    const touch = await supabase.from('crm_people').update({ last_activity_at: new Date().toISOString() }).eq('id', personId)
    if (touch.error) warn('last activity update failed', touch.error.message)
  } catch (e) { warn('log activity', e) }
}

const nameOf = (p: GhostProfile) => p.name || 'a network member'

export async function ghostSyncIntroAccepted(opts: { theirProfile: GhostProfile; introId: string }): Promise<void> {
  if (!(await ghostUpsertContact(opts.theirProfile))) return
  await ghostLogActivity({
    memberUserId: opts.theirProfile.id, kind: 'intro', introRequestId: opts.introId,
    subject: `Introduction accepted with ${nameOf(opts.theirProfile)}`, detail: 'Logged automatically when the introduction was accepted.',
  })
}

export async function ghostSyncMessage(opts: { theirProfile: GhostProfile; threadId: string }): Promise<void> {
  if (!(await ghostUpsertContact(opts.theirProfile))) return
  await ghostLogActivity({
    memberUserId: opts.theirProfile.id, kind: 'message', threadId: opts.threadId,
    subject: `Messaged ${nameOf(opts.theirProfile)}`, detail: 'Logged automatically (once per conversation per day).',
  })
}

const STAGE_TEXT: Record<string, string> = {
  met: 'Met', next_step: 'Agreed a next step', too_early: 'Too early to tell', no_outcome: 'No outcome', outcome: 'Outcome recorded',
}

export async function ghostSyncOutcome(opts: { theirProfile: GhostProfile; introId: string; stage: string; category?: string }): Promise<void> {
  if (!(await ghostUpsertContact(opts.theirProfile))) return
  const label = STAGE_TEXT[opts.stage] ?? opts.stage.replace(/_/g, ' ')
  await ghostLogActivity({
    memberUserId: opts.theirProfile.id, kind: opts.stage === 'met' ? 'meeting' : 'note', introRequestId: opts.introId,
    subject: `${label}${opts.category ? ` (${opts.category})` : ''} with ${nameOf(opts.theirProfile)}`,
    detail: 'Logged automatically from the introduction outcome.',
  })
}

export async function ghostSyncMeeting(opts: { theirProfile: GhostProfile; eventTitle: string; startAt: string; calendarEventId?: string }): Promise<void> {
  if (!(await ghostUpsertContact(opts.theirProfile))) return
  await ghostLogActivity({
    memberUserId: opts.theirProfile.id, kind: 'meeting', occurredAt: opts.startAt, ...(opts.calendarEventId ? { calendarEventId: opts.calendarEventId } : {}),
    subject: opts.eventTitle || `Meeting with ${nameOf(opts.theirProfile)}`, detail: 'Logged automatically from the calendar.',
  })
}

/** Outcome UIs only know the intro id: resolve the counterparty (the side that is not me) and sync. */
export async function ghostOutcomeRecorded(introId: string, stage: string, category?: string): Promise<void> {
  try {
    const [{ data: auth }, { data: intro, error }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('intro_requests').select('user_id, target_user_id').eq('id', introId).maybeSingle(),
    ])
    const me = auth.user?.id
    if (error || !intro || !me) { if (error) warn('intro lookup failed', error.message); return }
    const theirId = intro.user_id === me ? intro.target_user_id : intro.user_id
    if (!theirId) return
    await ghostSyncOutcome({ theirProfile: { id: theirId, name: '', title: '', company: '', location: '' }, introId, stage, ...(category ? { category } : {}) })
  } catch (e) { warn('outcome', e) }
}
