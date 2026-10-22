// Real-browser layout contract: wide Dashboard, balanced Member Network,
// responsive navigation and an optional (not occupying a third column) insight panel.
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const port = await new Promise(done => {
  const listener = createServer().listen(0, '127.0.0.1', () => {
    const value = listener.address().port
    listener.close(() => done(value))
  })
})
const server = spawn('npx', ['vite', 'dev', '--port', String(port), '--host', '127.0.0.1', '--strictPort'], {
  cwd: root, stdio: ['ignore', 'pipe', 'pipe'], detached: true,
})
const stop = () => { try { process.kill(-server.pid) } catch { /* already exited */ } }
let browser
const assert = (passed, message, metrics) => {
  if (!passed) throw new Error(message + ': ' + JSON.stringify(metrics))
  console.log('PASS ' + message)
}

try {
  await new Promise((ok, fail) => {
    const timeout = setTimeout(() => fail(new Error('Vite startup timeout')), 90_000)
    const ready = data => {
      if (/ready in|Local:/.test(String(data))) { clearTimeout(timeout); ok() }
    }
    server.stdout.on('data', ready); server.stderr.on('data', ready)
    server.once('exit', code => { clearTimeout(timeout); fail(new Error('Vite exited ' + code)) })
  })
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? resolve(root, 'node_modules/playwright/index.mjs'))
  browser = await chromium.launch()

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1180, height: 800 },
    { width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({ viewport })
    await context.addInitScript(() => {
      try { localStorage.setItem('ask-intros.appearance', 'dark') } catch { /* optional */ }
    })
    const page = await context.newPage()
    try {
      await page.goto('http://127.0.0.1:' + port + '/demo', { waitUntil: 'domcontentloaded', timeout: 120_000 })
      await page.locator('.home-feed-page').waitFor({ state: 'visible', timeout: 60000 })
      const dashboard = await page.evaluate(() => {
        const frame = document.querySelector('.home-feed-page')
        const panel = document.querySelector('#dashboard-social-panel')
        const area = document.querySelector('.aetheris-workspace-content')
        const width = node => node?.getBoundingClientRect().width || 0
        return {
          width: width(frame),
          panelWidth: width(panel),
          viewport: innerWidth,
          horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
          pageScroll: area ? area.scrollHeight - area.clientHeight : -1,
          panelScroll: panel ? panel.scrollHeight - panel.clientHeight : -1,
          panelVisible: Boolean(panel && getComputedStyle(panel).display !== 'none'),
        }
      })
      console.log('DASHBOARD ' + viewport.width, dashboard)
      assert(dashboard.panelVisible, 'Dashboard feed remains usable', dashboard)
      assert(dashboard.panelWidth >= dashboard.width * .90, 'Dashboard feed fills available content width', dashboard)
      assert(dashboard.horizontalOverflow <= 2, 'Dashboard has no horizontal overflow', dashboard)
      if (viewport.width >= 900) {
        assert(dashboard.pageScroll <= 4, 'Desktop dashboard owns scrolling within the feed pane', dashboard)
      }
      const nav = page.getByRole('navigation', { name: 'Workspace navigation' })
      if (viewport.width < 760) {
        await page.getByRole('button', { name: 'Open workspace menu' }).click()
        await page.getByRole('navigation', { name: 'Mobile workspace navigation' })
          .getByRole('button', { name: 'Member Network' }).click()
      } else {
        await nav.getByRole('button', { name: 'Member Network' }).click()
      }
      await page.locator('.ix-network-viewport').waitFor({ state: 'visible', timeout: 20000 })
      const network = await page.evaluate(() => {
        const container = document.querySelector('.ix-network-results-layout')
        const filter = document.querySelector('#people-filter-rail')
        const results = document.querySelector('.ix-network-results-list')
        const insights = document.querySelector('.ix-network-insights-disclosure')
        const grid = document.querySelector('.ix-network-member-grid')
        const rect = node => {
          if (!node) return null
          const r = node.getBoundingClientRect()
          return { x: r.x, y: r.y, right: r.right, width: r.width, height: r.height }
        }
        return {
          container: rect(container),
          filter: rect(filter),
          results: rect(results),
          insights: rect(insights),
          grid: rect(grid),
          columns: container ? getComputedStyle(container).gridTemplateColumns : '',
          overflow: document.documentElement.scrollWidth - innerWidth,
        }
      })
      console.log('NETWORK ' + viewport.width, network)
      assert(Boolean(network.results && network.insights && network.container), 'Network results and optional insights exist', network)
      assert(network.overflow <= 2, 'Network does not overflow viewport horizontally', network)
      if (viewport.width >= 1024) {
        assert(network.results.width > network.filter.width * 1.6, 'Results are wider than the left filters', network)
        assert(network.results.width >= network.container.width * .62, 'Results use the second column instead of a squeezed center', network)
        assert(Math.abs(network.results.width - network.insights.width) <= 6, 'Insights align with results instead of occupying a third column', network)
      }
      const disclosure = page.locator('.ix-network-insights-disclosure')
      assert(!(await disclosure.evaluate(el => el.open)), 'Network insights are compact by default', network)
      await disclosure.locator('summary').click()
      assert(await disclosure.evaluate(el => el.open), 'Network insights expand on request', network)
    } finally {
      await context.close()
    }
  }
  console.log('Dashboard and Network layout checks passed.')
} finally {
  if (browser) await browser.close()
  stop()
}
