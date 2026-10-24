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
async function checkBrand(page, label) {
  const warm = await page.evaluate(() => {
    const results=[];
    for(const element of document.querySelectorAll('body *')) {
      const box=element.getBoundingClientRect(),style=getComputedStyle(element);
      if(!box.width||!box.height||style.visibility==='hidden'||Number(style.opacity)<.05)continue;
      for(const property of ['color','backgroundColor','backgroundImage','borderTopColor','borderLeftColor','fill','stroke','webkitTextFillColor']) {
        for(const match of style[property]?.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/g)??[]) {
          if(match[4]&&Number(match[4])<.05)continue;
          const [r,g,b]=match.slice(1,4).map(Number).map(value=>value/255);
          const high=Math.max(r,g,b),low=Math.min(r,g,b),delta=high-low,light=(high+low)/2;
          if(!delta||light>=.9||light<=.04)continue;
          const saturation=delta/(1-Math.abs(2*light-1));
          const hue=((high===r?(g-b)/delta+(g<b?6:0):high===g?(b-r)/delta+2:(r-g)/delta+4)*60);
          if(hue>=8&&hue<=65&&saturation>=.25)results.push({tag:element.tagName,class:String(element.className).slice(0,90),property,color:match[0]});
        }
      }
    }
    return results.slice(0,12);
  });
  check(!warm.length,label+' has no orange brand accents: '+JSON.stringify(warm));
}
async function checkMenuAlignment(root,label) {
  const layout=await root.locator('.ledger-native-nav-item').evaluateAll(buttons=>buttons.map(button=>{
    const b=button.getBoundingClientRect(),i=button.querySelector('svg').getBoundingClientRect(),t=button.querySelector('.ledger-native-nav-label').getBoundingClientRect();
    const text=button.querySelector('.ledger-native-nav-label');
    return {x:b.x,width:b.width,height:b.height,icon:i.x,label:t.x,clipped:text.scrollWidth-text.clientWidth};
  }));
  check(layout.length===10,label+' has ten primary destinations');
  for(const property of ['x','width','icon','label']) check(Math.max(...layout.map(b=>b[property]))-Math.min(...layout.map(b=>b[property]))<1.5,label+' '+property+' aligns across every menu group');
  check(layout.every(b=>b.height>=43.5),label+' rows have consistent touch spacing');
  check(Math.max(...layout.map(b=>b.height))-Math.min(...layout.map(b=>b.height))<1.5,label+' rows have equal height');
  check(layout.every(b=>b.clipped<=1),label+' every menu label is fully readable');
}
async function checkDashboardBoard(page,theme) {
  const stat=page.locator('.ledger-ui-stat').first();
  check(await stat.evaluate(tile=>getComputedStyle(tile).boxShadow!=='none'),theme+' dashboard cards have depth at rest');
  const resting=await stat.boundingBox();
  await stat.hover();await page.waitForTimeout(250);
  check((await stat.boundingBox()).y<resting.y-2,theme+' pointer hover lifts a dashboard tile');
  await page.mouse.move(5,5);await page.waitForTimeout(250);
  await page.emulateMedia({reducedMotion:'reduce'});
  const steady=await stat.boundingBox();await stat.hover();await page.waitForTimeout(100);
  check(Math.abs((await stat.boundingBox()).y-steady.y)<1,theme+' reduced motion keeps tile position steady');
  await page.mouse.move(5,5);await page.emulateMedia({reducedMotion:'no-preference'});
  const draft=page.locator('#ledger-post-content');
  await draft.fill('Keep this draft while arranging my board');
  await page.getByRole('button',{name:'My board',exact:true}).click();
  const board=page.getByRole('region',{name:'Your customizable dashboard board',exact:true});
  await board.waitFor();
  check(await board.locator('[data-widget-id]').count()===8,theme+' dashboard board has eight real-action widgets');
  check(await board.locator('[data-widget-id][tabindex="0"]').count()===0,theme+' board starts locked');
  await board.getByRole('button',{name:'Edit layout',exact:true}).click();
  const before=await page.evaluate(()=>localStorage.getItem('ask-intros.dashboard.widgets.v1'));
  const source=board.locator('[data-widget-id="conversations"]');
  const target=board.locator('[data-widget-id="crm"]');
  await source.scrollIntoViewIfNeeded();
  const a=await source.boundingBox(),b=await target.boundingBox();
  await page.mouse.move(a.x+a.width/2,a.y+25);await page.mouse.down();
  await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:15});
  await page.waitForTimeout(200);await page.mouse.up();
  await page.waitForFunction(previous=>localStorage.getItem('ask-intros.dashboard.widgets.v1')!==previous,before);
  check(true,theme+' mouse dragging changes and saves board order');
  const order=await page.evaluate(()=>localStorage.getItem('ask-intros.dashboard.widgets.v1'));
  await source.focus();await source.press('Alt+ArrowLeft');
  await page.waitForFunction(previous=>localStorage.getItem('ask-intros.dashboard.widgets.v1')!==previous,order);
  check(true,theme+' keyboard reordering changes and saves board order');
  const network=board.locator('[data-widget-id="network"]');
  await network.evaluate(el=>el.dataset.mountProof='same-widget');
  await network.getByRole('combobox',{name:'Size of Member network',exact:true}).selectOption('wide');
  await network.getByRole('combobox',{name:'Size of Member network',exact:true}).selectOption('lg');
  check(await network.getAttribute('data-mount-proof')==='same-widget',theme+' resizing preserves the mounted widget');
  await board.getByRole('button',{name:'Lock layout',exact:true}).click();
  await page.getByRole('button',{name:'Activity feed',exact:true}).click();
  check(await draft.inputValue()==='Keep this draft while arranging my board',theme+' feed draft survives board toggles');
  await draft.fill('');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'My board',exact:true}).click();
  const restored=page.getByRole('region',{name:'Your customizable dashboard board',exact:true});
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('ask-intros.dashboard.widgets.v1')).items.find(i=>i.id==='network').size==='lg');
  check(await restored.getByRole('button',{name:'Edit layout',exact:true}).isVisible(),theme+' locked preference survives reload');
  check(await restored.locator('[data-widget-id="network"]').evaluate(el=>el.style.gridRow.includes('span 2')),theme+' chosen widget size survives reload');
  await restored.getByRole('button',{name:'Reset board',exact:true}).click();
  await page.waitForTimeout(750);
  const boxes=await restored.locator('[data-widget-id]').evaluateAll(tiles=>tiles.map(tile=>{const b=tile.getBoundingClientRect();return {x:b.x,y:b.y,right:b.right,bottom:b.bottom}}));
  check(boxes.every((a,i)=>boxes.every((b,j)=>i===j || a.right<=b.x+1 || b.right<=a.x+1 || a.bottom<=b.y+1 || b.bottom<=a.y+1)),theme+' settled board tiles never overlap');
  check(await restored.locator('[data-widget-id]').first().evaluate(tile=>getComputedStyle(tile).filter!=='none'),theme+' board tiles cast shadows above the canvas');
  if(process.env.NAV_SCREENSHOT_DIR) await page.screenshot({path:process.env.NAV_SCREENSHOT_DIR+'/'+theme+'-board.png'});
  await checkBrand(page,theme+' Dashboard board');
  await restored.getByRole('button',{name:'Open CRM & Pipeline',exact:true}).click();
  await page.getByRole('heading',{name:'Your opportunity pipeline.',exact:true}).waitFor();
  check(true,theme+' board action opens the canonical Pipeline');
  await page.locator('.ledger-crm-sidebar').getByRole('button',{name:'Dashboard',exact:true}).click();
}
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
    await context.addInitScript(value=>{localStorage.setItem('ask-intros.appearance',value);localStorage.setItem('aetheris.crm.view','full');localStorage.setItem('aetheris.crm.tab','tasks');sessionStorage.setItem('ask-intros.entrance-film.seen','1')},theme);
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://127.0.0.1:'+port+'/demo',{waitUntil:'domcontentloaded',timeout:120000});
    await page.locator('.ledger-crm-shell[data-layout-source="absolute-ledger-flow/app-shell"]').waitFor({timeout:60000}).catch(async error=>{console.error('Page errors',errors,'Page text',(await page.locator('body').innerText()).slice(0,2000));throw error});
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
    await checkBrand(page,theme+' Dashboard');
    const sidebar=page.locator('.ledger-crm-sidebar');
    await checkMenuAlignment(sidebar,theme+' desktop');
    if(process.env.NAV_SCREENSHOT_DIR) await page.screenshot({path:process.env.NAV_SCREENSHOT_DIR+'/'+theme+'-desktop.png'});
    await checkDashboardBoard(page,theme);
    await sidebar.getByRole('button',{name:'Network',exact:true}).click();
    await page.locator('.ledger-directory-table').waitFor({state:'visible',timeout:30000});
    check(await page.locator('[data-arch-page="people"]').count()===1,theme+' contacts use CRM records');
    await checkBrand(page,theme+' Contacts');
    await sidebar.getByRole('button',{name:'CRM & Pipeline',exact:true}).click();
    await page.locator('.ledger-workspace-modules').waitFor({state:'visible',timeout:30000});
    check(await page.locator('[data-arch-page="workspace"]').count()===1,theme+' authenticated tool frame is preserved');
    const focused=page.locator('.ledger-workspace-modules');
    check(JSON.stringify((await focused.locator('button').allTextContents()).map(s=>s.trim()))===JSON.stringify(['CRM','Pipeline']),theme+' CRM area contains only CRM and Pipeline');
    check(await page.getByRole('button',{name:'Full CRM & operations',exact:true}).count()===0,theme+' unrelated operations switch is hidden');
    await focused.getByRole('button',{name:'Pipeline',exact:true}).click();
    await page.getByRole('heading',{name:'Your opportunity pipeline.',exact:true}).waitFor();
    await page.getByRole('button',{name:'New opportunity',exact:true}).first().click();
    await page.locator('.ops-create').waitFor();
    await page.getByRole('button',{name:'Cancel',exact:true}).click();
    check(await page.locator('.ops-board').count()===1,theme+' Pipeline opens canonical opportunity board');
    await checkBrand(page,theme+' Pipeline');
    await focused.getByRole('button',{name:'CRM',exact:true}).click();
    await page.getByRole('tablist',{name:'CRM sections'}).waitFor();
    check(await page.locator('.ops-board').count()===0,theme+' CRM returns to relationship records');
    for (const destination of ['Dashboard','Network','Introductions','Meetings','Deals & Workspaces','Intelligence','My Work','Library']) {
      await sidebar.getByRole('button',{name:destination,exact:true}).click();
      const section=page.locator('.ledger-section-navigation');
      await section.waitFor();
      const labels=await section.locator('nav button').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label')||node.textContent?.trim()||'').filter(Boolean));
      for (const label of labels) {
        const button=section.getByRole('button',{name:label,exact:true,includeHidden:true});
        if (!(await button.isVisible())) await section.locator('summary').click();
        await button.click();
        await page.waitForTimeout(120);
        check(await sidebar.getByRole('button',{name:destination,exact:true}).getAttribute('aria-current')==='page',theme+' '+label+' retains '+destination+' parent');
        check(await section.getByRole('button',{name:label,exact:true,includeHidden:true}).getAttribute('aria-current')==='page',theme+' '+label+' section is selected');
        await checkBrand(page,theme+' '+label);
      }
    }
    await page.getByRole('button',{name:'Account menu',exact:true}).click();
    await page.getByRole('menuitem',{name:'My profile',exact:true}).click();
    const account=page.locator('.ledger-section-navigation[data-destination="account"]');
    for (const label of await account.locator('button').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label')||node.textContent?.trim()||'').filter(Boolean))) {
      await account.getByRole('button',{name:label,exact:true}).click();
      check(await sidebar.locator('.ledger-native-nav-item[aria-current="page"]').count()===0,theme+' '+label+' stays outside primary navigation');
      await checkBrand(page,theme+' account '+label);
    }
    await sidebar.getByRole('button',{name:'Intelligence',exact:true}).click();
    await page.locator('.ledger-section-navigation').getByRole('button',{name:'Specter Detect',exact:true}).click();
    await page.locator('.specter-shell').waitFor();
    await checkBrand(page,theme+' Specter browser');
    await sidebar.getByRole('button',{name:'Messages'}).click();
    await page.locator('[data-arch-page="messages"]').waitFor({state:'visible',timeout:30000});
    await page.locator('.ix-messages').first().waitFor({state:'visible',timeout:30000});
    check(await sidebar.isVisible(),theme+' CRM sidebar persists across messaging');
    await checkBrand(page,theme+' Messages');
    await sidebar.getByRole('button',{name:'Intelligence',exact:true}).click();
    await page.locator('[data-arch-page="insights"]').waitFor({state:'visible',timeout:30000});
    check(await page.locator('.ai-insight-list').count()>0,theme+' real Insights view remains connected');
    await sidebar.getByRole('button',{name:'Meetings'}).click();
    await page.locator('[data-arch-page="meetings"]').waitFor({state:'visible',timeout:30000});
    await checkBrand(page,theme+' Meetings');
    // A collapsed desktop sidebar must not hide labels in the mobile drawer.
    await page.getByRole('button',{name:'Collapse sidebar',exact:true}).click();
    await page.setViewportSize({width:390,height:844});
    await page.getByRole('button',{name:'More menu',exact:true}).click();
    const mobile=page.locator('.ledger-native-mobile-sidebar');
    await checkMenuAlignment(mobile,theme+' mobile');
    if(process.env.NAV_SCREENSHOT_DIR) await page.screenshot({path:process.env.NAV_SCREENSHOT_DIR+'/'+theme+'-mobile.png'});
    await mobile.getByRole('button',{name:'Network',exact:true}).click();
    check(!(await mobile.isVisible()),theme+' mobile selection closes drawer');
    await page.locator('.ledger-section-navigation').getByRole('button',{name:'Network map',exact:true}).click();
    check(await page.locator('[data-arch-page="bubbles"]').count()===1,theme+' mobile Network map remains reachable');
    check(await page.locator('.ask-dock-fab').count()===1,theme+' consolidated navigation retains one floating bot');
    await page.getByRole('button',{name:'More menu',exact:true}).click();
    await mobile.locator('.ledger-native-mobile-account-options summary').click();
    await mobile.getByRole('button',{name:'Preferences',exact:true}).click();
    check(await page.locator('.ledger-section-navigation[data-destination="account"]').isVisible(),theme+' mobile account settings remain reachable');
    await page.getByRole('button',{name:'Search records, people, modules and contacts',exact:true}).click();
    const search=page.getByRole('dialog',{name:'Search Ask Intros',exact:true});
    await search.getByRole('searchbox').fill('Private Vault');
    await search.getByRole('button',{name:/Private Vault/}).click();
    check(await page.locator('.ledger-section-navigation[data-destination="library"]').isVisible(),theme+' command search reaches nested tools directly');
    check(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=3,theme+' mobile sections fit viewport');
    await page.getByRole('button',{name:'More menu',exact:true}).click();
    await mobile.getByRole('button',{name:'Dashboard',exact:true}).click();
    await page.getByRole('button',{name:'My board',exact:true}).click();
    const mobileBoard=page.getByRole('region',{name:'Your customizable dashboard board',exact:true});
    await mobileBoard.locator('[data-widget-id="pipeline"]').evaluate(el=>el.scrollIntoView({block:'center'}));
    await page.waitForTimeout(750);
    check(await mobileBoard.locator('[data-slot="widget-grid"]').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length===2),theme+' mobile board adapts to two columns');
    check(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=3,theme+' mobile board never forces horizontal scrolling');
    if(process.env.NAV_SCREENSHOT_DIR) await page.screenshot({path:process.env.NAV_SCREENSHOT_DIR+'/'+theme+'-mobile-board.png'});
    await mobileBoard.getByRole('button',{name:'Open CRM & Pipeline',exact:true}).click();
    await page.getByRole('heading',{name:'Your opportunity pipeline.',exact:true}).waitFor();
    check(true,theme+' mobile board actions remain usable above navigation');

    check(!errors.length,theme+' no uncaught member-page errors: '+errors.slice(0,2).join('; '));
    for(const route of ['/', '/auth']){await page.goto('http://127.0.0.1:'+port+route,{waitUntil:'domcontentloaded'});await page.waitForTimeout(300);await checkBrand(page,theme+' '+route)}
    await context.close();
  }
  console.log('Native CRM multi-page architecture checks passed in dark and light appearances.');
} finally {
  if(browser)await browser.close();
  stop();
}
