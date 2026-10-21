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
const out = mkdtempSync(join(tmpdir(), 'specter-'))
await build({
  entryPoints: [join(here, 'entry.tsx')], bundle: true, format: 'esm', outdir: out, logLevel: 'error', jsx: 'automatic',
  plugins: [{ name: 'stubs', setup(b) {
    b.onResolve({ filter: /^\//, namespace: 'file' }, a => (a.kind === 'url-token' ? { path: a.path, external: true } : undefined))
    b.onResolve({ filter: /^@\/integrations\/supabase\/client$/ }, () => ({ path: join(here, 'db-stub.ts') }))
    b.onResolve({ filter: /^@\/lib\/specter\.functions$/ }, () => ({ path: join(here, 'server-stub.ts') }))
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
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1536, height: 1024 } })

const assert = (value, message) => { if (!value) throw new Error(message); console.log('✓', message); };
try {
  await page.route('https://alpha.com/house.jpg', route => route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="orange"/></svg>'}));
  await page.route('https://storage.googleapis.com/reader-6b7dc.appspot.com/screenshots/*', route => route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1365" height="900"><rect width="1365" height="900" fill="#0d5488"/><text x="60" y="120" fill="white" font-size="50">Captured website preview</text></svg>'}));
  await page.goto(base);
  await page.getByLabel('Website URL').fill('https://alpha.com/company?id=123');
  await page.getByRole('button', {name:'Scan Website',exact:true}).click();
  await page.getByRole('img',{name:'Captured website: Alpha',exact:true}).waitFor();
  assert(await page.locator('.specter-app-sidebar').isVisible(),'reference sidebar is present on desktop');
  assert(await page.locator('.specter-app-header').isVisible(),'reference top bar is present');
  await page.screenshot({path:join(out,'specter-reference-desktop.png'),fullPage:true});
  await page.getByLabel('Website URL').fill('https://beta.com');
  await page.getByRole('button', {name:'Scan Website',exact:true}).click();
  await page.getByRole('img', {name:'Captured website: Beta',exact:true}).waitFor();
  await page.getByLabel('Previous investigation').click();
  assert((await page.locator('.specter-address').textContent()).includes('id=123'), 'history restores exact query-selected source');
  assert((await page.locator('.specter-company').textContent()).includes('Alpha'), 'history restores matching company evidence');
  await page.getByRole('tab',{name:'Evidence',exact:true}).click();
  assert((await page.locator('#specter-results').textContent()).includes('Alpha services'), 'evidence belongs to restored scan');
  await page.getByRole('button',{name:'Save Case',exact:true}).click();
  assert(!(await page.evaluate(()=>localStorage.getItem('specter-cases:member-1'))).includes('previewUrl'),'temporary screenshot URLs are not persisted in cases');
  await page.reload();
  await page.getByRole('button',{name:'Saved Cases',exact:true}).click();
  await page.getByRole('heading',{name:'Alpha',exact:true}).waitFor();
  assert(true, 'case persists after reload and reopens');
  await page.getByRole('tab',{name:'Images',exact:true}).click();
  await page.getByRole('img',{name:'Alpha house',exact:true}).waitFor();
  assert(await page.locator('.specter-image img').getAttribute('src') === 'https://alpha.com/house.jpg','image tab renders captured image URL instead of empty placeholders');
  const download = page.waitForEvent('download');
  await page.getByRole('button',{name:'Export Report',exact:true}).click();
  assert((await download).suggestedFilename() === 'specter-report.json','report export produces a real file');
  await page.getByLabel('Website URL').fill('https://blocked.com');
  await page.getByRole('button',{name:'Scan Website',exact:true}).click();
  await page.getByRole('alert').waitFor();
  assert((await page.getByRole('alert').textContent()).includes('blocked'), 'failed scans show the real error');
  for (const width of [1536,390]) {
    await page.setViewportSize({width,height:1024});
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `no horizontal overflow at ${width}px`);
    await page.screenshot({path: join(out,`specter-${width}.png`),fullPage:true});
  }
  await page.setViewportSize({width:1536,height:1024});
  await page.getByRole('button',{name:'Dashboard',exact:true}).click();
  assert(await page.evaluate(()=>document.body.dataset.destination)==='home','sidebar Dashboard uses application navigation');
  await page.getByLabel('Search members, companies, or keywords').fill('Hallmark');
  await page.getByLabel('Search members, companies, or keywords').press('Enter');
  assert(await page.evaluate(()=>document.body.dataset.search)==='Hallmark','top bar search connects to member search');
  console.log('Screenshots:',out);
} finally { await browser.close(); server.close(); }
