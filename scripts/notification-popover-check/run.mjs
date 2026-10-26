// Real React notification bell with synthetic Supabase and push providers.
// Exercises viewport clipping/scrolling in Chromium without external accounts.
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync } from 'node:fs'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '../..')
const server = await createServer({
  configFile: false,
  root: here,
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^@\/integrations\/supabase\/client$/, replacement: resolve(here, 'supabase-mock.ts') },
      { find: /^\.\/push-client$/, replacement: resolve(here, 'push-stub.ts') },
      { find: '@', replacement: resolve(root, 'src') },
    ],
  },
  server: { host: '127.0.0.1', port: 0, fs: { allow: [root] } },
})
await server.listen()

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? resolve(root, 'node_modules/playwright/index.mjs'))
const browser = await chromium.launch()
const base = 'http://127.0.0.1:' + server.httpServer.address().port
const screenshots = process.env.NOTIFICATION_SCREENSHOTS
if (screenshots) mkdirSync(screenshots, { recursive: true })
const assert = (condition, message) => { if (!condition) throw Error(message); console.log('PASS ' + message) }

try {
  for (const theme of ['dark', 'light']) for (const size of [
    { width: 320, height: 700 },
    { width: 375, height: 812 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
    { width: 768, height: 850 },
    { width: 1440, height: 900 },
  ]) {
    const page = await browser.newPage({ viewport: size })
    const errors = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto(base + '/', { waitUntil: 'domcontentloaded' })
    await page.evaluate(t => { document.documentElement.dataset.theme = t }, theme)
    const bell = page.getByRole('button', { name: /Notifications/ })
    await bell.waitFor()
    await bell.click()
    const panel = page.getByRole('dialog', { name: 'Notifications' })
    await panel.waitFor()
    const geometry = await panel.evaluate(el => {
      const r = el.getBoundingClientRect()
      const visual = window.visualViewport
      return {
        left: r.left, right: r.right, top: r.top, bottom: r.bottom,
        width: r.width, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight,
        screenLeft: visual?.offsetLeft ?? 0,
        screenWidth: visual?.width ?? innerWidth,
        screenTop: visual?.offsetTop ?? 0,
        screenHeight: visual?.height ?? innerHeight,
        position: getComputedStyle(el).position,
        bodyDirect: el.parentElement === document.body,
        focus: document.activeElement === el,
        documentWidth: document.documentElement.scrollWidth,
      }
    })
    assert(geometry.bodyDirect && geometry.position === 'fixed', theme + ' ' + size.width + ' dialog uses body portal and fixed position')
    assert(
      geometry.left >= geometry.screenLeft + 10 &&
      geometry.right <= geometry.screenLeft + geometry.screenWidth - 10,
      theme + ' ' + size.width + ' notification panel remains horizontally inside viewport: ' + JSON.stringify(geometry),
    )
    assert(
      geometry.top >= geometry.screenTop + 8 &&
      geometry.bottom <= geometry.screenTop + geometry.screenHeight - 8,
      theme + ' ' + size.width + ' notification panel remains vertically inside viewport',
    )
    assert(geometry.documentWidth <= size.width + 2, theme + ' ' + size.width + ' panel does not widen the document')
    assert(geometry.focus, theme + ' ' + size.width + ' popup focuses its dialog')
    const title = panel.getByText('Notifications', { exact: true })
    const titleBox = await title.boundingBox()
    assert(titleBox && titleBox.x >= geometry.left - 1, theme + ' ' + size.width + ' title is not cut off')

    // Long item labels wrap inside the panel, with timestamps still visible.
    const row = panel.locator('li button').first()
    const rowGeometry = await row.evaluate(el => {
      const rect = el.getBoundingClientRect()
      const label = el.querySelector('span')?.getBoundingClientRect()
      return { rowLeft: rect.left, rowRight: rect.right, labelLeft: label?.left, labelRight: label?.right }
    })
    assert(rowGeometry.labelLeft >= rowGeometry.rowLeft - 1 && rowGeometry.labelRight <= rowGeometry.rowRight + 1,
      theme + ' ' + size.width + ' long notification text wraps within its row')

    const footer = panel.locator('.push-settings.compact p').first()
    await footer.scrollIntoViewIfNeeded()
    assert(await footer.locator(':scope > span').count() === 1,
      theme + ' ' + size.width + ' iPhone instructions remain one wrapping text item')
    const footerGeometry = await footer.evaluate(el => {
      const line = el.querySelector('span').getBoundingClientRect()
      const p = el.getBoundingClientRect()
      return { lineLeft: line.left, lineRight: line.right, parentLeft: p.left, parentRight: p.right }
    })
    assert(footerGeometry.lineLeft >= footerGeometry.parentLeft - 1 &&
      footerGeometry.lineRight <= footerGeometry.parentRight + 1,
      theme + ' ' + size.width + ' entire phone instruction fits')
    if (screenshots && size.width === 390)
      await page.screenshot({ path: resolve(screenshots, 'notifications-' + theme + '-390.png') })
    await page.keyboard.press('Escape')
    assert(!(await panel.count()), theme + ' ' + size.width + ' Escape closes popover')
    assert(await bell.evaluate(el => document.activeElement === el), theme + ' ' + size.width + ' Escape restores bell focus')
    await bell.click()
    await page.getByRole('dialog', { name: 'Notifications' }).waitFor()
    await page.mouse.click(3, 3)
    assert(await page.getByRole('dialog', { name: 'Notifications' }).count() === 0,
      theme + ' ' + size.width + ' outside click closes popover')
    assert(errors.length === 0, theme + ' ' + size.width + ' no browser exceptions: ' + errors.join('; '))
    await page.close()
  }
  console.log('Responsive notification popover checks passed. No live accounts were used.')
} finally {
  await browser.close()
  await server.close()
}
