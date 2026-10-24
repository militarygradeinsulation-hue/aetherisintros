// Browser smoke test of the public, data-free Opportunity Preview.
// Uses disposable local Vite preview. No account, database, external integrations, or live writes.
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createServer } from 'node:net'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const nextPort = () => new Promise(ok => {
  const socket = createServer().listen(0, '127.0.0.1', () => {
    const p = socket.address().port
    socket.close(() => ok(p))
  })
})
let server
let base = process.env.BASE
if (!base) {
  const port = await nextPort()
  base = 'http://127.0.0.1:' + port
  server = spawn('npx', ['vite', 'dev', '--port', String(port), '--host', '127.0.0.1', '--strictPort'], {
    cwd: root, stdio: ['ignore', 'pipe', 'pipe'], detached: true,
  })
  await new Promise((resolveReady, fail) => {
    const timer = setTimeout(() => fail(new Error('Vite startup timed out')), 90000)
    const ready = text => { if (/ready in|Local:/.test(String(text))) { clearTimeout(timer); resolveReady() } }
    server.stdout.on('data', ready)
    server.stderr.on('data', ready)
    server.once('exit', code => { clearTimeout(timer); fail(new Error('Vite exited ' + code)) })
  })
}
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? resolve(root, 'node_modules/playwright/index.mjs'))
const executable = process.env.CHROMIUM ?? '/opt/pw-browsers/chromium'
const browser = await chromium.launch(existsSync(executable) ? { executablePath: executable } : {})
let passed = 0
const assert = (condition, note) => { if (!condition) throw new Error(note); passed++; console.log(' ✓ ' + note) }

try {
  for (const theme of ['light', 'dark']) {
    for (const width of [1280, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 850 }, reducedMotion: 'reduce' })
      await context.addInitScript(mode => localStorage.setItem('ask-intros.appearance', mode), theme)
      const page = await context.newPage()
      await page.goto(base + '/try', { waitUntil: 'domcontentloaded', timeout: 120000 })
      await page.waitForURL(base + '/', { timeout: 60000 })
      await page.locator('.ael-hero').waitFor({ timeout: 60000 })
      assert(new URL(page.url()).pathname === '/', theme + '/' + width + ' retired preview redirects home')
      assert(await page.locator('.ai-try').count() === 0, 'questionnaire is removed')
      assert(await page.locator('.ael-hero-actions a[href="/demo"]').count() === 1, 'primary demo opens the actual workspace')
      assert(await page.locator('a[href="/try"]').count() === 0, 'no obsolete questionnaire links')
      await page.locator('.ask-cinematic-entrance').waitFor({ state: 'hidden', timeout: 60000 })
      assert(await page.locator('.ael-hero-actions').isVisible(), 'reduced motion leaves homepage accessible')
      await context.close()
    }
  }
  console.log(passed + ' retired-preview and homepage-entry checks passed')
} finally {
  await browser.close()
  if (server) { try { process.kill(-server.pid) } catch { /* already closed */ } }
}
