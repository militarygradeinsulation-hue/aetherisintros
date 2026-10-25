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
    console.log('HOME / ' + viewport.name + ' / ' + viewport.width + 'x' + viewport.height)
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    page.on('pageerror', error => console.log('  ! browser page error: ' + error.message.slice(0, 220)))
    await page.addInitScript(() => {
      try { localStorage.setItem('ask-intros.appearance', 'light') } catch { /* optional */ }
      // Inspect the actual homepage after the one-time cinematic intro (film has a dedicated component test).
      try { sessionStorage.setItem('ask-intros.entrance-film.seen', '1') } catch { /* optional */ }
    })
    try {
      await page.goto(base + '/', { waitUntil: 'domcontentloaded', timeout: 120_000 })
      await page.waitForSelector('.ael-compact', { timeout: 60_000 })
      // The opening film now waits for the visitor, so dismiss it before inspecting the page.
      await page.evaluate(() => {
        const host = document.querySelector('.ask-cinematic-entrance')
        if (!host) return
        const button = [...host.querySelectorAll('button')].find(x => /Skip intro|Enter Intros/.test(x.textContent || ''))
        if (button) button.click()
      })
      await page.waitForSelector('.ask-cinematic-entrance', { state: 'detached', timeout: 20_000 }).catch(() => {})
      assert(await page.locator('.vision-page').count() === 0, 'sample-only Vision dashboard is not the primary homepage')

      const m = await page.evaluate(() => {
        const root = document.querySelector('.ael-compact')
        const rect = selector => {
          const node = root.querySelector(selector)
          if (!node) return null
          const r = node.getBoundingClientRect()
          return { x: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }
        }
        return {
          sections: root.querySelectorAll(':scope > section').length,
          pageHeight: document.documentElement.scrollHeight,
          pageWidth: document.documentElement.scrollWidth,
          viewportWidth: innerWidth,
          hero: rect('.ael-hero'),
          cinematic: rect('.ask-cinematic-hero'),
          cinematicCTA: rect('.ask-cine-cta'),
          heroTitle: rect('#ael-hero-title'),
          heroActions: rect('.ael-hero-actions'),
          headerActions: rect('.ael-header-actions'),
          logo: rect('.ael-header .ask-intros-lockup'),
          signup: rect('.ael-header .ael-nav-cta'),
          footer: rect('.ael-compact-footer'),
          carousel: {
            total: root.querySelectorAll('.ael-hero-slide').length,
            active: [...root.querySelectorAll('.ael-hero-slide')].findIndex(s => s.classList.contains('is-active')),
            controls: Boolean(root.querySelector('.ael-hero-slide-controls')),
          },
          links: Object.fromEntries(
            ['cinematic-experience'].map(id => {
              return [id, Boolean(root.querySelector('a[href="#' + id + '"]') && document.getElementById(id))]
            }),
          ),
          ctas: {
            preview: Boolean(root.querySelector('.ael-hero-actions a[href="/demo"]')),
            demo: Boolean(root.querySelector('a[href="/demo"]')),
            join: Boolean(root.querySelector('.ael-hero-actions a[href^="/auth?"][href*="mode=signup"]')),
            auth: Boolean(root.querySelector('.ael-header-actions a[href="/auth"]')),
          },
        }
      })
      console.log('  dimensions: ' + JSON.stringify({
        height: m.pageHeight,
        hero: Math.round(m.hero?.height ?? 0),
        footer: Math.round(m.footer?.height ?? 0),
      }))
      assert(m.sections === 2, 'hero and cinematic experience keep the homepage concise')
      const allowedHeight = viewport.maxHeight + Math.ceil(m.cinematic?.height ?? 0) + 80
      assert(Boolean(m.cinematic && m.cinematicCTA && m.cinematic.height > 380), 'cinematic product demo and working CTA render')
      assert(m.pageHeight <= allowedHeight, 'scroll budget includes one approved cinematic chapter: ' + m.pageHeight + ' <= ' + allowedHeight + ' px')
      assert(m.pageWidth <= m.viewportWidth + 2, 'no horizontal page overflow')
      assert(Boolean(m.hero && m.heroTitle && m.heroActions && m.footer),
        'headline, primary actions and footer all render')
      assert(m.carousel.total === 10 && m.carousel.controls === false,
        'ten member pictures rotate in the hero with no visible controls')
      assert(m.hero && m.hero.height <= Math.max(viewport.height * 1.10, 760),
        'hero fits near the first viewport')
      assert(['cinematic-experience'].every(id => m.links[id]),
        'every navigation anchor has a real destination')
      assert(Object.values(m.ctas).every(Boolean), 'hero preview, demo, join and sign-in links remain')
      const onScreen = r => Boolean(r && r.width > 0 && r.right <= viewport.width + 3 && r.x >= -3)
      assert(m.logo && m.logo.width >= (viewport.width <= 420 ? 150 : viewport.width <= 750 ? 175 : 220),
        'approved Ask Intros wordmark is prominent at this breakpoint')
      assert([m.heroTitle, m.heroActions, m.headerActions, m.logo, m.signup, m.cinematicCTA].every(onScreen),
        'headlines and important actions remain within phone/desktop width')

      if (viewport.name === 'desktop') {
        await page.locator('.ael-nav a[href="#cinematic-experience"]').click()
        assert(new URL(page.url()).hash === '#cinematic-experience', 'Experience navigation updates the anchor')
        const before = await page.evaluate(() => [...document.querySelectorAll('.ael-hero-slide')].findIndex(s => s.classList.contains('is-active')))
        await page.waitForTimeout(5600)
        const after = await page.evaluate(() => [...document.querySelectorAll('.ael-hero-slide')].findIndex(s => s.classList.contains('is-active')))
        assert(after !== before, 'the hero picture advances on its own after five seconds')
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
