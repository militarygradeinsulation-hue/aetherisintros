// Browser check for the meeting room UI: two people with fake cameras (and a speech-like fake
// microphone) pass the camera check, join, connect, and record. The host presses Record, the
// guest is asked and agrees, and both people's speech is transcribed into the shared
// transcript. Database, realtime and server functions are in-browser stand-ins.
// Run: node scripts/meeting-room-check/run.mjs   (SHOTS=dir to save screenshots)
import { build } from 'esbuild'
import { createServer } from 'node:http'
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const src = resolve(here, '../../src')
const out = mkdtempSync(join(tmpdir(), 'meeting-room-'))
const stubs = {
  name: 'stubs',
  setup(b) {
    // Images and fonts the stylesheet references by site path are not needed here.
    b.onResolve({ filter: /^\//, namespace: 'file' }, a => (a.kind === 'url-token' ? { path: a.path, external: true } : undefined))
    b.onResolve({ filter: /^@\/integrations\/supabase\/client$/ }, () => ({ path: join(here, 'db-stub.ts') }))
    b.onResolve({ filter: /^@\/lib\/.*\.functions$/ }, () => ({ path: join(here, 'server-stub.ts') }))
    b.onResolve({ filter: /^\.\/(store|graph-store|nav)$/ }, a => (a.importer.startsWith(join(src, 'aetheris')) ? { path: join(here, 'app-stubs.tsx') } : undefined))
    b.onResolve({ filter: /^@\// }, a => {
      const base = join(src, a.path.slice(2))
      for (const ext of ['', '.ts', '.tsx', '/index.ts', '/index.tsx']) if (existsSync(base + ext) && !(ext === '' && !/\.\w+$/.test(base))) return { path: base + ext }
      return undefined
    })
  },
}
await build({
  entryPoints: [join(here, 'entry.tsx')], bundle: true, format: 'esm', outdir: out, logLevel: 'error', jsx: 'automatic',
  plugins: [stubs], loader: { '.woff2': 'empty', '.woff': 'empty', '.png': 'empty', '.jpg': 'empty', '.svg': 'empty' }, define: { 'process.env.NODE_ENV': '"production"' },
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

// Speech-like fake microphone: syllable-length bursts of tone.
const wav = join(out, 'speech.wav')
{
  const rate = 48000, n = rate * 12
  const data = Buffer.alloc(44 + n * 2)
  data.write('RIFF', 0); data.writeUInt32LE(36 + n * 2, 4); data.write('WAVEfmt ', 8); data.writeUInt32LE(16, 16)
  data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22); data.writeUInt32LE(rate, 24); data.writeUInt32LE(rate * 2, 28)
  data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34); data.write('data', 36); data.writeUInt32LE(n * 2, 40)
  for (let i = 0; i < n; i++) { const t = i / rate; data.writeInt16LE(Math.round(((t % 0.35) < 0.25 ? 0.3 : 0) * Math.sin(2 * Math.PI * 200 * t) * 32767), 44 + i * 2) }
  writeFileSync(wav, data)
}
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? '/opt/node22/lib/node_modules/playwright/index.mjs')
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium',
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${wav}`, '--autoplay-policy=no-user-gesture-required'],
})
const context = await browser.newContext({ permissions: ['camera', 'microphone'], viewport: { width: 1280, height: 860 } })
let failed = 0
const ok = (cond, label) => { console.log(`  ${cond ? '✓' : '✗'} ${label}`); if (!cond) failed++ }
const seen = async (page, text, ms = 20000) => { try { await page.getByText(text, { exact: false }).first().waitFor({ timeout: ms }); return true } catch { return false } }
const shot = async (page, name) => { if (process.env.SHOTS) await page.screenshot({ path: join(process.env.SHOTS, `${name}.png`), fullPage: true }) }

const host = await context.newPage(); await host.goto(`${base}?user=aaaaaaaa-0000-4000-8000-00000000000a`)
const guest = await context.newPage(); await guest.goto(`${base}?user=bbbbbbbb-0000-4000-8000-00000000000b`)
for (const p of [host, guest]) p.on('pageerror', e => console.log('  page error:', e.message))

console.log('meeting room')
ok(await seen(host, 'READY TO JOIN') && await seen(host, 'Join meeting'), 'the camera check shows before joining')
await shot(host, '1-lobby')
await host.getByRole('button', { name: 'Join meeting' }).click()
await guest.getByRole('button', { name: 'Join meeting' }).click()
ok(await seen(host, 'LIVE') && await seen(guest, 'LIVE'), 'both join the meeting')
ok(await host.waitForFunction(() => document.querySelectorAll('.meeting-grid video').length === 2, null, { timeout: 20000 }).then(() => true, () => false), 'they see each other on video')
ok(await seen(host, 'Invite people'), 'the host can invite people from inside the call')
ok(!(await guest.getByText('Invite people').count()), 'guests cannot invite')

await host.getByRole('button', { name: 'Record' }).click()
ok(await seen(host, 'Stop recording') && await seen(host, 'Recording · notes for you'), 'Record starts recording and includes the person who pressed it')
ok(await seen(guest, 'started recording for notes', 10000), 'the guest is asked straight away whether to include their voice')
ok(await seen(host, 'line 1', 20000), "the host's speech is transcribed into the transcript")
await guest.getByLabel('Recording consent').getByRole('button', { name: 'Include my voice' }).click()
ok(await seen(guest, 'Recording · notes for', 10000) && await seen(guest, 'Stop including my voice'), 'the guest agrees and is now included')
ok(await host.waitForFunction(() => [...document.querySelectorAll('.meeting-transcript li b')].some(b => b.textContent === 'Ben Guest'), null, { timeout: 25000 }).then(() => true, () => false), "the guest's speech reaches the host's transcript, attributed to them")
ok(await guest.waitForFunction(() => [...document.querySelectorAll('.meeting-transcript li b')].some(b => b.textContent === 'Ana Host'), null, { timeout: 25000 }).then(() => true, () => false), "and the host's speech reaches the guest's")
ok(!(await guest.getByRole('button', { name: 'Stop recording' }).count()), 'a guest who did not start recording cannot stop it for everyone')
await shot(host, '2-recording-host'); await shot(guest, '3-recording-guest')

await host.getByRole('button', { name: 'Stop recording' }).click()
ok(await seen(host, 'Press Record') && await seen(guest, 'Press Record', 10000), 'stopping recording reaches everyone')

await browser.close(); server.close()
console.log(`\n${failed ? `${failed} failed` : 'all passed'}`)
process.exit(failed ? 1 : 0)
