import { createServerFn } from '@tanstack/react-start'

/** Pulls a usable lead image out of an article page's own metadata. */
const PATTERNS = [
  /<meta[^>]+property=["']og:image(?::secure_url|:url)?["'][^>]+content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
  /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
  /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i,
  /<article[\s\S]{0,4000}?<img[^>]+src=["']([^"']+)["']/i,
]

function decode(value: string): string {
  return value
    .replace(/&#0*38;|&amp;/gi, '&')
    .replace(/&#0*39;|&#x0*27;/gi, "'")
    .replace(/&quot;/gi, '"')
    .trim()
}

function absolute(value: string, base: string): string | null {
  try {
    const url = new URL(decode(value), base)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (/\.svg($|\?)/i.test(url.pathname)) return null
    return url.toString()
  } catch {
    return null
  }
}

async function leadImage(link: string): Promise<string | null> {
  try {
    const res = await fetch(link, {
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; AskIntrosReader/1.0)',
        accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
    })
    if (!res.ok) return null
    const html = (await res.text()).slice(0, 250_000)
    for (const pattern of PATTERNS) {
      const match = pattern.exec(html)
      if (match?.[1]) {
        const url = absolute(match[1], res.url || link)
        if (url) return url
      }
    }
    return null
  } catch {
    return null
  }
}

/** Resolves lead images for article links that arrived without one. */
export const fetchNewsImages = createServerFn({ method: 'POST' })
  .inputValidator((input: { links: string[] }) => ({
    links: (input?.links ?? []).filter(link => /^https?:\/\//i.test(link)).slice(0, 12),
  }))
  .handler(async ({ data }): Promise<Record<string, string>> => {
    const found: Record<string, string> = {}
    const results = await Promise.allSettled(data.links.map(async link => [link, await leadImage(link)] as const))
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value[1]) found[result.value[0]] = result.value[1]
    }
    return found
  })
