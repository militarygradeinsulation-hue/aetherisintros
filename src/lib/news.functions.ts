import { createServerFn } from '@tanstack/react-start'

export interface NewsItem {
  id: string
  title: string
  link: string
  summary: string
  source: string
  category: string
  published: string | null
  image: string | null
  kind: 'industry' | 'aetheris'
}

const INDUSTRY = 'https://ihdjpxhcaiaixmqxyqoe.supabase.co/functions/v1/industry-news'
const POSTS = 'https://ihdjpxhcaiaixmqxyqoe.supabase.co/functions/v1/news-feed'
const NEWS_HOME = 'https://aetheris.technology/news'

const str = (value: unknown): string => (typeof value === 'string' ? value : '')
const clean = (value: unknown, max = 420): string =>
  str(value).replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim().slice(0, max)

async function get(url: string): Promise<any> {
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  if (!res.ok) throw new Error(`${url} -> ${res.status}`)
  return res.json()
}

/** Reads the public Aetheris news feed (aetheris.technology/news) and normalizes it. */
export const fetchAetherisNews = createServerFn({ method: 'GET' }).handler(async (): Promise<{
  items: NewsItem[]
  fetchedAt: string
  source: string
  degraded: boolean
}> => {
  const [industry, posts] = await Promise.allSettled([get(INDUSTRY), get(POSTS)])
  const items: NewsItem[] = []

  if (industry.status === 'fulfilled') {
    for (const raw of (industry.value?.items ?? []) as any[]) {
      const title = clean(raw?.title, 180)
      if (!title) continue
      items.push({
        id: `industry:${str(raw?.id) || title}`,
        title,
        link: str(raw?.link) || NEWS_HOME,
        summary: clean(raw?.summary),
        source: clean(raw?.source_label, 60) || clean(raw?.source, 60) || 'Industry',
        category: (clean(raw?.category, 30) || 'news').toUpperCase(),
        published: str(raw?.published_at) || str(raw?.created_at) || null,
        image: str(raw?.image_url) || null,
        kind: 'industry',
      })
    }
  }

  if (posts.status === 'fulfilled') {
    for (const raw of (posts.value?.posts ?? []) as any[]) {
      const title = clean(raw?.title, 180)
      if (!title) continue
      const slug = str(raw?.slug)
      items.push({
        id: `aetheris:${str(raw?.id) || slug || title}`,
        title,
        link: slug ? `https://aetheris.technology/blog/${slug}` : NEWS_HOME,
        summary: clean(raw?.summary) || clean(raw?.body),
        source: 'Aetheris',
        category: 'ANALYSIS',
        published: str(raw?.published_at) || str(raw?.created_at) || null,
        image: str(raw?.image_url) || str(raw?.cover_image) || null,
        kind: 'aetheris',
      })
    }
  }

  const seen = new Set<string>()
  const unique = items.filter(item => {
    const key = item.title.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  unique.sort((a, b) => new Date(b.published ?? 0).getTime() - new Date(a.published ?? 0).getTime())

  return {
    items: unique.slice(0, 80),
    fetchedAt: new Date().toISOString(),
    source: NEWS_HOME,
    degraded: industry.status === 'rejected' || posts.status === 'rejected',
  }
})
