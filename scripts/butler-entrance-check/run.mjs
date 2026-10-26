import { build } from 'esbuild';
import { createServer } from 'node:http';
import { mkdtempSync,readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname,join,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const here=dirname(fileURLToPath(import.meta.url)),out=mkdtempSync(join(tmpdir(),'butler-entrance-'));
await build({entryPoints:[join(here,'entry.tsx')],bundle:true,format:'esm',outdir:out,jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},logLevel:'error'});
const pending=new Set();
const server=createServer((req,res)=>{
 if(req.url==='/pending.mp4'){pending.add(res);res.on('close',()=>pending.delete(res));return;}
 const type=req.url==='/entry.js'?'text/javascript':req.url==='/entry.css'?'text/css':'text/html';res.setHeader('Content-Type',type);
 res.end(type==='text/html'?'<html data-experience="business"><head><link rel="stylesheet" href="/entry.css"></head><body style="background:#16161b;color:white"><div id="root"></div><script type="module" src="/entry.js"></script></body></html>':readFileSync(join(out,req.url.slice(1))));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??resolve(here,'../../node_modules/playwright/index.mjs'));
const browser=await chromium.launch({...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? {executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{}),args:['--enable-unsafe-swiftshader']});
const assert=(ok,label)=>{if(!ok)throw Error(label);console.log('PASS '+label)};
try {
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',message=>{if(message.type()==='error') console.log('BROWSER '+message.text())});
 await page.addInitScript(()=>{HTMLMediaElement.prototype.play=function(){return Promise.resolve()}});
 await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});
 await page.locator('.butler-orb canvas').waitFor();
 await page.waitForTimeout(700);
 const before=await page.locator('.butler-orb canvas').screenshot();
 let animated=false;
 for(let attempt=0;attempt<16;attempt++) {
  await page.waitForTimeout(500);
  const after=await page.locator('.butler-orb canvas').screenshot();
  if(!before.equals(after)){animated=true;break;}
 }
 if(!animated) console.log('RENDER_DIAGNOSTIC',await page.locator('.butler-orb').evaluate(e=>({html:e.outerHTML,hidden:document.hidden,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches})),errors);
 assert(animated,'Butler floating orb renders an animated avatar');
 assert(await page.locator('.butler-orb').getAttribute('data-butler-avatar')==='robot','launcher shows the floating robot');
 const transparent=await page.locator('.butler-orb').evaluate(el=>{
   const clear=color=>color==='transparent'||color==='rgba(0, 0, 0, 0)';
   const canvas=el.querySelector('canvas');
   return !!canvas&&clear(getComputedStyle(el).backgroundColor)&&clear(getComputedStyle(canvas).backgroundColor)&&canvas.getContext('webgl2')?.getContextAttributes()?.alpha===true;
 });
 assert(transparent,'robot has a transparent WebGL canvas and no colored backdrop');
 const center=await page.locator('.butler-orb canvas').screenshot();
 await page.mouse.move(0,0);
 await page.waitForTimeout(1000);
 const moved=await page.locator('.butler-orb canvas').screenshot();
 assert(!center.equals(moved),'Butler avatar continues to move and tracks the page mouse');
 await page.evaluate(()=>window.dispatchEvent(new PointerEvent('pointerdown',{pointerType:'touch',clientX:0,clientY:0,bubbles:true})));
 const touchShift=await page.locator('.butler-orb').evaluate(el=>el.style.getPropertyValue('--butler-look-x'));
 assert(touchShift!==''&&touchShift!=='0px','Butler tracks finger taps without intercepting page input');
 await page.evaluate(()=>{
   const finger=new Touch({identifier:1,target:document.body,clientX:innerWidth,clientY:innerHeight});
   window.dispatchEvent(new TouchEvent('touchmove',{touches:[finger],targetTouches:[finger],changedTouches:[finger],bubbles:true}));
 });
 const dragShift=await page.locator('.butler-orb').evaluate(el=>el.style.getPropertyValue('--butler-look-x'));
 assert(dragShift!==touchShift,'Butler follows a finger drag across the page');
 assert(await page.locator('.butler-orb').getAttribute('data-orb-view')==='business','Business robot selects red palette');
 await page.locator('.butler-orb').screenshot({path:join(out,'business.png')});
 await page.getByRole('button',{name:'Social',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.butler-orb').dataset.orbView==='social');
 await page.waitForTimeout(500);await page.locator('.butler-orb').screenshot({path:join(out,'social.png')});
 await page.getByRole('button',{name:'Ask Intros',exact:true}).click();
 assert(await page.getByRole('dialog').isVisible(),'decorative orb preserves launcher click');
 await page.getByRole('button',{name:'Start intro'}).click();
 const film=page.locator('.ask-cinematic-entrance');
 await film.waitFor();
 assert(await film.locator('video').evaluate(v=>v.autoplay&&v.muted&&v.playsInline),'intro is muted inline autoplay');
 assert(await film.evaluate(e=>e.getBoundingClientRect().height===innerHeight),'intro fills mobile viewport');
 await film.locator('video').evaluate(v=>{Object.defineProperty(v,'duration',{value:10,configurable:true});v.currentTime=9;v.dispatchEvent(new Event('timeupdate'))});
 assert(Number(await film.locator('.ask-cinematic-entrance-title').evaluate(e=>e.style.opacity))>0,'closing tagline fades in with playback');
 await page.getByRole('button',{name:'Skip intro'}).click();await film.waitFor({state:'detached'});
 await page.getByRole('button',{name:'Start intro'}).click();await film.waitFor();
 await film.locator('video').dispatchEvent('ended');await page.waitForTimeout(2200);assert(await film.isVisible(),'early video end cannot shorten eight-second entrance');
 assert(await page.getByRole('button',{name:'Enter Intros'}).count()===0,'entry is unavailable before eight seconds');
 await page.getByRole('button',{name:'Enter Intros'}).waitFor();await page.waitForTimeout(2000);
 assert(await film.isVisible(),'entrance waits for member after eight seconds');
 await page.getByRole('button',{name:'Enter Intros'}).click();await film.waitFor({state:'detached'});
 assert(true,'Enter Intros reveals page');
 await page.getByRole('button',{name:'Start intro'}).click();await film.waitFor();
 await film.locator('video').dispatchEvent('error');await page.waitForTimeout(2200);assert(await film.isVisible(),'failed video retains branded entrance for several seconds');
 await page.getByRole('button',{name:'Enter Intros'}).click();await film.waitFor({state:'detached'});
 assert(true,'failed video allows manual entry');
 await page.getByRole('button',{name:'Start intro'}).click();await film.waitFor();await page.keyboard.press('Escape');await film.waitFor({state:'detached'});
 assert(true,'Escape dismisses entry');
 await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('button',{name:'Start intro'}).click();await page.getByRole('button',{name:'Enter Intros'}).click();await film.waitFor({state:'detached'});
 assert(await page.evaluate(()=>document.body.style.position!=='fixed'),'reduced motion never locks page');
 await page.locator('.butler-orb canvas').evaluate(c=>c.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
 await page.locator('.butler-orb canvas').waitFor({state:'detached'});
 assert(await page.locator('.butler-orb-fallback').isVisible(),'context loss preserves visible fallback');
 assert(errors.length===0,'no browser runtime errors: '+errors.join(','));
 console.log('Screenshots: '+out);
} finally {await browser.close();for(const res of pending)res.destroy();server.close();}
