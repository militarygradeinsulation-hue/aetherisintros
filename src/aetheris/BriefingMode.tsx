import { useEffect, useState } from 'react'
import { ChevronDown, Info, Newspaper } from 'lucide-react'
import type { Page } from './nav'
import { metaById, relatedPages } from './pageMeta'

const MODE_KEY = 'aetheris.briefingMode'
const COLLAPSE_KEY = 'aetheris.briefingMode.collapsed'

function readSet(): string[] {
  try { const raw = JSON.parse(localStorage.getItem(COLLAPSE_KEY) ?? '[]'); return Array.isArray(raw) ? raw : [] } catch { return [] }
}

/** Global explanatory layer, persisted across refreshes. */
export function useBriefingMode() {
  const [on, setOn] = useState(false)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    try { setOn(localStorage.getItem(MODE_KEY) === 'on') } catch { /* ignore */ }
    setReady(true)
  }, [])
  useEffect(() => {
    if (!ready) return
    try { localStorage.setItem(MODE_KEY, on ? 'on' : 'off') } catch { /* ignore */ }
  }, [on, ready])
  return { on, toggle: () => setOn(v => !v) }
}

export function BriefingModeToggle({ on, toggle }: { on: boolean; toggle: () => void }) {
  return <button className={`briefing-toggle ${on ? 'on' : ''}`} onClick={toggle} aria-pressed={on}
    title="Briefing mode explains what each page means">
    <Newspaper size={14} /><span>Briefing mode</span>
  </button>
}

/** Per-page contextual briefing. Collapsible per page while the global mode stays on. */
export function BriefingPanel({ page }: { page: Page }) {
  const meta = metaById[page]
  const [collapsed, setCollapsed] = useState<string[]>([])
  useEffect(() => { setCollapsed(readSet()) }, [])
  if (!meta) return null
  const isCollapsed = collapsed.includes(page)
  const toggle = () => {
    const next = isCollapsed ? collapsed.filter(p => p !== page) : [...collapsed, page]
    setCollapsed(next)
    try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
  }
  const b = meta.briefing
  return <section className={`briefing-panel ${isCollapsed ? 'is-collapsed' : ''}`}>
    <header>
      <span className="briefing-flag"><Info size={12} /> BRIEFING MODE</span>
      <b>{meta.label}</b>
      <button onClick={toggle} aria-expanded={!isCollapsed}>
        {isCollapsed ? 'Show briefing' : 'Hide briefing'} <ChevronDown size={13} />
      </button>
    </header>
    {!isCollapsed && <>
      <div className="briefing-grid">
        <div><span>WHAT THIS PAGE DOES</span><p>{b.does}</p></div>
        <div><span>WHAT TO LOOK FOR</span><p>{b.look}</p></div>
        <div><span>WHAT CHANGES HERE</span><p>{b.changes}</p></div>
        <div><span>BEST NEXT MOVE</span><p>{b.next}</p></div>
      </div>
      {b.why && <p className="briefing-why"><em>Why this matters.</em> {b.why}</p>}
      {!!b.hints?.length && <ul className="briefing-hints">{b.hints.map(h => <li key={h}><Info size={11} /> {h}</li>)}</ul>}
    </>}
  </section>
}

/** Local sub-navigation so related capabilities are one click from their parent. */
export function RelatedTools({ page, onNavigate }: { page: Page; onNavigate: (p: Page) => void }) {
  const related = relatedPages[page]
  if (!related) return null
  return <nav className="related-tools" aria-label={related.label}>
    <span>{related.label}</span>
    {related.pages.map(id => {
      const meta = metaById[id]
      if (!meta) return null
      const Icon = meta.icon
      return <button key={id} onClick={() => onNavigate(id)} title={meta.blurb}><Icon size={13} />{meta.label}</button>
    })}
  </nav>
}
