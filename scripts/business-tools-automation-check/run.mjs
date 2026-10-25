import {build} from 'esbuild';
import {createServer} from 'node:http';
import {mkdtempSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url)),out=mkdtempSync(join(tmpdir(),'business-generation-'));
await build({entryPoints:[join(here,'entry.tsx')],bundle:true,format:'esm',outdir:out,jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'mock',setup(b){b.onResolve({filter:/(@\/lib\/businessTools.functions|@\/integrations\/supabase\/client)$/},()=>({path:join(here,'mock.ts')}));}}]});
const server=createServer((req,res)=>{const asset=req.url==='/entry.js'||req.url==='/entry.css';res.setHeader('Content-Type',req.url==='/entry.js'?'text/javascript':req.url==='/entry.css'?'text/css':'text/html');res.end(asset?readFileSync(join(out,req.url.slice(1))):'<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/entry.css"></head><body><div id="root"></div><script type="module" src="/entry.js"></script></body></html>');});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??resolve(here,'../../node_modules/playwright/index.mjs'));
const browser=await chromium.launch({...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{})});
try {
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());await page.goto('http://127.0.0.1:'+server.address().port);
 await page.getByLabel('Offer',{exact:true}).fill('CRM cleanup');await page.getByLabel('Target buyer',{exact:true}).fill('Founders');await page.getByRole('button',{name:'Generate content',exact:true}).click();await page.getByRole('status').filter({hasText:'Content generated'}).waitFor();
 if(!(await page.getByLabel('Editable draft').inputValue()).includes('Finished sales script'))throw Error('Generated output missing');
 await page.getByRole('navigation',{name:'Business tools'}).getByRole('button',{name:/Website Review/}).click();await page.getByLabel('Website URL',{exact:true}).fill('https://company.com');await page.getByRole('button',{name:'Capture and analyze'}).click();await page.getByRole('status').filter({hasText:'Public page capture completed'}).waitFor();
 await page.evaluate(()=>window.failGeneration=true);await page.getByRole('button',{name:'Capture and analyze'}).click();await page.getByRole('alert').filter({hasText:'Capture blocked'}).waitFor();if(!(await page.getByLabel('Editable draft').inputValue()).includes('Captured https://company.com'))throw Error('Failed request erased output');
 await page.getByRole('navigation',{name:'Business tools'}).getByRole('button',{name:/Image Studio/}).click();await page.getByLabel('Subject',{exact:true}).fill('A business workshop');await page.getByLabel('Style',{exact:true}).fill('Editorial illustration');await page.getByRole('button',{name:'Generate image',exact:true}).click();await page.getByRole('alert').filter({hasText:'Image provider unavailable'}).waitFor();
 await page.evaluate(()=>window.failGeneration=false);await page.getByRole('button',{name:'Generate image',exact:true}).click();await page.getByRole('link',{name:'Download PNG'}).waitFor();if(!await page.getByAltText('Generated visual from your business brief').isVisible())throw Error('Image preview missing');
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Phone overflow');if(errors.length)throw Error(errors.join('\n'));
 console.log('PASS generation, real-capture UI, preserved output on failure, image error/retry, preview/download, phone layout');
}finally{await browser.close();server.close();}
