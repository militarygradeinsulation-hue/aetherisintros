import { useEffect, useMemo, useState } from 'react'
import { Search, X, ArrowRight, Star } from 'lucide-react'
import type { Page } from '../nav'
import { groupOrder, groupedSecondary, hubBlurb, metaById, secondaryPages, type Hub, type PageMeta } from '../pageMeta'

const RECENT_KEY = 'aetheris.more.recent'

export function readRecent(): Page[] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    return Array.isArray(raw) ? raw.filter(id => typeof id === 'string' && metaById[id]).slice(0, 5) : []
  } catch { return [] }
}

export function rememberRecent(page: Page) {
  if (!metaById[page]) return
  const next = [page, ...readRecent().filter(p => p !== page)].slice(0, 5)
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)) } catch { /* ignore */ }
}

type View = 'az' | Hub

const PINNED_KEY = 'aetheris.more.pinned'

function readPinned(): Page[] {
  try {
    const raw = JSON.parse(localStorage.getItem(PINNED_KEY) ?? '[]')
    return Array.isArray(raw) ? raw.filter(id => typeof id === 'string' && metaById[id]) : []
  } catch { return [] }
}

/** Full-height editorial index of every secondary destination. */
export function MoreDrawer({ open, page, onClose, onNavigate }: {
  open: boolean; page: Page; onClose: () => void; onNavigate: (p: Page) => void
}) {
  const [query, setQuery] = useState('')
  const [view, setView] = useState<View>('az')
  const [recent, setRecent] = useState<Page[]>([])
  const [pinned, setPinned] = useState<Page[]>([])
  const togglePin = (id: Page) => {
    const next = pinned.includes(id) ? pinned.filter(p => p !== id) : [...pinned, id]
    setPinned(next)
    try { localStorage.setItem(PINNED_KEY, JSON.stringify(next)) } catch { /* ignore */ }
  }

  useEffect(() => { if (open) { setRecent(readRecent()); setPinned(readPinned()); setQuery('') } }, [open])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return null
    return secondaryPages.filter(p =>
      p.label.toLowerCase().includes(q) || p.blurb.toLowerCase().includes(q)
      || p.group.toLowerCase().includes(q) || p.keywords.some(k => k.includes(q)))
  }, [query])

  if (!open) return null

  const go = (p: Page) => { onNavigate(p); onClose() }

  const Item = ({ meta }: { meta: PageMeta }) => {
    const Icon = meta.icon
    return <div className={`more-item ${page === meta.id ? 'current' : ''}`}>
      <button className="more-item-go" onClick={() => go(meta.id)}>
        <span className="more-item-icon"><Icon size={16} /></span>
        <span className="more-item-copy"><b>{meta.label}</b><small>{meta.blurb}</small></span>
        {page === meta.id ? <em>Current</em> : <ArrowRight size={14} />}
      </button>
      <button className={`more-pin ${pinned.includes(meta.id) ? 'on' : ''}`} onClick={() => togglePin(meta.id)}
        aria-pressed={pinned.includes(meta.id)} aria-label={pinned.includes(meta.id) ? `Unpin ${meta.label}` : `Pin ${meta.label}`}>
        <Star size={13} />
      </button>
    </div>
  }

  const listed = results ?? (view === 'az' ? secondaryPages : groupedSecondary(view))

  return <div className="more-wrap" role="dialog" aria-label="All tools">
    <button className="more-scrim" aria-label="Close all tools" onClick={onClose} />
    <aside className="more-panel">
      <header className="more-head">
        <div>
          <span className="more-eyebrow">THE INDEX</span>
          <h2>All tools</h2>
          <p>Every capability in Ask Intros, in plain language.</p>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={17} /></button>
      </header>

      <label className="more-search">
        <Search size={15} />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a page or capability…" />
      </label>

      {!!pinned.length && !results && <section className="more-recent favourites">
        <span className="more-label">FAVOURITES</span>
        <div>{pinned.map(id => {
          const meta = metaById[id]
          if (!meta) return null
          return <button key={id} onClick={() => go(id)}>{meta.label}</button>
        })}</div>
      </section>}

      {!!recent.length && !results && <section className="more-recent">
        <span className="more-label">RECENTLY USED</span>
        <div>{recent.map(id => {
          const meta = metaById[id]
          if (!meta) return null
          return <button key={id} onClick={() => go(id)}>{meta.label}</button>
        })}</div>
      </section>}

      {!results && <nav className="more-tabs" role="tablist" aria-label="Categories">
        {(['az', ...groupOrder] as View[]).map(v =>
          <button key={v} role="tab" aria-selected={view === v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>
            {v === 'az' ? 'A–Z' : v}
          </button>)}
      </nav>}

      <div className="more-list">
        {results && <span className="more-label">{results.length} MATCH{results.length === 1 ? '' : 'ES'}</span>}
        {!results && <span className="more-label">{view === 'az' ? 'EVERY DESTINATION, A–Z' : view}</span>}
        {listed.map(meta => <Item key={meta.id} meta={meta} />)}
        {!listed.length && <p className="more-empty">Nothing matches that. Try a capability, not a feature name.</p>}
      </div>
    </aside>
  </div>
}
