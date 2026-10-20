// Browser checks for consent, account changes, optimistic conflicts and identity save receipts.
import { build } from 'esbuild'
import { createServer } from 'node:http'
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const src = resolve(here, '../../src')
const out = mkdtempSync(join(tmpdir(), 'linkedin-identity-'))
await build({
  entryPoints: [join(here, 'entry.tsx')], bundle: true, format: 'esm', outdir: out, logLevel: 'error', jsx: 'automatic',
  plugins: [{ name: 'stubs', setup(b) {
    b.onResolve({ filter: /^\//, namespace: 'file' }, a => (a.kind === 'url-token' ? { path: a.path, external: true } : undefined))
    b.onResolve({ filter: /^@\/integrations\/supabase\/client$/ }, () => ({ path: join(here, 'db-stub.ts') }))
    b.onResolve({ filter: /^@\/lib\/linkedinIdentity\.functions$/ }, () => ({ path: join(here, 'server-stub.ts') }))
    b.onResolve({ filter: /^@\/lib\/voice\.functions$/ }, () => ({ path: join(here, '../linkedin-scan-check/voice-stub.ts') }))
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
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } })
const errors=[];page.on('pageerror',e=>errors.push(e.message))
let pass=0,fail=0
const ok=(value,message)=>{value?pass++:fail++;console.log((value?'PASS ':'FAIL ')+message)}
try {
 await page.goto(base)
 await page.getByRole('checkbox').first().waitFor()
 const apply=()=>page.getByRole('button',{name:'Apply selected identity details',exact:true})
 ok(await apply().isDisabled(),'identity fields start unselected')
 ok(await page.evaluate(()=>window.__identityWrites.length===0),'loading identity never writes')
 await page.getByRole('checkbox').first().check()
 await page.evaluate(()=>{window.__identityFailure=true})
 await apply().click()
 await page.waitForFunction(()=>document.body.textContent.includes('selections are kept'))
 ok(await page.getByRole('checkbox').first().isChecked(),'failed save keeps consent selections')
 ok(await page.evaluate(()=>window.__identityWrites.length===0 && window.__identityReceipts.length===0),'failed save has no success receipt')
 await page.evaluate(()=>{window.__identityFailure=false})
 await apply().click()
 await page.waitForFunction(()=>window.__identityReceipts.length===1)
 ok(await page.evaluate(()=>JSON.stringify(window.__identityWrites[0])===JSON.stringify({name:'LinkedIn Name'})),'only the selected identity field is saved')
 ok(await page.evaluate(()=>window.__identityProfile.email===null && window.__identityProfile.avatar_url===null),'unticked email and photo stay unchanged')
 await page.getByRole('checkbox').first().check()
 await page.evaluate(()=>{window.__identityProfile.name='Concurrent edit'})
 await apply().click()
 await page.waitForFunction(()=>document.body.textContent.includes('protect your edits'))
 ok(await page.evaluate(()=>window.__identityWrites.length===1),'concurrent profile edit prevents overwrite')
 await page.getByRole('button',{name:'Reload identity details'}).click()
 await page.getByRole('checkbox').first().waitFor()
 await page.getByRole('checkbox').nth(2).check()
 await apply().click()
 await page.waitForFunction(()=>window.__identityReceipts.length===2)
 ok(await page.evaluate(()=>Object.keys(window.__identityWrites[1]).join()==='avatar_url'),'photo selection saves only the provider photo URL')
 await page.evaluate(()=>window.__switchIdentity('member-b'))
 await page.waitForFunction(()=>document.body.textContent.includes('Your account changed'))
 ok(await page.getByRole('checkbox').count()===0,'account changes clear the identity review')
 await page.getByRole('button',{name:'Reload identity details'}).click()
 await page.getByRole('checkbox').first().waitFor()
 await page.getByRole('checkbox').first().check()
 await page.evaluate(()=>{window.__delayIdentity=true})
 await apply().click()
 await page.waitForFunction(()=>typeof window.__releaseIdentity==='function')
 await page.evaluate(()=>{window.__switchIdentity('member-c');window.__releaseIdentity()})
 await page.waitForTimeout(150)
 ok(await page.evaluate(()=>window.__identityReceipts.length===2 && window.__identityWrites.length===2),'in-flight old-account results never become saved receipts')
 for(const width of [390,1280]) {
  await page.setViewportSize({width,height:900})
  for(const theme of ['light','dark']) {
   await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;document.documentElement.className=theme},theme)
   ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),width+'px '+theme+' has no horizontal overflow')
  }
 }
 ok(errors.length===0,'no browser errors')
} finally {await browser.close();server.close()}
console.log(`${pass} passed, ${fail} failed`)
process.exit(fail?1:0)
