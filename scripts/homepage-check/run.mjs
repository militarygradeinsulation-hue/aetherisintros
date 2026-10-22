// Checks that the public home stays concise and navigable on multiple screen sizes.
// Designed to catch regressions after site-wide design work, not exact pixel screenshots.
// Run: PLAYWRIGHT_MODULE=./node_modules/playwright/index.mjs node scripts/homepage-check/run.mjs
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createServer } from 'node:net'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const freePort = () => new Promise(resolvePort => {
  const server = createServer().listen(0, '127.0.0.1', () => {
    const { port } = server.address()
    server.close(() => resolvePort(port))
  })
})

let child = null
let base = process.env.BASE
const stop = () => {
  if (child) {
    try { process.kill(-child.pid) } catch { /* already exited */ }
  }
}
if (!base) {
  const port = await freePort()
  base = 'http://127.0.0.1:' + port
  child = spawn('npx', ['vite', 'dev', '--port', String(port), '--host', '127.0.0.1', '--strictPort'], {
    cwd: root, stdio: ['ignore', 'pipe', 'pipe'], detached: true,
  })
  try {
    await new Promise((ok, fail) => {
      const timeout = setTimeout(() => fail(new Error('dev server startup exceeded 90 seconds')), 90_000)
      const ready = data => {
        if (/ready in|Local:/.test(String(data))) {
          clearTimeout(timeout)
          ok()
        }
      }
      child.stdout.on('data', ready)
      child.stderr.on('data', ready)
      child.once('exit', code => {
        clearTimeout(timeout)
        fail(new Error('dev server exited before it was ready: ' + code))
      })
    })
  } catch (error) {
    stop()
    throw error
  }
}

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? resolve(root, 'node_modules/playwright/index.mjs'))
const executable = process.env.CHROMIUM ?? '/opt/pw-browsers/chromium'
const browser = await chromium.launch(existsSync(executable) ? { executablePath: executable } : {})
const viewports = [
  { name: 'desktop', width: 1440, height: 900, maxHeight: 2350 },
  { name: 'small-desktop', width: 1080, height: 800, maxHeight: 2450 },
  { name: 'tablet', width: 768, height: 1024, maxHeight: 2850 },
  { name: 'phone', width: 390, height: 844, maxHeight: 2950 },
  { name: 'small-phone', width: 320, height: 700, maxHeight: 3100 },
]

let passed = 0
let failed = 0
const assert = (condition, detail) => {
  if (condition) {
    passed++
    console.log('  ✓ ' + detail)
  } else {
    failed++
    console.log('  ✗ ' + detail)
  }
}

try {
  for (const viewport of viewports) {
    console.log('AETHERIS HOME / ' + viewport.name + ' / ' + viewport.width + 'x' + viewport.height)
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    try {
      await page.goto(base + '/', { waitUntil: 'domcontentloaded', timeout: 120_000 })
      await page.locator('.vision-page .vs-shell').waitFor({ state: 'visible', timeout: 60_000 })
      await page.locator('.vision-page[data-hydrated="true"]').waitFor({ state: 'attached', timeout: 60_000 })
      const info = await page.evaluate(() => {
        const root = document.querySelector('.vision-page')
        const rect = selector => {
          const element = root.querySelector(selector)
          if (!element) return null
          const r = element.getBoundingClientRect()
          return { x: r.x, right: r.right, width: r.width, height: r.height }
        }
        return {
          width: innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          hero: rect('.vs-hero h1'),
          heroActions: rect('.vs-hero-actions'),
          toolbar: rect('.vs-toolbar'),
          shell: rect('.vs-shell'),
          footer: rect('.vs-footer'),
          signIn: Boolean(root.querySelector('.vs-auth-links a[href^="/auth?"]')),
          signup: Boolean(root.querySelector('.vs-auth-links a[href*="mode=signup"]')),
          demo: Boolean(root.querySelector('a[href="/demo"]')),
          previewLabel: Boolean(root.querySelector('.vs-data-disclaimer')),
          appLink: Boolean(root.querySelector('a[href="/auth?next=%2Fapp"]')),
          feed: Boolean(root.querySelector('#vision-feed')),
          stats: root.querySelectorAll('.vs-stat').length,
        }
      })
      assert(info.scrollWidth <= info.width + 2, 'homepage does not overflow horizontally')
      assert(info.hero && info.hero.width > 200, 'social platform headline is visible')
      assert(info.shell && info.toolbar && info.feed && info.stats === 5, 'desktop dashboard and example metrics render')
      assert(info.previewLabel, 'sample business data is clearly identified as a preview')
      assert(info.signIn && info.signup && info.demo && info.appLink, 'sign-in, registration, demo, and member entry points exist')
      const onScreen = r => Boolean(r && r.width > 0 && r.x >= -3 && r.right <= viewport.width + 3)
      assert(onScreen(info.hero) && onScreen(info.heroActions) && onScreen(info.toolbar), 'critical navigation fits the viewport')
      assert(info.footer, 'the branded footer renders')
      assert(!errors.length, 'homepage has no JavaScript runtime errors')

      if (viewport.width <= 850) {
        const bottomNav = page.locator('.vs-mobile-bottom')
        assert(await bottomNav.isVisible(), 'mobile navigation is visible')
        const toggle = page.getByRole('button', { name: 'Open menu' })
        await toggle.click()
        assert(await page.locator('.vs-sidebar.is-open').isVisible(), 'mobile navigation opens')
        await page.getByRole('button', { name: 'Close menu' }).click()
        assert(!(await page.locator('.vs-sidebar').evaluate(element => element.classList.contains('is-open'))), 'mobile navigation closes')
        const fonts = await page.evaluate(() =>
          [...document.querySelectorAll('.vision-page input, .vision-page textarea')].filter(element => {
            const style = getComputedStyle(element)
            return style.display !== 'none' && style.visibility !== 'hidden'
          }).map(element => Number.parseFloat(getComputedStyle(element).fontSize)))
        assert(fonts.every(size => size >= 16), 'inputs use accessible touch font sizes to prevent iOS zoom')
      } else {
        assert(await page.locator('.vs-sidebar nav').isVisible(), 'desktop sidebar stays visible')
      }

      if (viewport.name === 'desktop') {
        const ceos = page.locator('.vs-tabs button').filter({ hasText: 'CEOs' })
        await ceos.click()
        assert(await ceos.evaluate(element => element.classList.contains('active')), 'feed categories are selectable')
        const draft = page.locator('#vision-composer')
        await draft.fill('Preview-only example update')
        await page.locator('.vs-composer-actions button').click()
        assert(await page.getByText('Preview-only example update').count() > 0, 'preview composer updates its local feed')
        assert(await page.getByText(/Preview post created locally/).count() > 0, 'preview composer does not claim a real published post')
        const link = page.locator('.vs-auth-links a[href*="mode=signup"]')
        assert(await link.count() === 1, 'create account links to existing authentication route')
        // Browser-to-auth contract. No credentials or live member writes are used.
        await page.locator('.vs-sidebar nav button').filter({ hasText: 'Messages' }).first().click()
        await page.waitForURL(url => {
          const target = new URL(url)
          return target.pathname === '/auth' && target.searchParams.get('next') === '/app?view=messages'
        }, { timeout: 30000 })
        assert(await page.locator('.auth-form input[type="email"]').isVisible(), 'protected messages route shows the real email login')
        assert(await page.locator('.auth-form input[type="password"]').isVisible(), 'real login requires a password')
        assert(await page.getByRole('button', { name: 'Continue with Google' }).isVisible(), 'Google sign-in remains accessible')
        assert(await page.getByRole('button', { name: 'Continue with LinkedIn' }).isVisible(), 'LinkedIn sign-in remains accessible')
        await page.goto(base + '/auth?mode=signup&next=%2Fapp', { waitUntil: 'domcontentloaded' })
        await page.locator('.auth-form input[autocomplete="name"]').waitFor({ state: 'visible' })
        assert(await page.locator('.auth-form input[autocomplete="email"]').isVisible(), 'new accounts reach existing sign-up form')
      }
    } catch (error) {
      failed++
      console.log('  ✗ check crashed: ' + error.message.split('\n')[0])
      console.log('  ! final URL: ' + page.url())
      console.log('  ! body: ' + (await page.locator('body').innerText().catch(() => 'unavailable')).slice(0, 550))
    } finally {
      await page.close()
    }
  }

} finally {
  await browser.close()
  stop()
}

console.log('\nHomepage layout: ' + passed + ' passed, ' + failed + ' failed')
process.exit(failed ? 1 : 0)
