// Browser check for "Scan LinkedIn profile": paste a profile, scan it, review each field next to
// the current value, and apply — only the ticked fields are written, and the confirmation says
// whether anything was saved. Also covers the demo reader (no server, nothing saved) used by
// the CRM's new-contact form.
// Run: node scripts/linkedin-scan-check/run.mjs   (SHOTS=dir to save screenshots)
import { build } from 'esbuild'
import { createServer } from 'node:http'
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const src = resolve(here, '../../src')
const out = mkdtempSync(join(tmpdir(), 'linkedin-scan-'))
await build({
  entryPoints: [join(here, 'entry.tsx')], bundle: true, format: 'esm', outdir: out, logLevel: 'error', jsx: 'automatic',
  plugins: [{ name: 'stubs', setup(b) {
    b.onResolve({ filter: /^\//, namespace: 'file' }, a => (a.kind === 'url-token' ? { path: a.path, external: true } : undefined))
    b.onResolve({ filter: /^@\/integrations\/supabase\/client$/ }, () => ({ path: join(here, 'db-stub.ts') }))
    b.onResolve({ filter: /^@\/lib\/linkedinImport\.functions$/ }, () => ({ path: join(here, 'server-stub.ts') }))
    b.onResolve({ filter: /^@\/lib\/voice\.functions$/ }, () => ({ path: join(here, 'voice-stub.ts') }))
    b.onResolve({ filter: /^pdfjs-dist/ }, () => ({ path: 'pdfjs-dist', namespace: 'empty' }))
    b.onLoad({ filter: /.*/, namespace: 'empty' }, () => ({ contents: 'export default {}', loader: 'js' }))
    b.onResolve({ filter: /^@\// }, a => {
      const p = join(src, a.path.slice(2))
      for (const ext of ['.ts', '.tsx', '/index.ts']) if (existsSync(p + ext)) return { path: p + ext }
      return undefined
    })
  } }],
  loader: { '.woff2': 'empty', '.woff': 'empty', '.png': 'empty', '.jpg': 'empty', '.svg': 'empty' }, define: { 'process.env.NODE_ENV': '"production"' },
})
writeFileSync(join(out, 'index.html'), '<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="entry.css"><div id="root"></div><script type="module" src="entry.js"></script>')
const server = createServer((req, res) => {
  const name = (req.url ?? '/').split('?')[0].slice(1) || 'index.html'
  const file = ['entry.js', 'entry.css'].includes(name) ? name : 'index.html'
  res.setHeader('content-type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html')
  res.end(readFileSync(join(out, file)))
}).listen(0, '127.0.0.1')
await new Promise(r => server.once('listening', r))
const base = `http://127.0.0.1:${server.address().port}/`
const chromiumPath = () => { const p = process.env.CHROMIUM ?? '/opt/pw-browsers/chromium'; return existsSync(p) ? { executablePath: p } : {} }
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? '/opt/node22/lib/node_modules/playwright/index.mjs')
const browser = await chromium.launch({ ...chromiumPath() })
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } })
const errors = []
page.on('pageerror', e => errors.push(e.message))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m) } else { fail++; console.log('  ✗', m) } }
const shot = async n => { if (process.env.SHOTS) await page.screenshot({ path: join(process.env.SHOTS, `${n}.png`), fullPage: true }) }
const PROFILE = readFileSync(join(here, 'profile.txt'), 'utf8')
const P = '#profile'
const row = (scope, key) => `${scope} [data-field=${key}]`
const box = (scope, key) => `${row(scope, key)} input[type=checkbox]`
const scanBtn = scope => `${scope} .li-scan-actions .btn.primary`

await page.goto(base)

// 1. Paste → Scan. A link that is not a LinkedIn profile is refused before anything is read.
ok(await page.isDisabled(scanBtn(P)), 'Scan is disabled until a profile is pasted')
await page.fill(`${P} input[inputmode=url]`, 'example.com/in/maya')
await page.fill(`${P} textarea[aria-label="Profile text"]`, PROFILE)
await page.click(scanBtn(P))
ok(/not a LinkedIn profile link/.test(await page.textContent(`${P} [role=alert]`) ?? ''), 'a non-LinkedIn link is refused')
ok(await page.evaluate(() => window.__scans.length) === 0, 'and nothing is sent to the server')
await page.fill(`${P} input[inputmode=url]`, 'linkedin.com/in/maya-okafor/')
await page.click(scanBtn(P))
await page.waitForSelector(`${P} .li-scan-review`)
ok(await page.evaluate(() => window.__scans.length) === 1, 'Scan sends the pasted text to the server reader once')

// 2. Review: every field next to its current value; nothing saved yet.
const title = row(P, 'title')
ok((await page.textContent(`${title} .li-scan-now`))?.includes('Founder') && await page.inputValue(`${title} input:not([type=checkbox])`) === 'Chief Executive Officer', 'the review shows the current title next to the scanned one')
ok(await page.inputValue(`${row(P, 'company')} input:not([type=checkbox])`) === 'Harbor Freight Labs', 'company is filled from the current role')
ok(await page.inputValue(`${row(P, 'linkedin_url')} input:not([type=checkbox])`) === 'https://www.linkedin.com/in/maya-okafor', 'the LinkedIn link is normalised')
ok(await page.isChecked(box(P, 'title')) && await page.isChecked(box(P, 'company')), 'changed fields are ticked')
ok(!(await page.isChecked(box(P, 'name'))) && !(await page.isChecked(box(P, 'location'))), 'fields that already match are not ticked')
ok(await page.isDisabled(box(P, 'industries')) && (await page.textContent(row(P, 'industries')))?.includes('Not on the profile'), 'fields the profile does not state stay empty and cannot be applied')
const reviewText = await page.textContent(`${P} .li-scan-review`)
ok(!/Tunde Bello|FreshBox|People also viewed/.test(reviewText ?? ''), 'other people’s profiles never reach the review')
ok(/built-in reader/.test(await page.textContent(`${P} .li-scan-source`) ?? ''), 'the review says which reader read it')
ok(await page.evaluate(() => window.__updates.length) === 0, 'nothing is saved before Apply')
await shot('review')

// 3. Apply writes only the ticked fields, with the member's edit.
await page.uncheck(box(P, 'company'))
await page.uncheck(box(P, 'headline'))
await page.uncheck(box(P, 'about'))
await page.fill(`${title} input:not([type=checkbox])`, 'CEO')
ok(/\(3 fields\)/.test(await page.textContent(scanBtn(P)) ?? ''), 'Apply shows how many fields will be written')
await page.click(scanBtn(P))
await page.waitForSelector(`${P} .li-scan-outcome`)
const updates = await page.evaluate(() => window.__updates)
const written = updates[0]?.row ?? {}
ok(updates.length === 1 && updates[0].table === 'profiles' && updates[0].id === '00000000-0000-4000-8000-00000000000a', 'Apply writes once, to the member’s own profile row')
ok(JSON.stringify(Object.keys(written).sort()) === JSON.stringify(['expertise', 'linkedin_url', 'title']), `only ticked fields are written (${Object.keys(written).join(', ')})`)
ok(written.title === 'CEO' && JSON.stringify(written.expertise) === JSON.stringify(['Supply Chain Management', 'Logistics', 'Cold Chain']) && written.linkedin_url === 'https://www.linkedin.com/in/maya-okafor', 'with the edited title, the skills as a list and the canonical link')
ok((await page.textContent(`${P} .li-scan-outcome`))?.trim() === 'Saved to your profile.' && await page.isVisible(`${P} .li-scan-outcome.saved`), 'the confirmation says it was saved to the profile')
await shot('saved')

// 4. A failed write says so, and keeps the review open.
await page.fill(`${P} textarea[aria-label="Profile text"]`, PROFILE)
await page.click(scanBtn(P))
await page.waitForSelector(`${P} .li-scan-review`)
await page.evaluate(() => { window.__failNext = true })
await page.click(scanBtn(P))
await page.waitForSelector(`${P} .li-scan-outcome.failed`)
ok(/^Not saved: permission denied/.test((await page.textContent(`${P} .li-scan-outcome`))?.trim() ?? ''), 'a failed save says “Not saved”')
ok(await page.isVisible(`${P} .li-scan-review`) && (await page.evaluate(() => window.__updates.length)) === 1, 'the review stays open and nothing extra is recorded')

// 5. Demo reader (as in /demo and the CRM new-contact form): labelled, reads on the device, fills the form only.
const C = '#contact'
ok(/Demo mode/.test(await page.textContent(`${C} .li-scan-demo`) ?? ''), 'demo mode is clearly labelled')
await page.fill(`${C} textarea[aria-label="Profile text"]`, PROFILE)
await page.click(scanBtn(C))
await page.waitForSelector(`${C} .li-scan-review`)
ok(await page.evaluate(() => window.__scans.length) === 2, 'the demo reads on the device (no server call)')
ok(/^Demo:/.test(await page.textContent(`${C} .li-scan-source`) ?? ''), 'the demo review is labelled as the built-in reader')
ok(await page.isChecked(box(C, 'name')), 'an empty contact form gets every stated field ticked')
await page.uncheck(box(C, 'about'))
await page.click(scanBtn(C))
await page.waitForSelector(`${C} .li-scan-outcome.filled`)
const form = JSON.parse(await page.textContent('#contact-form'))
ok(form.name === 'Maya Okafor' && form.company === 'Harbor Freight Labs' && form.title === 'Chief Executive Officer' && !('about' in form), 'Apply fills only the ticked contact fields')
ok(/Not saved yet/.test(await page.textContent(`${C} .li-scan-outcome`) ?? '') && (await page.evaluate(() => window.__updates.length)) === 1, 'and says the contact is not saved yet')

// 6. Readable: text on the opaque card meets WCAG AA (4.5:1).
const contrast = await page.evaluate(() => {
  const lum = c => { const [r, g, b] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
  const bgOf = el => { for (let e = el; e; e = e.parentElement) { const b = getComputedStyle(e).backgroundColor; if (!/rgba\(.*, 0\)|transparent/.test(b)) return b } return 'rgb(0,0,0)' }
  const worst = []
  for (const el of document.querySelectorAll('.li-scan p, .li-scan small, .li-scan label, .li-scan-now, .li-scan-none, .li-scan h2')) {
    if (!el.textContent.trim() || !el.offsetParent) continue
    const a = lum(getComputedStyle(el).color), b = lum(bgOf(el))
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
    if (ratio < 4.5) worst.push(`${el.className || el.tagName}: ${ratio.toFixed(2)}`)
  }
  const opaque = [...document.querySelectorAll('.li-scan')].every(el => !/rgba\(.*, 0(\.\d+)?\)/.test(getComputedStyle(el).backgroundColor))
  return { worst, opaque }
})
ok(contrast.opaque, 'the scan card has an opaque background')
ok(contrast.worst.length === 0, `all scan text meets AA contrast${contrast.worst.length ? ': ' + contrast.worst.join('; ') : ''}`)

// 7. Phone width: no sideways scrolling.
await page.setViewportSize({ width: 375, height: 800 })
ok(await page.evaluate(() => document.documentElement.scrollWidth <= 376), 'no horizontal scroll at phone width')
await shot('phone')

ok(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join('; ') : ''}`)
await browser.close(); server.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
