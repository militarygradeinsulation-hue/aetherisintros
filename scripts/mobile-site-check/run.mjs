// Responsive UI guard: public page, /demo product flows, guided tour and More sheet.
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
 browser=await chromium.launch()
 for (const vp of [{width:320,height:700},{width:375,height:812},{width:390,height:844},{width:430,height:932},{width:768,height:1024},{width:1024,height:768},{width:1440,height:900}]) {
  console.log('Mobile site / '+vp.width+' × '+vp.height)
  const page=await browser.newPage({viewport:vp})
  const errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  await page.goto(base+'/demo',{waitUntil:'domcontentloaded',timeout:120000})
  await page.waitForSelector('.ix-root .journey-launcher',{timeout:60000})
  const bar=page.locator('.journey-shell')
  const button=page.locator('.journey-launcher')
  const position=await bar.evaluate(el=>getComputedStyle(el).position)
  check(position!=='fixed'&&position!=='absolute','guided tour stays in page flow')
  const toolbar=await pos(bar)
  const header=await pos(page.locator('.ix-global-header'))
  check(toolbar.y >= header.bottom-3,'tour sits below primary navigation')
  const b=await pos(button)
  check(b.x>=-2&&b.right<=vp.width+2,'tour launcher fits device width')
  await clearLayout(page,'demo '+vp.width)
  await button.click()
  const panel=page.locator('.journey-panel')
  await panel.waitFor({state:'visible'})
  check(await panel.isVisible(),'tour remains accessible on demand')
  const panelPos=await pos(panel)
  check(panelPos.x>=-2&&panelPos.right<=vp.width+2,'open tour stays within viewport width')
  await page.getByRole('button',{name:'Close guided tour'}).click()
  check(await button.isVisible(),'tour closes and restores launcher')
  if(vp.width<=1023) {
    const nav=page.locator('.ix-mobile-nav')
    check(await nav.isVisible(),'mobile navigation stays reachable')
    const navPos=await pos(nav)
    const touch=await pos(page.locator('.ix-mobile-nav [aria-label="More menu"]'))
    check(touch.height>=44,'mobile More touch target is at least 44px')
    check(navPos.bottom<=vp.height+3,'mobile navigation respects device bottom edge')
    await page.locator('.ix-mobile-nav [aria-label="More menu"]').click()
    const sheet=page.locator('.ix-mobile-sheet')
    await sheet.waitFor({state:'visible'})
    const rect=await pos(sheet)
    check(rect.x>=0&&rect.right<=vp.width+1&&rect.y>=0&&rect.bottom<=vp.height+2,
      'More menu entirely within phone screen')
    check(Math.abs(rect.x+rect.width/2-vp.width/2)<18,'More menu centered horizontally')
    check(rect.y>16,'More menu is no longer hidden below the viewport')
    await page.getByRole('button',{name:'Close more menu'}).last().click()
    check(!(await sheet.isVisible()),'More menu closes')
    await page.locator('.ix-mobile-nav-item').filter({hasText:'Messages'}).first().click()
    await page.waitForSelector('.ix-messages',{timeout:20000})
    await clearLayout(page,'messages '+vp.width)
    await page.locator('.ix-mobile-nav-item').filter({hasText:'People'}).first().click()
    await page.waitForTimeout(250)
    await clearLayout(page,'people '+vp.width)
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
console.log('Mobile site browser guard: '+passed+' passed')
