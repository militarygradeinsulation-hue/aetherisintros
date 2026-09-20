import { useMemo, useState } from 'react'
import { ArrowUpRight, RefreshCw } from 'lucide-react'
import { Btn, Eyebrow, Head } from '../ui'
import { newsAge, useAetherisNews, type NewsItem } from '../news'
import { NewsReader } from './NewsReader'

export function NewsPage() {
  const { data, isLoading, isError, isFetching, refetch } = useAetherisNews()
  const [filter, setFilter] = useState<string>('ALL')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<NewsItem | null>(null)

  const items = data?.items ?? []

  const categories = useMemo(
    () => ['ALL', ...Array.from(new Set(items.map(item => item.category)))].slice(0, 9),
    [items],
  )
  const query = q.trim().toLowerCase()
  const shown = items.filter(item =>
    (filter === 'ALL' || item.category === filter)
    && (!query || `${item.title} ${item.summary} ${item.source}`.toLowerCase().includes(query)))

  if (open) return <NewsReader item={open} onBack={() => setOpen(null)} />

  return <>
    <Head
      label="NEWS"
      title="The intelligence feed, read alongside your relationships."
      copy="Live coverage from the Aetheris newsroom: analysis written by the operator, plus the industry, AI and security reporting worth your attention. Read the signal, then act on it with the people who care about it."
      proof="Pulled live from aetheris.technology/news"
      action={<Btn kind="secondary" onClick={() => refetch()}><RefreshCw size={13} /> {isFetching ? 'Refreshing…' : 'Refresh'}</Btn>}
    />

    <section className="module news-controls">
      <div className="news-filters">
        {categories.map(cat => <button key={cat} className={filter === cat ? 'on' : ''} onClick={() => setFilter(cat)}>{cat}</button>)}
      </div>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search the feed…" aria-label="Search the news feed" />
    </section>

    {isLoading && <section className="module"><p className="sv-empty">Loading the feed…</p></section>}
    {isError && <section className="module"><p className="sv-empty">The feed is unavailable right now. Try refreshing in a moment.</p></section>}
    {data?.degraded && <section className="module"><p className="sv-empty">Part of the feed did not respond. Showing everything that did.</p></section>}

    {!isLoading && !isError && <section className="news-grid">
      {shown.map(item => <article key={item.id} className="news-card">
        {item.image && <button className="news-thumb" onClick={() => setOpen(item)} aria-label={`Read ${item.title}`}>
          <img src={item.image} alt="" loading="lazy" onError={e => { (e.currentTarget.closest('.news-thumb') as HTMLElement | null)?.remove() }} />
        </button>}
        <header><Eyebrow signal={item.kind === 'aetheris'}>{item.source}</Eyebrow><small>{newsAge(item.published)}</small></header>
        <h3><button className="news-title" onClick={() => setOpen(item)}>{item.title}</button></h3>
        {item.summary && <p>{item.summary}</p>}
        <footer>
          <span className="news-tag">{item.category}</span>
          <div className="news-actions">
            <button className="news-link" onClick={() => setOpen(item)}>Read <ArrowUpRight size={13} /></button>
            <a className="news-source-link" href={item.link} target="_blank" rel="noreferrer">Original</a>
          </div>
        </footer>
      </article>)}
      {!shown.length && <p className="sv-empty">Nothing matches that filter yet.</p>}
    </section>}
  </>
}


export default NewsPage
