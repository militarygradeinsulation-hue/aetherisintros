import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

const BUCKET = 'meeting-backgrounds'
const KEY = 'ai.meeting.background'
type Bg = { path: string; url: string }

/** Uploads and saves the member's own meeting room backgrounds (private, per account). */
export function useMeetingBackground(userId: string) {
  const [items, setItems] = useState<Bg[]>([])
  const [active, setActiveState] = useState<string>('')
  const load = async () => {
    const { data } = await supabase.storage.from(BUCKET).list(userId, { limit: 50, sortBy: { column: 'created_at', order: 'desc' } })
    const paths = (data ?? []).filter(f => f.name && !f.name.startsWith('.')).map(f => `${userId}/${f.name}`)
    if (!paths.length) { setItems([]); return }
    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600)
    setItems((signed ?? []).filter(s => s.signedUrl).map(s => ({ path: s.path!, url: s.signedUrl })))
  }
  useEffect(() => { setActiveState(localStorage.getItem(`${KEY}.${userId}`) ?? ''); void load() }, [userId])
  const setActive = (p: string) => { setActiveState(p); localStorage.setItem(`${KEY}.${userId}`, p) }
  return { items, active, setActive, activeUrl: items.find(i => i.path === active)?.url ?? '', reload: load }
}

export function MeetingBackgroundPicker({ userId, bg }: { userId: string; bg: ReturnType<typeof useMeetingBackground> }) {
  const input = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const upload = async (file: File) => {
    if (!file.type.startsWith('image/')) { setMsg('Choose an image file.'); return }
    if (file.size > 10 * 1024 * 1024) { setMsg('Images must be under 10 MB.'); return }
    setBusy(true); setMsg('')
    const path = `${userId}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type })
    setBusy(false)
    if (error) { setMsg('Upload failed. Please try again.'); return }
    await bg.reload(); bg.setActive(path); setMsg('Background saved.')
  }
  const remove = async (path: string) => {
    await supabase.storage.from(BUCKET).remove([path])
    if (bg.active === path) bg.setActive('')
    await bg.reload()
  }
  return <details className="meeting-bg">
    <summary>Room background</summary>
    <div className="meeting-bg-grid">
      <button type="button" className="meeting-bg-swatch none" aria-pressed={!bg.active} onClick={() => bg.setActive('')}>None</button>
      {bg.items.map(i => <div key={i.path} className="meeting-bg-item">
        <button type="button" className="meeting-bg-swatch" aria-pressed={bg.active === i.path} aria-label="Use this background" style={{ backgroundImage: `url("${i.url}")` }} onClick={() => bg.setActive(i.path)} />
        <button type="button" className="meeting-bg-del" aria-label="Delete background" onClick={() => void remove(i.path)}><Trash2 size={12} /></button>
      </div>)}
      <button type="button" className="meeting-bg-swatch add" disabled={busy} onClick={() => input.current?.click()}><ImagePlus size={16} /> {busy ? 'Uploading…' : 'Upload'}</button>
    </div>
    <input ref={input} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void upload(f) }} />
    {msg && <p className="og-note" role="status">{msg}</p>}
  </details>
}
