import { publicDocument } from './public-fetch.server'
export interface WebResult {
  title: string
  url: string
  snippet: string
}

const decode = (value: string): string =>
  value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#x27;|&#0?39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&[a-z#0-9]+;/gi, ' ')

const strip = (html: string): string => decode(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36'

const unwrapDuck = (raw: string): string => {
  let url = decode(raw)
  const redirect = /[?&]uddg=([^&]+)/.exec(url)
  if (redirect?.[1]) url = decodeURIComponent(redirect[1])
  if (url.startsWith('//')) url = `https:${url}`
  return url
}

/** Reader-proxy search, used when the direct endpoint refuses the request. */
async function searchProxy(query: string, limit: number): Promise<WebResult[]> {
  const target = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`
  const res = await fetch(`https://r.jina.ai/${target}`, { headers: { accept: 'text/plain' } })
  if (!res.ok) throw new Error(`proxy ${res.status}`)
  const markdown = await res.text()

  const out: WebResult[] = []
  const seen = new Set<string>()
  const re = /^##+\s*\[([^\]]+)\]\(([^)]+)\)([\s\S]*?)(?=\n##+\s*\[|$)/gm
  let match: RegExpExecArray | null
  while ((match = re.exec(markdown)) && out.length < limit) {
    const url = unwrapDuck(match[2] ?? '')
    const title = strip(match[1] ?? '')
    if (!title || !/^https?:/i.test(url)) continue
    if (/duckduckgo\.com/i.test(url) || seen.has(url)) continue
    seen.add(url)
    const snippet = (match[3] ?? '')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/https?:\/\/\S+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 400)
    out.push({ title, url, snippet })
  }
  return out
}

/** DuckDuckGo's HTML endpoint, used as a second opinion. */
async function searchDuck(query: string, limit: number): Promise<WebResult[]> {
  const res = await fetch('https://html.duckduckgo.com/html/', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': UA, accept: 'text/html' },
    body: new URLSearchParams({ q: query }).toString(),
  })
  if (!res.ok) throw new Error(`duck ${res.status}`)
  const html = await res.text()

  const out: WebResult[] = []
  const seen = new Set<string>()
  const re = /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>([\s\S]{0,1200}?)(?=<a[^>]+class="[^"]*result__a|<\/div>\s*<\/div>\s*<\/div>)/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(html)) && out.length < limit) {
    let url = decode(match[1] ?? '')
    const redirect = /[?&]uddg=([^&]+)/.exec(url)
    if (redirect?.[1]) url = decodeURIComponent(redirect[1])
    if (url.startsWith('//')) url = `https:${url}`
    if (!/^https?:/i.test(url)) continue
    const title = strip(match[2] ?? '')
    if (!title || seen.has(url)) continue
    seen.add(url)
    const snippetMatch = /class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/i.exec(match[3] ?? '')
    out.push({ title, url, snippet: strip(snippetMatch?.[1] ?? '').slice(0, 400) })
  }
  return out
}

/** Live web search with no third-party key: direct first, reader proxy as backup. */
export async function searchWeb(query: string, limit = 6): Promise<WebResult[]> {
  const settled = await Promise.allSettled([searchDuck(query, limit), searchProxy(query, limit)])
  const out: WebResult[] = []
  const seen = new Set<string>()
  for (const attempt of settled) {
    if (attempt.status !== 'fulfilled') continue
    for (const item of attempt.value) {
      if (seen.has(item.url)) continue
      seen.add(item.url)
      out.push(item)
    }
  }
  return out.slice(0, limit * 2)
}

/** Reads one page and returns readable text, for grounding an answer. */
export async function readPage(url: string, max = 9000): Promise<string> {
  return readProxy(url, Math.min(Math.max(max, 1), 14_000))
}

async function readProxy(url: string, max: number): Promise<string> {
  const text = await publicDocument(url)
  return text
    .split('\n')
    .filter(line => !/^!\[/.test(line.trim()))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .slice(0, max)
}

