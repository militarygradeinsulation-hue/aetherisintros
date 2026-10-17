// Guard actual rendered message legibility in the public demo (no member data required).
// Live messages use the same semantic palette and have separate source/contrast unit tests.
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root=resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const freePort = () => new Promise(done => {
  const socket=createServer().listen(0, '127.0.0.1', () => {
    const { port }=socket.address()
    socket.close(() => done(port))
  })
})
const port=await freePort()
const base='http://127.0.0.1:'+port
const child=spawn('npx',['vite','dev','--port',String(port),'--host','127.0.0.1','--strictPort'],{
  cwd:root,stdio:['ignore','pipe','pipe'],detached:true,
})
function stop(){try{process.kill(-child.pid)}catch{}}
let browser
try {
  await new Promise((ok,fail)=>{
    const timeout=setTimeout(()=>fail(new Error('dev server startup timed out')),90000)
    const ready=b=>{if(/ready in|Local:/.test(String(b))){clearTimeout(timeout);ok()}}
    child.stdout.on('data',ready)
    child.stderr.on('data',ready)
    child.once('exit',code=>{clearTimeout(timeout);fail(new Error('dev server exited: '+code))})
  })
  const {chromium}=await import(process.env.PLAYWRIGHT_MODULE ?? resolve(root,'node_modules/playwright/index.mjs'))
  browser=await chromium.launch()
  const page=await browser.newPage({viewport:{width:1440,height:900}})
  let errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  await page.goto(base+'/demo',{waitUntil:'domcontentloaded',timeout:120000})
  await page.waitForSelector('.ix-root',{timeout:60000})
  await page.locator('.ix-desktop-main-nav button').filter({hasText:'Messages'}).first().click()
  await page.waitForSelector('.ix-messages .msg-outgoing',{timeout:30000})
  const parse = x => {
    const m=String(x).match(/[\d.]+/g)
    if(!m || m.length<3)throw new Error('cannot parse color '+x)
    return m.slice(0,3).map(Number)
  }
  const contrast=(color,bg)=>{
    const l=rgb=>rgb.map(n=>{
      let c=n/255
      return c<=.04045 ? c/12.92:((c+.055)/1.055)**2.4
    }).reduce((n,c,i)=>n+c*[.2126,.7152,.0722][i],0)
    const a=l(parse(color)),b=l(parse(bg))
    return +(Math.max(a,b)+.05)/(Math.min(a,b)+.05)
  }
  let checks=0
  for(const theme of ['dark','light']){
    await page.evaluate(mode=>document.documentElement.setAttribute('data-theme',mode),theme)
    for(const [name,selector] of [
      ['outgoing bubble','.ix-messages .msg-outgoing'],
      ['incoming bubble','.ix-messages .msg-incoming'],
      ['AI next step','.ix-messages .msg-next-step .msg-body-text'],
      ['AI brief','.ix-messages .msg-brief-panel .msg-body-text'],
      ['conversation name','.ix-messages aside .text-xs.font-semibold.truncate'],
      ['primary action','.ix-messages aside .msg-primary-action'],
    ]){
      const computed=await page.locator(selector).first().evaluate(el=>{
        const ink=getComputedStyle(el).color
        let parent=el
        let surface='rgb(255, 255, 255)'
        while(parent){
          const bg=getComputedStyle(parent).backgroundColor
          if(bg && /rgba?\(/.test(bg) && !/^rgba?\(0,\s*0,\s*0,\s*0\)/.test(bg) && !/,\s*0(?:\.0+)?\)$/.test(bg)){
            surface=bg
            break
          }
          parent=parent.parentElement
        }
        return {ink,surface}
      })
      const value=contrast(computed.ink,computed.surface)
      if(value<4.5)throw new Error(theme+' '+name+' contrast '+value.toFixed(2)+':1 under 4.5:1; foreground '+computed.ink+'; surface '+computed.surface+'; selector '+selector)
      checks++
      console.log('  ✓ '+theme+' '+name+' '+value.toFixed(2)+':1')
    }
  }
  if(errors.length)throw new Error('page errors: '+errors.join(' | ').slice(0,400))
  // Mobile should retain visible chat content without a horizontal scrollbar.
  await page.setViewportSize({width:390,height:844})
  const dims=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:innerWidth}))
  if(dims.scroll>dims.viewport+2)throw new Error('Mobile horizontal overflow: '+JSON.stringify(dims))
  checks++
  console.log('  ✓ mobile conversation layout fits 390px')
  console.log('Messaging readability browser checks: '+checks+' passed')
} finally {
  if(browser)await browser.close()
  stop()
}
