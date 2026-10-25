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
  for(const width of [390,1280]){
    const page=await browser.newPage({viewport:{width,height:900}});
    await page.goto("http://127.0.0.1:"+port+"/",{waitUntil:"domcontentloaded",timeout:120000});
    await page.waitForSelector(".ael-hero-actions",{timeout:45000});
    await page.evaluate(()=>{
      const fixture=document.createElement("div");
      fixture.id="news-copy-contrast-fixture";fixture.className="ix-root";
      fixture.innerHTML='<div class="arch-product-main"><header class="news-editorial-head"><div><p class="eyebrow">EXECUTIVE INTELLIGENCE</p><h1>Read the signal. <em>Call the right person.</em></h1><p>Live reporting, considered alongside your relationships.</p></div></header></div>';
      fixture.style.cssText="position:absolute;left:-20000px;top:0;width:900px";
      document.body.appendChild(fixture);
    });
    for(const theme of ["dark","light"]){
      await page.evaluate(t=>{
        const html=document.documentElement;html.dataset.theme=t;
        html.classList.toggle("dark",t==="dark");html.classList.toggle("light",t==="light");
        html.style.colorScheme=t;
      },theme);
      await page.waitForTimeout(120);
      const cases=[
        [".news-editorial-head",".news-editorial-head h1","news title"],
        [".news-editorial-head",".news-editorial-head h1 em","news emphasis"],
        [".news-editorial-head",".news-editorial-head p:last-child","news description"],
      ];
      for(const [background,text,name] of cases){
        const isNews=background.startsWith(".news");
        const result=await page.evaluate(args=>{
          const t=document.querySelector(args.text),panel=document.querySelector(args.background);
          if(!t||!panel)return null;
          const a=getComputedStyle(t),b=getComputedStyle(panel);
          return {ink:a.color,textFill:a.webkitTextFillColor,bg:b.backgroundColor,opacity:a.opacity};
        },{background:(isNews?"#news-copy-contrast-fixture ":"")+background,
           text:(isNews?"#news-copy-contrast-fixture ":"")+text});
        if(!result)throw Error("Missing "+name);
        const lum=color=>{const v=[...color.matchAll(/(?:\d*\.)?\d+/g)].slice(0,3).map(x=>Number(x[0])/255)
          .map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
          return v.reduce((sum,x,i)=>sum+x*[.2126,.7152,.0722][i],0);
        };
        const bg=lum(result.bg),fg=lum(result.textFill||result.ink);
        const ratio=(Math.max(bg,fg)+.05)/(Math.min(bg,fg)+.05);
        if(theme==="light"&&bg<.72)throw Error("Light panel is not white: "+name+" "+JSON.stringify(result));
        if(theme==="dark"&&bg>.05)throw Error("Dark panel is not black: "+name+" "+JSON.stringify(result));
        if(ratio<4.5||Number(result.opacity)<.95)throw Error("Low contrast "+name+" "+ratio.toFixed(1)+": "+JSON.stringify(result));
        console.log("PASS "+width+" "+theme+" "+name+" "+ratio.toFixed(1)+":1");
      }
    }
    await page.close();
  }
  console.log("Public editorial contrast passed in both themes, on mobile and desktop.");
}finally{
  if(browser)await browser.close();
  stop();
}
