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

/** Bing's keyless RSS results — stable and cheap to parse. */
async function searchBing(query: string, limit: number): Promise<WebResult[]> {
  const url = `https://www.bing.com/search?format=rss&count=${limit * 2}&q=${encodeURIComponent(query)}`
  const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/rss+xml,text/xml' } })
  if (!res.ok) throw new Error(`bing ${res.status}`)
  const xml = await res.text()
  const out: WebResult[] = []
  const seen = new Set<string>()
  const re = /<item>([\s\S]*?)<\/item>/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(xml)) && out.length < limit) {
    const block = match[1] ?? ''
    const pick = (tag: string) => {
      const found = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i').exec(block)?.[1] ?? ''
      return strip(found.replace(/<!\[CDATA\[|\]\]>/g, ''))
    }
    const link = pick('link')
    const title = pick('title')
    if (!title || !/^https?:/i.test(link) || seen.has(link)) continue
    seen.add(link)
    out.push({ title, url: link, snippet: pick('description').slice(0, 400) })
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

/** Live web search with no third-party key, across two public sources. */
export async function searchWeb(query: string, limit = 6): Promise<WebResult[]> {
  const settled = await Promise.allSettled([searchBing(query, limit), searchDuck(query, limit)])
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
  const res = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
      accept: 'text/html,application/xhtml+xml',
    },
  })
  if (!res.ok) throw new Error(`page ${res.status}`)
  const html = (await res.text())
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  const parts: string[] = []
  const re = /<(p|h1|h2|h3|li)\b[^>]*>([\s\S]*?)<\/\1>/gi
  let match: RegExpExecArray | null
  let total = 0
  while ((match = re.exec(html))) {
    const text = strip(match[2] ?? '')
    if (text.length < 40) continue
    parts.push(text)
    total += text.length
    if (total > max) break
  }
  return parts.join('\n\n').slice(0, max)
}
