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
  participants: Participant[]
  hasNotes: boolean
}

export interface TranscriptLine { id: string; speakerId: string; text: string; spokenAt: string }

export interface SavedNotes extends NotesContent { privateNote: string; generatedAt: string | null }

export async function loadMeetings(): Promise<{ data: Meeting[]; error: string }> {
  const m = await db.from('meetings').select('id, host_id, title, scheduled_for, started_at, ended_at, created_at').order('created_at', { ascending: false }).limit(50)
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

export async function createMeeting(title: string, invitees: string[], scheduledFor: string | null): Promise<{ id: string | null; error: string }> {
  const r = await db.rpc('create_meeting', { p_title: title, p_invitees: invitees, p_scheduled_for: scheduledFor })
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
