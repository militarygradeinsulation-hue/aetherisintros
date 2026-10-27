#!/usr/bin/env node
/** Public HTTP crawl-readiness checks. This never requests protected member URLs. */
import { appendFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'

export const ORIGIN = 'https://askintros.vip'
export const ROUTES = [
  '/', '/how-it-works', '/warm-introductions', '/active-memory',
  '/executive-networking', '/relationship-intelligence', '/ai-networking-assistant',
  '/business-relationship-crm', '/social-business-views', '/warm-introduction-playbook', '/early-access', '/founder-story',
]

function canonical(value) {
  try {
    const url = new URL(value)
    return url.origin === ORIGIN && !url.username && !url.password && url.protocol === 'https:'
  } catch { return false }
}
export function htmlProblems(html, path) {
  const failures = []
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? ''
  if (!/Ask\s*Intros/i.test(title.replace(/&amp;/g, '&'))) failures.push('Ask Intros title missing in server HTML')
  if (!/<h1\b/i.test(html)) failures.push('Server HTML missing main heading')
  const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map(m => m[0])
  const description = metas.find(tag => /\bname=["']description["']/i.test(tag))
  if (!description || !/\bcontent=["'][^"']{20,}["']/i.test(description)) failures.push('Meaningful description missing')
  const robots = metas.find(tag => /\bname=["']robots["']/i.test(tag))
  if (robots && /noindex/i.test(robots)) failures.push('HTML contains noindex')
  const canonicalLinks = [...html.matchAll(/<link\b[^>]*>/gi)].map(m => m[0]).filter(tag => /\brel=["']canonical["']/i.test(tag))
  const expected = ORIGIN + path
  if (canonicalLinks.length !== 1 || !canonicalLinks[0].includes('href="' + expected + '"')) failures.push('Canonical mismatch: ' + expected)
  const jsonScripts = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  if (jsonScripts.length !== 1) failures.push('Expected one public JSON-LD identity graph')
  else {
    try {
      const graph = JSON.parse(jsonScripts[0][1])['@graph']
      if (!Array.isArray(graph) || !graph.some(node => node['@type'] === 'Organization' && node.name === 'Ask Intros') ||
        !graph.some(node => node['@type'] === 'WebPage' && node.url === expected)) failures.push('Organization or WebPage identity missing')
    } catch { failures.push('Malformed structured data') }
  }
  return failures
}
export function sitemapProblems(xml) {
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map(m => m[1].replaceAll('&amp;', '&').trim())
  const missing = ROUTES.filter(path => !urls.includes(ORIGIN + path))
  return [
    ...(!/<urlset\b/i.test(xml) ? ['Missing urlset'] : []),
    ...(missing.length ? ['Sitemap missing: ' + missing.join(', ')] : []),
    ...(urls.some(url => !canonical(url)) ? ['Sitemap has noncanonical host URL'] : []),
  ]
}
export function robotsProblems(body) {
  const text = body.replace(/\r/g, '')
  const problems = []
  if (!/Sitemap:\s*https:\/\/askintros\.vip\/sitemap\.xml/i.test(text)) problems.push('Canonical sitemap reference missing')
  if (!/User-agent:\s*\*\s*\nAllow:\s*\//i.test(text)) problems.push('No default Allow: / rule')
  if (/User-agent:\s*\*[\s\S]*?Disallow:\s*\/\s*(?:\n|$)/i.test(text)) problems.push('Potential global Disallow: / rule')
  return problems
}
export async function publicGet(path, fetcher = fetch) {
  let problem = 'Unknown HTTP failure'
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      let url = ORIGIN + path
      for (let hop = 0; hop < 4; hop++) {
        const response = await fetcher(url, {
          redirect: 'manual', credentials: 'omit', cache: 'no-store',
          signal: AbortSignal.timeout(15000),
          headers: {
            'User-Agent': 'AskIntros-Search-Monitor/1.0 (+https://askintros.vip/robots.txt)',
            Accept: 'text/html,application/xml,text/plain;q=0.9,*/*;q=0.5',
          },
        })
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          const location = response.headers.get('location')
          if (!location) throw Error('Redirect missing Location')
          const redirected = new URL(location, url).href
          if (!canonical(redirected)) throw Error('Redirect leaves canonical host')
          url = redirected
          continue
        }
        if (response.status !== 200) throw Error('HTTP ' + response.status)
        const contentType = response.headers.get('content-type') ?? ''
        if (path === '/robots.txt' && !/text\/plain/i.test(contentType)) throw Error('robots.txt content type mismatch')
        if (path === '/sitemap.xml' && !/xml/i.test(contentType)) throw Error('sitemap.xml content type mismatch')
        if (!['/robots.txt', '/sitemap.xml'].includes(path) && !/text\/html/i.test(contentType)) throw Error('HTML content type mismatch')
        if (/noindex/i.test(response.headers.get('x-robots-tag') ?? '')) throw Error('HTTP X-Robots-Tag contains noindex')
        return await response.text()
      }
      throw Error('Redirect loop')
    } catch (e) {
      problem = e instanceof Error ? e.message : String(e)
      if (attempt === 0) await delay(300)
    }
  }
  throw Error(problem)
}
export async function audit(fetcher = fetch) {
  const results = []
  const check = async (path, validate) => {
    try {
      const text = await publicGet(path, fetcher)
      const failures = validate(text)
      results.push({ path, status: failures.length ? 'FAIL' : 'PASS', detail: failures.join('; ') || 'Initial HTML and metadata verified over HTTPS' })
    } catch (e) {
      results.push({ path, status: 'FAIL', detail: e instanceof Error ? e.message : String(e) })
    }
  }
  await check('/robots.txt', robotsProblems)
  await check('/sitemap.xml', sitemapProblems)
  for (const path of ROUTES) await check(path, html => htmlProblems(html, path))
  return results
}
export function report(results) {
  const fails = results.filter(r => r.status !== 'PASS').length
  const rows = results.map(r => '| ' + r.path + ' | ' + r.status + ' | ' + r.detail.replaceAll('|', '/') + ' |')
  return {
    failures: fails,
    markdown: ['# Ask Intros production search crawl readiness', '', 'HTTP checks do not prove search engine indexing or ranking.',
      '', '| URL | Result | Evidence |', '| --- | --- | --- |', ...rows, '',
      fails ? '**' + fails + ' failures.**' : '**All public readiness checks passed.**'].join('\n'),
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = report(await audit())
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, result.markdown + '\n')
  process.stdout.write(result.markdown + '\n')
  if (result.failures) process.exitCode = 1
}
