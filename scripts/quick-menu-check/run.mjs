// Browser check for the right-click quick menu: opens on right-click, shows context actions
// for members, links and selected text, keeps the browser menu in typing fields and with
// Shift, works by keyboard, and saves a member's customized items.
// Run: node scripts/quick-menu-check/run.mjs   (SHOTS=dir to save screenshots)
import { build } from 'esbuild'
import { createServer } from 'node:http'
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const src = resolve(here, '../../src')
const out = mkdtempSync(join(tmpdir(), 'quick-menu-'))
await build({
  entryPoints: [join(here, 'entry.tsx')], bundle: true, format: 'esm', outdir: out, logLevel: 'error', jsx: 'automatic',
  plugins: [{ name: 'stubs', setup(b) {
    b.onResolve({ filter: /^\//, namespace: 'file' }, a => (a.kind === 'url-token' ? { path: a.path, external: true } : undefined))
    b.onResolve({ filter: /^@\/integrations\/supabase\/client$/ }, () => ({ path: join(here, 'db-stub.ts') }))
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
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } })
const errors = []
page.on('pageerror', e => errors.push(e.message))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m) } else { fail++; console.log('  ✗', m) } }
const shot = async n => { if (process.env.SHOTS) await page.screenshot({ path: join(process.env.SHOTS, `${n}.png`) }) }
const menuLabels = () => page.$$eval('.qm [role=menuitem]', els => els.map(e => e.textContent))
const log = () => page.$$eval('#log li', els => els.map(e => e.textContent))

await page.goto(base)
await page.click('#blank', { button: 'right' })
ok(await page.isVisible('.qm'), 'right-click opens the quick menu')
const labels = await menuLabels()
ok(labels.includes('Post an ask') && labels.includes('Warm paths') && labels.at(-1) === 'Customize this menu…', 'it lists the default actions and Customize')
ok(await page.evaluate(() => document.activeElement?.textContent) === 'Post an ask', 'the first item has keyboard focus')
await shot('menu')
await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter')
ok((await log()).includes('go:page:people'), 'arrow keys and Enter run an action')
ok(!(await page.isVisible('.qm')), 'the menu closes after an action')

await page.click('#ana', { button: 'right' })
const memberLabels = await menuLabels()
ok(memberLabels[0] === 'Open Ana Diaz' && memberLabels[1] === 'Request intro to Ana Diaz', 'right-clicking a member offers their profile and an intro')
await page.click('text=Request intro to Ana Diaz')
ok((await log()).includes('intro:m1'), 'request intro runs for that member')

await page.click('#link', { button: 'right' })
ok((await menuLabels()).includes('Copy link'), 'links get Copy link and Open in new tab')
await page.keyboard.press('Escape')
ok(!(await page.isVisible('.qm')), 'Escape closes the menu')

await page.evaluate(() => { const r = document.createRange(); r.selectNodeContents(document.getElementById('text')); const s = getSelection(); s.removeAllRanges(); s.addRange(r) })
await page.click('#text', { button: 'right', position: { x: 5, y: 5 } })
ok((await menuLabels()).some(l => l.startsWith('Search members for')), 'selected text can be searched in the member directory')
await page.mouse.click(5, 5)
ok(!(await page.isVisible('.qm')), 'clicking elsewhere closes the menu')

const prevented = await page.evaluate(() => new Promise(r => {
  const el = document.getElementById('field')
  const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 })
  el.dispatchEvent(ev); r(ev.defaultPrevented)
}))
ok(!prevented && !(await page.isVisible('.qm')), 'typing fields keep the browser menu')
const shiftPrevented = await page.evaluate(() => {
  const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, shiftKey: true })
  document.getElementById('blank').dispatchEvent(ev); return ev.defaultPrevented
})
ok(!shiftPrevented, 'Shift + right-click keeps the browser menu')

// Near the bottom-right corner the menu stays on screen.
await page.mouse.click(1190, 790, { button: 'right' })
const box = await page.locator('.qm').boundingBox()
ok(box && box.x + box.width <= 1200 && box.y + box.height <= 800, 'the menu stays on screen near the corner')
await page.keyboard.press('Escape')

// Customize: remove "Post an ask", add "Peer groups", move it to the top, save.
await page.click('#blank', { button: 'right' })
await page.click('text=Customize this menu…')
ok(await page.isVisible('.qm-editor'), 'Customize opens the editor')
await page.click('[aria-label="Remove Post an ask"]')
await page.click('.qm-add >> text=Peer groups')
for (let i = 0; i < 7; i++) await page.click('[aria-label="Move Peer groups up"]').catch(() => {})
await shot('editor')
await page.click('.qm-primary')
ok(!(await page.isVisible('.qm-editor')), 'Save closes the editor')
const saved = await page.evaluate(() => window.__saved)
ok(saved?.items?.[0] === 'peergroups' && !saved.items.includes('new-ask'), 'the new order is saved to the account')
await page.click('#blank', { button: 'right' })
const after = await menuLabels()
ok(after[0] === 'Peer groups' && !after.includes('Post an ask'), 'the menu shows the member’s own items')
ok(await page.evaluate(() => JSON.parse(localStorage.getItem('aetheris.quickmenu.v1'))[0]) === 'peergroups', 'and remembers them on this device for instant menus')
await page.keyboard.press('Escape')

// A fresh page loads the saved menu from the account.
await page.evaluate(() => localStorage.clear())
await page.reload()
await page.evaluate(() => { window.__saved = { items: ['events', 'messages'] } })
await page.reload()
await page.evaluate(() => { window.__saved = { items: ['events', 'messages'] } })
// Reset to default.
await page.click('#blank', { button: 'right' })
await page.click('text=Customize this menu…')
await page.click('text=Reset to default')
await page.click('#blank', { button: 'right' })
ok((await menuLabels())[0] === 'Post an ask' && await page.evaluate(() => window.__saved) === null, 'Reset to default restores the standard menu and clears the saved one')

ok(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join('; ') : ''}`)
await browser.close(); server.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
