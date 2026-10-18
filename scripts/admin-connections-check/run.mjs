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
const out = mkdtempSync(join(tmpdir(), 'admin-connections-'))
await build({
  entryPoints: [join(here, 'entry.tsx')], bundle: true, format: 'esm', outdir: out, logLevel: 'error', jsx: 'automatic',
  plugins: [{ name: 'stubs', setup(b) {
    b.onResolve({ filter: /^\//, namespace: 'file' }, a => (a.kind === 'url-token' ? { path: a.path, external: true } : undefined))
    b.onResolve({ filter: /^@\/integrations\/supabase\/client$/ }, () => ({ path: join(here, 'db-stub.ts') }))
    b.onResolve({ filter: /^@\/lib\/voice\.functions$/ }, () => ({ path: join(here, 'voice-stub.ts') }))
    b.onResolve({ filter: /^\.\/access$/ }, a => a.importer.endsWith('admin-connections.tsx') ? { path: join(here, 'access-stub.ts') } : undefined)
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
page.on('pageerror', error => errors.push(error.message))
const assert = (condition, description) => { if (!condition) throw new Error(description); console.log('✓', description) }
const button = name => page.getByRole('button', { name, exact: true })
try {
 await page.goto(base)
 await button('Run connection checks').waitFor()
 assert((await page.evaluate(() => window.__calls)).length === 0, 'admin reads are not run until requested')
 await button('Ordinary member').click()
 await button('Run connection checks').waitFor({state:'hidden'})
 assert((await page.evaluate(() => window.__calls)).length === 0, 'ordinary member has neither panel nor automatic probes')
 await button('Admin A').click()
 await button('Run connection checks').click()
 await page.getByText('2 of 7 reads verified.', {exact:false}).waitFor()
 for (const label of ['Database setup needed','Access denied','Needs attention','Unexpected response','Unavailable']) assert(await page.getByText(label,{exact:true}).isVisible(),label+' is distinct')
 assert(!(await page.textContent('body')).includes('DO_NOT_DISPLAY_TOKEN'),'raw backend messages are not displayed')
 const calls = await page.evaluate(() => window.__calls)
 assert(calls.length === 7 && !calls.some(name => /insert|publish|send|delete|update|act_on/.test(name)),'only seven allowed reads are issued')
 for (const theme of ['light','dark']) {
  await page.evaluate(mode => {document.documentElement.dataset.theme=mode},theme)
  const metrics = await page.evaluate(() => {
   const el=document.querySelector('.admin-connection-checks'); const style=getComputedStyle(el)
   const luminance=color=>color.match(/[\d.]+/g).slice(0,3).map(Number).map(c=>{c/=255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4}).reduce((s,c,i)=>s+c*[.2126,.7152,.0722][i],0)
   const a=luminance(style.color), b=luminance(style.backgroundColor)
   return {overflow:document.documentElement.scrollWidth>innerWidth+2,contrast:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)}
  })
  assert(!metrics.overflow,theme+' mobile report fits the viewport')
  assert(metrics.contrast>=4.5,theme+' report contrast >= 4.5:1')
  await page.screenshot({path:join(out,theme+'.png'),fullPage:true})
 }
 await button('Admin B').click()
 await page.getByText('No checks run in this session.').waitFor()
 assert(await page.locator('[data-state]').count()===0,'another administrator does not inherit a stale report')
 await page.evaluate(()=>{window.__delay=true})
 await button('Run connection checks').click()
 await button('Checking connections…').waitFor()
 await button('Ordinary member').click()
 await button('Run connection checks').waitFor({state:'hidden'})
 await button('Admin A').click()
 await page.getByText('No checks run in this session.').waitFor()
 assert(await page.locator('[data-state]').count()===0,'cancelled checks cannot reappear after account change')
 assert(!errors.length,'no browser runtime errors: '+errors.join(', '))
 console.log('Screenshots: '+out)
} finally { await browser.close(); server.close() }
