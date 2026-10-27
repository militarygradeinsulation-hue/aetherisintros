import { useEffect, useRef, useState } from 'react'
import { butlerPrompt, classifyText, kindForFiles, setPendingSheet, suggestionsFor, type DropKind, type DropSuggestion } from './drop-anywhere'
import './global-drop.css'

interface Pending { kind: DropKind; files: File[]; text: string }

const hasPayload = (e: DragEvent) => {
  const types = Array.from(e.dataTransfer?.types ?? [])
  return types.includes('Files') || types.includes('text/uri-list') || types.includes('text/plain')
}

/** Accepts a drop on any screen; Butler suggests a destination and the member confirms. */
export function GlobalDropZone() {
  const [dragging, setDragging] = useState(false)
  const [pending, setPending] = useState<Pending | null>(null)
  const depth = useRef(0)

  useEffect(() => {
    const enter = (e: DragEvent) => { if (!hasPayload(e)) return; depth.current += 1; setDragging(true) }
    const leave = () => { depth.current = Math.max(0, depth.current - 1); if (depth.current === 0) setDragging(false) }
    const over = (e: DragEvent) => { if (hasPayload(e)) e.preventDefault() }
    const drop = (e: DragEvent) => {
      depth.current = 0; setDragging(false)
      // A screen's own drop area (CRM import, Butler, an editor) already handled it.
      if (e.defaultPrevented || !e.dataTransfer) return
      e.preventDefault()
      const files = Array.from(e.dataTransfer.files ?? [])
      if (files.length) { setPending({ kind: kindForFiles(files), files: files.slice(0, 3), text: '' }); return }
      const text = (e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain')).trim()
      if (text) setPending({ kind: classifyText(text), files: [], text: text.slice(0, 4000) })
    }
    window.addEventListener('dragenter', enter)
    window.addEventListener('dragleave', leave)
    window.addEventListener('dragover', over)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('dragover', over)
      window.removeEventListener('drop', drop)
    }
  }, [])

  useEffect(() => {
    if (!pending) return
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setPending(null) }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [pending])

  const confirm = (s: DropSuggestion) => {
    if (!pending) return
    if (s.action === 'crm-import') {
      const sheet = pending.files.find(f => /\.(csv|tsv)$/i.test(f.name) || f.type === 'text/csv') ?? null
      setPendingSheet(sheet)
      window.dispatchEvent(new CustomEvent('aetheris:navigate', { detail: 'crm' }))
      window.dispatchEvent(new CustomEvent('aetheris:crm-import'))
    } else {
      window.dispatchEvent(new CustomEvent('aetheris:open-assistant', { detail: { question: butlerPrompt(s.action, pending.kind, pending.text), files: pending.files } }))
    }
    setPending(null)
  }

  const label = pending ? (pending.files.length ? pending.files.map(f => f.name).join(', ') : pending.text) : ''

  return <>
    {dragging && <div className="global-drop-veil" aria-hidden="true"><div><b>Drop it anywhere</b><span>Butler will suggest where it belongs. Nothing is saved until you confirm.</span></div></div>}
    {pending && <div className="global-drop-backdrop" onClick={() => setPending(null)}>
      <section className="global-drop-card" role="dialog" aria-modal="true" aria-labelledby="global-drop-title" onClick={e => e.stopPropagation()}>
        <small>BUTLER SUGGESTS</small>
        <h2 id="global-drop-title">Where should this go?</h2>
        <p className="global-drop-item" title={label}>{label}</p>
        <div className="global-drop-options">
          {suggestionsFor(pending.kind).map((s, i) => <button key={s.action} type="button" className={i === 0 ? 'primary' : ''} autoFocus={i === 0} onClick={() => confirm(s)}><b>{s.label}</b><span>{s.detail}</span></button>)}
        </div>
        <button type="button" className="global-drop-cancel" onClick={() => setPending(null)}>Cancel</button>
      </section>
    </div>}
  </>
}

export default GlobalDropZone
