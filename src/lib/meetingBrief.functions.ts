import { createServerFn } from '@tanstack/react-start'
import { requireAuthContract } from './auth-gate'
import { gatewayChat } from './aiGateway.server'

// A personal brief differs from the live meeting-scoped "meeting_briefs" table.
// Save it to owner-only "meeting_personal_briefs" instead of writing missing columns.
const PROMPT = `You are a meeting prep specialist. Return ONLY valid JSON, no markdown:
{"their_background":"<2 sentences>","their_current_focus":"<1-2 sentences>","open_needs":[{"need":"...","how_you_can_help":"..."}],"talking_points":[{"point":"...","why_relevant":"..."}],"summary":"<paragraph>"}`

type BriefRequest = { meetingId?: string | undefined; otherUserId: string }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const validate = (data: BriefRequest): BriefRequest => {
  if ((!!data?.meetingId && !UUID.test(data.meetingId)) || !UUID.test(data?.otherUserId ?? ''))
    throw new Error('Invalid meeting or attendee.')
  return data
}
const field = (value: unknown, length: number): string =>
  typeof value === 'string' ? value.trim().slice(0, length) : ''
const openNeeds = (value: unknown) =>
  Array.isArray(value) ? value.slice(0, 15).map(item => ({
    need: field(item?.need, 400), how_you_can_help: field(item?.how_you_can_help, 500),
  })).filter(item => item.need) : []
const talkingPoints = (value: unknown) =>
  Array.isArray(value) ? value.slice(0, 15).map(item => ({
    point: field(item?.point, 400), why_relevant: field(item?.why_relevant, 500),
  })).filter(item => item.point) : []

export const generateMeetingBrief = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .validator(validate)
  .handler(async ({ data, context }) => {
    const userId = context.userId
    const db = context.supabase as any
    // A genuine meeting uses roster authorization; a direct-message preview does not
    // persist a meeting-specific record.
    if (data.meetingId) {
      const [meeting, roster] = await Promise.all([
        db.from('meetings').select('id').eq('id', data.meetingId).maybeSingle(),
        db.from('meeting_participants').select('user_id')
          .eq('meeting_id', data.meetingId).in('user_id', [userId, data.otherUserId]),
      ])
      if (meeting.error || !meeting.data || roster.error ||
        !(roster.data ?? []).some((row: { user_id: string }) => row.user_id === userId) ||
        !(roster.data ?? []).some((row: { user_id: string }) => row.user_id === data.otherUserId)) {
        throw new Error('This attendee is not available in your meeting.')
      }
    }
    const [myRes, theirRes] = await Promise.all([
      db.from('profiles').select('name,title,company,focus,can_help_with').eq('id', userId).single(),
      db.from('profiles').select('name,title,company,focus,looking_for,can_help_with,industries,expertise')
        .eq('id', data.otherUserId).single(),
    ])
    const me = myRes.data, them = theirRes.data
    if (!them) throw new Error('Attendee profile could not be loaded.')
    const prompt = [
      `Preparing ${me?.name ?? 'a member'} to meet ${them.name ?? 'an attendee'}.`,
      `Their role and business: ${them.title ?? ''} at ${them.company ?? ''}.`,
      `Their focus: ${them.focus ?? ''}`,
      `Looking for: ${them.looking_for ?? ''}`,
      `Can help with: ${them.can_help_with ?? ''}`,
      `Your focus: ${me?.focus ?? ''}`,
      `You can help with: ${me?.can_help_with ?? ''}`,
    ].join('\n')
    const answer = await gatewayChat({
      system: PROMPT, messages: [{ role: 'user', content: prompt }], maxSteps: 1,
    })
    let parsed: Record<string, unknown>
    try {
      const text = answer.replace(/^```(?:json)?/i, '').replace(/```\s*$/, '').trim()
      parsed = JSON.parse(text) as Record<string, unknown>
    } catch { parsed = { summary: answer } }
    if (!data.meetingId) {
      // Direct-message briefs cannot be associated with an invented meeting.
      return {
        id: '', meeting_id: null, user_id: userId, other_user_id: data.otherUserId,
        their_background: field(parsed['their_background'],4000),
        their_current_focus: field(parsed['their_current_focus'],2000),
        open_needs: openNeeds(parsed['open_needs']),
        talking_points: talkingPoints(parsed['talking_points']),
        summary: field(parsed['summary'],6000),
        generated_at: new Date().toISOString(), ephemeral: true,
      }
    }
    const { data: row, error } = await db.from('meeting_personal_briefs')
      .upsert({
        user_id: userId,
        meeting_id: data.meetingId,
        other_user_id: data.otherUserId,
        their_background: field(parsed['their_background'], 4000),
        their_current_focus: field(parsed['their_current_focus'], 2000),
        open_needs: openNeeds(parsed['open_needs']),
        talking_points: talkingPoints(parsed['talking_points']),
        summary: field(parsed['summary'], 6000),
        generated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,meeting_id,other_user_id' })
      .select().single()
    if (error) throw new Error('Your pre-meeting brief could not be saved: ' + error.message)
    return row
  })

export const getLatestBrief = createServerFn({ method: 'GET' })
  .middleware([requireAuthContract])
  .validator(validate)
  .handler(async ({ data, context }) => {
    if (!data.meetingId) return null
    const { data: row, error } = await (context.supabase as any)
      .from('meeting_personal_briefs').select('*')
      .eq('user_id', context.userId)
      .eq('meeting_id', data.meetingId)
      .eq('other_user_id', data.otherUserId)
      .maybeSingle()
    if (error) throw new Error('Your saved pre-meeting brief could not be loaded.')
    return row
  })
