import { createFileRoute, Link, Outlet, useLocation } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'
import { AskIntrosLockup } from '@/aetheris/AskIntrosLockup'
import { NewsPage } from '@/aetheris/pages/NewsPage'
import '@/aetheris/styles.css'
import '@/aetheris/public-news.css'

export const Route = createFileRoute('/news')({
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
  component: PublicNewsRoute,
})

function PublicNewsRoute() {
  const location = useLocation()
  if (location.pathname.startsWith('/news/story')) return <Outlet />
  return <PublicNewsIndex />
}

function PublicNewsIndex() {
  return <main className="public-news public-news-editorial">
    <nav className="public-news-topbar" aria-label="Public news navigation">
      <Link to="/" aria-label="Ask Intros home"><AskIntrosLockup /></Link>
      <Link to="/auth" className="public-news-join">Join Ask Intros <ArrowUpRight size={15} /></Link>
    </nav>
    <NewsPage publicMode />
  </main>
}
