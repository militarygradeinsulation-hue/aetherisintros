import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, ArrowUpRight, Check, Copy } from 'lucide-react'
import { AskIntrosLockup } from '@/aetheris/AskIntrosLockup'
import { NewsImagesProvider, useAetherisNews, useNewsImages } from '@/aetheris/news'
import { newsStoryUrl, validNewsSource } from '@/aetheris/news-links'
import { NewsReader } from '@/aetheris/pages/NewsReader'
import type { NewsItem } from '@/lib/news.functions'

export const Route = createFileRoute('/news/story')({
  validateSearch: (params: Record<string, unknown>) => ({
    url: typeof params['url'] === 'string' ? params['url'] : '',
    title: typeof params['title'] === 'string' ? params['title'].slice(0, 180) : '',
    source: typeof params['source'] === 'string' ? params['source'].slice(0, 60) : '',
    summary: typeof params['summary'] === 'string' ? params['summary'].slice(0, 420) : '',
  }),
  head: () => ({
    meta: [
      { title: 'Read News on Ask Intros' },
      { name: 'description', content: 'Read the article and explore its executive implications on Ask Intros.' },
      { property: 'og:title', content: 'Read News on Ask Intros' },
      { property: 'og:description', content: 'Read the article directly on Ask Intros and explore its executive implications.' },
      { property: 'og:type', content: 'article' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: PublicNewsStory,
})

function PublicNewsStory() {
  const params = Route.useSearch()
  const url = validNewsSource(params['url'])
  const { data, isLoading } = useAetherisNews()
  const [copied, setCopied] = useState(false)
  const found = data?.items.find(item => item.link === url)
  const images = useNewsImages(found ? [found] : [])
  // Keep the shared headline and summary readable even after the rolling feed
  // removes an older story. Never pretend an expired article is a live feed item.
  const fallback: NewsItem | null = url && params['title'] ? {
    id: 'shared:' + url, link: url, title: params['title'], summary: params['summary'],
    source: new URL(url).hostname, category: 'UNVERIFIED SHARED LINK',
    published: null, image: null, kind: 'industry',
  } : null
  const item = found ?? fallback
  async function copy() {
    if (!item) return
    try { await navigator.clipboard.writeText(newsStoryUrl(item)); setCopied(true) }
    catch { setCopied(false) }
  }
  return <main className="public-news public-news-story">
    <header className="public-news-story-head">
      <Link to="/" aria-label="Ask Intros home"><AskIntrosLockup /></Link>
      <Link to="/news"><ArrowLeft size={15} /> All news</Link>
    </header>
    {!url && <section className="public-news-card"><h1>Invalid article link</h1><p>This address is not a valid public news article. Visit the news page to choose a story.</p><Link to="/news">Browse news</Link></section>}
    {url && !item && isLoading && <p role="status">Finding the article…</p>}
    {url && !item && !isLoading && <section className="public-news-card"><h1>Article not available</h1><p>This link does not include enough information to display the story. You can return to the news page.</p><Link to="/news">Browse news</Link></section>}
    {item && <>
      <div className="public-news-sharebar">
        <span>Direct article link · Anyone can open this page</span>
        <button type="button" onClick={() => void copy()}><Copy size={15} /> {copied ? 'Article link copied' : 'Copy article link'} {copied && <Check size={14} />}</button>
        <a href={item.link} target="_blank" rel="noopener noreferrer">Original publisher <ArrowUpRight size={14} /></a>
      </div>
      {found ? <NewsImagesProvider value={images}><NewsReader item={found} onBack={() => { window.location.assign('/news') }} publicMode /></NewsImagesProvider>
        : <article className="public-news-card public-news-archived"><small>{item.source} / UNVERIFIED SHARED LINK</small><h1>{item.title}</h1><p>{item.summary || 'This story is no longer in the current news feed. Open the original publisher to read the complete article.'}</p><p>This link contains a user-provided headline and summary that Ask Intros cannot currently verify against the live feed. The original publisher link is provided for independent confirmation.</p><a href={item.link} target="_blank" rel="noopener noreferrer">Read the original article <ArrowUpRight size={15} /></a></article>}
    </>}
  </main>
}
