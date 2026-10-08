import { createServerFn } from '@tanstack/react-start'

import { requireAuthContract } from './auth-gate'
import { gatewayChat, routeLlmChat } from './aiGateway.server'
import { NOTES_SYSTEM_PROMPT, parseNotesAnswer, transcriptForPrompt, type NotesContent } from '@/aetheris/meeting-notes-format'

export interface GenerateMeetingNotesResult { notes: NotesContent | null; error?: string }

/**
 * Summarise a meeting's consented transcript into the caller's own notes. Runs as the
 * signed-in member, so row-level security decides what they can read: only meetings they
 * attended and only lines spoken by people who turned notes on. Notes are saved to the
 * caller's account alone; the private note they wrote is kept.
 */
export const generateMeetingNotes = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .inputValidator((data: { meetingId: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(data?.meetingId ?? '')) throw new Error('Invalid meeting')
    return data
  })
  .handler(async ({ data, context }): Promise<GenerateMeetingNotesResult> => {
    const db = context.supabase
    const { data: meeting } = await db.from('meetings' as never).select('id, title').eq('id', data.meetingId).maybeSingle()
    if (!meeting) return { notes: null, error: 'Meeting not found.' }

    const { data: rows, error } = await db.from('meeting_transcript_lines' as never)
      .select('speaker_id, text, spoken_at').eq('meeting_id', data.meetingId).order('spoken_at', { ascending: true }).limit(3000)
    if (error) return { notes: null, error: error.message }
    const lines = (rows ?? []) as Array<{ speaker_id: string; text: string }>
    if (!lines.length) return { notes: null, error: 'Nobody turned notes on in this meeting, so there is nothing to summarise.' }

    const ids = [...new Set(lines.map(l => l.speaker_id))]
    const { data: people } = await db.from('profiles').select('id, name').in('id', ids)
    const names = new Map((people ?? []).map(p => [p.id, p.name || 'A member']))
    const transcript = transcriptForPrompt(lines.map(l => ({ speaker: names.get(l.speaker_id) ?? 'A member', text: l.text })))

    const routeKey = process.env['ROUTELLM_API_KEY']
    const apiKey = process.env['LOVABLE_API_KEY']
    if (!routeKey && !apiKey) return { notes: null, error: 'AI notes are not configured on this account yet.' }

    let answer: string
    try {
      const request = {
        system: NOTES_SYSTEM_PROMPT,
        messages: [{ role: 'user' as const, content: `Meeting: ${(meeting as { title: string }).title}\n\nTranscript:\n${transcript}` }],
        maxSteps: 1,
      }
      answer = routeKey ? await routeLlmChat(request) : await gatewayChat(request)
    } catch (e) {
      return { notes: null, error: e instanceof Error ? e.message : 'The note taker could not answer just now.' }
    }
    const notes = parseNotesAnswer(answer)

    const { error: saveError } = await db.from('meeting_notes' as never).upsert({
      meeting_id: data.meetingId,
      summary: notes.summary,
      decisions: notes.decisions,
      action_items: notes.actionItems,
      generated_at: new Date().toISOString(),
    } as never, { onConflict: 'meeting_id,owner_id' })
    if (saveError) return { notes, error: `Notes were written but not saved: ${saveError.message}` }
    return { notes }
  })
