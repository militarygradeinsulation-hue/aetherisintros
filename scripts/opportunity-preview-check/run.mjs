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
      const context = await browser.newContext({ viewport: { width, height: 850 } })
      await context.addInitScript(mode => {
        try { localStorage.setItem('ask-intros.appearance', mode) } catch { /* optional */ }
      }, theme)
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      page.on('console', message => { if (message.type() === 'error') errors.push('console: ' + message.text()) })
      page.on('requestfailed', request => { if (request.url().startsWith(base)) errors.push('request: ' + request.url() + ' ' + request.failure()?.errorText) })
      await page.goto(base + '/try', { waitUntil: 'domcontentloaded', timeout: 120000 })
      await page.locator('.ai-try-output').waitFor({ timeout: 60000 })
      assert(await page.getByRole('heading', { name: /One goal/i }).count() === 1, theme + '/' + width + ' heading')
      assert(await page.getByRole('button', { name: /Build a partnership/ }).count() === 1, theme + '/' + width + ' scenarios')
      assert(await page.getByText('No member search was run', { exact: false }).count() > 0, theme + '/' + width + ' honest disclosure')
      // Server markup may paint before React has attached event handlers.
      await page.waitForLoadState('load')
      const hydrated = await page.waitForFunction(() => {
        const button = document.querySelector('.ai-try-goal')
        return Boolean(button && Object.keys(button).some(key => key.startsWith('__reactProps$')))
      }, null, { timeout: 60000 }).then(() => true).catch(() => false)
      if (!hydrated) {
        console.log('hydration diagnostic:', JSON.stringify({
          errors,
          scripts: await page.locator('script[src]').evaluateAll(nodes => nodes.map(n => n.getAttribute('src'))),
          url: page.url(),
        }))
      }
      assert(hydrated, theme + '/' + width + ' interactive React hydration: ' + errors.join('; '))
      await page.getByRole('button', { name: /Build a partnership/ }).click()
      const updated = await page.waitForFunction(() =>
        document.querySelector('.ai-try-draft')?.textContent?.includes('new service into another market'),
      null, { timeout: 10000 }).then(() => true).catch(() => false)
      if (!updated) console.log('draft after goal click:', await page.locator('.ai-try-draft').innerText())
      assert(updated, theme + '/' + width + ' goal changes preview')
      await page.locator('#ai-try-outcome').fill('launch a market-entry pilot')
      const custom = await page.waitForFunction(() =>
        document.querySelector('.ai-try-draft')?.textContent?.includes('launch a market-entry pilot'),
      null, { timeout: 10000 }).then(() => true).catch(() => false)
      if (!custom) console.log('draft after editing:', await page.locator('.ai-try-draft').innerText())
      assert(custom, theme + '/' + width + ' preview responds to user input')
      const data = await page.evaluate(() => ({
        docWidth: document.documentElement.scrollWidth,
        viewport: innerWidth,
        rootTheme: document.documentElement.getAttribute('data-theme'),
        background: getComputedStyle(document.querySelector('.ai-try')).backgroundColor,
      }))
      assert(data.docWidth <= data.viewport + 2, theme + '/' + width + ' no sideways overflow ' + JSON.stringify(data))
      assert(data.rootTheme === theme, theme + '/' + width + ' theme respected')
      assert(!errors.length, theme + '/' + width + ' no page errors: ' + errors.join('; '))
      await context.close()
    }
  }
  console.log('Opportunity Preview passed ' + passed + ' browser assertions')
} finally {
  await browser.close()
  if (server) try { process.kill(-server.pid) } catch { /* server exited */ }
}
