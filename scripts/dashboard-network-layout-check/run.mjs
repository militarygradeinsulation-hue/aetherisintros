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

  // Native Absolute Ledger CRM contract; no selectors from the superseded
  // HomeFeedView/PeopleDirectoryView widget and gallery layouts.
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
      await page.goto('http://127.0.0.1:' + port + '/demo', {
        waitUntil: 'domcontentloaded', timeout: 120_000,
      })
      await page.locator('.ledger-crm-shell[data-layout-source="absolute-ledger-flow/app-shell"]').waitFor({
        state: 'visible', timeout: 60_000,
      })
      await page.locator('.ledger-dashboard-stats .ledger-ui-stat').first().waitFor()
      const metrics = await page.evaluate(() => {
        const root = document.querySelector('.ledger-native-app')
        const side = document.querySelector('.ledger-crm-sidebar')
        const body = document.querySelector('.ledger-crm-body')
        const bottom = document.querySelector('.ledger-native-bottom')
        const dashboard = document.querySelector('.ledger-dashboard')
        const bounding = node => node?.getBoundingClientRect()
        const css = root && getComputedStyle(root)
        // The workspace is transparent so the shared particle layer remains visible.
        let surface = root;
        let backdrop = 'rgba(0, 0, 0, 0)';
        while (surface && backdrop === 'rgba(0, 0, 0, 0)') {
          backdrop = getComputedStyle(surface).backgroundColor;
          surface = surface.parentElement;
        }
        const channels = backdrop.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? [];
        const backdropBrightness = backdrop === 'rgba(0, 0, 0, 0)' || channels.length !== 3 ? NaN : channels.reduce((sum, value) => sum + value, 0) / 3;
        const ambient = document.querySelector('.site-ambient[data-particle-view="business"]');
        const particlesVisible = Boolean(ambient?.querySelector('canvas')) && getComputedStyle(ambient).pointerEvents === 'none';

        return {
          sidebarWidth: bounding(side)?.width ?? 0,
          sidebarVisible: Boolean(side && getComputedStyle(side).display !== 'none'),
          bodyLeft: bounding(body)?.left ?? -1,
          bodyWidth: bounding(body)?.width ?? 0,
          dashboardWidth: bounding(dashboard)?.width ?? 0,
          bottomVisible: Boolean(bottom && getComputedStyle(bottom).display !== 'none'),
          overflow: document.documentElement.scrollWidth - innerWidth,
          accent: css?.getPropertyValue('--ledger-crm-accent').trim(),
          background: css?.backgroundColor, backdrop, backdropBrightness, particlesVisible,
          stats: document.querySelectorAll('.ledger-dashboard-stats .ledger-ui-stat').length,
        }
      })
      console.log('CRM ' + viewport.width, metrics)
      assert(metrics.stats === 4, 'CRM data dashboard has four actionable KPI cards', metrics)
      assert(metrics.background === 'rgba(0, 0, 0, 0)' && metrics.backdropBrightness < 35 && metrics.particlesVisible && /^#(?:ef4444|b91c1c)$/i.test(metrics.accent || ''),
        'CRM uses a dark backdrop with red accents and shared particles', metrics)
      assert(metrics.dashboardWidth > 0 && metrics.overflow <= 3, 'CRM dashboard stays inside viewport', metrics)
      if (viewport.width > 1120) {
        assert(metrics.sidebarVisible && metrics.sidebarWidth >= 245 && metrics.sidebarWidth <= 260,
          'Native desktop CRM sidebar is visible', metrics)
        assert(metrics.bodyLeft >= 245 && metrics.bodyWidth > 600, 'CRM content occupies the remaining screen', metrics)
        const groups = await page.locator('.ledger-crm-sidebar .ledger-native-group').count()
        assert(groups >= 4, 'Grouped CRM navigation renders on desktop', { groups })
        const sorted = await page.locator('.ledger-crm-sidebar .ledger-native-group').evaluateAll(groups =>
          groups.every(group => {
            const labels = [...group.querySelectorAll('.ledger-native-nav-label')].map(el => el.textContent?.trim() || '')
            return labels.every((value, index) =>
              !index || labels[index - 1].localeCompare(value, 'en', { sensitivity: 'base' }) <= 0)
          }))
        assert(sorted, 'CRM navigation items are alphabetical in each section', { sorted })
        await page.locator('.ledger-crm-sidebar').getByRole('button', { name: 'Network', exact: true }).click()
      } else {
        assert(!metrics.sidebarVisible && metrics.bottomVisible, 'CRM mobile uses bottom bar and drawer', metrics)
        assert(metrics.bodyLeft < 3 && metrics.bodyWidth >= 380, 'CRM mobile content uses full screen', metrics)
        await page.getByRole('button', { name: 'More menu' }).click()
        const drawer = page.getByRole('navigation', { name: 'Mobile workspace navigation' })
        await drawer.waitFor()
        assert(await page.locator('.ledger-native-mobile-account a[href="/auth"]').count() === 1,
          'Guest can log in from the CRM mobile menu')
        await drawer.getByRole('button', { name: 'Network', exact: true }).click()
      }

      await page.locator('.ledger-directory-table').waitFor({ state: 'visible', timeout: 20_000 })
      const records = await page.locator('.ledger-directory-table tbody tr').count()
      assert(records > 0, 'CRM contacts table loads the showcase member directory', { records })
      await page.getByRole('textbox', { name: 'Search people' }).fill('nonexistent-member-string')
      assert(await page.locator('.ledger-directory-table tbody tr').count() === 0,
        'CRM contacts search filters results')
      assert(await page.locator('.ledger-directory .ledger-ui-empty').count() > 0,
        'No-results feedback explains empty CRM search')
      assert(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 3,
        'CRM contacts do not force horizontal page overflow', { viewport })

      if (viewport.width > 1120) {
        await page.locator('.ledger-crm-sidebar').getByRole('button', { name: 'Ask Intros', exact: true }).click()
      } else {
        await page.getByRole('button', { name: 'More menu' }).click()
        await page.getByRole('navigation', { name: 'Mobile workspace navigation' })
          .getByRole('button', { name: 'Ask Intros', exact: true }).click()
      }
      await page.locator('.ledger-introductions').waitFor()
      assert(await page.getByRole('button', { name: 'Find a member' }).count() > 0,
        'CRM introduction pipeline links into the member directory')
    } finally {
      await context.close()
    }
  }
  console.log('Native CRM dashboard, contacts, introductions and responsive navigation checks passed.')
} finally {
  if (browser) await browser.close()
  stop()
}
