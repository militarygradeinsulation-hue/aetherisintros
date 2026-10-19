import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import './opportunity-wheel.css'

export interface OpportunityWheelItem { id: string; label: string; kind: string; summary: string }
export function OpportunityWheel({ items, onSelect }: { items: readonly OpportunityWheelItem[]; onSelect?: (id: string) => void }) {
  const [index, setIndex] = useState(0)
  const id = useId()
  const drag = useRef<{ y: number; index: number } | null>(null)
  const length = items.length
  const selected = length ? ((index % length) + length) % length : 0
  const item = items[selected]
  useEffect(() => { setIndex(0) }, [items.map(x => x.id).join('|')])
  const move = (delta: number) => setIndex(v => length ? (v + delta + length) % length : 0)
  const keyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); move(1) }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); move(-1) }
    if (e.key === 'Home') { e.preventDefault(); setIndex(0) }
    if (e.key === 'End') { e.preventDefault(); setIndex(length - 1) }
  }
  const pointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    drag.current = { y: e.clientY, index: selected }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const pointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    const delta = Math.round((drag.current.y - e.clientY) / 45)
    if (Math.abs(delta)) setIndex((drag.current.index + delta % length + length) % length)
    drag.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
  }
  if (!item || length < 2) return null
  return <section className="opportunity-wheel" aria-label="Browse opportunities">
    <div className="opportunity-wheel__preview" aria-live="polite">
      <span className="opportunity-wheel__eyebrow">SELECTED OPPORTUNITY · {selected + 1} / {length}</span>
      <h3>{item.label}</h3><p>{item.kind}</p><p className="opportunity-wheel__summary">{item.summary}</p>
      <button type="button" onClick={() => onSelect?.(item.id)}>View opportunity details</button>
    </div>
    <div className="opportunity-wheel__rail" role="listbox" tabIndex={0} aria-label="Opportunity wheel" aria-activedescendant={id + '-item-' + selected}
      onKeyDown={keyDown} onPointerDown={pointerDown} onPointerUp={pointerUp} onPointerCancel={pointerUp}
      onWheel={e => { if (!e.ctrlKey && !e.metaKey && Math.abs(e.deltaY) > 8) { e.stopPropagation(); move(e.deltaY > 0 ? 1 : -1) } }}>
      {items.map((entry, i) => {
        let offset = i - selected
        if (offset > length / 2) offset -= length
        if (offset < -length / 2) offset += length
        if (Math.abs(offset) > 3) return null
        const angle = offset * 17 * Math.PI / 180
        const x = -240 * (1 - Math.cos(angle))
        const y = 240 * Math.sin(angle)
        return <div key={entry.id} id={id + '-item-' + i} role="option" aria-selected={i === selected}
          className="opportunity-wheel__item" style={{ transform: `translate(${x}px,${y}px) translateY(-50%) rotate(${offset * 17}deg)`, opacity: Math.max(.28, 1 - Math.abs(offset) * .22) }}>
          <button type="button" tabIndex={-1} onClick={() => { setIndex(i); onSelect?.(entry.id) }}>{entry.label}</button>
        </div>
      })}
      <span className="opportunity-wheel__marker" aria-hidden="true" />
    </div>
    <div className="opportunity-wheel__controls"><button type="button" onClick={() => move(-1)} aria-label="Previous opportunity">↑</button><button type="button" onClick={() => move(1)} aria-label="Next opportunity">↓</button></div>
  </section>
}
