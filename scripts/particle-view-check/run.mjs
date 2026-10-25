const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:900}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
try{
 await p.goto(new URL('/demo',process.env.EXPERIENCE_BASE_URL || 'http://127.0.0.1:5173').href,{waitUntil:'domcontentloaded',timeout:120000});
 await p.locator('.site-ambient[data-particle-view="business"] canvas').waitFor({timeout:120000});
 for(const view of ['business','social']){
  if(view==='social')await p.getByRole('button',{name:'Social',exact:true}).first().click();
  await p.locator(`.site-ambient[data-particle-view="${view}"] canvas`).waitFor();
  await p.waitForTimeout(400);
  const result=await p.locator('.site-ambient[data-particle-view] canvas').evaluate(c=>{const ctx=c.getContext('2d');const d=ctx.getImageData(0,0,c.width,c.height).data;let red=0,blue=0;for(let i=0;i<d.length;i+=4)if(d[i+3]>20){if(d[i]>d[i+2]*1.3)red++;if(d[i+2]>d[i]*1.3)blue++;}return {red,blue,filter:getComputedStyle(c).filter,pointer:getComputedStyle(c).pointerEvents,count:document.querySelectorAll('.site-ambient canvas').length};});
  console.log(view,result);if(result[view==='social'?'blue':'red']<100||result.count!==1||result.pointer!=='none'||result.filter!=='none')throw Error('Particle color/layer contract failed');

 }
 await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(100);
 const first=await p.locator('.site-ambient canvas').evaluate(c=>c.toDataURL());await p.waitForTimeout(200);
 const second=await p.locator('.site-ambient canvas').evaluate(c=>c.toDataURL());if(first!==second)throw Error('Reduced motion still animating');
 await p.setViewportSize({width:390,height:844});await p.waitForTimeout(100);
 if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Phone overflow');
 if(errors.length)throw Error(errors.join('\n'));console.log('PASS colors, one shared canvas, reduced motion, phone and no page errors');
}finally{await b.close()}
