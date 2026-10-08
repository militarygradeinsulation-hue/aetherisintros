/**
 * Meetings data for the signed-in member. Every read is row-level-secured to meetings they
 * attend; every change goes through the guarded functions in drizzle/migrations/0031.
 */
import { supabase } from '@/integrations/supabase/client'
import { notesFromRow, type NotesContent } from './meeting-notes-format'

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any

export interface Participant { userId: string; name: string; role: 'host' | 'guest'; notesConsent: boolean; joinedAt: string | null }

export interface Meeting {
  id: string
  hostId: string
  title: string
  scheduledFor: string | null
  startedAt: string | null
  endedAt: string | null
  createdAt: string
  agenda: string
  introRequestId: string | null
  participants: Participant[]
  hasNotes: boolean
}

export interface TranscriptLine { id: string; speakerId: string; text: string; spokenAt: string }

export interface SavedNotes extends NotesContent { privateNote: string; generatedAt: string | null }

export async function loadMeetings(): Promise<{ data: Meeting[]; error: string }> {
  const m = await db.from('meetings').select('id, host_id, title, scheduled_for, started_at, ended_at, created_at, agenda, intro_request_id').order('created_at', { ascending: false }).limit(50)
  if (m.error) return { data: [], error: m.error.message }
  const rows = (m.data ?? []) as any[]
  const ids = rows.map(r => r.id)
  if (!ids.length) return { data: [], error: '' }
  const [parts, notes] = await Promise.all([
    db.from('meeting_participants').select('meeting_id, user_id, role, notes_consent, joined_at').in('meeting_id', ids),
    db.from('meeting_notes').select('meeting_id').in('meeting_id', ids),
  ])
  const userIds = [...new Set(((parts.data ?? []) as any[]).map(p => p.user_id))]
  const names = new Map<string, string>()
  if (userIds.length) {
    const p = await db.from('profiles').select('id, name').in('id', userIds)
    for (const row of p.data ?? []) names.set(row.id, row.name || 'A member')
  }
  const withNotes = new Set(((notes.data ?? []) as any[]).map(n => n.meeting_id))
  return {
    data: rows.map(r => ({
      id: r.id, hostId: r.host_id, title: r.title, scheduledFor: r.scheduled_for, startedAt: r.started_at, endedAt: r.ended_at, createdAt: r.created_at,
      agenda: r.agenda ?? '', introRequestId: r.intro_request_id ?? null,
      hasNotes: withNotes.has(r.id),
      participants: ((parts.data ?? []) as any[]).filter(p => p.meeting_id === r.id)
        .map(p => ({ userId: p.user_id, name: names.get(p.user_id) ?? 'A member', role: p.role, notesConsent: p.notes_consent, joinedAt: p.joined_at }))
        .sort((a, b) => (a.role === b.role ? a.name.localeCompare(b.name) : a.role === 'host' ? -1 : 1)),
    })),
    error: parts.error?.message ?? '',
  }
}

export async function loadRoster(meetingId: string): Promise<Pick<Participant, 'userId' | 'notesConsent'>[]> {
  const r = await db.from('meeting_participants').select('user_id, notes_consent').eq('meeting_id', meetingId)
  return ((r.data ?? []) as any[]).map(p => ({ userId: p.user_id, notesConsent: p.notes_consent }))
}

export interface RoomState {
  roster: Pick<Participant, 'userId' | 'name' | 'notesConsent'>[]
  recordingSince: string | null
  recordingBy: string | null
  endedAt: string | null
}

/** Who is in the meeting, who has notes on, and whether it is being recorded. Polled while in the room. */
export async function loadRoomState(meetingId: string): Promise<RoomState | null> {
  const [m, r] = await Promise.all([
    db.from('meetings').select('recording_started_at, recording_started_by, ended_at').eq('id', meetingId).maybeSingle(),
    db.from('meeting_participants').select('user_id, notes_consent').eq('meeting_id', meetingId),
  ])
  if (m.error && r.error) return null
  const rows = (r.data ?? []) as any[]
  const names = new Map<string, string>()
  if (rows.length) {
    const p = await db.from('profiles').select('id, name').in('id', rows.map(x => x.user_id))
    for (const row of p.data ?? []) names.set(row.id, row.name || 'A member')
  }
  return {
    roster: rows.map(x => ({ userId: x.user_id, name: names.get(x.user_id) ?? 'A member', notesConsent: x.notes_consent })),
    // Before migration 0039 these columns do not exist: treat as not recording.
    recordingSince: m.error ? null : m.data?.recording_started_at ?? null,
    recordingBy: m.error ? null : m.data?.recording_started_by ?? null,
    endedAt: m.data?.ended_at ?? null,
  }
}

/** Start or stop recording for the meeting. Starting also turns your own notes on. */
export async function setMeetingRecording(meetingId: string, on: boolean): Promise<string> {
  const r = await db.rpc('set_meeting_recording', { p_meeting: meetingId, p_on: on })
  return r.error?.message ?? ''
}

/** The host adds a member to the meeting; they are notified and can join straight away. */
export async function inviteToMeeting(meetingId: string, userId: string): Promise<string> {
  const r = await db.rpc('invite_to_meeting', { p_meeting: meetingId, p_user: userId })
  return r.error?.message ?? ''
}

export async function createMeeting(title: string, invitees: string[], scheduledFor: string | null, extra: { agenda?: string; introId?: string | null } = {}): Promise<{ id: string | null; error: string }> {
  const r = await db.rpc('create_meeting', { p_title: title, p_invitees: invitees, p_scheduled_for: scheduledFor, p_agenda: extra.agenda ?? '', p_intro: extra.introId ?? null })
  return { id: (r.data as string | null) ?? null, error: r.error?.message ?? '' }
}

export async function setNotesConsent(meetingId: string, on: boolean): Promise<string> {
  const r = await db.rpc('set_meeting_notes_consent', { p_meeting: meetingId, p_on: on })
  return r.error?.message ?? ''
}

export async function markJoined(meetingId: string): Promise<void> {
  await db.rpc('mark_meeting_joined', { p_meeting: meetingId })
}

export async function endMeeting(meetingId: string): Promise<string> {
  const r = await db.rpc('end_meeting', { p_meeting: meetingId })
  return r.error?.message ?? ''
}

export async function loadTranscript(meetingId: string): Promise<TranscriptLine[]> {
  const r = await db.from('meeting_transcript_lines').select('id, speaker_id, text, spoken_at').eq('meeting_id', meetingId).order('spoken_at', { ascending: true }).limit(3000)
  return ((r.data ?? []) as any[]).map(l => ({ id: l.id, speakerId: l.speaker_id, text: l.text, spokenAt: l.spoken_at }))
}

/** Save one finished phrase of your own speech. Refused by the database unless your notes are on. */
export async function addTranscriptLine(meetingId: string, text: string): Promise<string> {
  const r = await db.from('meeting_transcript_lines').insert({ meeting_id: meetingId, text: text.slice(0, 2000) })
  return r.error?.message ?? ''
}

export async function loadMyNotes(meetingId: string): Promise<SavedNotes | null> {
  const r = await db.from('meeting_notes').select('summary, decisions, action_items, private_note, generated_at').eq('meeting_id', meetingId).maybeSingle()
  if (!r.data) return null
  return { ...notesFromRow(r.data), privateNote: r.data.private_note ?? '', generatedAt: r.data.generated_at }
}

export async function savePrivateNote(meetingId: string, privateNote: string): Promise<string> {
  const existing = await db.from('meeting_notes').select('id').eq('meeting_id', meetingId).maybeSingle()
  const r = existing.data
    ? await db.from('meeting_notes').update({ private_note: privateNote.slice(0, 4000) }).eq('id', existing.data.id)
    : await db.from('meeting_notes').insert({ meeting_id: meetingId, private_note: privateNote.slice(0, 4000) })
  return r.error?.message ?? ''
}

/* ── Meetings feed the rest of the system ───────────────────────────────────────────── */

const PENDING_ROOM = 'aetheris:open-meeting'

/** Remember a meeting to open when the Meetings page next loads (e.g. after "Meet now"). */
export function queueMeetingToOpen(id: string) {
  try { sessionStorage.setItem(PENDING_ROOM, id) } catch { /* storage blocked: the list still shows it */ }
}

export function takeQueuedMeeting(): string | null {
  try { const id = sessionStorage.getItem(PENDING_ROOM); sessionStorage.removeItem(PENDING_ROOM); return id } catch { return null }
}

/** Agenda for a meeting started from an introduction, from its context capsule. */
export function agendaFromCapsule(c: { whyExists?: string; whyNow?: string; firstGoal?: string }): string {
  return [
    c.whyExists?.trim() && `Why this introduction: ${c.whyExists.trim()}`,
    c.whyNow?.trim() && `Why now: ${c.whyNow.trim()}`,
    c.firstGoal?.trim() && `First goal: ${c.firstGoal.trim()}`,
  ].filter(Boolean).join('\n')
}

export async function startIntroMeeting(introId: string, title: string, agenda: string): Promise<{ id: string | null; error: string }> {
  return createMeeting(title, [], null, { agenda, introId })
}

/** A due date the model gave as an ISO date, or null for "Friday", "soon" and the like. */
export function parseDue(due: string): string | null {
  const t = due.trim()
  if (!/^\d{4}-\d{2}-\d{2}/.test(t)) return null
  const d = new Date(t)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

/** Is this action item mine? Owner names are free text from the transcript. */
export function ownedBy(owner: string, myName: string): boolean {
  const o = owner.trim().toLowerCase()
  if (!o) return true
  if (['me', 'you', 'i'].includes(o)) return true
  const first = myName.trim().toLowerCase().split(/\s+/)[0] ?? ''
  return !!first && (o === myName.trim().toLowerCase() || o.split(/\s+/)[0] === first)
}

/** Add action items to the CRM: mine as tasks, other people's as commitments I am waiting on. */
export async function addActionItemsToTasks(items: Array<{ task: string; owner: string; due: string }>, meetingTitle: string, myId: string, myName: string): Promise<{ added: number; error: string }> {
  const rows = items.map(i => {
    const mine = ownedBy(i.owner, myName)
    return {
      owner_id: myId,
      title: i.task.slice(0, 200),
      detail: [`From the meeting “${meetingTitle}”.`, i.owner && !mine ? `Owner: ${i.owner}.` : '', i.due ? `Due: ${i.due}.` : ''].filter(Boolean).join(' ').slice(0, 1000),
      due_at: parseDue(i.due),
      kind: mine ? 'task' : 'commitment',
      waiting_on: mine ? 'me' : 'them',
      owed_to: mine ? '' : i.owner.slice(0, 120),
    }
  })
  if (!rows.length) return { added: 0, error: '' }
  const r = await db.from('crm_tasks').insert(rows)
  return { added: r.error ? 0 : rows.length, error: r.error?.message ?? '' }
}

/** Save agreed decisions to the member's decision log. */
export async function saveDecisionsToLog(decisions: string[], meetingTitle: string): Promise<{ added: number; error: string }> {
  const rows = decisions.map(d => ({ title: d.slice(0, 300), status: 'decided', context: `Agreed in the meeting “${meetingTitle}”.`, decided_at: new Date().toISOString() }))
  if (!rows.length) return { added: 0, error: '' }
  const r = await db.from('decisions').insert(rows)
  return { added: r.error ? 0 : rows.length, error: r.error?.message ?? '' }
}

/** Open meetings the member is in, with whether they have joined, for reminders. */
export async function loadReminderMeetings(myId: string): Promise<import('./meeting-reminders').ReminderMeeting[]> {
  const m = await db.from('meetings').select('id, title, host_id, scheduled_for, started_at, ended_at').is('ended_at', null).order('created_at', { ascending: false }).limit(30)
  const rows = (m.data ?? []) as any[]
  if (!rows.length) return []
  const mine = await db.from('meeting_participants').select('meeting_id, joined_at').eq('user_id', myId).in('meeting_id', rows.map(r => r.id))
  const joined = new Map(((mine.data ?? []) as any[]).map(p => [p.meeting_id, p.joined_at]))
  return rows.map(r => ({ id: r.id, title: r.title, hostId: r.host_id, scheduledFor: r.scheduled_for, startedAt: r.started_at, endedAt: r.ended_at, myJoinedAt: joined.get(r.id) ?? null }))
}
