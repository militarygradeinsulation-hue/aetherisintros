import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Copy, Check, ArrowUpRight } from 'lucide-react'
import { AskIntrosLockup } from '@/aetheris/AskIntrosLockup'
import { useAetherisNews } from '@/aetheris/news'
import { newsStoryPath } from '@/aetheris/news-links'

export const Route = createFileRoute('/news/')({
  head: () => ({
    meta: [
      { title: 'Executive News & Intelligence — Ask Intros' },
      { name: 'description', content: 'Read the latest business and industry news with an executive perspective. Share any article directly from Ask Intros.' },
      { property: 'og:title', content: 'Executive News & Intelligence — Ask Intros' },
      { property: 'og:description', content: 'The news worth discussing. Read and share executive intelligence on Ask Intros.' },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: 'https://askintros.vip/news' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [{ rel: 'canonical', href: 'https://askintros.vip/news' }],
  }),
  component: PublicNewsIndex,
})

function PublicNewsIndex() {
  const { data, isLoading, isError, refetch } = useAetherisNews()
  const [copied, setCopied] = useState('')
  const [search, setSearch] = useState('')
  const items = (data?.items ?? []).filter(item => (item.title + ' ' + item.summary + ' ' + item.source).toLowerCase().includes(search.trim().toLowerCase()))
  async function copy(url: string, key: string) {
    try { await navigator.clipboard.writeText(url); setCopied(key) }
    catch { setCopied('error') }
  }
  return <main className="public-news">
    <header className="public-news-header">
      <Link to="/" aria-label="Ask Intros home"><AskIntrosLockup /></Link>
      <span className="folio">ASK INTROS / EXECUTIVE INTELLIGENCE</span>
      <h1>Read the signal. <em>Share the perspective.</em></h1>
      <p>Business and industry reporting, with a direct link to every article. No account required to read.</p>
      <div className="public-news-header-actions">
        <button type="button" onClick={() => void copy('https://askintros.vip/news', 'feed')}><Copy size={16} /> {copied === 'feed' ? 'News link copied' : 'Copy news page link'}</button>
        <button type="button" onClick={() => void refetch()}>Refresh news</button>
        <Link to="/auth">Join Ask Intros <ArrowUpRight size={15} /></Link>
      </div>
    </header>
    <label className="public-news-search">Find an article<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search headlines, sources or topics" /></label>
    {isLoading && <p role="status">Loading the latest articles…</p>}
    {isError && <p role="alert">News is unavailable right now. Please try refreshing.</p>}
    {copied === 'error' && <p role="alert">Copy was blocked by your browser. You can copy the address from the link instead.</p>}
    <section className="public-news-grid" aria-label="News articles">
      {items.map(item => <article key={item.id} className="public-news-card">
        <small>{item.source} · {item.category}</small>
        <h2><Link to={newsStoryPath(item)}>{item.title}</Link></h2>
        {item.summary && <p>{item.summary}</p>}
        <div className="public-news-card-actions">
          <Link to={newsStoryPath(item)}>Read on Ask Intros <ArrowUpRight size={15} /></Link>
          <button type="button" onClick={() => void copy('https://askintros.vip' + newsStoryPath(item), item.id)}><Copy size={14} /> {copied === item.id ? 'Copied' : 'Copy article link'}</button>
        </div>
      </article>)}
    </section>
    {!isLoading && !isError && !items.length && <p>No matching articles right now.</p>}
  </main>
}
