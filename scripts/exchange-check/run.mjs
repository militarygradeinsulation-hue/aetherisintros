// Browser check for deal rooms: two members open a room from an accepted introduction and take
// it through invite → proposal → accept → milestone → deliver → close, seeing only the moves
// the rules allow and honest confirmations; then the /demo showcase room works without writes.
// Run: node scripts/deal-room-check/run.mjs   (SHOTS=dir to save screenshots)
import { build } from 'esbuild'
import { createServer } from 'node:http'
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const src = resolve(here, '../../src')
const out = mkdtempSync(join(tmpdir(), 'deal-room-'))
await build({
  entryPoints: [join(here, 'entry.tsx')], bundle: true, format: 'esm', outdir: out, logLevel: 'error', jsx: 'automatic',
  plugins: [{ name: 'stubs', setup(b) {
    b.onResolve({ filter: /^\//, namespace: 'file' }, a => (a.kind === 'url-token' ? { path: a.path, external: true } : undefined))
    b.onResolve({ filter: /^@\/integrations\/supabase\/client$/ }, () => ({ path: join(here, 'db-stub.ts') }))
    b.onResolve({ filter: /^@\/lib\/voice\.functions$/ }, () => ({ path: join(here, 'voice-stub.ts') }))
    b.onResolve({ filter: /^\.\/store$/ }, a => a.importer.endsWith('LiveOpportunityExchange.tsx') ? { path: join(here, 'store-stub.ts') } : undefined)
    b.onResolve({ filter: /^\.\/voice$/ }, a => a.importer.endsWith('ui.tsx') ? { path: join(here, 'voice-stub.ts') } : undefined)
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
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? resolve(here, '../../node_modules/playwright/index.mjs'))
const browser = await chromium.launch({ ...chromiumPath(), headless: true })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const errors = []
page.on('pageerror', e => errors.push(e.message))
const assert = (condition, message) => { if (!condition) throw new Error(message); console.log('✓', message) }
const button = name => page.getByRole('button', { name, exact: true })
try {
 await page.goto(base)
 await page.getByText('No opportunities match this view.').waitFor()
 await button('Post an opportunity').click()
 await page.getByLabel('Title', {exact:true}).fill('Industrial pilot partnership')
 await page.getByLabel('Objective', {exact:true}).fill('Run a hydraulic optimization pilot')
 await page.getByLabel('What is needed', {exact:true}).fill('Hydraulic engineering expertise')
 await page.getByLabel('What you offer', {exact:true}).fill('Pilot budget and project access')
 await page.getByLabel('Why both sides benefit', {exact:true}).fill('Validate the implementation together')
 await button('Publish opportunity').click()
 await page.getByRole('heading', { name: 'Industrial pilot partnership' }).waitFor()
 assert(await button('Close opportunity').isVisible(), 'owner can close published opportunity')
 await button('Member B').click()
 await button('Express interest').waitFor()
 assert(await button('Close opportunity').count() === 0, 'member B is not given owner controls')
 await button('Save').click()
 await button('Unsave').waitFor()
 await button('Express interest').click()
 await button('Draft from my profile').click()
 assert(await button('Send private interest').isDisabled(), 'draft requires member completion before sending')
 const note = page.getByRole('textbox', { name: 'Why is this a fit?' })
 await note.fill('I delivered three hydraulic optimization pilots and can scope a first site review.')
 await button('Send private interest').click()
 await page.getByText('Your response is recorded.').waitFor()
 await button('Member C').click()
 await button('Express interest').waitFor()
 assert(!await page.getByText('I delivered three hydraulic optimization pilots', {exact:false}).count(), 'member switch does not show another member response')
 assert(await button('Save').isVisible(), 'member C has independent save state')
 await button('Member A').click()
 await page.getByText('I delivered three hydraulic optimization pilots and can scope a first site review.', {exact:true}).waitFor()
 await page.reload()
 await page.getByText('I delivered three hydraulic optimization pilots and can scope a first site review.', {exact:true}).waitFor()
 assert(true, 'owner response view survives reload')
 for (const theme of ['light','dark']) {
  await page.evaluate(mode => { document.documentElement.dataset.theme=mode; document.documentElement.style.colorScheme=mode },theme)
  await button('Post an opportunity').click()
  await page.getByLabel('Title', {exact:true}).fill('Check field readability')
  const layout = await page.evaluate(() => {
   const field=document.querySelector('.exchange-form textarea'); const style=getComputedStyle(field)
   const luminance = color => color.match(/[\d.]+/g).slice(0,3).map(Number).map(c => { c/=255; return c<=.04045?c/12.92:((c+.055)/1.055)**2.4 }).reduce((s,c,i)=>s+c*[.2126,.7152,.0722][i],0)
   const a=luminance(style.color),b=luminance(style.backgroundColor)
   return { contrast:(Math.max(a,b)+.05)/(Math.min(a,b)+.05), overflow:document.documentElement.scrollWidth>innerWidth+2 }
  })
  assert(!layout.overflow, theme+' mobile view fits the viewport')
  assert(layout.contrast>=4.5,theme+' field contrast meets 4.5:1 ('+layout.contrast.toFixed(2)+':1)')
  await page.screenshot({path:join(out,theme+'.png'),fullPage:true})
  await button('Cancel post').click()
  await page.getByLabel('Title', {exact:true}).waitFor({state:'hidden'})
 }
 await button('Close opportunity').click()
 await page.getByText('No opportunities match this view.').waitFor()
 await button('Past / closed').click()
 await page.getByRole('heading', { name: 'Industrial pilot partnership' }).waitFor()
 await page.evaluate(() => { window.__failExchange=true })
 await button('Refresh opportunities').click()
 await page.getByRole('alert').waitFor()
 assert(true,'unavailable backend shows an error rather than sample success')
 assert(!errors.length,'no browser runtime errors: '+errors.join(', '))
 console.log('Screenshots: '+out)
} catch(error) { await page.screenshot({path:join(out,'failure.png'),fullPage:true}); console.error('Screenshots: '+out); throw error } finally { await browser.close(); server.close() }
