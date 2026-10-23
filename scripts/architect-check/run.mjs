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
  check(m.background=== (theme==='dark'?'rgb(0, 0, 0)':'rgb(255, 255, 255)'),'Canvas follows the black / white appearance mode');
  check(m.panel.toLowerCase()===(theme==='light'?'#fff':'#0c0c0c'),`White or graphite panel token matches appearance mode (received ${m.panel})`);
  check(m.mainWidth<=m.viewport+2,'Home stays within viewport');
  const nav=page.locator('.specter-app-sidebar nav[aria-label="Workspace navigation"]');
  await nav.getByRole('button',{name:'Member Network'}).click();
  await page.waitForFunction(()=>document.querySelector('.arch-product-main')?.dataset.archPage==='people');
  check((await read()).page==='people','People directory shares the design shell');
  await page.locator('.specter-app-header .specter-header-cta').click();
  await page.waitForFunction(()=>document.querySelector('.arch-product-main')?.dataset.archPage==='workspace');
  check((await read()).page==='workspace','All workspace tools share the design shell');
  // Workspace tools now live exclusively in the persistent sidebar and mobile
  // Menu; a second 19-button strip above the active workspace obscured content.
  check(await page.locator('.ix-tools').count()===0,'Duplicate workspace button strip is absent');
  const toolsToggle=nav.getByRole('button',{name:'Business Tools'});
  if ((await toolsToggle.getAttribute('aria-expanded'))!=='true') await toolsToggle.click();
  const toolsList=nav.locator('.specter-tools-list');
  check(await toolsList.isVisible() && await toolsList.getByRole('button').count()>=16,
    'Real workspace tools remain accessible in the business menu');
  await toolsList.getByRole('button',{name:'CRM & Contacts'}).click();
  await page.waitForFunction(()=>document.querySelector('.arch-product-main')?.dataset.archPage==='workspace');
  const selectedTool=toolsList.getByRole('button',{name:'CRM & Contacts'});
  check((await selectedTool.getAttribute('aria-current'))==='page',
    'Selected workspace tool remains highlighted in the persistent menu');
  const workspaceSkin=await page.evaluate(() => {
    const app=document.querySelector('.ix-classic .app-shell');
    const get=(selector)=>{const el=document.querySelector(selector);return el?getComputedStyle(el).backgroundColor:null;};
    return {app:app?getComputedStyle(app).backgroundColor:null,
      toolstrip:get('.ix-tools'),main:get('.arch-product-main')};
  });
  check(workspaceSkin.app=== (theme==='light'?'rgb(255, 255, 255)':'rgb(0, 0, 0)'),
    'Classic workspace actual background matches inverse stencil theme ('+JSON.stringify(workspaceSkin)+')');
  check(workspaceSkin.toolstrip===null && workspaceSkin.main===workspaceSkin.app,
    'Workspace content uses the shared surface without an overlaying option strip');

  // Option pages share the current stencil/orange selection system, not obsolete powder blue.
  const options = await page.evaluate(() => {
    const chosen=document.querySelector('.specter-app-sidebar .specter-tools-list button[aria-current="page"]');
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
  check(Boolean(options.selectedColor) && options.selectedColor!=='rgb(220, 232, 243)','Selected business tool uses the current design rather than stale powder-blue');
  // One persistent member sidebar replaces the obsolete desktop More dropdown.
  check(await nav.isVisible(), 'Persistent workspace destinations are visible');
  const navColor=await nav.evaluate(el=>getComputedStyle(el).color);
  check(Boolean(navColor && navColor!=='rgba(0, 0, 0, 0)'), 'Workspace navigation has readable ink');
  await nav.getByRole('button',{name:'Messages'}).click();
  await page.waitForFunction(()=>document.querySelector('.arch-product-main')?.dataset.archPage==='messages');
  check((await read()).page==='messages','Messages shares the product shell');
  const messaging=await page.evaluate(() => {
    const root=document.querySelector('.ix-messages,.ix-live-messages');
    const action=root?.querySelector('.msg-primary-action');
    return { background:root?getComputedStyle(root).backgroundColor:null,
      action:action?getComputedStyle(action).backgroundColor:null };
  });
  check(messaging.background===(theme==='dark'?'rgb(0, 0, 0)':'rgb(255, 255, 255)'),'Message panels invert black/white with the active appearance');
  check(!messaging.action || messaging.action!=='rgb(47, 95, 135)','Message actions never regress to obsolete slate blue');
  // Previously dark-on-dark relationship signal cards must remain readable.
  await nav.getByRole('button',{name:'Insights'}).click();
  await page.waitForFunction(()=>document.querySelector('.arch-product-main')?.dataset.archPage==='insights');
  await page.waitForSelector('.ai-insight-list>article',{timeout:30000});
  const signals=await page.evaluate(() => {
    const card=document.querySelector('.ai-insight-list>article');
    const group=document.querySelector('.ai-insight-numbers');
    const styles=el=>el?getComputedStyle(el):null;
    const color=s=>{const m=s?.match(/[\d.]+/g);return m?m.slice(0,3).map(Number):null};
    const luminosity=channels=>channels.reduce((a,v,i)=>{
      const x=v/255,linear=x<=.04045?x/12.92:((x+.055)/1.055)**2.4;
      return a+linear*[.2126,.7152,.0722][i];
    },0);
    const contrast=(fg,bg)=>{const f=color(fg),b=color(bg);
      if(!f||!b)return 0;
      const a=luminosity(f),z=luminosity(b);
      return (Math.max(a,z)+.05)/(Math.min(a,z)+.05);
    };
    const surface=styles(card)?.backgroundColor;
    return {surface,metrics:styles(group)?.backgroundColor,
      heading:contrast(styles(card?.querySelector('.insight-main h3'))?.color,surface),
      description:contrast(styles(card?.querySelector('.insight-main p'))?.color,surface),
      evidence:contrast(styles(card?.querySelector('.insight-main small'))?.color,surface),
      confidence:contrast(styles(card?.querySelector('.insight-confidence strong'))?.color,surface)};
  });
  check(signals.surface===(theme==='dark'?'rgb(12, 12, 12)':'rgb(255, 255, 255)') && signals.metrics===signals.surface,
    'Insights and relationship signals use inverse graphite/white cards');
  check(['heading','description','evidence','confidence'].every(k=>signals[k]>=4.5),
    'Insight names, descriptions, evidence and confidence all meet 4.5:1 text contrast ('+JSON.stringify(signals)+')');
  await nav.getByRole('button',{name:'Meetings'}).click();
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
