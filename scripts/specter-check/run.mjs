// Browser check for Specter's fixed workspace, interactive preview and captured evidence.
// Run: node scripts/specter-check/run.mjs
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
writeFileSync(join(out, 'index.html'), '<!doctype html><meta charset="utf-8"><style>html,body,#root{margin:0;width:100%;height:100%;}</style><link rel="stylesheet" href="entry.css"><div id="root"></div><script type="module" src="entry.js"></script>')
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
  await page.route('https://alpha.com/company?id=123', route => route.fulfill({
    status:200,contentType:'text/html',
    body:'<!doctype html><title>Alpha live</title><button id="interact" onclick="document.getElementById(\'feedback\').textContent=\'Clicked\'">Interact here</button><p id="feedback">Ready</p>',
  }));
  await page.route('https://beta.com/', route => route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>Beta live</title><p>Beta page</p>'}));
  await page.route('https://alpha.com/house.jpg', route => route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="orange"/></svg>'}));
  await page.route('https://storage.googleapis.com/reader-6b7dc.appspot.com/screenshots/*', route => route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1365" height="900"><rect width="1365" height="900" fill="#0d5488"/><text x="60" y="120" fill="white" font-size="50">Captured website preview</text></svg>'}));
  await page.goto(base);
  await page.getByLabel('Website URL').fill('https://alpha.com/company?id=123');
  await page.getByRole('button', {name:'Scan Website',exact:true}).click();
  await page.locator('iframe.specter-live-frame').waitFor();
  assert((await page.locator('iframe.specter-live-frame').getAttribute('src')).includes('alpha.com/company?id=123'), 'scan opens the original URL in the browser pane');
  await page.frameLocator('iframe.specter-live-frame').getByRole('button',{name:'Interact here'}).click();
  assert((await page.frameLocator('iframe.specter-live-frame').locator('#feedback').textContent()) === 'Clicked', 'embedded website accepts real user interaction');
  await page.getByRole('button',{name:'Capture',exact:true}).click();
  await page.getByRole('img',{name:'Captured website: Alpha',exact:true}).waitFor();
  await page.getByRole('button',{name:'Browse',exact:true}).click();
  assert(await page.locator('iframe.specter-live-frame').isVisible(), 'Browse tab restores the live interactive iframe');
  assert(await page.getByRole('link',{name:'Open full browser',exact:true}).first().getAttribute('href') === 'https://alpha.com/company?id=123', 'external browser action preserves the requested URL');
  await page.getByRole('button',{name:'Split view',exact:true}).click();
  assert(!(await page.locator('.specter-grid').evaluate(el=>el.classList.contains('specter-grid--browser-first'))), 'split view reveals the analysis workspace');
  await page.getByRole('button',{name:'Expand',exact:true}).click();
  assert(await page.locator('.specter-grid').evaluate(el=>el.classList.contains('specter-grid--browser-first')), 'expand restores the browser-first layout');
  assert(await page.locator('.specter-app-sidebar').isVisible(),'reference sidebar is present on desktop');
  assert(await page.locator('.specter-app-header').isVisible(),'reference top bar is present');
  assert(await page.evaluate(() => document.scrollingElement.scrollHeight <= innerHeight + 2),'desktop workspace locks the document to the viewport without dead space beneath');
  await page.screenshot({path:join(out,'specter-reference-desktop.png'),fullPage:true});
  await page.getByLabel('Website URL').fill('https://beta.com');
  await page.getByRole('button',{name:'Browse',exact:true}).last().click();
  await page.locator('iframe.specter-live-frame[src="https://beta.com/"]').waitFor();
  assert(await page.getByRole('link',{name:'Open full browser',exact:true}).first().getAttribute('href') === 'https://beta.com/', 'browse without a scan navigates to the website');
  await page.getByLabel('Website URL').fill('https://beta.com');
  await page.getByRole('button', {name:'Scan Website',exact:true}).click();
  await page.locator('iframe.specter-live-frame[src="https://beta.com/"]').waitFor();
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
  await page.getByRole('button',{name:'Track Company',exact:true}).click();
  assert((await page.evaluate(()=>localStorage.getItem('specter-tracked:member-1'))).includes('alpha.com'),'Track Company persists the captured company on this device');
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
    assert(await page.evaluate(() => document.scrollingElement.scrollHeight <= innerHeight + 2), `locked document has no dead space at ${width}px`);
    if (width === 390) {
      await page.getByRole('button',{name:'Open workspace menu'}).click();
      assert(await page.getByRole('navigation',{name:'Mobile workspace navigation'}).isVisible(),'mobile workspace navigation opens');
      await page.getByRole('button',{name:'Close workspace menu'}).click();
    }
    await page.screenshot({path: join(out,`specter-${width}.png`),fullPage:true});
  }
  await page.setViewportSize({width:1536,height:1024});
  await page.getByRole('navigation',{name:'Workspace navigation'}).getByRole('button',{name:'Dashboard',exact:true}).click();
  assert(await page.evaluate(()=>document.body.dataset.destination)==='home','sidebar Dashboard uses application navigation');
  await page.getByLabel('Search members, companies, or keywords').fill('Hallmark');
  await page.getByLabel('Search members, companies, or keywords').press('Enter');
  assert(await page.evaluate(()=>document.body.dataset.search)==='Hallmark','workspace sidebar search connects to member search');
  // Collapsible sidebar: hide, persist across reload, restore.
  await page.getByRole('button',{name:'Hide sidebar'}).click();
  assert(!(await page.locator('.specter-app-sidebar').isVisible()),'hide control removes the sidebar panel');
  assert(await page.getByRole('button',{name:'Show sidebar'}).isVisible(),'a persistent expand control stays in the top bar');
  assert((await page.evaluate(()=>localStorage.getItem('aetheris.sidebar.collapsed')))==='1','collapsed preference is saved on this device');
  await page.reload();
  await page.getByRole('button',{name:'Show sidebar'}).waitFor();
  assert(!(await page.locator('.specter-app-sidebar').isVisible()),'collapsed preference survives reload');
  await page.getByRole('button',{name:'Show sidebar'}).click();
  assert(await page.locator('.specter-app-sidebar').isVisible(),'expand control restores the sidebar');
  assert((await page.evaluate(()=>localStorage.getItem('aetheris.sidebar.collapsed')))==='0','restored preference is saved on this device');

  // Executive launcher regression: sidebar action opens the real dialog, no
  // floating bubble ever overlaps the Butler launcher.
  await page.goto(base + '#executive');
  await page.reload(); // same-URL hash change does not remount the harness
  assert((await page.locator('.executive-upgrade-trigger').count()) === 0, 'no floating Executive bubble is rendered');
  const fab = page.locator('.ask-dock-fab');
  assert(await fab.isVisible(), 'Butler launcher stays visible');
  await fab.click({ trial: true });
  assert(true, 'Butler launcher is clickable and unobstructed');
  await page.getByRole('navigation', { name: 'Workspace navigation' }).getByRole('button', { name: 'Executive access' }).click();
  await page.getByRole('dialog', { name: 'Apply for Executive' }).waitFor();
  assert(true, 'sidebar Executive access action opens the real membership dialog');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  assert((await page.getByRole('dialog').count()) === 0, 'Executive dialog closes');
  await page.getByRole('button', { name: 'Hide sidebar' }).click();
  await page.getByRole('button', { name: 'Show sidebar' }).click();
  assert(await page.getByRole('navigation', { name: 'Workspace navigation' }).getByRole('button', { name: 'Executive access' }).isVisible(), 'Executive action is available again after expanding the sidebar');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Open workspace menu' }).click();
  await page.getByRole('navigation', { name: 'Mobile workspace navigation' }).getByRole('button', { name: 'Executive access' }).click();
  await page.getByRole('dialog', { name: 'Apply for Executive' }).waitFor();
  assert((await page.getByRole('navigation', { name: 'Mobile workspace navigation' }).count()) === 0, 'mobile drawer closes when the Executive action opens');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    assert((await page.locator('.executive-upgrade-trigger').count()) === 0, `no floating Executive bubble at ${width}px`);
    assert(await fab.isVisible(), `Butler launcher visible at ${width}px`);
    await fab.click({ trial: true });
    assert(true, `Butler launcher unobstructed at ${width}px`);
  }
  console.log('Screenshots:',out);
} finally { await browser.close(); server.close(); }
