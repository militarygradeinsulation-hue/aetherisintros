/** Import only verifiable Search Console date and query exports. No synthetic metrics. */
export type SearchMetrics = {
  firstDate: string
  lastDate: string
  days: number
  clicks: number
  impressions: number
  ctr: number | null
  averagePosition: number | null
}
export type SearchQuery = { query: string; clicks: number; impressions: number; ctr: number | null }
const MAX_CSV_LENGTH = 2_000_000

export function readCsv(text: string): string[][] {
  if (!text || text.length > MAX_CSV_LENGTH) throw new Error('Upload a nonempty CSV file smaller than 2 MB.')
  const input = text.replace(/^\uFEFF/, '')
  const rows: string[][] = []
  let row: string[] = [], cell = '', quoted = false
  for (let i = 0; i < input.length; i++) {
    const c = input[i]!
    if (quoted) {
      if (c === '"' && input[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"' && cell === '') quoted = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && input[i + 1] === '\n') i++
      row.push(cell); cell = ''
      if (row.some(part => part.trim())) rows.push(row)
      row = []
    } else cell += c
  }
  if (quoted) throw new Error('CSV contains an unclosed quoted value.')
  row.push(cell)
  if (row.some(part => part.trim())) rows.push(row)
  if (rows.length < 2) throw new Error('CSV needs a header and at least one data row.')
  return rows
}
function columns(rows: string[][], required: string[]) {
  const header = rows[0]!.map(value => value.trim().toLowerCase())
  const indices = required.map(name => header.indexOf(name))
  if (indices.some(i => i < 0)) throw new Error('Expected Google Search Console columns: ' + required.join(', ') + '.')
  return { header, indices }
}
function count(value: string | undefined, field: string): number {
  const v = (value ?? '').trim().replace(/,/g, '')
  if (!/^\d+(?:\.\d+)?$/.test(v)) throw new Error('Invalid ' + field + ' value in CSV.')
  const n = Number(v)
  if (!Number.isSafeInteger(n) || n < 0) throw new Error('Invalid ' + field + ' count in CSV.')
  return n
}
function position(value: string | undefined): number | null {
  const v = (value ?? '').trim()
  if (!v) return null
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) throw new Error('Invalid Position value in CSV.')
  return n
}
export function parseSearchConsoleDates(csv: string): SearchMetrics {
  const rows = readCsv(csv)
  const { header, indices } = columns(rows, ['date', 'clicks', 'impressions'])
  const pIndex = header.indexOf('position')
  const dates = new Set<string>()
  let clicks = 0, impressions = 0, weightedPosition = 0, positionWeight = 0
  for (const row of rows.slice(1)) {
    const date = (row[indices[0]!] ?? '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date + 'T00:00:00Z'))) throw new Error('Expected an ISO Date column (YYYY-MM-DD).')
    if (dates.has(date)) throw new Error('Duplicate dates found. Upload the daily Dates.csv export, not a combined report.')
    dates.add(date)
    const c = count(row[indices[1]!], 'Clicks'), n = count(row[indices[2]!], 'Impressions')
    if (c > n) throw new Error('Clicks cannot exceed impressions for a daily row.')
    clicks += c; impressions += n
    if (pIndex >= 0) {
      const p = position(row[pIndex])
      if (p !== null && n > 0) { weightedPosition += p * n; positionWeight += n }
    }
  }
  if (!Number.isSafeInteger(impressions) || !Number.isSafeInteger(clicks)) throw new Error('CSV totals are too large.')
  const sorted = [...dates].sort()
  return {
    firstDate: sorted[0]!, lastDate: sorted[sorted.length - 1]!, days: sorted.length,
    clicks, impressions, ctr: impressions ? clicks / impressions : null,
    averagePosition: positionWeight ? weightedPosition / positionWeight : null,
  }
}
export function parseSearchConsoleQueries(csv: string): SearchQuery[] {
  const rows = readCsv(csv)
  const { indices } = columns(rows, ['query', 'clicks', 'impressions'])
  const results: SearchQuery[] = []
  for (const row of rows.slice(1)) {
    const query = (row[indices[0]!] ?? '').trim()
    if (!query) continue
    const clicks = count(row[indices[1]!], 'Clicks')
    const impressions = count(row[indices[2]!], 'Impressions')
    if (clicks > impressions) throw new Error('Clicks cannot exceed impressions in a query row.')
    results.push({ query: query.slice(0, 240), clicks, impressions, ctr: impressions ? clicks / impressions : null })
  }
  if (!results.length) throw new Error('No query records found.')
  return results.sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions).slice(0, 25)
}

/**
 * Pages.csv is the separately exported Pages dimension from Google Search Console.
 * It is NOT a conversion report. The URL must belong to the canonical Ask Intros host.
 */
export type SearchPage = {
  url: string
  path: string
  clicks: number
  impressions: number
  ctr: number | null
  position: number | null
}
export type SearchOpportunity = {
  path: string
  reason: 'snippet' | 'content'
  message: string
  impressions: number
  clicks: number
}
export function parseSearchConsolePages(csv: string): SearchPage[] {
  const rows = readCsv(csv)
  const head = rows[0]!.map(cell => cell.trim().toLowerCase())
  const pageIndex = head.indexOf('top pages') >= 0 ? head.indexOf('top pages') : head.indexOf('page')
  const clicksIndex = head.indexOf('clicks')
  const impressionsIndex = head.indexOf('impressions')
  const positionIndex = head.indexOf('position')
  if (pageIndex < 0 || clicksIndex < 0 || impressionsIndex < 0) {
    throw new Error('Expected Pages.csv with Top pages or Page, Clicks and Impressions columns.')
  }
  const pages = new Map<string, SearchPage>()
  for (const row of rows.slice(1)) {
    const raw = row[pageIndex]?.trim() ?? ''
    if (!raw) continue
    let url: URL
    try { url = new URL(raw) }
    catch { throw new Error('Pages.csv contains an invalid page URL.') }
    if (url.protocol !== 'https:' || url.hostname !== 'askintros.vip' || url.port || url.username || url.password) {
      throw new Error('Pages.csv includes a URL outside https://askintros.vip. Export only the Ask Intros property.')
    }
    const path = url.pathname.replace(/\/$/, '') || '/'
    const canonical = 'https://askintros.vip' + path
    const clicks = count(row[clicksIndex], 'Clicks')
    const impressions = count(row[impressionsIndex], 'Impressions')
    if (clicks > impressions) throw new Error('Clicks cannot exceed impressions for a page.')
    if (pages.has(canonical)) throw new Error('Duplicate canonical page rows. Export the Pages dimension without extra breakdowns.')
    const rank = positionIndex < 0 ? null : position(row[positionIndex])
    pages.set(canonical, { url: canonical, path, clicks, impressions, ctr: impressions ? clicks / impressions : null, position: rank })
  }
  if (pages.size === 0) throw new Error('No valid page rows found.')
  return [...pages.values()].sort((a,b)=>b.impressions-a.impressions || b.clicks-a.clicks).slice(0,100)
}

/** Heuristic review flags, not traffic or ranking predictions. */
export function prioritizeSearchPages(pages: SearchPage[]): SearchOpportunity[] {
  return pages.flatMap(page => {
    if (page.impressions < 50) return []
    const opportunities: SearchOpportunity[] = []
    if (page.ctr !== null && page.ctr < 0.02) {
      opportunities.push({
        path: page.path, reason: 'snippet', impressions: page.impressions, clicks: page.clicks,
        message: 'Review the title, description and query intent; a low clickthrough rate does not by itself prove a snippet problem.',
      })
    }
    if (page.position !== null && page.position > 10) {
      opportunities.push({
        path: page.path, reason: 'content', impressions: page.impressions, clicks: page.clicks,
        message: 'Review page usefulness, relevant internal links and search intent. Average position varies by query.',
      })
    }
    return opportunities
  }).sort((a,b)=>b.impressions-a.impressions).slice(0,20)
}

export const PUBLIC_DISCOVERY_ROUTES = [
  '/', '/how-it-works', '/warm-introductions', '/active-memory', '/early-access', '/founder-story',
  '/executive-networking', '/relationship-intelligence', '/ai-networking-assistant',
  '/business-relationship-crm', '/social-business-views',
] as const
export const SEARCH_CANONICAL_ORIGIN = 'https://askintros.vip'
export type CrawlResult = { path: string; status: 'pass' | 'warn' | 'fail'; detail: string }

/** Browser probes test raw HTTP HTML on the current deployed hostname; not actual index status. */
export async function runSearchCrawl(fetcher: typeof fetch, htmlParser: (html: string) => Document): Promise<CrawlResult[]> {
  const results: CrawlResult[] = []
  const request = async (path: string) => {
    const response = await fetcher(path, { cache: 'no-store', credentials: 'omit' })
    return { status: response.status, text: await response.text() }
  }
  let sitemap = ''
  try {
    const robots = await request('/robots.txt')
    results.push({ path: '/robots.txt', status: robots.status === 200 && /Sitemap:\s*https:\/\/askintros\.vip\/sitemap\.xml/i.test(robots.text) ? 'pass' : 'fail', detail: robots.status === 200 ? 'Check crawler allowance and canonical sitemap reference.' : 'Robots request returned HTTP ' + robots.status })
  } catch { results.push({ path: '/robots.txt', status: 'fail', detail: 'Robots request failed.' }) }
  try {
    const response = await request('/sitemap.xml')
    sitemap = response.status === 200 ? response.text : ''
    const doc = htmlParser(sitemap)
    const links = Array.from(doc.getElementsByTagName('loc')).map(node => node.textContent?.trim() ?? '')
    const missing = PUBLIC_DISCOVERY_ROUTES.filter(path => !links.includes(SEARCH_CANONICAL_ORIGIN + path))
    results.push({ path: '/sitemap.xml', status: response.status === 200 && !missing.length ? 'pass' : 'fail', detail: response.status !== 200 ? 'Sitemap returned HTTP ' + response.status : missing.length ? 'Missing public URLs: ' + missing.join(', ') : 'Eleven expected canonical URLs present.' })
  } catch { results.push({ path: '/sitemap.xml', status: 'fail', detail: 'Sitemap request failed.' }) }
  for (const path of PUBLIC_DISCOVERY_ROUTES) {
    try {
      const response = await request(path)
      if (response.status !== 200) { results.push({ path, status: 'fail', detail: 'HTTP ' + response.status }); continue }
      const doc = htmlParser(response.text)
      const title = doc.querySelector('title')?.textContent?.trim()
      const canonical = [...doc.querySelectorAll('link[rel="canonical"]')].map(node => node.getAttribute('href'))
      const robots = doc.querySelector('meta[name="robots"]')?.getAttribute('content') ?? ''
      const description = doc.querySelector('meta[name="description"]')?.getAttribute('content') ?? ''
      const heading = doc.querySelector('h1')?.textContent?.trim()
      const ld = [...doc.querySelectorAll('script[type="application/ld+json"]')]
      const issues: string[] = []
      if (!title) issues.push('Missing rendered title')
      if (canonical.length !== 1 || canonical[0] !== SEARCH_CANONICAL_ORIGIN + path) issues.push('Canonical mismatch')
      if (/noindex/i.test(robots)) issues.push('Noindex directive')
      if (!description) issues.push('Missing description')
      if (!heading) issues.push('No H1 in initial HTML')
      if (ld.length !== 1) issues.push('Expected one JSON-LD graph')
      else {
        try {
          const graph = JSON.parse(ld[0]!.textContent ?? '{}')['@graph']
          if (!Array.isArray(graph) || !graph.some(node => node['@type'] === 'Organization' && node['name'] === 'Ask Intros')) issues.push('Organization JSON-LD missing')
        } catch { issues.push('Invalid JSON-LD') }
      }
      results.push({ path, status: issues.length ? 'fail' : 'pass', detail: issues.length ? issues.join('; ') : 'Initial HTML contains heading, metadata, canonical, and organization data.' })
    } catch { results.push({ path, status: 'fail', detail: 'Page request failed.' }) }
  }
  return results
}
