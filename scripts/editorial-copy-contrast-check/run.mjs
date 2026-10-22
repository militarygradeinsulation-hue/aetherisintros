// Guard public editorial foreground/background in both modes and on mobile.
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const port=await new Promise(done=>{
  const s=createServer().listen(0,"127.0.0.1",()=>{const n=s.address().port;s.close(()=>done(n));});
});
const child=spawn("npx",["vite","dev","--port",String(port),"--host","127.0.0.1","--strictPort"],{
  cwd:root,stdio:["ignore","pipe","pipe"],detached:true
});
const stop=()=>{try{process.kill(-child.pid)}catch{/* exited */}};
let browser;
try{
  await new Promise((done,fail)=>{
    const timer=setTimeout(()=>fail(new Error("Vite did not start")),90000);
    const onData=data=>{if(/ready in|Local:/.test(String(data))){clearTimeout(timer);done(true)}};
    child.stdout.on("data",onData);child.stderr.on("data",onData);
    child.once("exit",code=>{clearTimeout(timer);fail(new Error("Vite exited "+code))});
  });
  const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??resolve(root,"node_modules/playwright/index.mjs"));
  browser=await chromium.launch();
  // The public entry is now the Aetheris Vision dashboard rather than the
  // former compact editorial landing page. Guard actual, visible copy rather
  // than waiting for selectors from the removed landing.
  for (const width of [320,390,768,1280]) {
    const page=await browser.newPage({viewport:{width,height:900}});
    await page.goto("http://127.0.0.1:"+port+"/",{waitUntil:"domcontentloaded",timeout:120000});
    await page.locator(".vision-page .vs-hero h1").waitFor({state:"visible",timeout:45000});
    const result=await page.evaluate(()=>{
      const selectors=[".vs-hero h1",".vs-eyebrow",".vs-hero p",".vs-data-disclaimer",".vs-surface-heading h3",".vs-sidebar nav button"];
      return selectors.map(selector=>{
        const element=document.querySelector(selector);
        if(!element)return {selector,missing:true};
        const style=getComputedStyle(element);
        const r=element.getBoundingClientRect();
        return {selector,color:style.color,opacity:Number(style.opacity),display:style.display,visibility:style.visibility,width:r.width,height:r.height};
      });
    });
    const linear=value=>{
      const normalized=value/255;
      return normalized<=0.04045?normalized/12.92:((normalized+0.055)/1.055)**2.4;
    };
    const luminance=color=>{
      const rgb=color.match(/[0-9.]+/g)?.slice(0,3).map(Number)??[];
      if(rgb.length!==3)throw new Error("Unparseable text color "+color);
      return rgb.reduce((sum,v,i)=>sum+linear(v)*[0.2126,0.7152,0.0722][i],0);
    };
    const backgrounds={
      ".vs-hero h1":"#070c14",
      ".vs-eyebrow":"#070c14",
      ".vs-hero p":"#070c14",
      ".vs-data-disclaimer":"#142438",
      ".vs-surface-heading h3":"#101c2b",
      ".vs-sidebar nav button":"#111b2a",
    };
    for(const item of result){
      if(item.missing||item.width<=0||item.height<=0||item.display==="none"||item.visibility==="hidden"||item.opacity<0.95)throw Error("Missing or hidden "+item.selector);
      const bg=luminance(backgrounds[item.selector]),fg=luminance(item.color);
      const contrast=(Math.max(bg,fg)+0.05)/(Math.min(bg,fg)+0.05);
      if(contrast<4.5)throw Error("Low contrast "+item.selector+" "+contrast.toFixed(1)+":1 at "+width);
      console.log("PASS "+width+" "+item.selector+" "+contrast.toFixed(1)+":1");
    }
    await page.close();
  }

  console.log("Public Aetheris copy contrast passed on mobile, tablet and desktop.");
}finally{
  if(browser)await browser.close();
  stop();
}
