/**
 * Quick note: a small card that opens where the member right-clicked (or when they say
 * "take a note…"). Type or dictate, then save. Notes are private and land in Memory
 * (public.memories, kind 'note', source 'Quick note'). In the showcase they stay on the device.
 */
import { Check, Mic, MicOff, NotebookPen, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { supabase } from '@/integrations/supabase/client'
import { placeMenu } from './quick-menu'
import { MAX_NOTE, noteSavedMessage, saveQuickNoteWith, type NoteDestination } from './quick-note'
import { useDictation } from './voice'

export interface QuickNoteRequest { x?: number; y?: number; text?: string }

/** Opens the quick-note card, optionally at a point and with text already in it. */
export function openQuickNote(request: QuickNoteRequest = {}) {
  window.dispatchEvent(new CustomEvent<QuickNoteRequest>('aetheris:quick-note', { detail: request }))
}

/** Saves a private note to the member's Memory. Returns where it went; throws if it went nowhere. */
export function saveQuickNote(text: string): Promise<NoteDestination> {
  return saveQuickNoteWith(text, {
    getUserId: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
    insertMemory: async ({ userId, text: body, when }) => {
      const { error } = await supabase.from('memories').insert({
        user_id: userId, kind: 'note', category: 'Quick note', member_id: null, text: body,
        scope: 'private', source: 'Quick note', when_label: when,
      } as never)
      return error ? error.message : null
    },
    storage: () => { try { return typeof localStorage === 'undefined' ? null : localStorage } catch { return null } },
    now: () => new Date(),
  })
}

export function QuickNoteHost() {
  const [req, setReq] = useState<QuickNoteRequest | null>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const area = useRef<HTMLTextAreaElement>(null)

  const dictation = useDictation({
    keepOpen: true,
    onFinal: phrase => setText(t => (t && !/\s$/.test(t) ? `${t} ` : t) + phrase),
  })

  useEffect(() => {
    const open = (e: Event) => {
      const detail = (e as CustomEvent<QuickNoteRequest>).detail ?? {}
      setReq(detail); setText(detail.text ?? ''); setMsg(''); setPos(null)
    }
    window.addEventListener('aetheris:quick-note', open)
    return () => window.removeEventListener('aetheris:quick-note', open)
  }, [])

  // Place the card before it is painted, so it never flashes somewhere else.
  useLayoutEffect(() => {
    if (!req || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    const x = req.x ?? window.innerWidth / 2 - r.width / 2
    const y = req.y ?? window.innerHeight / 3
    setPos(placeMenu(x, y, r.width, r.height, window.innerWidth, window.innerHeight))
  }, [req])

  useEffect(() => { if (pos) area.current?.focus() }, [pos])

  const close = () => { dictation.stop(); setReq(null) }

  useEffect(() => {
    if (!req) return
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })

  if (!req) return null

  const save = async () => {
    setBusy(true); setMsg('')
    try {
      dictation.stop()
      const where = await saveQuickNote(text)
      setMsg(noteSavedMessage(where))
      setTimeout(() => setReq(null), 900)
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Could not save the note.') }
    setBusy(false)
  }

  return <div ref={ref} className="qn" role="dialog" aria-label="Quick note" data-voice-skip="true"
    style={pos ? { left: pos.left, top: pos.top } : { left: 0, top: 0, visibility: 'hidden' }} onContextMenu={e => e.stopPropagation()}>
    <header><NotebookPen size={14} aria-hidden /><b>Quick note</b><small>Private · saved to Memory</small>
      <button type="button" aria-label="Close" onClick={close}><X size={14} /></button></header>
    <textarea ref={area} value={text} maxLength={MAX_NOTE} rows={5} placeholder={dictation.supported ? 'Type, or press the microphone and speak…' : 'Type your note…'}
      onChange={e => setText(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void save() } }} />
    {dictation.listening && <p className="qn-live"><i />Listening…{dictation.interim ? ` ${dictation.interim}` : ''}</p>}
    <footer>
      {dictation.supported
        ? <button type="button" className={`qn-mic ${dictation.listening ? 'on' : ''}`} aria-pressed={dictation.listening} onClick={dictation.toggle}>
            {dictation.listening ? <><MicOff size={14} /> Stop</> : <><Mic size={14} /> Speak</>}
          </button>
        : <small>Voice typing needs Chrome, Edge or Safari.</small>}
      <span />
      <button type="button" className="qm-secondary" onClick={close}>Cancel</button>
      <button type="button" className="qm-primary" disabled={busy || !text.trim()} onClick={() => void save()}><Check size={13} /> {busy ? 'Saving…' : 'Save'}</button>
    </footer>
    {msg && <p className="qn-msg">{msg}</p>}
  </div>
}
