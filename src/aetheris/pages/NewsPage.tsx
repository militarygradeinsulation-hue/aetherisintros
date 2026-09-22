import { useMemo, useState } from 'react'
import { ArrowUpRight, RefreshCw, X } from 'lucide-react'
import { Btn, Eyebrow, Head } from '../ui'
import { NewsImagesProvider, newsAge, useAetherisNews, useNewsImages, type NewsItem } from '../news'
import { NewsReader } from './NewsReader'
import { NewsActions } from './NewsActions'
import { useNewsShelf } from '../newsShelf'
import { NewsThumbnail } from './NewsThumbnail'

type Tab = 'feed' | 'later' | 'library'

export function NewsPage() {
  const { data, isLoading, isError, isFetching, refetch } = useAetherisNews()
  const [filter, setFilter] = useState<string>('ALL')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<NewsItem | null>(null)
  const [tab, setTab] = useState<Tab>('feed')
  const shelf = useNewsShelf()

  const items = data?.items ?? []

  const categories = useMemo(
    () => ['ALL', ...Array.from(new Set(items.map(item => item.category)))].slice(0, 9),
    [items],
  )
  const query = q.trim().toLowerCase()
  const source = tab === 'feed' ? items : (tab === 'later' ? shelf.later : shelf.library).map(entry => entry.item)
  const shown = source.filter(item =>
    (tab !== 'feed' || filter === 'ALL' || item.category === filter)
    && (!query || `${item.title} ${item.summary} ${item.source}`.toLowerCase().includes(query)))

  const resolvedImages = useNewsImages(items)

  if (open) return <NewsImagesProvider value={resolvedImages}>
    <NewsReader item={open} onBack={() => setOpen(null)} />
  </NewsImagesProvider>

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'feed', label: 'Feed', count: items.length },
    { id: 'later', label: 'Read later', count: shelf.later.length },
    { id: 'library', label: 'Library', count: shelf.library.length },
  ]


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
        {tabs.map(entry => <button
          key={entry.id}
          className={tab === entry.id ? 'on' : ''}
          onClick={() => setTab(entry.id)}
        >{entry.label} {entry.count ? `· ${entry.count}` : ''}</button>)}
      </div>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search the feed…" aria-label="Search the news feed" />
    </section>

    {tab === 'feed' && <section className="module news-controls">
      <div className="news-filters">
        {categories.map(cat => <button key={cat} className={filter === cat ? 'on' : ''} onClick={() => setFilter(cat)}>{cat}</button>)}
      </div>
    </section>}

    {tab === 'feed' && isLoading && <section className="module"><p className="sv-empty">Loading the feed…</p></section>}
    {tab === 'feed' && isError && <section className="module"><p className="sv-empty">The feed is unavailable right now. Try refreshing in a moment.</p></section>}
    {tab === 'feed' && data?.degraded && <section className="module"><p className="sv-empty">Part of the feed did not respond. Showing everything that did.</p></section>}

    {tab === 'later' && !shelf.later.length && <section className="module"><p className="sv-empty">Nothing set aside yet. Use Read later on any story and it waits here for you.</p></section>}
    {tab === 'library' && !shelf.library.length && <section className="module"><p className="sv-empty">Your library is empty. Save the pieces worth returning to and they stay here.</p></section>}

    {!(tab === 'feed' && (isLoading || isError)) && <section className="news-grid">
      {shown.map(item => <article key={item.id} className="news-card">
        <button className="news-thumb" onClick={() => setOpen(item)} aria-label={`Read ${item.title}`}>
          <NewsThumbnail item={item} />
        </button>
        <header><Eyebrow signal={item.kind === 'aetheris'}>{item.source}</Eyebrow><small>{newsAge(item.published)}</small></header>
        <h3><button className="news-title" onClick={() => setOpen(item)}>{item.title}</button></h3>
        {item.summary && <p>{item.summary}</p>}
        <NewsActions item={item} compact />
        <footer>
          <span className="news-tag">{item.category}</span>
          <div className="news-actions">
            <button className="news-link" onClick={() => setOpen(item)}>Read <ArrowUpRight size={13} /></button>
            <span className="news-source-link">{item.source}</span>
            {tab !== 'feed' && <button className="news-remove" onClick={() => shelf.remove(tab === 'later' ? 'later' : 'library', item.id)} aria-label="Remove from this shelf"><X size={12} /></button>}
          </div>
        </footer>
      </article>)}
      {!shown.length && tab === 'feed' && <p className="sv-empty">Nothing matches that filter yet.</p>}
    </section>}
  </>

}


export default NewsPage
