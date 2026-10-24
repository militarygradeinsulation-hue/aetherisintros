const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:844}});
try {
 await p.goto(new URL('/demo', process.env.EXPERIENCE_BASE_URL || 'http://127.0.0.1:5173').href,{waitUntil:'domcontentloaded',timeout:120000});
 await p.locator('.ledger-crm-topbar').waitFor({timeout:120000});
 for(const view of ['Social','Business']) {
  await p.getByRole('button',{name:'More menu',exact:true}).click();
  await p.locator('.ledger-mobile-view-choice').getByRole('button',{name:view,exact:true}).click();
  await p.getByRole('button',{name:'Close navigation',exact:true}).last().click();
  await p.locator('#ledger-post-content').fill('Preserve phone draft');
  const metrics=await p.evaluate(()=>{const shell=document.querySelector('.ledger-crm-shell');shell.scrollTop=0;return {header:document.querySelector('.ledger-crm-topbar').getBoundingClientRect().height,bottom:document.querySelector('.ledger-native-bottom').getBoundingClientRect().height,viewSwitch:getComputedStyle(document.querySelector('.ledger-crm-topbar>.experience-switch')).display,overflow:document.documentElement.scrollWidth-innerWidth,scrollable:shell.scrollHeight>shell.clientHeight};});
  console.log(view,metrics);
  if(metrics.header>68||metrics.bottom>53||metrics.viewSwitch!=='none'||metrics.overflow>1||!metrics.scrollable)throw Error('Phone geometry failed');

  await p.locator('.ledger-crm-shell').evaluate(n=>n.scrollTop=350);
  await p.waitForTimeout(200);
  if(await p.locator('.ledger-crm-topbar').evaluate(n=>n.getBoundingClientRect().bottom)>0)throw Error('Toolbar still occupies page on scroll');
  if(await p.locator('#ledger-post-content').inputValue()!=='Preserve phone draft')throw Error('Draft lost');
 }
 await p.setViewportSize({width:1440,height:1000});
 if(!await p.locator('.ledger-crm-topbar>.experience-switch').isVisible())throw Error('Desktop switch hidden');
 console.log('PASS full phone scroll, compact controls, both views and desktop switch');
}finally{await b.close()}
