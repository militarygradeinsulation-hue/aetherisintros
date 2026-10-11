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
      member_id: p.id, source: 'ghost_sync',
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
 * Returns true when the activity was actually inserted, false when deduped or on any error.
 * Callers use the return value to decide whether to run downstream work (e.g. lifecycle advance).
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
}): Promise<boolean> {
  try {
    const personId = await personIdFor(opts.memberUserId)
    if (!personId) return false
    const occurredAt = opts.occurredAt ?? new Date().toISOString()
    const introRequestId = opts.introRequestId && UUID.test(opts.introRequestId) ? opts.introRequestId : null
    const calendarEventId = opts.calendarEventId && UUID.test(opts.calendarEventId) ? opts.calendarEventId : null
    if (opts.threadId || introRequestId) {
      const { start, end } = dayBounds(occurredAt)
      let q = supabase.from('crm_activities').select('id').eq('kind', opts.kind).gte('occurred_at', start).lt('occurred_at', end)
      q = opts.threadId ? q.eq('thread_id', opts.threadId) : q.eq('intro_request_id', introRequestId as string)
      const { data, error } = await q.limit(1)
      if (error) { warn('dedup check failed', error.message); return false }
      if (data?.length) return false // already logged today — skip
    }
    const ins = await supabase.from('crm_activities').insert({
      kind: opts.kind, subject: opts.subject, detail: opts.detail ?? '', occurred_at: occurredAt, person_id: personId,
      intro_request_id: introRequestId, thread_id: opts.threadId ?? null, calendar_event_id: calendarEventId,
    })
    if (ins.error) { warn('activity insert failed', ins.error.message); return false }
    const touch = await supabase.from('crm_people').update({ last_activity_at: new Date().toISOString() }).eq('id', personId)
    if (touch.error) warn('last activity update failed', touch.error.message)
    return true
  } catch (e) { warn('log activity', e); return false }
}

const nameOf = (p: GhostProfile) => p.name || 'a network member'

/**
 * After a key social event (accepted intro, calendar meeting), try to advance the contact's
 * lifecycle stage. Lead → Prospect after any intro; Prospect → Partner after 2+ meetings.
 * Ghost-created contacts start as 'Lead' (DB default), so this progression fires naturally.
 */
async function ghostMaybeAdvanceLifecycle(personId: string): Promise<void> {
  try {
    const { data, error } = await supabase.from('crm_people').select('lifecycle').eq('id', personId).maybeSingle()
    if (error || !data) return
    const current = data.lifecycle as string
    let next: string | null = null
    if (current === 'Lead') {
      next = 'Prospect'
    } else if (current === 'Prospect') {
      const { count: meetingCount, error: cErr } = await supabase.from('crm_activities')
        .select('id', { count: 'exact', head: true }).eq('person_id', personId).eq('kind', 'meeting')
      if (!cErr && (meetingCount ?? 0) >= 2) next = 'Partner'
    }
    if (!next) return
    const u = await supabase.from('crm_people').update({ lifecycle: next, updated_at: new Date().toISOString() }).eq('id', personId)
    if (u.error) warn('lifecycle advance failed', u.error.message)
  } catch (e) { warn('advance lifecycle', e) }
}

export async function ghostSyncIntroAccepted(opts: { theirProfile: GhostProfile; introId: string }): Promise<void> {
  const personId = await ghostUpsertContact(opts.theirProfile)
  if (!personId) return
  await ghostLogActivity({
    memberUserId: opts.theirProfile.id, kind: 'intro', introRequestId: opts.introId,
    subject: `Introduction accepted with ${nameOf(opts.theirProfile)}`, detail: 'Logged automatically when the introduction was accepted.',
  })
  await ghostMaybeAdvanceLifecycle(personId)
}

export async function ghostSyncMessage(opts: { theirProfile: GhostProfile; threadId: string }): Promise<void> {
  const personId = await ghostUpsertContact(opts.theirProfile)
  if (!personId) return
  const logged = await ghostLogActivity({
    memberUserId: opts.theirProfile.id, kind: 'message', threadId: opts.threadId,
    subject: `Messaged ${nameOf(opts.theirProfile)}`, detail: 'Logged automatically (once per conversation per day).',
  })
  // Only advance lifecycle when a fresh activity was logged — not on dedup (already ran today).
  if (logged) await ghostMaybeAdvanceLifecycle(personId)
}

const STAGE_TEXT: Record<string, string> = {
  met: 'Met', next_step: 'Agreed a next step', too_early: 'Too early to tell', no_outcome: 'No outcome', outcome: 'Outcome recorded',
}

/**
 * A deal or partnership outcome opens a CRM opportunity once per introduction.
 * Uses the intro_request_id column on crm_opportunities (added by migration
 * 20261011100000_crm_opportunity_intro_id.sql) for a precise, indexed dedup
 * rather than a fragile text search.
 */
async function maybeAutoOpportunity(theirProfile: GhostProfile, introId: string, category: string, personId: string): Promise<void> {
  try {
    if (category !== 'deal' && category !== 'partnership') return
    if (!UUID.test(introId)) return
    // Precise dedup on the dedicated FK column — no text scan needed.
    // Cast to `any` because the generated types predate the intro_request_id migration.
    const opps = supabase.from('crm_opportunities') as any
    const { data: existing, error } = await opps.select('id').eq('intro_request_id', introId).limit(1)
    if (error) { warn('opportunity lookup failed', error.message); return }
    if (existing?.length) return
    const label = category === 'deal' ? 'Deal' : 'Partnership'
    const ins = await opps.insert({
      name: `${nameOf(theirProfile)} — ${label} opportunity`, person_id: personId, status: 'open', probability: 50, amount: 0,
      source: 'ghost_sync', intro_request_id: introId,
      detail: `Auto-created from introduction outcome (${category}).`,
    })
    if (ins.error) { warn('opportunity create failed', ins.error.message); return }
    // Notify the user so the auto-created opportunity surfaces in the bell.
    const { data: authData } = await supabase.auth.getUser()
    const uid = authData?.user?.id
    if (uid) {
      const notif = await supabase.from('notifications').insert({
        user_id: uid, kind: 'crm_opportunity', link: '/crm',
        text: `${label} opportunity created from your introduction with ${nameOf(theirProfile)}.`,
      })
      if (notif.error) warn('opportunity notification failed', notif.error.message)
    }
  } catch (e) { warn('auto opportunity', e) }
}

export async function ghostSyncOutcome(opts: { theirProfile: GhostProfile; introId: string; stage: string; category?: string }): Promise<void> {
  const personId = await ghostUpsertContact(opts.theirProfile)
  if (!personId) return
  const label = STAGE_TEXT[opts.stage] ?? opts.stage.replace(/_/g, ' ')
  const logged = await ghostLogActivity({
    memberUserId: opts.theirProfile.id, kind: opts.stage === 'met' ? 'meeting' : 'note', introRequestId: opts.introId,
    subject: `${label}${opts.category ? ` (${opts.category})` : ''} with ${nameOf(opts.theirProfile)}`,
    detail: 'Logged automatically from the introduction outcome.',
  })
  if (opts.stage === 'outcome' && opts.category) await maybeAutoOpportunity(opts.theirProfile, opts.introId, opts.category, personId)
  // Only advance lifecycle when the activity was freshly written (not a repeated submit).
  if (logged) await ghostMaybeAdvanceLifecycle(personId)
}

export async function ghostSyncMeeting(opts: { theirProfile: GhostProfile; eventTitle: string; startAt: string; calendarEventId?: string }): Promise<void> {
  const personId = await ghostUpsertContact(opts.theirProfile)
  if (!personId) return
  await ghostLogActivity({
    memberUserId: opts.theirProfile.id, kind: 'meeting', occurredAt: opts.startAt, ...(opts.calendarEventId ? { calendarEventId: opts.calendarEventId } : {}),
    subject: opts.eventTitle || `Meeting with ${nameOf(opts.theirProfile)}`, detail: 'Logged automatically from the calendar.',
  })
  await ghostMaybeAdvanceLifecycle(personId)
}

/**
 * Outcome UIs only know the intro id: resolve the counterparty (the side that is not me),
 * fetch their full profile so the CRM contact gets a real name, then sync.
 */
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
    // Resolve the counterparty's public profile so the ghost contact carries a real name and role.
    // completeProfile fills any blank fields from the profiles table; falls back to empty strings on error.
    const theirProfile = await completeProfile({ id: theirId, name: '', title: '', company: '', location: '' })
    await ghostSyncOutcome({ theirProfile, introId, stage, ...(category ? { category } : {}) })
  } catch (e) { warn('outcome', e) }
}
