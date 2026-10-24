// Browser check for actual black-red CRM menus, drawers, dialogs and popovers.
// For each surface it opens (in the /demo showcase, desktop and phone sizes) it asserts:
//   - the surface's own background is (near) opaque: alpha >= 0.9
//   - nothing decorative (the site-wide ambient field) paints on top of it
//   - every visible text inside has WCAG AA contrast against its real background
//     (4.5:1 for normal text, 3:1 for large text), compositing backgrounds up the tree.
// Run: node scripts/contrast-check/run.mjs
//   BASE=http://127.0.0.1:5173   reuse a running dev server (otherwise one is started)
//   SHOTS=/some/dir PREFIX=after  save a screenshot per surface
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { createServer } from 'node:net'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const freePort = () => new Promise(r => { const s = createServer().listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => r(port)) }) })

let server
let base = process.env.BASE
if (!base) {
  const port = await freePort()
  server = spawn('npx', ['vite', 'dev', '--port', String(port), '--host', '127.0.0.1', '--strictPort'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], detached: true })
  base = `http://127.0.0.1:${port}`
  await new Promise((ok, fail) => {
    const t = setTimeout(() => fail(new Error('dev server did not start in 90s')), 90_000)
    const watch = d => { if (/ready in|Local:/.test(String(d))) { clearTimeout(t); ok() } }
    server.stdout.on('data', watch); server.stderr.on('data', watch)
    server.on('exit', c => { clearTimeout(t); fail(new Error('dev server exited ' + c)) })
  })
}
const stop = () => { if (server) try { process.kill(-server.pid) } catch { /* already gone */ } }

const chromiumPath = () => { const p = process.env.CHROMIUM ?? '/opt/pw-browsers/chromium'; return existsSync(p) ? { executablePath: p } : {} }
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? '/opt/node22/lib/node_modules/playwright/index.mjs')
const browser = await chromium.launch({ ...chromiumPath() })
if (process.env.SHOTS) mkdirSync(process.env.SHOTS, { recursive: true })

let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m) } else { fail++; console.log('  ✗', m) } }

// Runs in the page: measure one surface.
function measure(selector) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1
  const cx = cv.getContext('2d', { willReadFrequently: true })
  const rgba = c => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = 'rgba(0,0,0,0)'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255] }
  const over = (top, under) => { const a = top[3] + under[3] * (1 - top[3]); if (!a) return [0, 0, 0, 0]; return [0, 1, 2].map(i => (top[i] * top[3] + under[i] * under[3] * (1 - top[3])) / a).concat(a) }
  const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05) }
  const PAGE = [7, 9, 12, 1]
  const shown = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' }
  const surfaces = [...document.querySelectorAll(selector)].filter(shown)
  if (!surfaces.length) return null
  const s = surfaces[0]
  const own = rgba(getComputedStyle(s).backgroundColor)
  // Background under the surface: the surface over the page colour (what is behind may vary).
  const surfaceBg = over(own, PAGE)
  // Is anything (the decorative ambient field, a floating button…) painted above the surface?
  // The ambient ignores the pointer, so make it hit-testable for a moment.
  const amb = document.querySelector('.site-ambient')
  let covered = false
  {
    const prev = amb?.style.pointerEvents; if (amb) amb.style.pointerEvents = 'auto'
    const r = s.getBoundingClientRect()
    // Only sample the part visible inside all scrolling/clipping ancestors.
    let left=0,top=0,right=innerWidth,bottom=innerHeight;
    for(let parent=s.parentElement;parent;parent=parent.parentElement) {
      const style=getComputedStyle(parent),box=parent.getBoundingClientRect();
      if(/auto|scroll|hidden|clip/.test(style.overflowX)) { left=Math.max(left,box.left);right=Math.min(right,box.right); }
      if(/auto|scroll|hidden|clip/.test(style.overflowY)) { top=Math.max(top,box.top);bottom=Math.min(bottom,box.bottom); }
    }
    for (const fx of [.08, .29, .5, .71, .92]) for (const fy of [.08, .29, .5, .71, .92]) {
      const x = r.left + r.width * fx, y = r.top + r.height * fy
      if (x < left || y < top || x >= right || y >= bottom) continue
      const hit = document.elementFromPoint(x, y)
      // Shell launchers intentionally float above scrolling content. Their own
      // hit targets and content scroll reachability are covered by mobile-site-check.
      // Continue detecting decorative fields and unknown overlays here.
      if (hit?.closest('.ledger-native-quick-dock,.ask-dock-fab') && !s.contains(hit)) continue
      if (hit && !s.contains(hit)) covered = (hit.className && String(hit.className).split(' ')[0]) || hit.tagName.toLowerCase()
    }
    if (amb) amb.style.pointerEvents = prev
  }
  const bgAt = el => {
    const chain = []
    for (let n = el; n && n !== s.parentElement; n = n.parentElement) chain.push(n)
    let bg = surfaceBg
    for (const n of chain.reverse().slice(1)) bg = over(rgba(getComputedStyle(n).backgroundColor), bg)
    return bg
  }
  const texts = []
  const walker = document.createTreeWalker(s, NodeFilter.SHOW_TEXT)
  const seen = new Set()
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    const el = t.parentElement
    if (!el || seen.has(el) || !t.textContent.trim() || !shown(el)) continue
    if (el.closest(':disabled,[aria-disabled=true],[aria-hidden=true],svg')) continue
    seen.add(el)
    const cs = getComputedStyle(el)
    let alpha = 1
    for (let n = el; n && n !== s.parentElement; n = n.parentElement) alpha *= +getComputedStyle(n).opacity
    const fg = rgba(cs.color); fg[3] *= alpha
    const bg = bgAt(el)
    const fgOn = over(fg, bg)
    const size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700
    const large = size >= 24 || (bold && size >= 18.66)
    texts.push({ text: t.textContent.trim().slice(0, 28), ratio: +ratio(fgOn, bg).toFixed(2), need: large ? 3 : 4.5 })
  }
  // Native <select> lists: their options draw with the option's own colours.
  for (const o of s.querySelectorAll('option')) {
    const cs = getComputedStyle(o)
    const bg = over(rgba(cs.backgroundColor), [255, 255, 255, 1])
    texts.push({ text: 'option: ' + o.textContent.trim().slice(0, 20), ratio: +ratio(over(rgba(cs.color), bg), bg).toFixed(2), need: 4.5 })
  }
  return { alpha: +own[3].toFixed(2), covered, texts }
}

// inline: a bar that sits in the page (tab bar, form) rather than floating over it, so its
// background may be the page's own; it must still sit above the decorative field.
// field: a form holding native selects; only its text and option lists are checked.
async function check(page, name, selector, prefix, { inline = false, field = false } = {}) {
  await page.waitForTimeout(350)
  const m = await page.evaluate(measure, selector)
  if (process.env.SHOTS) await page.screenshot({ path: join(process.env.SHOTS, `${process.env.PREFIX ?? 'check'}-${prefix}${name}.png`) })
  if (!m) { ok(false, `${name}: surface ${selector} is visible`); return }
  if (!inline) ok(m.alpha >= 0.9, `${name}: background alpha ${m.alpha} >= 0.9`)
  if (!field) ok(!m.covered, `${name}: no unexpected overlay on its visible content` + (m.covered ? ` (covered by ${m.covered})` : ''))
  const bad = m.texts.filter(t => t.ratio < t.need)
  const worst = m.texts.reduce((w, t) => (!w || t.ratio < w.ratio ? t : w), null)
  ok(bad.length === 0, `${name}: ${m.texts.length} text items readable (lowest ${worst ? `${worst.ratio}:1 "${worst.text}"` : 'n/a'})` + (bad.length ? ` — below AA: ${bad.slice(0, 4).map(t => `"${t.text}" ${t.ratio}`).join(', ')}` : ''))
}

async function open(viewport) {
  const page = await browser.newPage({ viewport })
  page.on('pageerror', e => console.log('  ! page error:', e.message.slice(0, 400)))
  page.on('console', message => { if (message.type() === 'error') console.log('  ! browser console:', message.text().slice(0, 500)) })
  page.on('response', response => { if (response.status() >= 400 && response.url().startsWith(base)) console.log('  ! local HTTP:', response.status(), response.url().slice(0, 230)) })
  await page.goto(`${base}/demo`, { waitUntil: 'networkidle', timeout: 120_000 })
  try {
    await page.waitForSelector('.ix-root', { timeout: 60_000 })
  } catch (error) {
    console.log('  ! actual page:', page.url())
    console.log('  ! body snapshot:', (await page.locator('body').innerText({ timeout: 5000 }).catch(() => '[unavailable]')).slice(0, 1400))
    console.log('  ! HTML head:', (await page.locator('head').innerHTML({ timeout: 5000 }).catch(() => '[unavailable]')).slice(-1800))
    throw error
  }
  return page
}

try {
  console.log('Desktop CRM 1440x900');
  let page=await open({width:1440,height:900});
  const nav=page.locator('.ledger-crm-sidebar');
  await nav.waitFor({state:'visible',timeout:30000});
  await check(page,'desktop-crm-navigation','.ledger-crm-sidebar','');
  await check(page,'crm-command-header','.ledger-crm-topbar','');
  await page.getByRole('button',{name:'Account menu'}).click();
  await check(page,'crm-account-dropdown','.ledger-native-account-dropdown','');
  await page.getByRole('button',{name:'Account menu'}).click();
  await page.getByRole('button',{name:'Customize',exact:true}).click();
  await check(page,'crm-customization','.ledger-customize-dialog','');
  await page.keyboard.press('Escape');
  await page.locator('.ledger-ui-page-header h1').click({button:'right'});
  await check(page,'quick-menu','.qm','');
  await page.keyboard.press('Escape');
  if(await page.locator('.ask-dock-fab').count()){
    await page.click('.ask-dock-fab');
    await check(page,'ask-dock','.ask-dock','');
    await page.click('.ask-dock-fab');
  }
  await page.getByRole('button',{name:'My board',exact:true}).click();
  await page.waitForTimeout(750);
  await check(page,'dashboard-board-pipeline','.ledger-widget-board [data-widget-id="pipeline"] > div','');
  await page.getByRole('button',{name:'Edit layout',exact:true}).click();
  // The member stack is now a two-row tile. Bring the whole tile into the
  // scroll viewport before testing every sample point for overlay obstruction.
  await page.locator('.ledger-widget-board [data-widget-id="network"]').evaluate(el=>el.scrollIntoView({block:'start'}));
  await check(page,'dashboard-board-size-controls','.ledger-widget-board [data-widget-id="network"] > div','');
  await page.getByRole('button',{name:'Lock layout',exact:true}).click();
  await page.getByRole('button',{name:'Activity feed',exact:true}).click();
  await nav.getByRole('button',{name:'Network',exact:true}).click();
  await page.locator('.ledger-directory-table').waitFor({state:'visible',timeout:30000});
  await check(page,'crm-contact-records','.ledger-ui-panel','');
  await page.locator('.ledger-directory-actions button[title="Request introduction"]').first().click();
  await check(page,'request-intro-modal','[role=dialog], .fixed.inset-0 > div','');
  await page.keyboard.press('Escape');
  ok(await page.getByRole('dialog', {name:/^Request introduction to /}).count()===0,'Escape dismisses introduction request before workspace navigation');
  await nav.getByRole('button',{name:'CRM & Pipeline',exact:true}).click();
  await page.locator('.ledger-workspace-modules').waitFor({state:'visible',timeout:30000});
  await check(page,'operations-module-navigation','.ledger-workspace-modules','');
  await check(page,'operations-module-details','.ledger-workspace-detail','');
  // Keep coverage of the canonical controls hosted inside the CRM frame.
  const tool = async label => {
    await page.locator('.ledger-workspace-modules').getByRole('button', { name: label, exact: true }).click();
    await page.waitForTimeout(500);
  };
  await tool('CRM');
  await check(page,'crm-tabs','[role=tablist][aria-label="CRM sections"]','',{inline:true});
  await nav.getByRole('button',{name:'My Work',exact:true}).click();
  const sections=page.locator('.ledger-section-navigation');
  await check(page,'consolidated-section-navigation','.ledger-section-navigation','');
  await sections.locator('summary').click();
  await sections.getByRole('button',{name:'Trusted Providers',exact:true}).click();
  await check(page,'providers-tabs','.providers-tabs','',{inline:true});
  await sections.getByRole('button',{name:'Needs & Offers',exact:true}).click();
  await check(page,'needs-select-options','main :has(> select)','',{inline:true,field:true});
  await page.getByRole('button',{name:'Account menu',exact:true}).click();
  await check(page,'account-menu','.ledger-native-account-dropdown','');
  await page.getByRole('menuitem',{name:'My profile',exact:true}).click();
  await page.evaluate(() => {
    const details = document.querySelector('details.identity-more');
    for(let node=details;node;node=node.parentElement?.closest('details')) node.open=true;
    details?.scrollIntoView({block:'center'});
  });
  await check(page,'profile-more-menu','details.identity-more[open] > div','');
  await page.close();

  console.log('Phone CRM 390x844');
  page=await open({width:390,height:844});
  await check(page,'mobile-crm-header','.ledger-crm-topbar','m-');
  await page.getByRole('button',{name:'Open navigation'}).click();
  await check(page,'mobile-crm-drawer','.ledger-native-mobile-sidebar','m-');
  await page.keyboard.press('Escape');
  await page.mouse.click(200,420,{button:'right'});
  await check(page,'mobile-quick-menu','.qm','m-');
  await page.keyboard.press('Escape');
  if(await page.locator('.ask-dock-fab').count()){
    await page.click('.ask-dock-fab');
    await check(page,'mobile-ask-dock','.ask-dock','m-');
  }
  if(await page.getByRole('dialog',{name:'Ask Intros',exact:true}).isVisible()) await page.click('.ask-dock-fab');
  await page.getByRole('button',{name:'My board',exact:true}).click();
  await page.waitForTimeout(750);
  await page.locator('.ledger-widget-board [data-widget-id="pipeline"]').evaluate(el=>el.scrollIntoView({block:'center'}));
  await check(page,'mobile-dashboard-board','.ledger-widget-board [data-widget-id="pipeline"] > div','m-');
  ok(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=3,'mobile board fits the viewport');
  await page.close();
} catch (e) {
  fail++; console.log('  ✗ check crashed:', e.message.split('\n')[0])
} finally {
  await browser.close()
  stop()
}
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
