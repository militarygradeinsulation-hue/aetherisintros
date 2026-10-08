// Browser check for the meeting call engine: three tabs with fake cameras join one meeting
// over an in-browser transport, connect to each other directly, exchange captions, and
// cope with someone leaving. Run: node scripts/meeting-call-check/run.mjs
import { build } from 'esbuild'
import { createServer } from 'node:http'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const out = mkdtempSync(join(tmpdir(), 'meeting-call-'))
await build({
  entryPoints: [join(here, 'entry.ts')], bundle: true, format: 'esm', outfile: join(out, 'app.js'), logLevel: 'error',
  alias: { '@/integrations/supabase/client': join(here, 'supabase-stub.ts') },
})
writeFileSync(join(out, 'supabase-stub.ts'), '')
writeFileSync(join(out, 'index.html'), '<!doctype html><meta charset="utf-8"><script type="module" src="app.js"></script>')
const { readFileSync } = await import('node:fs')
const server = createServer((req, res) => {
  const file = req.url?.startsWith('/app.js') ? 'app.js' : 'index.html'
  res.setHeader('content-type', file.endsWith('.js') ? 'text/javascript' : 'text/html')
  res.end(readFileSync(join(out, file)))
}).listen(0, '127.0.0.1')
await new Promise(r => server.once('listening', r))
const base = `http://127.0.0.1:${server.address().port}/`

const pw = process.env.PLAYWRIGHT_MODULE ?? '/opt/node22/lib/node_modules/playwright/index.mjs'
const { chromium } = await import(pw)
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium',
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
}).catch(() => chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] }))
const context = await browser.newContext({ permissions: ['camera', 'microphone'] })

let failed = 0
const ok = (cond, label) => { console.log(`  ${cond ? '✓' : '✗'} ${label}`); if (!cond) failed++ }
const peersOf = page => page.evaluate(() => window.__peers.map(p => ({ id: p.userId, state: p.state, video: !!p.stream?.getVideoTracks().length, audio: !!p.stream?.getAudioTracks().length })))
const waitFor = async (page, fn, arg, ms = 20000) => { try { await page.waitForFunction(fn, arg, { timeout: ms }); return true } catch { return false } }
const connectedTo = n => window.__peers.filter(p => p.state === 'connected' && p.stream?.getVideoTracks().length).length === n

const [a, b, c] = await Promise.all(['user-a', 'user-b', 'user-c'].map(async u => { const p = await context.newPage(); await p.goto(`${base}?user=${u}`); return p }))

console.log('meeting call engine')
ok(await waitFor(a, connectedTo, 2) && await waitFor(b, connectedTo, 2) && await waitFor(c, connectedTo, 2), 'three people connect to each other directly, whatever order they joined in')
const pa = await peersOf(a)
ok(pa.every(p => p.video && p.audio) && pa.map(p => p.id).sort().join() === 'user-b,user-c', 'each receives the others\' camera and microphone')

await b.evaluate(() => window.__call.sendCaption('We should hire a CFO'))
ok(await waitFor(a, () => window.__captions.some(c => c.from === 'user-b' && c.text === 'We should hire a CFO')) && await waitFor(c, () => window.__captions.length === 1), 'live captions reach everyone else')
ok(await b.evaluate(() => window.__captions.length === 0), 'the speaker does not receive their own caption back')

await c.evaluate(() => window.__leave())
ok(await waitFor(a, () => window.__peers.length === 1 && window.__peers[0].userId === 'user-b') && await waitFor(b, () => window.__peers.length === 1), 'when someone leaves, the others drop their connection')
ok(await waitFor(a, connectedTo, 1), 'the remaining two stay connected')

const d = await context.newPage(); await d.goto(`${base}?user=user-d`)
ok(await waitFor(d, connectedTo, 2) && await waitFor(a, connectedTo, 2), 'a late joiner connects to everyone already there')
if (process.env.DEBUG) for (const [n, p] of [['a', a], ['b', b], ['d', d]]) console.log(n, JSON.stringify(await peersOf(p)), await p.evaluate(() => window.__status))

await browser.close()
server.close()
console.log(`\n${failed ? `${failed} failed` : 'all passed'}`)
process.exit(failed ? 1 : 0)
