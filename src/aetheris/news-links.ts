import type { NewsItem } from '@/lib/news.functions'

/** Share the publisher URL, not an ephemeral feed index, so old links still open. */
export function newsStoryPath(item: Pick<NewsItem, 'link' | 'title' | 'source' | 'summary'>): string {
  const params = new URLSearchParams({ url: item.link, title: item.title.slice(0, 180), source: item.source.slice(0, 60), summary: item.summary.slice(0, 420) })
  return '/news/story?' + params.toString()
}

export function newsStoryUrl(item: Pick<NewsItem, 'link'>, origin = 'https://askintros.vip'): string {
  return origin.replace(/\/$/, '') + newsStoryPath(item)
}

/** Only allow public HTTPS publisher pages; never interpret a shared URL as app code. */
export function validNewsSource(value: string | null): string | null {
  if (!value || value.length > 2048) return null
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'https:' || !parsed.hostname.includes('.') || parsed.username || parsed.password) return null
    if (['localhost', '127.0.0.1', '0.0.0.0', '169.254.169.254'].includes(parsed.hostname)) return null
    return parsed.href
  } catch { return null }
}
