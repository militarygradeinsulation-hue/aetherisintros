// Browser check for deal rooms: two members open a room from an accepted introduction and take
// it through invite → proposal → accept → milestone → deliver → close, seeing only the moves
// the rules allow and honest confirmations; then the /demo showcase room works without writes.
// Run: node scripts/deal-room-check/run.mjs   (SHOTS=dir to save screenshots)
import { build } from 'esbuild'
import { createServer } from 'node:http'
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const src = resolve(here, '../../src')
const out = mkdtempSync(join(tmpdir(), 'deal-room-'))
await build({
  entryPoints: [join(here, 'entry.tsx')], bundle: true, format: 'esm', outdir: out, logLevel: 'error', jsx: 'automatic',
  plugins: [{ name: 'stubs', setup(b) {
    b.onResolve({ filter: /^\//, namespace: 'file' }, a => (a.kind === 'url-token' ? { path: a.path, external: true } : undefined))
    b.onResolve({ filter: /^@\/integrations\/supabase\/client$/ }, () => ({ path: join(here, 'db-stub.ts') }))
    b.onResolve({ filter: /^@\/lib\/voice\.functions$/ }, () => ({ path: join(here, 'voice-stub.ts') }))
    b.onResolve({ filter: /^@\// }, a => {
      const p = join(src, a.path.slice(2))
      for (const ext of ['.ts', '.tsx', '/index.ts']) if (existsSync(p + ext)) return { path: p + ext }
      return undefined
    })
  } }],
  loader: { '.woff2': 'empty', '.woff': 'empty', '.png': 'empty', '.jpg': 'empty', '.svg': 'empty' }, define: { 'process.env.NODE_ENV': '"production"' },
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
const chromiumPath = () => { const p = process.env.CHROMIUM ?? '/opt/pw-browsers/chromium'; return existsSync(p) ? { executablePath: p } : {} }
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? '/opt/node22/lib/node_modules/playwright/index.mjs')
const browser = await chromium.launch({ ...chromiumPath() })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const errors = []
page.on('pageerror', e => errors.push(e.message))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m) } else { fail++; console.log('  ✗', m) } }
const shot = async n => { if (process.env.SHOTS) await page.screenshot({ path: join(process.env.SHOTS, `${n}.png`), fullPage: true }) }
const btn = name => page.getByRole('button', { name, exact: true })
const has = async name => (await btn(name).count()) > 0
const flash = async () => (await page.locator('.deals-flash').first().textContent({ timeout: 3000 }).catch(() => '')) ?? ''
const stage = async () => (await page.locator('[data-testid=deal-stage]').textContent({ timeout: 3000 }).catch(() => '')) ?? ''
const as = async who => { await page.click(who === 'A' ? '#as-a' : '#as-b'); await page.waitForSelector('.deals-head, .deals-room') }
const openRoom = async title => { await page.locator('.deals-card-btn', { hasText: title }).click(); await page.waitForSelector('.deals-room') }

await page.goto(base)
await page.waitForSelector('.deals-head')
ok(await page.isVisible('text=No deal rooms yet'), 'an empty Deals page says how to start')

// Ana opens a room from the accepted introduction.
await page.locator('#accepted-intro').getByRole('button', { name: 'Open deal room' }).click()
await page.waitForSelector('[aria-label="New deal room"]')
ok(await page.inputValue('.deals-form input') === 'Deal with Ben Okafor', 'the form is prefilled from the introduction')
ok(await page.isChecked('.deals-check input'), 'inviting the other person is offered and on')
ok(await page.evaluate(() => window.__state.rooms.length) === 0, 'nothing is created before the member confirms')
await shot('1-create')
await btn('Create deal room').click()
await page.waitForSelector('.deals-room')
ok(/Invite sent to Ben Okafor — they need to accept/.test(await flash()), 'creating says the invite was sent and must be accepted')
ok((await stage()).startsWith('Interested'), 'the room starts at Interested')

// Ben sees the invitation and accepts.
await as('B')
ok(await page.isVisible('text=INVITATIONS TO ANSWER'), 'the invitee sees the invitation')
ok(!(await page.isVisible('.deals-card-btn')), 'but not the room in their list yet')
await page.locator('.deals-invites').getByRole('button', { name: 'Accept' }).click()
await page.waitForSelector('.deals-room')
ok(/joined the room/.test(await flash()), 'accepting opens the room')

// Ben proposes terms.
await btn('Send a proposal').click()
await page.fill('.deals-form textarea', 'Twelve weeks, two days a week; model and data room by week six.')
await page.fill('.deals-form input[inputmode=decimal]', '48000')
await btn('Send proposal').click()
await page.waitForFunction(() => document.querySelector('.deals-flash')?.textContent?.includes('Proposal v1 sent'))
ok((await stage()).startsWith('Proposal'), 'the first proposal moves the deal to Proposal')
ok(!(await has('Accept v1')), 'the author is not offered to accept their own proposal')
ok(await page.isVisible('text=Waiting for the other side to decide.'), 'and is told the other side decides')
await shot('2-proposal')

// Ana accepts.
await as('A')
await openRoom('Deal with Ben Okafor')
ok(await has('Accept v1'), 'the other side can accept')
await btn('Accept v1').click()
await page.waitForFunction(() => document.querySelector('.deals-flash')?.textContent?.includes('Terms are agreed'))
ok((await stage()).startsWith('Agreed'), 'accepting agrees terms')
ok(!(await has('Mark delivered')), 'delivery cannot be marked before work starts')

// Ana starts the work, edits terms and adds a milestone.
await btn('Start the work').click()
await page.waitForFunction(() => document.querySelector('[data-testid=deal-stage]')?.textContent?.startsWith('In progress'))
ok(true, 'the buyer starts the work')
await btn('Edit terms').click()
await page.locator('[aria-label="Scope, budget and date"] textarea').first().fill('Raise readiness: model, data room, investor Q&A.')
await btn('Save terms').click()
await page.waitForFunction(() => document.querySelector('.deals-flash')?.textContent === 'Saved.')
ok(await page.isVisible('text=Raise readiness: model, data room, investor Q&A.'), 'terms save and show')
await page.fill('[aria-label="New milestone"]', 'Three-statement model')
await btn('Add milestone').click()
await page.waitForFunction(() => document.querySelector('.deals-flash')?.textContent?.includes('Milestone “Three-statement model” added'))
ok(!(await has('Submit for review')), 'the buyer is not offered to submit the provider’s milestone')
ok(!(await has('Mark delivered')), 'the buyer cannot mark the provider’s work delivered')

// Ben submits it.
await as('B')
await openRoom('Deal with Ben Okafor')
await btn('Submit for review').click()
await page.waitForFunction(() => document.querySelector('.deals-flash')?.textContent?.includes('submitted for review'))
ok(!(await has('Request changes')), 'the provider cannot review their own submission')

// Ana accepts the milestone.
await as('A')
await openRoom('Deal with Ben Okafor')
await page.locator('.deals-milestone').getByRole('button', { name: 'Accept' }).click()
await page.waitForFunction(() => document.querySelector('.deals-flash')?.textContent?.includes('“Three-statement model” accepted'))
ok(await page.isVisible('.deals-milestone.m-accepted'), 'the buyer accepts the milestone')
await page.fill('[aria-label="Add a note"]', 'Kick-off call went well.')
await btn('Add note').click()
await page.waitForFunction(() => document.querySelector('.deals-flash')?.textContent === 'Note added to the timeline.')
ok(await page.isVisible('text=You: Kick-off call went well.'), 'notes go on the timeline')

// Ben marks it delivered; Ana closes it.
await as('B')
await openRoom('Deal with Ben Okafor')
await btn('Mark delivered').click()
await page.waitForFunction(() => document.querySelector('[data-testid=deal-stage]')?.textContent?.startsWith('Delivered'))
ok(!(await has('Close — won')), 'the provider cannot close a delivered deal')
await as('A')
await openRoom('Deal with Ben Okafor')
await btn('Close — won').click()
await page.waitForFunction(() => document.querySelector('[data-testid=deal-stage]')?.textContent?.startsWith('Closed'))
ok((await stage()) === 'Closed · Won', 'the buyer closes it as won')
ok(/Your outcome is recorded on the introduction, privately/.test(await flash()), 'closing says where the outcome went')
ok(!(await has('Edit terms')) && !(await has('Add milestone')), 'a closed room offers no more edits')
const kinds = await page.evaluate(() => window.__state.events.map(e => e.kind))
ok(['created', 'member_invited', 'member_joined', 'proposal_submitted', 'proposal_accepted', 'milestone_added', 'milestone_submitted', 'milestone_accepted', 'details_updated', 'note'].every(k => kinds.includes(k)), 'every step is on the timeline')
await shot('3-closed')
await page.click('.deals-back')
ok(await page.isVisible('text=CLOSED · 1'), 'the list groups the room under Closed')

// /demo showcase: a local example room, clearly labelled, no writes.
const writes = await page.evaluate(() => window.__writes)
await page.click('#showcase')
await page.waitForSelector('.deals-showcase')
ok(await page.isVisible('text=Nothing here is saved or sent to anyone.'), 'the showcase is labelled')
await openRoom('Fractional CFO for the Series B')
ok(await has('Accept v1'), 'the example room is mid-negotiation')
await btn('Accept v1').click()
await page.waitForFunction(() => document.querySelector('[data-testid=deal-stage]')?.textContent?.startsWith('Agreed'))
await page.locator('.deals-acting').getByRole('button', { name: 'Marcus (provider)' }).click()
await page.waitForFunction(() => document.querySelector('.deals-room-head')?.textContent?.includes('YOU ARE PROVIDER'))
ok(!(await has('Accept v1')) && (await stage()).startsWith('Agreed'), 'the visitor can see it from the other side')
ok(await page.evaluate(() => window.__writes) === writes, 'the showcase never writes to the database')
await shot('4-showcase')

ok(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join('; ') : ''}`)
await browser.close(); server.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
