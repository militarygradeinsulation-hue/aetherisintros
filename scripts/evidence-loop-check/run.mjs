import {build} from 'esbuild'
import {createServer} from 'node:http'
import {mkdtempSync,readFileSync,mkdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname,join,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
const here=dirname(fileURLToPath(import.meta.url)),out=mkdtempSync(join(tmpdir(),'evidence-browser-'))
await build({entryPoints:[join(here,'entry.tsx')],bundle:true,format:'esm',outdir:out,jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'fixtures-only',setup(b){b.onResolve({filter:/(@\/lib\/evidence.functions|@\/integrations\/supabase\/client)$/},()=>({path:join(here,'mock.ts')}))}}]})
const server=createServer((req,res)=>{const asset=['/entry.js','/entry.css'].includes(req.url);res.setHeader('Content-Type',req.url==='/entry.js'?'text/javascript':req.url==='/entry.css'?'text/css':'text/html');res.end(asset?readFileSync(join(out,req.url.slice(1))):'<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/entry.css"><style>*{box-sizing:border-box}body{margin:0;background:#0b1018;color:#edf3fa;--commons-ink:#edf3fa;--commons-card:#141a24;font-family:system-ui}body.light{background:#f3f6fa;color:#17202e;--commons-ink:#17202e;--commons-card:#fff;--commons-bg:#f4f6fa}</style></head><body><div id="root"></div><script type="module" src="/entry.js"></script></body></html>')})
await new Promise(r=>server.listen(0,'127.0.0.1',r))
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??resolve(here,'../../node_modules/playwright/index.mjs'))
const browser=await chromium.launch(),url='http://127.0.0.1:'+server.address().port
const assert=(v,m)=>{if(!v)throw Error(m);console.log('PASS '+m)}
try{
 for(const width of [320,390,768,1440]) for(const theme of ['dark','light']){
  const page=await browser.newPage({viewport:{width,height:844}}),errors=[]
  page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.evaluate(t=>document.body.className=t,theme)
  await page.getByLabel('Enable private task timing').check()
  await page.locator('select').first().selectOption('content')
  await page.getByLabel('Usual active minutes').fill('10')
  await page.getByRole('button',{name:'Start task timer'}).click()
  const timer=page.getByRole('complementary',{name:'Private task timer'})
  await timer.waitFor();await page.waitForTimeout(2200)
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))})
  await timer.getByRole('button',{name:'Resume',exact:true}).waitFor()
  await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,value:false}))
  await timer.getByRole('button',{name:'Resume',exact:true}).click()
  await page.evaluate(()=>window.failSave=true)
  await timer.getByRole('button',{name:'Reviewed & complete'}).click()
  await timer.getByRole('alert').waitFor()
  assert(await timer.isVisible(),'failed save retains active record')
  await page.evaluate(()=>window.failSave=false)
  await timer.getByRole('button',{name:'Reviewed & complete'}).click()
  await timer.waitFor({state:'detached'})
  await page.getByRole('button',{name:'Delete record',exact:true}).waitFor()
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow '+width+' '+theme)
  if(process.env.EVIDENCE_SCREENSHOTS&&width===390){mkdirSync(process.env.EVIDENCE_SCREENSHOTS,{recursive:true});await page.screenshot({path:resolve(process.env.EVIDENCE_SCREENSHOTS,theme+'.png'),fullPage:true})}
  await page.getByRole('button',{name:'Delete all timing records'}).click();await page.getByRole('button',{name:'Keep records'}).click()
  assert(await page.getByRole('button',{name:'Delete record',exact:true}).count()===1,'cancel keeps history')
  await page.evaluate(()=>window.changeAccount())
  await page.getByText('No completed tasks yet.',{exact:false}).waitFor()
  assert(await page.getByRole('button',{name:'Delete record',exact:true}).count()===0,'account switch clears private history')
  assert(!await page.getByLabel('Enable private task timing').isChecked(),'consent does not follow another account')
  assert(errors.length===0,'no browser errors');await page.close()
 }
 const page=await browser.newPage({viewport:{width:390,height:844}})
 await page.goto(url+'/?unavailable=1');await page.getByRole('status').filter({hasText:'awaiting database activation'}).waitFor();assert(await page.getByRole('button',{name:'Start task timer'}).isDisabled(),'unapplied migration disables timing')
 await page.goto(url);await page.getByLabel('Enable private task timing').check();await page.locator('select').first().selectOption('content');await page.getByRole('button',{name:'Start task timer'}).click();await page.waitForTimeout(2200)
 await page.evaluate(()=>window.deferSave=true);await page.getByRole('button',{name:'Reviewed & complete'}).click();await page.evaluate(()=>window.changeAccount());await page.getByText('No completed tasks yet.',{exact:false}).waitFor();await page.evaluate(()=>window.releaseSave());await page.waitForTimeout(100)
 assert(await page.getByRole('button',{name:'Delete record',exact:true}).count()===0,'late completion cannot populate another account')
 console.log('Evidence browser checks passed')
}finally{await browser.close();await new Promise(r=>server.close(r))}
