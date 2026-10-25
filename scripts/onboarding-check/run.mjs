import { build } from 'esbuild';
import { createServer } from 'node:http';
import { mkdtempSync,readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname,join,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const here=dirname(fileURLToPath(import.meta.url)),out=mkdtempSync(join(tmpdir(),'onboarding-'));
await build({entryPoints:[join(here,'entry.tsx')],bundle:true,external:['/fonts/*'],format:'esm',outdir:out,jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},logLevel:'error'});
const server=createServer((req,res)=>{const asset=req.url==='/entry.js'||req.url==='/entry.css';res.setHeader('Content-Type',req.url==='/entry.js'?'text/javascript':req.url==='/entry.css'?'text/css':'text/html');res.end(asset?readFileSync(join(out,req.url.slice(1))):'<html data-theme="dark" data-experience="social"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/entry.css"></head><body><div id="root"></div><script type="module" src="/entry.js"></script></body></html>');});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??resolve(here,'../../node_modules/playwright/index.mjs'));
const browser=await chromium.launch({...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{})});
const assert=(ok,label)=>{if(!ok)throw Error(label);console.log('PASS '+label)};
try {
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);
 const start=()=>page.getByRole('button',{name:'Onboarding',exact:true}).click();const dialog=page.getByRole('dialog');
 for (const width of [320,390,768]) { await page.setViewportSize({width,height:740}); const menu=page.locator('.ix-mobile-sheet');const box=await menu.boundingBox();assert(box.x>=0&&box.x+box.width<=width,'More menu stays inside viewport '+width);assert(await menu.locator('button').evaluateAll(items=>items.every(e=>e.scrollWidth<=e.clientWidth&&e.scrollHeight<=e.clientHeight&&getComputedStyle(e).lineHeight==='21px')),'More labels have room '+width); }
 await start();await dialog.waitFor();
 assert(await dialog.getByRole('heading').innerText()==='Welcome to Ask Intros','explicit launch opens welcome');
 await dialog.getByRole('button',{name:'Next',exact:true}).click();
 assert(await dialog.getByRole('heading').innerText()==='One system, two views','next advances');
 await dialog.getByLabel('Jump to a feature').selectOption('crm');
 assert(await page.locator('output').innerText()==='crm','topic selection routes to canonical CRM');
 await dialog.getByRole('button',{name:'Try this page'}).click();await dialog.waitFor({state:'hidden'});
 await page.getByRole('button',{name:'Continue walkthrough'}).click();await dialog.waitFor();
 assert(await dialog.getByRole('heading').innerText()==='CRM & Pipeline','practice resumes same topic');
 await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});await page.reload();await start();
 assert(await dialog.getByRole('heading').innerText()==='CRM & Pipeline','resume survives reload');
 const topics=await dialog.locator('option').evaluateAll(options=>options.map(o=>o.value));
 assert(topics.length>35&&new Set(topics).size===topics.length,'full feature catalog has unique topics');
 for (const topic of topics) { await dialog.getByLabel('Jump to a feature').selectOption(topic);assert(await dialog.getByRole('heading').innerText()!=='','topic renders '+topic); }
 await dialog.getByRole('button',{name:'Finish',exact:true}).click();await dialog.waitFor({state:'hidden'});await start();
 await dialog.getByRole('button',{name:'Restart',exact:true}).click();
 assert(await dialog.getByRole('heading').innerText()==='Welcome to Ask Intros','restart resets progress');
 for (const width of [320,390,1440]) {await page.setViewportSize({width,height:740});const r=await dialog.boundingBox();assert(r.x>=0&&r.x+r.width<=width&&r.y>=0&&r.y+r.height<=740,'dialog fits viewport '+width);}
 await page.screenshot({path:join(out,'guide-dark.png')});await page.evaluate(()=>document.documentElement.dataset.theme='light');await page.screenshot({path:join(out,'guide-light.png')});
 await dialog.getByRole('button',{name:'Skip tour'}).click();await dialog.waitFor({state:'hidden'});
 await page.evaluate(()=>{localStorage.setItem('ask-intros.walkthrough.v1','invalid-topic');});await start();assert(await dialog.getByRole('heading').innerText()==='Welcome to Ask Intros','invalid stored progress resets safely');
 assert(errors.length===0,'no browser runtime errors');console.log('Screenshots: '+out);
} finally {await browser.close();server.close();}
