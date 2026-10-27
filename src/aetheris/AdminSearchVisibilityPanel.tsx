import { useState } from 'react'
import { BarChart3, FileUp, SearchCheck, Sparkles } from 'lucide-react'
import {
  parseSearchConsoleDates, parseSearchConsoleQueries, parseSearchConsolePages, prioritizeSearchPages, runSearchCrawl,
  SEARCH_CANONICAL_ORIGIN, type SearchMetrics, type SearchQuery, type SearchPage, type CrawlResult,
} from './lib/search-visibility'
import './admin-search-visibility.css'

const PROMPTS = [
  'What platforms help CEOs find relevant business introductions?',
  'What software combines executive networking with a business CRM?',
  'How can founders request double opt in warm introductions?',
  'What tools help business owners remember relationship context?',
] as const
const ENGINES = ['ChatGPT Search', 'Gemini', 'Perplexity', 'Bing Copilot'] as const
type Observation = 'untested' | 'not-mentioned' | 'mentioned' | 'cited'
type Entry = { status: Observation; source: string }
const format = (n: number) => n.toLocaleString()
const percentage = (n: number | null) => n === null ? 'Not measured' : (100 * n).toFixed(2) + '%'
const nodeParser = (html: string) => new DOMParser().parseFromString(html, html.trimStart().startsWith('<?xml') ? 'text/xml' : 'text/html')

/**
 * Mounted only inside the guarded Launch Control route. No admin information or
 * Search Console exports are sent to a backend. Revisit with server-side GSC OAuth
 * only when a verified Google property is connected.
 */
export function AdminSearchVisibilityPanel() {
  const [metrics, setMetrics] = useState<SearchMetrics | null>(null)
  const [queries, setQueries] = useState<SearchQuery[] | null>(null)
  const [pages, setPages] = useState<SearchPage[] | null>(null)
  const [metricsFile, setMetricsFile] = useState('')
  const [queriesFile, setQueriesFile] = useState('')
  const [pagesFile, setPagesFile] = useState('')
  const [error, setError] = useState('')
  const [crawl, setCrawl] = useState<CrawlResult[] | null>(null)
  const [crawlAt, setCrawlAt] = useState('')
  const [checking, setChecking] = useState(false)
  const [observations, setObservations] = useState<Record<string, Entry>>({})

  const importCsv = async (file: File | undefined, kind: 'dates' | 'queries' | 'pages') => {
    if (!file) return
    setError('')
    try {
      if (file.size > 2_000_000) throw new Error('Only CSV files smaller than 2 MB are supported.')
      if (!file.name.toLowerCase().endsWith('.csv')) throw new Error('Use a Search Console CSV export.')
      const csv = await file.text()
      if (kind === 'dates') {
        setMetrics(parseSearchConsoleDates(csv))
        setMetricsFile(file.name)
      } else if (kind === 'queries') {
        setQueries(parseSearchConsoleQueries(csv))
        setQueriesFile(file.name)
      } else {
        setPages(parseSearchConsolePages(csv))
        setPagesFile(file.name)
      }
    } catch (cause) {
      if (kind === 'dates') { setMetrics(null); setMetricsFile('') }
      else if (kind === 'queries') { setQueries(null); setQueriesFile('') }
      else { setPages(null); setPagesFile('') }
      setError(cause instanceof Error ? cause.message : 'Could not import the CSV.')
    }
  }

  const checkPages = async () => {
    if (checking) return
    setChecking(true)
    setCrawl(null)
    setError('')
    try {
      const result = await runSearchCrawl(fetch, nodeParser)
      setCrawl(result)
      setCrawlAt(new Date().toLocaleString())
    } catch {
      setError('Unable to complete the HTTP checks. Verify the current deployment and try again.')
    } finally { setChecking(false) }
  }
  const measured = Object.values(observations).filter(row => row.status !== 'untested')
  const cited = measured.filter(row => row.status === 'cited').length
  const passing = crawl?.filter(row => row.status === 'pass').length ?? 0
  const pageOpportunities = pages ? prioritizeSearchPages(pages) : []
  const updateEntry = (key: string, patch: Partial<Entry>) => {
    setObservations(previous => ({ ...previous, [key]: { status: previous[key]?.status ?? 'untested', source: previous[key]?.source ?? '', ...patch } }))
  }
  return <section id="search-visibility" className="admin-panel search-visibility" aria-label="SEO and AI search visibility dashboard">
    <div className="sv-head">
      <span className="sv-kicker"><SearchCheck size={16} /> SEARCH / DISCOVERY</span>
      <h2>SEO & AI visibility</h2>
      <p>Admin-only measurement. Real page checks and optionally imported Google Search Console data; no simulated rankings, referrals or AI citations.</p>
    </div>
    <div className="sv-grid">
      <div className="sv-stat"><span>HTTP discovery checks</span><strong>{crawl ? `${passing} / ${crawl.length}` : 'Not tested'}</strong><small>{crawlAt ? 'Checked ' + crawlAt : 'Run the live check below'}</small></div>
      <div className="sv-stat"><span>Search impressions</span><strong>{metrics ? format(metrics.impressions) : 'Not connected'}</strong><small>{metrics ? `${metrics.firstDate} to ${metrics.lastDate}` : 'Import daily Google Search Console data'}</small></div>
      <div className="sv-stat"><span>Organic search clicks</span><strong>{metrics ? format(metrics.clicks) : 'Not connected'}</strong><small>{metrics ? 'Imported Google Search Console dates' : 'No verified performance export'}</small></div>
      <div className="sv-stat"><span>AI answers manually checked</span><strong>{measured.length} / {PROMPTS.length * ENGINES.length}</strong><small>{cited} reported citation{cited === 1 ? '' : 's'}; not independently verified</small></div>
    </div>

    {error && <p className="sv-error" role="alert">{error}</p>}

    <div className="sv-block">
      <div className="sv-heading"><h3><SearchCheck size={17} /> Public technical audit</h3><button type="button" className="sv-button" onClick={() => void checkPages()} disabled={checking}>{checking ? 'Checking pages…' : 'Run HTTP checks'}</button></div>
      <p>Checks this deployment's raw HTML, robots.txt and sitemap. Passing checks do not mean Google or AI tools have indexed the page. If this is a preview hostname, repeat the check on the published domain.</p>
      <p>GitHub also runs a daily external check of the public domain. <a href="https://github.com/militarygradeinsulation-hue/aetherisintros/actions/workflows/live-search-monitor.yml" target="_blank" rel="noopener noreferrer">View external production checks</a>. This monitor reports crawl readiness, not Google indexing or search rank.</p>
      {typeof window !== 'undefined' && window.location.origin !== SEARCH_CANONICAL_ORIGIN && <p className="sv-warning">Current host: {window.location.origin}. Canonical site: {SEARCH_CANONICAL_ORIGIN}. Results here describe this host, not necessarily the live domain.</p>}
      {crawl && <div className="sv-scroll"><table className="sv-table"><thead><tr><th>Page or file</th><th>Status</th><th>Evidence</th></tr></thead><tbody>
        {crawl.map(row => <tr key={row.path}><td><code>{row.path}</code></td><td><span className={`sv-status sv-status--${row.status}`}>{row.status}</span></td><td>{row.detail}</td></tr>)}
      </tbody></table></div>}
    </div>

    <div className="sv-block">
      <h3><BarChart3 size={17} /> Google Search Console performance</h3>
      <p>Export <strong>Dates.csv</strong> from the Search Results performance report for daily totals. You may also import <strong>Queries.csv</strong> for top searches and <strong>Pages.csv</strong> for landing page performance. Files stay in this browser session; nothing is uploaded or saved to the member database.</p>
      <div className="sv-upload-row">
        <label className="sv-upload"><FileUp size={16} /><span>Import Dates.csv</span><input type="file" accept=".csv,text/csv" onChange={e => { void importCsv(e.target.files?.[0], 'dates'); e.target.value = '' }} /></label>
        <label className="sv-upload"><FileUp size={16} /><span>Import Queries.csv</span><input type="file" accept=".csv,text/csv" onChange={e => { void importCsv(e.target.files?.[0], 'queries'); e.target.value = '' }} /></label>
        <label className="sv-upload"><FileUp size={16} /><span>Import Pages.csv</span><input type="file" accept=".csv,text/csv" onChange={e => { void importCsv(e.target.files?.[0], 'pages'); e.target.value = '' }} /></label>
      </div>
      {metrics && <><p className="sv-subline">Source: {metricsFile} · {metrics.days} reported dates · {metrics.firstDate} through {metrics.lastDate}</p><div className="sv-grid sv-grid--metrics">
        <div className="sv-stat"><span>Clicks</span><strong>{format(metrics.clicks)}</strong></div>
        <div className="sv-stat"><span>Impressions</span><strong>{format(metrics.impressions)}</strong></div>
        <div className="sv-stat"><span>Clickthrough rate</span><strong>{percentage(metrics.ctr)}</strong></div>
        <div className="sv-stat"><span>Weighted position</span><strong>{metrics.averagePosition === null ? 'Not measured' : metrics.averagePosition.toFixed(1)}</strong></div>
      </div></>}
      {queries && <><p className="sv-subline">Top imported queries · {queriesFile}. Query export is a separate dimension and is not added to daily totals.</p><div className="sv-scroll"><table className="sv-table"><thead><tr><th>Query</th><th>Clicks</th><th>Impressions</th><th>CTR</th></tr></thead><tbody>
        {queries.map((item, i) => <tr key={i}><td>{item.query}</td><td>{format(item.clicks)}</td><td>{format(item.impressions)}</td><td>{percentage(item.ctr)}</td></tr>)}
      </tbody></table></div></>}
      {pages && <><p className="sv-subline">Page dimension · {pagesFile} · {pages.length} imported canonical URLs. Pages, queries and dates are separate views; never add their totals together.</p>
      <div className="sv-scroll"><table className="sv-table"><thead><tr><th>Page</th><th>Impressions</th><th>Clicks</th><th>CTR</th><th>Average position</th></tr></thead><tbody>
        {pages.map(page => <tr key={page.path}><td><code>{page.path}</code></td><td>{format(page.impressions)}</td><td>{format(page.clicks)}</td><td>{percentage(page.ctr)}</td><td>{page.position === null ? 'Not reported' : page.position.toFixed(1)}</td></tr>)}
      </tbody></table></div>
      <h3 className="sv-opportunity-title">Pages to review</h3>
      <p>Heuristic opportunities from the imported export: at least 50 impressions, a clickthrough rate below 2%, or an average position above 10. These are starting points, not predictions or confirmed problems.</p>
      {pageOpportunities.length ? <div className="sv-scroll"><table className="sv-table"><thead><tr><th>Page</th><th>Review focus</th><th>Impressions</th><th>Why review it</th></tr></thead><tbody>
        {pageOpportunities.map((item, index) => <tr key={item.path + item.reason + index}><td><code>{item.path}</code></td><td>{item.reason === 'snippet' ? 'Search snippet and intent' : 'Page content and links'}</td><td>{format(item.impressions)}</td><td>{item.message}</td></tr>)}
      </tbody></table></div> : <p className="sv-unconnected">No pages meet those review thresholds in this imported report. This does not prove pages are optimized or indexed.</p>}</>}
      {!metrics && !queries && !pages && <p className="sv-unconnected">No Search Console data imported. A verified Google property and integration are not assumed.</p>}
    </div>

    <div className="sv-block">
      <h3><Sparkles size={17} /> AI answer discovery log</h3>
      <p>Use these four buyer questions to test each engine. Record only what you actually observe. “Cited” means a visible link or citation to Ask Intros; a mention without a citation is different. These notes are temporary and are not automated tests.</p>
      <div className="sv-scroll"><table className="sv-table sv-ai-table"><thead><tr><th>Buyer question</th><th>Engine</th><th>Observed result</th><th>Evidence URL, optional</th></tr></thead><tbody>
        {PROMPTS.flatMap((prompt, index) => ENGINES.map(engine => {
          const key = index + ':' + engine
          const entry = observations[key]
          return <tr key={key}><td>{prompt}</td><td>{engine}</td><td>
            <select aria-label={`Observation for ${engine} prompt ${index + 1}`} value={entry?.status ?? 'untested'} onChange={e => updateEntry(key, { status: e.target.value as Observation })}>
              <option value="untested">Not tested</option><option value="not-mentioned">Not mentioned</option><option value="mentioned">Mentioned</option><option value="cited">Cited with link</option>
            </select>
          </td><td><input aria-label={`Evidence URL for ${engine} prompt ${index + 1}`} type="url" placeholder="https://…" value={entry?.source ?? ''} onChange={e => updateEntry(key, { source: e.target.value.slice(0, 400) })} /></td></tr>
        }))}</tbody></table></div>
    </div>
    <p className="sv-foot">Discovery tracking is diagnostic, not a ranking guarantee. Connect a verified property and server-authorized analytics before displaying automated conversion or AI citation totals.</p>
  </section>
}
