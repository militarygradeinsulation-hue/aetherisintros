// Exercises real PDF.js canvas/worker and real workspace components with isolated data.
import { build } from 'esbuild'
import { createServer } from 'node:http'
import { mkdtempSync,readFileSync,writeFileSync,existsSync,copyFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname,join,resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
const here=dirname(fileURLToPath(import.meta.url)),src=resolve(here,'../../src'),out=mkdtempSync(join(tmpdir(),'workspace-components-'))
await build({entryPoints:[join(here,'entry.tsx')],bundle:true,format:'esm',outdir:out,jsx:'automatic',logLevel:'error',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'isolated-adapters',setup(b){
 b.onResolve({filter:/pdf\.worker\.min\.mjs\?url$/},()=>({path:'pdf-worker-url',namespace:'worker-url'}))
 b.onLoad({filter:/.*/,namespace:'worker-url'},()=>({contents:'export default "/pdf.worker.mjs"',loader:'js'}))
 b.onResolve({filter:/^@\/integrations\/supabase\/client$/},()=>({path:join(here,'db-stub.ts')}))
 b.onResolve({filter:/^@\/aetheris\/access$/},()=>({path:resolve(here,'../admin-connections-check/access-stub.ts')}))
 b.onResolve({filter:/^@\//},a=>{const p=join(src,a.path.slice(2));for(const ext of ['.ts','.tsx','/index.ts'])if(existsSync(p+ext))return{path:p+ext}})
}}]})
copyFileSync(resolve(here,'../../node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs'),join(out,'pdf.worker.mjs'))
// Small valid, three-page PDF fixture generated in memory. No customer documents.
const texts=['Ask Intros source evidence','Verified context on page two','Literal <img src=x onerror=alert(1)> evidence']
const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R 5 0 R 7 0 R] /Count 3 >>']
texts.forEach((text,index)=>{objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 500] /Resources << /Font << /F1 9 0 R >> >> /Contents ${4+index*2} 0 R >>`);const stream=`BT /F1 16 Tf 40 440 Td (${text.replace(/[()\\]/g,'\\$&')}) Tj ET`;objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`)})
objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
let pdf='%PDF-1.4\n',offsets=[0];objects.forEach((object,index)=>{offsets.push(Buffer.byteLength(pdf));pdf+=`${index+1} 0 obj\n${object}\nendobj\n`});const xref=Buffer.byteLength(pdf);pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+offsets.slice(1).map(value=>String(value).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
writeFileSync(join(out,'test.pdf'),pdf)
writeFileSync(join(out,'index.html'),'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;font-family:system-ui}button{cursor:pointer}</style><link rel="stylesheet" href="/entry.css"><div id="root"></div><script type="module" src="/entry.js"></script>')
const server=createServer((req,res)=>{const name=(req.url??'/').slice(1);const allowed=['entry.js','entry.css','pdf.worker.mjs','test.pdf'];if(name==='missing.pdf'){res.writeHead(404);res.end();return}const file=allowed.includes(name)?name:'index.html';res.setHeader('content-type',file.endsWith('.js')||file.endsWith('.mjs')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.pdf')?'application/pdf':'text/html');res.end(readFileSync(join(out,file)))}).listen(0,'127.0.0.1')
await new Promise(r=>server.once('listening',r))
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');const browser=await chromium.launch();let passed=0
const assert=(ok,message)=>{if(!ok)throw Error(message);passed++;console.log('PASS '+message)}
try{
 for(const width of [1280,390,320]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',message=>{if(message.type()==='error') console.log(message.text())})
  await page.goto(`http://127.0.0.1:${server.address().port}`)
  await page.getByRole('button',{name:'Read Evidence.pdf',exact:true}).click()
  const viewer=page.getByRole('region',{name:'Document viewer: Evidence.pdf'});await viewer.getByText('Page 1 of 3',{exact:true}).waitFor()
  await page.waitForFunction(()=>{const canvas=document.querySelector('.ai-pdf-page canvas');return canvas&&canvas.width===400&&document.querySelector('.ai-pdf-canvas').getAttribute('aria-busy')==='false'})
  assert(await page.locator('.ai-pdf-page canvas').evaluate(c=>{const pixels=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let ink=0;for(let n=0;n<pixels.length;n+=4)if(pixels[n+3]>0&&pixels[n]<200)ink++;return ink>20}),width+' PDF is rendered by real PDF.js worker')
  await viewer.getByRole('button',{name:'Next PDF page'}).click();await viewer.getByText('Page 2 of 3',{exact:true}).waitFor()
  await viewer.getByRole('combobox',{name:'PDF zoom'}).selectOption('1.5');assert(await viewer.getByRole('combobox',{name:'PDF zoom'}).inputValue()==='1.5',width+' zoom selector works')
  await viewer.getByRole('button',{name:'Rotate PDF right'}).click();await page.waitForFunction(()=>document.querySelector('.ai-pdf-page canvas').width===750)
  await viewer.getByRole('button',{name:'Pages',exact:true}).click();await viewer.getByRole('button',{name:'Go to PDF page 3'}).click();await viewer.getByText('Page 3 of 3',{exact:true}).waitFor()
  await viewer.getByRole('textbox',{name:'Search PDF text'}).fill('onerror');await viewer.getByRole('button',{name:'Find',exact:true}).click();await viewer.getByRole('status').filter({hasText:'1 matching pages'}).waitFor()
  assert(await viewer.getByRole('button',{name:/Page 3: Literal/}).isVisible(),width+' literal document text is searchable')
  assert(await viewer.locator('img').count()===0,width+' PDF text cannot inject HTML')
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),width+' reader has no outer sideways overflow')
  await viewer.getByRole('button',{name:'Rotate PDF left'}).click();await viewer.getByRole('combobox',{name:'PDF zoom'}).selectOption('0.75');await viewer.getByRole('button',{name:'Go to PDF page 1'}).click();await page.waitForFunction(()=>document.querySelector('.ai-pdf-page canvas').width===300);await page.screenshot({path:join(out,`reader-${width}.png`),fullPage:true})
  await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});await page.waitForFunction(()=>document.querySelector('.ai-pdf-open')===document.activeElement);assert(await page.getByRole('button',{name:'Read Evidence.pdf',exact:true}).evaluate(el=>el===document.activeElement),width+' closing reader restores trigger focus')
  assert(errors.length===0,width+' no browser runtime errors: '+errors.join(','))
  if(width===1280){await page.getByRole('button',{name:'Read Missing.pdf',exact:true}).click();await page.getByRole('alert').filter({hasText:'could not be opened'}).waitFor();assert(true,'missing document gives an honest error');await page.keyboard.press('Escape')}
  await page.close()
 }
 console.log('Workspace component checks: '+passed+' passed. Screenshots: '+out)
}finally{await browser.close();server.close()}
