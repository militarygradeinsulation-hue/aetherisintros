// Responsive UI guard: public page and actual CRM /demo product flows at seven viewport sizes.
// This script runs only against the isolated Vite demo — no live member data or writes.
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const port = await new Promise(done => {
  const server=createServer().listen(0,'127.0.0.1',()=>{
    const p=server.address().port
    server.close(()=>done(p))
  })
})
const base='http://127.0.0.1:'+port
const child=spawn('npx',['vite','dev','--port',String(port),'--host','127.0.0.1','--strictPort'],{
  cwd:root,stdio:['ignore','pipe','pipe'],detached:true,
})
const stop=()=>{try{process.kill(-child.pid)}catch{}}
let browser,passed=0
const check=(ok,message)=>{
  if(!ok)throw new Error(message)
  passed++
  console.log('  ✓ '+message)
}
const pos=locator=>locator.evaluate(el=>{
  const r=el.getBoundingClientRect()
  return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}
})
const clearLayout=async(page,label)=>{
  const d=await page.evaluate(()=>({
    width:innerWidth,
    scroll:document.documentElement.scrollWidth,
    height:innerHeight
  }))
  check(d.scroll<=d.width+2,label+' no horizontal page overflow ('+d.scroll+' / '+d.width+')')
}
try {
 await new Promise((ok,fail)=>{
   const timeout=setTimeout(()=>fail(new Error('Vite startup timeout')),90000)
   const ready=data=>{if(/ready in|Local:/.test(String(data))){clearTimeout(timeout);ok()}}
   child.stdout.on('data',ready)
   child.stderr.on('data',ready)
   child.once('exit',code=>{clearTimeout(timeout);fail(new Error('Server exited '+code))})
 })
 const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??resolve(root,'node_modules/playwright/index.mjs'))
 browser=await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {})
 for (const vp of [{width:320,height:700},{width:375,height:812},{width:390,height:844},{width:430,height:932},{width:768,height:1024},{width:1024,height:768},{width:1440,height:900}]) {
  console.log('Workspace / '+vp.width+' x '+vp.height)
  const page=await browser.newPage({viewport:vp})
  const errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  await page.goto(base+'/demo',{waitUntil:'domcontentloaded',timeout:120000})
  const shell=page.locator('.ix-root .ledger-crm-shell')
  await shell.waitFor({state:'visible',timeout:60000})
  check(await shell.isVisible(),'native Ask Intros CRM shell is visible')
  const header=page.locator('.ledger-crm-topbar')
  check(await header.isVisible(),'persistent CRM header is visible')
  const frame=await pos(shell)
  check(frame.x>=-2&&frame.right<=vp.width+2,'CRM shell fits device width')
  check(frame.height>=vp.height*.7,'CRM frame retains usable viewport height')
  await clearLayout(page,'CRM dashboard '+vp.width)
  const butler=page.locator('.ask-dock-fab')
  if(await butler.count())check(await butler.isVisible(),'Ask Intros Butler stays visible')

  if(vp.width<=1120){
    const launcher=page.getByRole('button',{name:'Open navigation'})
    await launcher.waitFor({state:'visible'})
    const touch=await pos(launcher)
    check(touch.height>=40,'responsive CRM menu stays touch reachable')
    await launcher.click()
    const menu=page.locator('.ledger-native-mobile-sidebar')
    await menu.waitFor({state:'visible'})
    const bounds=await pos(menu)
    check(bounds.x>=-2&&bounds.right<=vp.width+2,'CRM navigation drawer fits the viewport')
    const mobileNav=page.getByRole('navigation',{name:'Mobile workspace navigation'})
    await mobileNav.getByRole('button',{name:'Messages'}).click()
    await page.locator('.ix-messages').first().waitFor({state:'visible',timeout:25000})
    check(!(await menu.isVisible()),'CRM navigation drawer closes after selection')
    await clearLayout(page,'messages '+vp.width)

    await launcher.click()
    await page.getByRole('navigation',{name:'Mobile workspace navigation'})
      .getByRole('button',{name:'People & contacts'}).click()
    await page.locator('.ledger-directory-table').waitFor({state:'visible',timeout:25000})
    await clearLayout(page,'contacts '+vp.width)
  }else{
    const nav=page.locator('.ledger-crm-sidebar')
    check(await nav.isVisible(),'desktop CRM sidebar is visible')
    await nav.getByRole('button',{name:'Messages'}).click()
    await page.locator('.ix-messages').first().waitFor({state:'visible',timeout:25000})
    await clearLayout(page,'messages '+vp.width)
    await nav.getByRole('button',{name:'People & contacts'}).click()
    await page.locator('.ledger-directory-table').waitFor({state:'visible',timeout:25000})
    await clearLayout(page,'contacts '+vp.width)
    await page.getByRole('button',{name:'Collapse sidebar'}).click()
    check(await page.getByRole('button',{name:'Expand sidebar'}).isVisible(),
      'collapsed CRM sidebar retains its restore control')
    await page.getByRole('button',{name:'Expand sidebar'}).click()
    check(await nav.isVisible(),'CRM sidebar expands without navigation loss')
  }

  check(!errors.length,'no unhandled JavaScript errors in demo')
  await page.close()
 }
 for(const vp of [{width:320,height:700},{width:390,height:844},{width:768,height:1024}]) {
   console.log('Public homepage / '+vp.width)
   const page=await browser.newPage({viewport:vp})
   await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:120000})
   await page.waitForSelector('.ael-compact',{timeout:60000})
   await clearLayout(page,'homepage '+vp.width)
   const cta=page.locator('.ael-hero-actions').first()
   const rect=await pos(cta)
   check(rect.x>=-2&&rect.right<=vp.width+2,'hero actions fit viewport')
   const inputStats=await page.evaluate(()=>[...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]),textarea,select')].filter(x=>getComputedStyle(x).display!=='none').map(x=>parseFloat(getComputedStyle(x).fontSize)))
   check(inputStats.every(x=>x>=16),'visible form controls avoid iOS focus zoom')
   await page.close()
 }
} finally {
 if(browser)await browser.close()
 stop()
}
console.log('Native CRM mobile and site browser guard: '+passed+' passed')
