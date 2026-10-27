import test from 'node:test'
import assert from 'node:assert/strict'
import { audit, htmlProblems, sitemapProblems, robotsProblems, publicGet, ROUTES, ORIGIN, report } from './production-monitor.mjs'

function html(path = '/') {
  return '<!doctype html><html><head><title>Ask Intros | Executive Networking</title>' +
    '<meta name="description" content="Meet relevant executives through mutual consent introductions.">' +
    '<meta name="robots" content="index,follow">' +
    '<link rel="canonical" href="' + ORIGIN + path + '">' +
    '<script type="application/ld+json">' +
    JSON.stringify({ '@context': 'https://schema.org', '@graph': [
      { '@type': 'Organization', name: 'Ask Intros' },
      { '@type': 'WebPage', url: ORIGIN + path },
    ] }) + '</script></head><body><h1>Find the right introductions</h1></body></html>'
}
function robots() {
  return 'User-agent: *\nAllow: /\n\nSitemap: ' + ORIGIN + '/sitemap.xml\n'
}
function sitemap() {
  return '<?xml version="1.0"?><urlset>' + ROUTES.map(path => '<url><loc>' + ORIGIN + path + '</loc></url>').join('') + '</urlset>'
}
function responses(url) {
  const path = new URL(url).pathname
  if (path === '/robots.txt') return new Response(robots(), { headers: { 'Content-Type': 'text/plain' } })
  if (path === '/sitemap.xml') return new Response(sitemap(), { headers: { 'Content-Type': 'application/xml' } })
  return new Response(html(path), { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
test('public route inventory excludes protected member data', () => {
  assert.equal(ROUTES.length, 11)
  assert(!ROUTES.some(path => path.startsWith('/admin') || path === '/app' || path.startsWith('/api')))
})
test('finds missing SEO metadata and noindex in initial server HTML', () => {
  assert.deepEqual(htmlProblems(html('/how-it-works'), '/how-it-works'), [])
  const degraded = html('/how-it-works').replace('<h1>', '<h2>').replace('index,follow', 'noindex,follow')
  assert(htmlProblems(degraded, '/how-it-works').some(s => s.includes('heading')))
  assert(htmlProblems(degraded, '/how-it-works').some(s => s.includes('noindex')))
  assert(htmlProblems(html('/wrong'), '/how-it-works').some(s => s.includes('Canonical')))
})
test('requires a complete canonical sitemap and default crawl allowance', () => {
  assert.deepEqual(sitemapProblems(sitemap()), [])
  assert.deepEqual(robotsProblems(robots()), [])
  assert(sitemapProblems('<urlset></urlset>').some(s => s.includes('Sitemap missing')))
  assert(robotsProblems('User-agent: *\nDisallow: /\n').length > 0)
})
test('does not follow redirects to external hosts', async () => {
  const evil = () => new Response(null, { status: 302, headers: { location: 'https://bad.example/phishing' } })
  await assert.rejects(publicGet('/', evil), /Redirect leaves canonical host/)
})
test('executes production diagnostics without cookies or private URLs', async () => {
  const fetched = []
  const run = await audit((url, options) => {
    fetched.push({ url, options })
    return Promise.resolve(responses(url))
  })
  assert.equal(run.length, 13)
  assert(run.every(x => x.status === 'PASS'), JSON.stringify(run))
  assert(fetched.every(x => x.options.credentials === 'omit'))
  assert(fetched.every(x => new URL(x.url).origin === ORIGIN))
  assert.equal(report(run).failures, 0)
})
