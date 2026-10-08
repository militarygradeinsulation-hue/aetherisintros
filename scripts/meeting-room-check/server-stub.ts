/** Stand-ins for the app's server functions: transcription returns a numbered line per clip. */
import { me, supabase } from './db-stub'

let n = 0
export const getIceServers = async () => ({ iceServers: [], relay: false })
export const generateMeetingNotes = async () => ({ notes: null })
export const transcribeMeetingAudio = async ({ data }: { data: { meetingId: string; audio: string; mimeType: string } }) => {
  const consent = (await supabase.from('meeting_participants').eq('meeting_id', data.meetingId).eq('user_id', me()).maybeSingle()).data as { notes_consent?: boolean } | null
  if (!consent?.notes_consent) return { text: '', error: 'not_recording' }
  const text = `${me()} line ${++n} (${Math.round((data.audio.length * 3) / 4 / 1024)} KB ${data.mimeType.split(';')[0]})`
  await supabase.from('meeting_transcript_lines').insert({ meeting_id: data.meetingId, text })
  return { text }
}
export const speakWithIntrosVoice = async () => ({ audio: null })
