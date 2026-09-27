import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { rankCapabilities, type RankSignals } from './registry'
import { openCapability } from './store'
import type { EntityRef } from './types'

/** Contextual verbs for one record — at most four, ranked by relevance. */
export function DoMore({ subject, label, signals }: { subject: EntityRef; label: string; signals?: RankSignals }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  const verbs = rankCapabilities(subject.type, signals)
  if (!verbs.length) return null
  return <div className="domore" ref={ref}>
    <button type="button" className="domore-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(v => !v)}>Do more <ChevronDown size={13} /></button>
    {open && <div className="domore-menu" role="menu">{verbs.map(v =>
      <button key={v.id} role="menuitem" onClick={() => { setOpen(false); openCapability({ capabilityId: v.id, subject, subjectLabel: label }) }}>
        <b>{v.label}</b><small>{v.outcome}</small></button>)}</div>}
  </div>
}
