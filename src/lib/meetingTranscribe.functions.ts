import { createServerFn } from '@tanstack/react-start'

import { requireAuthContract } from './auth-gate'
import { cleanTranscript } from '@/aetheris/meeting-recorder'

/**
 * Transcribes one short clip of the caller's own microphone during a recorded meeting and
 * saves it as their transcript line. Runs as the signed-in member, so the database decides:
 * a line is only stored for a participant who agreed to be transcribed, in an open meeting
 * (drizzle/migrations/0031 and 0039). The audio itself is never stored.
 *
 * Uses the Lovable AI gateway's speech-to-text (openai/gpt-4o-transcribe).
 */
const MAX_AUDIO_BYTES = 4 * 1024 * 1024
const TYPES: Record<string, string> = { 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'mp4', 'audio/mpeg': 'mp3', 'audio/wav': 'wav' }

export interface TranscribeResult { text: string; error?: 'not_configured' | 'not_recording' | 'failed' | string }

export const transcribeMeetingAudio = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .inputValidator((data: { meetingId: string; audio: string; mimeType: string; names?: string[] }) => {
    if (!/^[0-9a-f-]{36}$/i.test(data?.meetingId ?? '')) throw new Error('Invalid meeting')
    const base = (data.mimeType ?? '').split(';')[0]!.trim().toLowerCase()
    if (!TYPES[base]) throw new Error('Unsupported audio format')
    if (typeof data.audio !== 'string' || !data.audio || data.audio.length > (MAX_AUDIO_BYTES * 4) / 3 + 8) throw new Error('Audio clip too large')
    const names = Array.isArray(data.names) ? data.names.filter(n => typeof n === 'string').map(n => n.slice(0, 60)).slice(0, 4) : []
    return { meetingId: data.meetingId, audio: data.audio, mimeType: base, names }
  })
  .handler(async ({ data, context }): Promise<TranscribeResult> => {
    const db = context.supabase
    const apiKey = process.env['LOVABLE_API_KEY']
    if (!apiKey) return { text: '', error: 'not_configured' }

    // Only spend on transcription for someone the database would let speak.
    const [{ data: me }, { data: meeting }] = await Promise.all([
      db.from('meeting_participants' as never).select('notes_consent').eq('meeting_id', data.meetingId).eq('user_id', context.userId).maybeSingle(),
      db.from('meetings' as never).select('ended_at').eq('id', data.meetingId).maybeSingle(),
    ])
    if (!meeting || (meeting as { ended_at: string | null }).ended_at || !(me as { notes_consent?: boolean } | null)?.notes_consent) {
      return { text: '', error: 'not_recording' }
    }

    const bytes = Uint8Array.from(atob(data.audio), c => c.charCodeAt(0))
    const form = new FormData()
    form.append('file', new Blob([bytes], { type: data.mimeType }), `clip.${TYPES[data.mimeType]}`)
    form.append('model', 'openai/gpt-4o-transcribe')
    form.append('response_format', 'json')
    if (data.names.length) form.append('prompt', `A business video call between ${data.names.join(', ')}.`)

    let text = ''
    try {
      const res = await fetch('https://ai.gateway.lovable.dev/v1/audio/transcriptions', {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'Lovable-API-Key': apiKey, 'X-Lovable-AIG-SDK': 'fetch' },
        body: form,
        signal: AbortSignal.timeout(30_000),
      })
      if (!res.ok) {
        console.error('meeting transcription failed', res.status, (await res.text()).slice(0, 300))
        return { text: '', error: 'failed' }
      }
      const body = (await res.json()) as { text?: string }
      text = cleanTranscript(body.text ?? '')
    } catch (error) {
      console.error('meeting transcription failed', error)
      return { text: '', error: 'failed' }
    }
    if (!text) return { text: '' }

    const { error } = await db.from('meeting_transcript_lines' as never).insert({ meeting_id: data.meetingId, text: text.slice(0, 2000) } as never)
    if (error) return { text: '', error: error.message }
    return { text }
  })
