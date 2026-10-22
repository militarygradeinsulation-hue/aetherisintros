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
 browser=await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {})
 for (const vp of [{width:320,height:700},{width:375,height:812},{width:390,height:844},{width:430,height:932},{width:768,height:1024},{width:1024,height:768},{width:1440,height:900}]) {
  console.log('Workspace / '+vp.width+' x '+vp.height)
  const page=await browser.newPage({viewport:vp})
  const errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  await page.goto(base+'/demo',{waitUntil:'domcontentloaded',timeout:120000})
  const shell=page.locator('.ix-root .aetheris-workspace-shell')
  await shell.waitFor({state:'visible',timeout:60000})
  check(await shell.isVisible(),'shared Ask Intros shell is visible')
  const header=page.locator('.specter-app-header')
  check(await header.isVisible(),'persistent workspace header is visible')
  const frame=await pos(shell)
  check(frame.x>=-2&&frame.right<=vp.width+2,'workspace shell fits device width')
  // The shared shell can start below a legitimate status/banner in the outer
  // app, so it need not itself be exactly 100dvh. It must fit the available
  // phone viewport without spilling beyond it, with room to use the pane.
  console.log('  workspace bounds', JSON.stringify({shell:frame, viewport:vp}))
  check(frame.y>=-2&&frame.bottom<=vp.height+3&&frame.height>=vp.height*.6,
    'workspace stays within viewport with enough usable height')
  await clearLayout(page,'demo '+vp.width)
  const butler=page.locator('.ask-dock-fab')
  if (await butler.count()) check(await butler.isVisible(),'Ask Intros Butler stays visible')

  if (vp.width<=760) {
    const launcher=page.getByRole('button',{name:'Open workspace menu'})
    await launcher.waitFor({state:'visible'})
    const touch=await pos(launcher)
    check(touch.height>=40,'mobile menu remains touch reachable')
    await launcher.click()
    const menu=page.locator('.specter-mobile-menu')
    await menu.waitFor({state:'visible'})
    // Visibility begins during the slide-in; measure its settled position.
    await menu.evaluate(async element => {
      await Promise.all(element.getAnimations().map(animation => animation.finished.catch(() => {})))
    })
    const bounds=await pos(menu)
    check(bounds.x>=-2&&bounds.right<=vp.width+2,'workspace menu fits phone width')
    await menu.locator('nav button').filter({hasText:'Messages'}).first().click()
    await page.locator('.ix-messages').first().waitFor({state:'visible',timeout:25000})
    check(!(await menu.isVisible()),'mobile menu closes after navigation')
    await clearLayout(page,'messages '+vp.width)

    await page.getByRole('button',{name:'Open workspace menu'}).click()
    await page.locator('.specter-mobile-menu nav button').filter({hasText:'Member Network'}).first().click()
    await page.locator('.ix-network-viewport').waitFor({state:'visible',timeout:25000})
    await clearLayout(page,'network '+vp.width)
  } else {
    const nav=page.locator('.specter-app-sidebar')
    check(await nav.isVisible(),'desktop sidebar is visible')
    await nav.locator('nav button').filter({hasText:'Messages'}).first().click()
    await page.locator('.ix-messages').first().waitFor({state:'visible',timeout:25000})
    await clearLayout(page,'messages '+vp.width)
    await nav.locator('nav button').filter({hasText:'Member Network'}).first().click()
    await page.locator('.ix-network-viewport').waitFor({state:'visible',timeout:25000})
    await clearLayout(page,'network '+vp.width)
    await page.getByRole('button',{name:'Hide sidebar'}).click()
    check(await page.getByRole('button',{name:'Show sidebar'}).isVisible(),'collapsed sidebar retains restore control')
    await page.getByRole('button',{name:'Show sidebar'}).click()
    check(await page.locator('.specter-app-sidebar').isVisible(),'sidebar expands without leaving page')
  }

  check(!errors.length,'no unhandled JavaScript errors in demo')
  await page.close()
 }
 for(const vp of [{width:320,height:700},{width:390,height:844},{width:768,height:1024}]) {
   console.log('Public homepage / '+vp.width)
   const page=await browser.newPage({viewport:vp})
   await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:120000})
   await page.waitForSelector('.vision-page .vs-shell',{timeout:60000})
   await clearLayout(page,'homepage '+vp.width)
   const cta=page.locator('.vs-hero-actions').first()
   const rect=await pos(cta)
   check(rect.x>=-2&&rect.right<=vp.width+2,'hero actions fit viewport')
   check(await page.locator('.vs-data-disclaimer').isVisible(),'sample data is labeled before any live member action')
   check(await page.locator('.vs-auth-links a[href*="mode=signup"]').count()===1,'mobile signup entry reaches existing auth')
   const mobileNav=page.locator('.vs-mobile-bottom')
   check(await mobileNav.isVisible(),'mobile bottom navigation is available')
   const inputStats=await page.evaluate(()=>[...document.querySelectorAll('.vision-page input:not([type=checkbox]):not([type=radio]),.vision-page textarea,.vision-page select')].filter(x=>{const st=getComputedStyle(x);return st.display!=='none'&&st.visibility!=='hidden'}).map(x=>parseFloat(getComputedStyle(x).fontSize)))
   check(inputStats.every(x=>x>=16),'visible form controls avoid iOS focus zoom')
   await page.close()
 }
} finally {
 if(browser)await browser.close()
 stop()
}
console.log('Mobile site browser guard: '+passed+' passed')
