// Browser regression for the actual Feed > Customize dialog, not a CSS mock.
// Checks real computed text-fill and background colors on mobile + desktop,
// with BOTH saved appearance modes (including native selects and option text).
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const port=await new Promise(done=>{
  const server=createServer().listen(0,"127.0.0.1",()=>{
    const n=server.address().port;server.close(()=>done(n));
  });
});
const child=spawn("npx",["vite","dev","--port",String(port),"--host","127.0.0.1","--strictPort"],{
  cwd:root,stdio:["ignore","pipe","pipe"],detached:true
});
const stop=()=>{try{process.kill(-child.pid)}catch{/* exited */}};
let browser;
try {
  await new Promise((ok,fail)=>{
    const t=setTimeout(()=>fail(new Error("Vite did not start")),90000);
    const ready=data=>{if(/ready in|Local:/.test(String(data))){clearTimeout(t);ok(true)}};
    child.stdout.on("data",ready);child.stderr.on("data",ready);
    child.once("exit",code=>{clearTimeout(t);fail(new Error("Vite exited "+code))});
  });
  const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??resolve(root,"node_modules/playwright/index.mjs"));
  browser=await chromium.launch();
  const contrast=(foreground,background)=>{
    const channels=color=>{
      const m=color.match(/[\d.]+/g);
      if(!m||m.length<3)throw Error("Invalid computed color "+color);
      return m.slice(0,3).map(Number);
    };
    const lum=color=>{
      const x=channels(color).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
      return x[0]*.2126+x[1]*.7152+x[2]*.0722;
    };
    const a=lum(foreground),b=lum(background);
    return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
  };
  for(const size of [{width:1440,height:900},{width:390,height:844}]) {
    for(const theme of ["dark","light"]) {
      const context=await browser.newContext({viewport:size});
      await context.addInitScript(t=>{
        try{localStorage.setItem("ask-intros.appearance",t)}catch{/* private mode */}
      },theme);
      const page=await context.newPage();
      await page.goto("http://127.0.0.1:"+port+"/demo",{waitUntil:"domcontentloaded",timeout:120000});
      const button=page.getByRole("button",{name:/Customize/i}).first();
      await button.waitFor({state:"visible",timeout:45000});
      await button.click();
      const modal=page.getByRole("dialog",{name:"Customize your feed"});
      await modal.waitFor({state:"visible"});
      const data=await modal.evaluate(el=>{
        const cs=getComputedStyle(el);
        const selectors=[
          ["heading","header h2"],
          ["eyebrow",".home-board-label"],
          ["description",":scope > p"],
          ["group",".home-feed-customize-show strong"],
          ["row label",".home-feed-customize-row label"],
          ["position",".home-feed-customize-row select"],
          ["view",".home-feed-customize-row label:last-child select"],
          ["close","header button"],
          ["reset","footer button:first-child"],
          ["done","footer button:last-child"],
        ];
        return {
          background:cs.backgroundColor,
          items:selectors.map(([name,sel])=>{
            const child=el.querySelector(sel);
            if(!child)return {name,missing:true};
            const computed=getComputedStyle(child);
            const parentColor=child.closest("button,select,.home-feed-customize-row") ?? el;
            const panel=getComputedStyle(parentColor);
            return {name,text:(child.textContent||child.getAttribute("aria-label")||"").trim().slice(0,80),
              ink:computed.webkitTextFillColor||computed.color,
              fg:computed.color,background:panel.backgroundColor,opacity:computed.opacity,
              visible:computed.display!=="none"&&computed.visibility!=="hidden"};
          }),
          rows:el.querySelectorAll(".home-feed-customize-row").length,
          nativeOptions:[...el.querySelectorAll("select option")].slice(0,5).map(opt=>{
            const c=getComputedStyle(opt);return {text:opt.textContent,ink:c.color,bg:c.backgroundColor};
          })
        };
      });
      if(data.rows!==6)throw Error("Missing Customize groups: "+JSON.stringify(data));
      for(const item of data.items){
        if(item.missing||!item.visible)throw Error(theme+" "+size.width+" missing "+JSON.stringify(item));
        const bg=item.background==="rgba(0, 0, 0, 0)"?data.background:item.background;
        const ratio=contrast(item.ink,bg);
        if(ratio<4.5)throw Error(theme+" "+size.width+" unreadable "+item.name+" "+ratio.toFixed(2)+":1 "+JSON.stringify(item));
        if(Number(item.opacity)<.95)throw Error(theme+" "+size.width+" transparent label "+JSON.stringify(item));
        console.log("PASS "+theme+" "+size.width+" "+item.name+" "+ratio.toFixed(1)+":1");
      }
      for(const item of data.nativeOptions){
        if(contrast(item.ink,item.bg)<4.5)throw Error(theme+" "+size.width+" dropdown option unreadable: "+JSON.stringify(item));
      }
      const panelRatio=contrast(theme==="light"?"rgb(17,17,17)":"rgb(255,255,255)",data.background);
      if(panelRatio<12)throw Error("Wrong modal palette for "+theme+" "+JSON.stringify(data.background));
      await modal.getByRole("button",{name:"Done"}).click();
      if(await modal.isVisible())throw Error("Done did not close modal");
      await context.close();
    }
  }
  console.log("Customize modal controls, text and options readable in both modes on desktop/mobile.");
}finally{
  if(browser)await browser.close();
  stop();
}
