// Browser regression for actual CRM Dashboard > Customize, preserving member preferences.
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
      await page.locator('.ledger-dashboard').waitFor({state:'visible',timeout:60000});
      const photos=page.locator('.ledger-feed-entry .ledger-post-photo');
      if(await photos.count()<2)throw Error('Showcase photo posts missing');
      await page.waitForFunction(()=>[...document.querySelectorAll('.ledger-feed-entry .ledger-post-photo')].every(img=>img.complete&&img.naturalWidth>0));
      await page.getByRole('region',{name:'Business headlines',exact:true}).waitFor();
      const button=page.getByRole('button',{name:'Customize',exact:true});
      await button.waitFor({state:'visible',timeout:45000});
      await button.click();
      const modal=page.getByRole('dialog',{name:'Customize your dashboard'});
      await modal.waitFor({state:'visible',timeout:10000});
      const data=await modal.evaluate(el=>{
        const selected=['header h2','header p','.ledger-customize-option strong','.ledger-customize-option small','footer button'];
        const resolved=selected.map(selector=>{
          const target=el.querySelector(selector);
          if(!target)return {selector,missing:true};
          const style=getComputedStyle(target);
          const surface=getComputedStyle(el);
          return {selector,foreground:style.webkitTextFillColor||style.color,
            background:surface.backgroundColor,opacity:style.opacity};
        });
        return {count:el.querySelectorAll('.ledger-customize-option').length,items:resolved,
          background:getComputedStyle(el).backgroundColor};
      });
      if(data.count!==4)throw Error('CRM dashboard must expose four layout settings: '+JSON.stringify(data));
      for(const item of data.items){
        if(item.missing)throw Error('Missing CRM customization label: '+item.selector);
        if(contrast(item.foreground,item.background)<4.5)
          throw Error(theme+' '+size.width+' unreadable CRM customization text '+JSON.stringify(item));
        if(Number(item.opacity)<.95)throw Error('Transparent CRM customization text '+JSON.stringify(item));
      }
      const activity=modal.getByRole('checkbox',{name:/Network activity/});
      if(!(await activity.isChecked()))throw Error('Default CRM activity section is not visible');
      await activity.uncheck();
      if(await page.locator('.ledger-dashboard-feed').count())throw Error('CRM activity did not hide');
      await modal.getByRole('button',{name:'Done'}).click();
      if(await modal.isVisible())throw Error('CRM Done failed to close');
      await page.getByRole('button',{name:'Customize',exact:true}).click();
      const reopened=page.getByRole('dialog',{name:'Customize your dashboard'});
      if(await reopened.getByRole('checkbox',{name:/Network activity/}).isChecked())
        throw Error('Saved CRM dashboard customization did not persist');
      await reopened.getByRole('button',{name:'Reset defaults'}).click();
      if(!(await reopened.getByRole('checkbox',{name:/Network activity/}).isChecked()))
        throw Error('CRM Reset defaults failed');
      await reopened.getByRole('button',{name:'Done'}).click();
      console.log('PASS CRM customizable dashboard '+theme+' '+size.width);
      const feedDraft=page.locator('#ledger-post-content');
      await feedDraft.fill('Preserve my draft while reading highlights');
      await page.getByRole('button',{name:'Network highlights',exact:true}).click();
      const highlights=page.getByRole('region',{name:'Network highlights',exact:true});
      await highlights.waitFor();
      const highlightCards=highlights.locator('.network-highlight-card');
      if(await highlightCards.count()<2)throw Error('Highlights did not use existing showcase posts');
      const ids=await highlightCards.evaluateAll(cards=>cards.map(card=>card.dataset.postId));
      if(new Set(ids).size!==ids.length)throw Error('Marquee duplicated accessible post controls');
      await highlights.getByRole('button',{name:'Pause highlights',exact:true}).click();
      const track=highlights.locator('.network-marquee-track').first();
      if(await track.evaluate(el=>getComputedStyle(el).animationPlayState)!=='paused')throw Error('Highlights pause control failed');
      const pausedWindow=highlights.locator('.network-marquee-window');
      const pausedScroll=await pausedWindow.evaluate(el=>{
        const style=getComputedStyle(el);el.scrollTop=10000;
        return {overflow:style.overflowY,height:el.clientHeight,total:el.scrollHeight,top:el.scrollTop};
      });
      if(pausedScroll.overflow!=='auto')throw Error('Paused highlights do not allow manual scrolling');
      if(pausedScroll.total>pausedScroll.height+1&&pausedScroll.top<=0)throw Error('Paused highlights trap posts below the viewport');
      if(await track.evaluate(el=>getComputedStyle(el).transform)!=='none')throw Error('Paused highlights leave posts translated outside the scroll range');
      await pausedWindow.evaluate(el=>el.scrollTop=0);

      const first=highlightCards.first();
      const like=first.getByRole('button',{name:/^(Like|Liked)$/});

      const highlightColors=await first.evaluate(el=>({
        background:getComputedStyle(el).backgroundColor,
        text:[...el.querySelectorAll('strong,small,p,time,button')].map(node=>getComputedStyle(node).color)
      }));
      for(const ink of highlightColors.text)if(contrast(ink,highlightColors.background)<4.5)throw Error('Unreadable highlight card '+JSON.stringify(highlightColors));
      const wasLiked=await like.getAttribute('aria-pressed');
      await like.click();
      if(await like.getAttribute('aria-pressed')===wasLiked)throw Error('Highlights did not update shared Like state');
      const save=first.getByRole('button',{name:/^(Save|Saved)$/});
      const wasSaved=await save.getAttribute('aria-pressed');
      await save.click();
      if(await save.getAttribute('aria-pressed')===wasSaved)throw Error('Highlights did not update shared Save state');
      await pausedWindow.evaluate(el=>el.scrollTop=10000);
      await highlights.getByRole('button',{name:'Resume highlights',exact:true}).click();
      await page.waitForFunction(()=>document.querySelector('.network-marquee-window').scrollTop===0);
      await highlights.locator('.network-marquee-window').focus();
      if(await track.evaluate(el=>getComputedStyle(el).animationPlayState)!=='paused')throw Error('Keyboard focus did not pause highlights');
      await page.emulateMedia({reducedMotion:'reduce'});
      if(await track.evaluate(el=>getComputedStyle(el).animationName)!=='none')throw Error('Highlights ignored reduced motion');
      if(await highlights.locator('.network-marquee-window').evaluate(el=>getComputedStyle(el).overflowY)!=='auto')throw Error('Reduced-motion highlights are not manually scrollable');
      await highlights.getByRole('button',{name:'Read full feed',exact:true}).click();
      if(await feedDraft.inputValue()!=='Preserve my draft while reading highlights')throw Error('Highlights discarded a feed draft');
      await feedDraft.fill('');
      await page.emulateMedia({reducedMotion:'no-preference'});
      console.log('PASS highlights controls, shared social state, draft retention and reduced motion '+theme+' '+size.width);

      await page.getByRole('button',{name:'My board',exact:true}).click();
      const stack=page.locator('.ledger-member-stack');
      const memberCards=stack.getByRole('button',{name:/^Select /});
      if(await memberCards.count()!==3)throw Error('Expected three directory-backed member cards');
      const chosenName=(await memberCards.first().getAttribute('aria-label')).replace('Select ','');
      const chosen=stack.getByRole('button',{name:'Select '+chosenName,exact:true});
      await chosen.focus();
      await chosen.press('Enter');
      if(await chosen.getAttribute('aria-pressed')!=='true')throw Error('Keyboard selection did not bring member card forward');
      if(!(await stack.locator('.ledger-member-stack-detail strong').textContent()).includes(chosenName))throw Error('Member detail does not follow selected card');
      await page.emulateMedia({reducedMotion:'reduce'});
      if(await chosen.evaluate(el=>getComputedStyle(el).transitionDuration)!=='0s')throw Error('Card stack ignores reduced motion');
      await page.emulateMedia({reducedMotion:'no-preference'});
      // Test actual foreground tokens over the lightest/darkest card gradient stops.
      const stackColors=await chosen.evaluate(el=>{
        const style=getComputedStyle(el),root=getComputedStyle(document.querySelector('.ledger-native-app'));
        const ink=style.webkitTextFillColor||style.color;
        const sample=document.createElement('span');document.body.append(sample);
        const colors=['--ledger-crm-raised','--ledger-crm-surface'].map(key=>{
          sample.style.color=root.getPropertyValue(key);return getComputedStyle(sample).color;
        });sample.remove();return {ink,colors};
      });
      for(const surface of stackColors.colors)if(contrast(stackColors.ink,surface)<4.5)throw Error('Unreadable member card '+JSON.stringify(stackColors));
      if(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)>3)throw Error('Member stack causes viewport overflow');
      if(process.env.BENTO_SCREENSHOT_DIR)await page.screenshot({path:process.env.BENTO_SCREENSHOT_DIR+'/'+theme+'-'+size.width+'.png'});
      await stack.getByRole('button',{name:'View profile of '+chosenName,exact:true}).click();
      await page.getByRole('button',{name:'Back to People',exact:true}).waitFor({timeout:15000});
      await page.getByRole('heading',{name:chosenName.split(' ')[0],exact:true}).waitFor({timeout:15000});
      console.log('PASS bento member stack selection, profile navigation, contrast and motion '+theme+' '+size.width);

      if(size.width < 600) {
        await page.getByRole('button',{name:'More menu',exact:true}).click();
        await page.getByRole('complementary',{name:'Mobile workspace sidebar'}).getByRole('button',{name:'CRM & Pipeline',exact:true}).click();
      } else {
        await page.getByRole('navigation',{name:'Desktop navigation'}).getByRole('button',{name:'CRM & Pipeline',exact:true}).click();
      }
      const liveBento = page.locator('.ask-crm-bento');
      await liveBento.waitFor({state:'visible',timeout:25000});
      const visibleTiles = liveBento.locator('.ask-crm-bento-tile');
      if(await visibleTiles.count()!==6)throw Error('The canonical CRM must display six live operational bento tiles');
      const visual = await liveBento.locator('.recharts-wrapper svg').first().evaluate(el => ({
        filter:getComputedStyle(el).filter,
        colors:[...el.querySelectorAll('.recharts-area-curve,.recharts-bar-rectangle')]
          .map(node=>getComputedStyle(node).stroke+' '+getComputedStyle(node).fill)
      })).catch(()=>null);
      if(visual && visual.filter!=='none')throw Error('Live CRM chart is desaturated '+JSON.stringify(visual));
      await page.locator('.ops-stats > div').first().waitFor();
      const cards=await page.locator('.ops-stats > div').evaluateAll(nodes=>nodes.map(el=>({
        background:getComputedStyle(el).backgroundColor,
        radius:parseFloat(getComputedStyle(el).borderTopLeftRadius),
        shadow:getComputedStyle(el).boxShadow,
        items:[...el.querySelectorAll('strong,small,.eyebrow')].map(n=>({
          text:n.textContent,foreground:getComputedStyle(n).webkitTextFillColor||getComputedStyle(n).color
        }))
      })));
      for(const card of cards) {
        if(card.radius<20||card.shadow==='none')throw Error('CRM summary lost Command Dashboard depth '+JSON.stringify(card));
        for(const item of card.items)if(contrast(item.foreground,card.background)<4.5)
          throw Error(theme+' '+size.width+' unreadable CRM summary '+JSON.stringify({card,item}));
      }
      const tabs=await page.getByRole('tablist',{name:'CRM sections'}).getByRole('tab').evaluateAll(nodes=>nodes.map(el=>({color:getComputedStyle(el).webkitTextFillColor||getComputedStyle(el).color,background:getComputedStyle(el.closest('.content')).backgroundColor})));
      if(theme==='light')for(const tab of tabs)if(contrast(tab.color,tab.background)<4.5)throw Error('Unreadable CRM tab '+JSON.stringify(tab));
      console.log('PASS Command CRM card depth and text contrast '+theme+' '+size.width);
      await context.close();
    }
  }
  console.log('CRM dashboard customization controls and member preferences passed desktop/mobile and both appearance modes.');
}finally{
  if(browser)await browser.close();
  stop();
}
