// Product-wide visual and route smoke test against the REAL Absolute Ledger CRM shell.
// Keep member behavior and underlying Ask Intros modules, not superseded Specter navigation.
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const port=await new Promise(done=>{const s=createServer().listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>done(p))})});
const child=spawn('npx',['vite','dev','--port',String(port),'--host','127.0.0.1','--strictPort'],{cwd:root,stdio:['ignore','pipe','pipe'],detached:true});
const stop=()=>{try{process.kill(-child.pid)}catch{}};
const check=(condition,label)=>{if(!condition)throw Error(label);console.log('PASS '+label)};
let browser;
try{
  await new Promise((ready,fail)=>{
    const timeout=setTimeout(()=>fail(Error('Vite startup timed out')),90000);
    const receive=data=>{if(/ready in|Local:/.test(String(data))){clearTimeout(timeout);ready()}};
    child.stdout.on('data',receive);child.stderr.on('data',receive);
    child.once('exit',code=>{clearTimeout(timeout);fail(Error('Server exited '+code))});
  });
  const {chromium}=await import(process.env.PLAYWRIGHT_MODULE ?? resolve(root,'node_modules/playwright/index.mjs'));
  browser=await chromium.launch();
  for(const theme of ['dark','light']){
    const context=await browser.newContext({viewport:{width:1440,height:900}});
    await context.addInitScript(value=>{localStorage.setItem('ask-intros.appearance',value)},theme);
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://127.0.0.1:'+port+'/demo',{waitUntil:'domcontentloaded',timeout:120000});
    await page.locator('.ledger-crm-shell[data-layout-source="absolute-ledger-flow/app-shell"]').waitFor({timeout:60000});
    await page.waitForFunction(mode=>document.documentElement.dataset.theme===mode,theme);
    const style=await page.evaluate(()=>{
      const root=document.querySelector('.ledger-native-app');
      const shell=document.querySelector('.ledger-crm-shell');
      const label=document.querySelector('.ledger-ui-page-header h1');
      const css=getComputedStyle(root);
      return {background:css.backgroundColor,color:css.color,accent:css.getPropertyValue('--ledger-crm-accent').trim(),
        h1:label?.textContent?.trim(),sidebarCount:shell?.querySelectorAll('.ledger-crm-sidebar').length,
        overflow:document.documentElement.scrollWidth-innerWidth,
        rootWidth:root?.getBoundingClientRect().width};
    });
    check(style.h1==='Command Dashboard',theme+' native CRM dashboard heading');
    check(style.sidebarCount===1,theme+' one persistent CRM sidebar');
    check(style.overflow<=3 && style.rootWidth<=1442,theme+' CRM layout fits viewport');
    check(style.background===(theme==='dark'?'rgb(10, 10, 10)':'rgb(245, 245, 240)'),
      theme+' CRM canvas follows black/ivory appearance');
    check(/^#(?:ef4444|b91c1c|cb3000)$/i.test(style.accent),theme+' CRM accent is red, not orange');
    check(await page.locator('.ledger-dashboard-stats .ledger-ui-stat').count()===4,theme+' grounded KPI cards');
    const sidebar=page.locator('.ledger-crm-sidebar');
    await sidebar.getByRole('button',{name:'People & contacts'}).click();
    await page.locator('.ledger-directory-table').waitFor({state:'visible',timeout:30000});
    check(await page.locator('[data-arch-page="people"]').count()===1,theme+' contacts use CRM records');
    await sidebar.getByRole('button',{name:'CRM pipeline'}).click();
    await page.locator('.ledger-workspace-modules').waitFor({state:'visible',timeout:30000});
    check(await page.locator('[data-arch-page="workspace"]').count()===1,theme+' authenticated tool frame is preserved');
    check(await page.locator('.ledger-workspace-modules button').count()>=10,theme+' module navigation retains production tools');
    await sidebar.getByRole('button',{name:'Messages'}).click();
    await page.locator('[data-arch-page="messages"]').waitFor({state:'visible',timeout:30000});
    await page.locator('.ix-messages').first().waitFor({state:'visible',timeout:30000});
    check(await sidebar.isVisible(),theme+' CRM sidebar persists across messaging');
    await sidebar.getByRole('button',{name:'Network intelligence'}).click();
    await page.locator('[data-arch-page="insights"]').waitFor({state:'visible',timeout:30000});
    check(await page.locator('.ai-insight-list').count()>0,theme+' real Insights view remains connected');
    await sidebar.getByRole('button',{name:'Meetings'}).click();
    await page.locator('[data-arch-page="meetings"]').waitFor({state:'visible',timeout:30000});
    check(!errors.length,theme+' no uncaught member-page errors: '+errors.slice(0,2).join('; '));
    await context.close();
  }
  console.log('Native CRM multi-page architecture checks passed in dark and light appearances.');
} finally {
  if(browser)await browser.close();
  stop();
}
