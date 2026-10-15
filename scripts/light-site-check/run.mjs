// Guard light-first Ask Intros visual continuity across the public and member UI.
// Browser-only demo, with no live authentication, data reads, or writes.
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..')
const port=await new Promise(ok=>{const s=createServer().listen(0,'127.0.0.1',()=>{
 const value=s.address().port;s.close(()=>ok(value))
})})
const base='http://127.0.0.1:'+port
const child=spawn('npx',['vite','dev','--port',String(port),'--host','127.0.0.1','--strictPort'],{cwd:root,stdio:['ignore','pipe','pipe'],detached:true})
let browser,passed=0
const stop=()=>{try{process.kill(-child.pid)}catch{}}
const check=(condition,name)=>{
 if(!condition)throw new Error(name)
 passed++;console.log('  ✓ '+name)
}
const toRgb=value=>{
 const hex=value.trim().match(/^#([0-9a-f]{6})$/i)
 if(hex)return [0,2,4].map(i=>parseInt(hex[1].slice(i,i+2),16))
 const arr=value.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i)
 if(!arr)throw new Error('Could not interpret CSS color: '+value)
 return arr.slice(1,4).map(Number)
}
const lum=value=>toRgb(value).map(v=>{
 const c=v/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4
}).reduce((t,v,i)=>t+v*[.2126,.7152,.0722][i],0)
const ratio=(one,two)=>{
 const a=lum(one),b=lum(two);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)
}
try {
 await new Promise((ok,fail)=>{
   const timeout=setTimeout(()=>fail(new Error('Vite timed out')),90000)
   const ready=buffer=>{if(/ready in|Local:/.test(String(buffer))){clearTimeout(timeout);ok()}}
   child.stdout.on('data',ready);child.stderr.on('data',ready)
   child.once('exit',code=>{clearTimeout(timeout);fail(new Error('Vite exited '+code))})
 })
 const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??resolve(root,'node_modules/playwright/index.mjs'))
 browser=await chromium.launch()
 const page=await browser.newPage({viewport:{width:1440,height:900}})
 const errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.goto(base+'/demo',{waitUntil:'domcontentloaded',timeout:120000})
 await page.waitForSelector('.ix-root .arch-product-main',{timeout:60000})
 // Explicit light theme set synchronously; saved choices are tested separately.
 await page.evaluate(()=>document.documentElement.setAttribute('data-theme','light'))
 const nav=id=>page.locator('.ix-desktop-main-nav .ix-desktop-nav-link').filter({hasText:id}).first()
 const inspect=async(title)=>{
   const data=await page.evaluate(()=>{
     const root=document.querySelector('.ix-root')
     const main=document.querySelector('.arch-product-main')
     const item=main.querySelector('.sys-tile,.home-board-tile,.feed-card,[class~="bg-[#0E121A]"],[class~="bg-[var(--ui-panel)]"]')
     const computed=getComputedStyle(root)
     const style=getComputedStyle(main)
     const box=item?getComputedStyle(item):null
     return {
       page:style.backgroundColor,ink:style.color,
       panel:computed.getPropertyValue('--ui-panel').trim(),
       muted:computed.getPropertyValue('--ui-muted').trim(),
       architect:getComputedStyle(document.documentElement).getPropertyValue('--architect-canvas').trim(),
       itemBackground:box?.backgroundColor??null,
       bodyScroll:document.documentElement.scrollWidth,
       viewport:innerWidth
     }
   })
   console.log('  surface: '+JSON.stringify({name:title,...data}))
   check(data.architect.toLowerCase()==='#edf2f2',title+' unified light canvas')
   check(data.panel.toLowerCase()==='#fffdfa',title+' warm white panels')
   check(ratio(data.ink,data.panel)>=7,title+' strong text-to-panel contrast')
   check(data.bodyScroll<=data.viewport+3,title+' no horizontal overflow')
 }
 await inspect('Home')
 await nav('People').click()
 await page.waitForTimeout(160)
 await inspect('People')
 await nav('Messages').click()
 await page.waitForSelector('.ix-messages',{timeout:30000})
 const messageBg=await page.locator('.ix-messages').evaluate(node=>getComputedStyle(node).backgroundColor)
 check(ratio('rgb(32,49,57)',messageBg)>=7,'Messages matches light ink contrast')
 await inspect('Messages')
 await page.locator('.ix-desktop-more-trigger').click()
 await page.locator('.ix-desktop-more-menu button').filter({hasText:'Insights'}).first().click()
 await inspect('Insights')
 await nav('Ask Intros').click()
 await inspect('Workspaces')
 check(errors.length===0,'no runtime errors in standard member navigation')
 await page.close()
 for(const width of [320,390,768]){
   const mobile=await browser.newPage({viewport:{width,height:844}})
   await mobile.goto(base+'/',{waitUntil:'domcontentloaded',timeout:120000})
   await mobile.waitForSelector('.ael-compact',{timeout:60000})
   const cta=mobile.locator('.ael-header .ael-nav-cta.ai-gradient-button')
   for(const mode of ['dark','light']){
     await mobile.evaluate(mode=>document.documentElement.setAttribute('data-theme',mode),mode)
     const color=await cta.evaluate(el=>{
       const style=getComputedStyle(el)
       return {fg:style.color,bg:style.getPropertyValue('--ai-button-surface').trim(),text:el.textContent?.trim()||''}
     })
     const contrast=ratio(color.fg,color.bg)
     check(contrast>=7,width+'px '+mode+' access CTA contrast '+contrast.toFixed(2)+':1')
     check(color.text.toLowerCase().includes('apply for access'),width+'px '+mode+' label exists')
   }
   const dims=await mobile.evaluate(()=>({screen:innerWidth,scroll:document.documentElement.scrollWidth}))
   check(dims.scroll<=dims.screen+3,width+'px marketing header fits phone')
   await mobile.close()
 }
} finally {
 if(browser)await browser.close()
 stop()
}
console.log('Site-wide light visual checks: '+passed+' passed')
