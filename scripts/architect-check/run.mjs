// Product-wide Architect smoke test: the look cannot stop at the homepage.
// Checks both modes across the member destinations and classic operational pages.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const port = () => new Promise(done => {
  const s = createServer().listen(0, '127.0.0.1', () => {
    const p = s.address().port;
    s.close(() => done(p));
  });
});
let child;
let base = process.env.BASE;
if (!base) {
  const p = await port();
  base = `http://127.0.0.1:${p}`;
  child = spawn('npx',['vite','dev','--port',String(p),'--host','127.0.0.1','--strictPort'],{
    cwd:root,stdio:['ignore','pipe','pipe'],detached:true,
  });
  await new Promise((ok,fail) => {
    const timer = setTimeout(() => fail(new Error('dev server startup exceeded 90s')),90000);
    const started = data => { if (/ready in|Local:/.test(String(data))) { clearTimeout(timer); ok(); } };
    child.stdout.on('data',started);child.stderr.on('data',started);
    child.once('exit',code => {clearTimeout(timer);fail(new Error('server exited '+code));});
  });
}
const stop = () => {if (child) try {process.kill(-child.pid);}catch {/* ignored */}};
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE ?? resolve(root,'node_modules/playwright/index.mjs'));
const executable = process.env.CHROMIUM ?? '/opt/pw-browsers/chromium';
const browser = await chromium.launch(existsSync(executable)?{executablePath:executable}:{});
let failures = 0,passes=0;
const check=(condition,description) => {if(condition){passes++;console.log('  ✓ '+description);}else{failures++;console.log('  ✗ '+description);}};

try {
 for(const theme of ['dark','light']){
  const page = await browser.newPage({viewport:{width:1440,height:900}});
  await page.addInitScript(mode => {
    try { localStorage.setItem('ask-intros.appearance',mode); } catch { /* optional */ }
  },theme);
  await page.goto(base+'/demo',{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForSelector('.arch-product-main',{timeout:60000});
  await page.waitForFunction(mode=>document.documentElement.dataset.theme===mode,theme);
  const read=()=>page.evaluate(() => {
    const main=document.querySelector('.arch-product-main');
    const styles=getComputedStyle(main);
    const root=getComputedStyle(document.documentElement);
    return {
      page:main?.getAttribute('data-arch-page'),
      background:styles.backgroundColor,
      panel:root.getPropertyValue('--ai-ui-surface').trim(),
      ink:root.getPropertyValue('--architect-ink').trim(),
      mainWidth:main?.getBoundingClientRect().width,
      viewport:innerWidth,
    };
  });
  console.log('ARCHITECT / '+theme);
  let m=await read();
  check(m.page==='home','Home uses the shared product layout');
  check(m.panel.length>0 && m.ink.length>0,'Design tokens load in '+theme);
  check(m.background=== (theme==='dark'?'rgb(17, 23, 25)':'rgb(245, 242, 236)'),'Canvas follows appearance mode');
  check(m.panel===(theme==='light'?'#FBF9F4':'#1a2223'),'Paper or charcoal panel tokens follow appearance mode');
  check(m.mainWidth<=m.viewport+2,'Home stays within viewport');
  const nav=page.locator('nav[aria-label="Desktop navigation"]');
  await nav.locator('> button',{hasText:'People'}).click();
  await page.waitForFunction(()=>document.querySelector('.arch-product-main')?.dataset.archPage==='people');
  check((await read()).page==='people','People directory shares the design shell');
  await nav.locator('> button',{hasText:'Ask Intros'}).click();
  await page.waitForFunction(()=>document.querySelector('.arch-product-main')?.dataset.archPage==='workspace');
  check((await read()).page==='workspace','All workspace tools share the design shell');
  check(await page.locator('.ix-tools button').count()>=10,'Real workspace module tabs remain available');
  // Option pages share the pale-blue selection system, regardless of view.
  const options = await page.evaluate(() => {
    const chosen=document.querySelector('.arch-product-main .ix-tools button.on');
    const selected=chosen?getComputedStyle(chosen):null;
    const root=getComputedStyle(document.documentElement);
    return {
      selectedColor:selected?.backgroundColor,
      optionInk:root.getPropertyValue('--ai-ui-selected-ink').trim(),
      optionBg:root.getPropertyValue('--ai-ui-selected').trim(),
      canvas:root.getPropertyValue('--ai-ui-canvas').trim()
    };
  });
  check(Boolean(options.optionBg && options.optionInk && options.canvas),'Executive option tokens available in '+theme);
  check(theme!=='light' || options.selectedColor==='rgb(220, 232, 243)','Selected workspace option uses powder-blue on light theme');
  await nav.locator('[aria-haspopup=menu]').click();
  const menuSurface=await page.locator('.ix-desktop-more-menu').evaluate(el=>getComputedStyle(el).backgroundColor);
  check(menuSurface=== (theme==='light'?'rgb(251, 249, 244)':'rgb(26, 34, 35)'),'More dropdown uses the same panel surface');
  await page.keyboard.press('Escape');
  await nav.locator('> button',{hasText:'Messages'}).click();
  await page.waitForFunction(()=>document.querySelector('.arch-product-main')?.dataset.archPage==='messages');
  check((await read()).page==='messages','Messages shares the product shell');
  const messaging=await page.evaluate(() => {
    const root=document.querySelector('.ix-messages,.ix-live-messages');
    const action=root?.querySelector('.msg-primary-action');
    return { background:root?getComputedStyle(root).backgroundColor:null,
      action:action?getComputedStyle(action).backgroundColor:null };
  });
  check(messaging.background==='rgb(245, 242, 236)','Messaging panels retain screenshot-inspired ivory even in dark mode');
  check(!messaging.action || messaging.action==='rgb(47, 95, 135)','Routine message actions are muted slate blue');
  await nav.locator('> button',{hasText:'Meetings'}).click();
  await page.waitForFunction(()=>document.querySelector('.arch-product-main')?.dataset.archPage==='meetings');
  check((await read()).page==='meetings','Meeting workspace shares the design shell');
  await page.close();
 }
} catch(error){
 failures++; console.error('  ✗ Architect smoke test crashed:',error.message.slice(0,600));
} finally {
 await browser.close();stop();
}
console.log(`Architect whole-product: ${passes} passed, ${failures} failed`);
process.exit(failures?1:0);
