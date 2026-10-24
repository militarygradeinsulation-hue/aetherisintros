// Isolated real-component test. Controlled receipts exercise the UI contract;
// these checks do not certify production permissions or comment persistence.
import { build } from 'esbuild'
import { createServer } from 'node:http'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const here = dirname(fileURLToPath(import.meta.url))
const out = mkdtempSync(join(tmpdir(), 'comment-save-'))
await build({entryPoints:[join(here,'entry.tsx')],bundle:true,format:'esm',outfile:join(out,'entry.js'),jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'}})
writeFileSync(join(out,'index.html'), '<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/entry.css"><div id="root"></div><script type="module" src="/entry.js"></script>')
const server = createServer((req,res) => {
  const file = req.url === '/entry.js' ? 'entry.js' : req.url === '/entry.css' ? 'entry.css' : 'index.html'
  res.setHeader('content-type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html')
  res.end(readFileSync(join(out,file)))
}).listen(0,'127.0.0.1')
await new Promise(resolve => server.once('listening',resolve))
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')
let browser
const assert = (value,message) => { if(!value) throw new Error(message); console.log('PASS '+message) }
try {
  browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto(`http://127.0.0.1:${server.address().port}`)
  const input = page.getByRole('textbox',{name:'Comment',exact:true})
  const send = page.getByRole('button',{name:'Post comment',exact:true})
  await input.waitFor()
  assert(await send.isDisabled(),'blank comments cannot be submitted')
  await input.fill('  Keep my useful context  ')
  await send.click()
  assert(await input.isDisabled(),'draft cannot change during an unconfirmed save')
  assert(await page.getByRole('button',{name:'Saving comment'}).isDisabled(),'pending save cannot be resubmitted')
  await input.dispatchEvent('keydown',{key:'Enter'})
  assert(await page.evaluate(()=>window.commentCheck.calls.length)===1,'Enter during an in-flight save does not duplicate the write')
  await page.evaluate(()=>window.commentCheck.finish(false))
  await page.getByRole('alert').waitFor()
  assert(await input.inputValue()==='  Keep my useful context  ','permission denial retains the entire draft')
  assert(await send.isEnabled(),'denied draft can be edited or retried')
  await input.fill('Edited context')
  await input.dispatchEvent('keydown',{key:'Enter',isComposing:true})
  assert(await page.evaluate(()=>window.commentCheck.calls.length)===1,'IME confirmation does not submit a comment')
  await input.press('Enter')
  await page.evaluate(()=>window.commentCheck.fail())
  await page.getByRole('alert').waitFor()
  assert(await input.inputValue()==='Edited context','transport exception retains the draft')
  assert(!(await page.getByRole('alert').textContent()).includes('private server'),'failure notice does not expose server details')
  await send.click()
  await page.evaluate(()=>window.commentCheck.finish(true))
  await page.waitForFunction(()=>document.querySelector('input').value==='')
  assert(await input.inputValue()==='','confirmed receipt clears the draft')
  assert(await page.getByRole('alert').count()===0,'successful save clears the failure notice')
  assert(JSON.stringify(await page.evaluate(()=>window.commentCheck.calls))===JSON.stringify(['Keep my useful context','Edited context','Edited context']),'submitted content and number of attempts match the member actions')
} finally { if(browser) await browser.close(); server.close() }
