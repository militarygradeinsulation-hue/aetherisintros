import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import type { Meeting } from './meetings'

const bucket = () => supabase.storage.from('meeting-audio')

export async function saveMeetingAudio(meetingId: string, userId: string, blob: Blob, mimeType: string) {
  const ext = mimeType.startsWith('audio/mp4') ? 'mp4' : mimeType.startsWith('audio/ogg') ? 'ogg' : 'webm'
  const path = meetingId + '/' + userId + '/' + Date.now() + '_' + crypto.randomUUID() + '.' + ext
  const r = await bucket().upload(path, blob, { contentType: mimeType.split(';')[0]!, upsert: false })
  if (r.error) throw new Error('Audio could not be saved: ' + r.error.message)
  return path
}

interface AudioClip { path: string; name: string }

/** Audio is a private, member-scoped archive of consented microphone clips, never video. */
export function MeetingAudio({ meeting }: { meeting: Meeting }) {
  const [clips, setClips] = useState<AudioClip[]>([])
  const [msg, setMsg] = useState('')
  const [playing, setPlaying] = useState('')
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    let stale = false
    setLoading(true)
    setMsg('')
    setClips([])
    void (async () => {
      const all: AudioClip[] = []
      try {
        for (const p of meeting.participants) {
          let offset = 0
          for (;;) {
            const r = await bucket().list(meeting.id + '/' + p.userId, {
              limit: 100, offset, sortBy: { column: 'name', order: 'asc' },
            })
            if (r.error) throw r.error
            for (const f of r.data ?? []) {
              const stamp = Number(f.name.split('_')[0])
              const time = Number.isFinite(stamp) && stamp > 0
                ? new Date(stamp).toLocaleString(undefined, {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})
                : 'Recording clip'
              all.push({ path: meeting.id + '/' + p.userId + '/' + f.name, name: p.name + ' · ' + time })
            }
            if ((r.data?.length ?? 0) < 100) break
            offset += 100
            if (offset >= 3000) break
          }
        }
        if (!stale) setClips(all.sort((a,b) => a.path.localeCompare(b.path)))
      } catch (error) {
        if (!stale) setMsg(error instanceof Error ? 'Audio could not be loaded: ' + error.message : 'Audio could not be loaded.')
      } finally {
        if (!stale) setLoading(false)
      }
    })()
    return () => { stale = true }
  }, [meeting.id, meeting.participants, revision])

  const play = async (path: string) => {
    setMsg('')
    const r = await bucket().createSignedUrl(path, 60)
    if (r.error) setMsg('Could not play the saved clip: ' + r.error.message)
    else setPlaying(r.data.signedUrl)
  }

  return <details className="meeting-saved-audio" open>
    <summary>Saved microphone recordings ({clips.length.toLocaleString()} clips)</summary>
    <p>Only consenting speakers’ microphone clips are stored. Video is not stored.</p>
    <button type="button" className="meeting-focus-back" disabled={loading}
      onClick={() => setRevision(n => n + 1)}>Refresh recordings</button>
    {playing && <audio src={playing} controls autoPlay playsInline aria-label="Playing a saved meeting recording" />}
    {loading ? <p role="status">Loading saved recordings…</p>
      : clips.length ? <div className="meeting-audio-list">
        {clips.map((clip, i) => <button type="button" key={clip.path}
          onClick={() => void play(clip.path)}>{i + 1}. Play {clip.name}</button>)}
      </div> : <p>No saved microphone clips were found for this meeting. Recording must be enabled and each speaker must consent.</p>}
    {msg && <p role="alert">{msg}</p>}
  </details>
}
