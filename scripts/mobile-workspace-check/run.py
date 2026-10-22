import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
OUT=Path('/tmp/browser/mobile-finishing')
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True)
  for w,h in [(320,700),(390,844),(430,932),(760,900),(1440,900)]:
   page=await browser.new_page(viewport={'width':w,'height':h},reduced_motion='reduce');errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   await page.goto('http://localhost:8080/demo',wait_until='networkidle')
   async def nav(label):
    if w<=760:
     await page.get_by_role('button',name='Open workspace menu',exact=True).click()
     dialog=page.get_by_role('dialog',name='Navigate')
     await dialog.get_by_role('button',name=label,exact=True).click()
    else: await page.get_by_role('navigation',name='Workspace navigation',exact=True).get_by_role('button',name=label,exact=True).click()
    await page.wait_for_timeout(200)
   async def locked():
    sizes=await page.evaluate('({doc:[document.documentElement.scrollWidth,innerWidth,document.documentElement.scrollHeight,innerHeight],pane:[...document.querySelectorAll(".specter-app-canvas,.aetheris-workspace-content")].map(e=>[e.scrollHeight,e.clientHeight])})')
    assert sizes['doc'][0]<=w+2 and sizes['doc'][2]<=h+2,sizes
    assert all(a<=b+2 for a,b in sizes['pane']),sizes
   await locked()
   fab=page.locator('.ask-dock-fab');box=await fab.bounding_box();assert box and box['width']>=44 if w<=760 else box
   await fab.click();await page.get_by_role('dialog',name='Ask Intros',exact=True).wait_for();await page.screenshot(path=str(OUT/f'{w}-butler.png'))
   await page.get_by_role('button',name='Close Ask Intros',exact=True).click()
   if w<=760:
    toggle=page.get_by_role('button',name='Open workspace menu',exact=True);await toggle.click();d=page.get_by_role('dialog',name='Navigate')
    assert await page.locator('.specter-mobile-menu-toggle span').is_visible()
    assert await page.locator('.specter-app-canvas').evaluate('(e)=>e.inert')
    assert not await fab.is_visible()
    await d.get_by_role('button').first.focus();await page.keyboard.press('Shift+Tab');assert await d.get_by_role('button').last.evaluate('(e)=>document.activeElement===e')
    await page.keyboard.press('Tab');assert await d.get_by_role('button').first.evaluate('(e)=>document.activeElement===e')
    await d.get_by_role('button',name='Settings',exact=True).scroll_into_view_if_needed();await page.screenshot(path=str(OUT/f'{w}-menu-bottom.png'))
    await page.keyboard.press('Escape');assert await toggle.evaluate('(e)=>document.activeElement===e')
   await nav('Messages');await page.get_by_role('heading',name='Messages',exact=True).wait_for()
   await nav('Member Network');await locked()
   search=page.get_by_role('textbox',name='Search the member network');await search.fill('Marcus');await page.wait_for_timeout(100)
   print(w,'filtered names',await page.locator('.ix-network-member-card h3').all_text_contents())
   assert await page.locator('.ix-network-member-card').count()==1
   await search.fill('');await page.get_by_role('button',name='Show filters',exact=True).click() if w<=760 else await asyncio.sleep(0)
   if w<=760: await page.get_by_role('button',name='Hide filters',exact=True).click()
   scroller=page.locator('.ix-network-results-layout' if w<=760 else '.ix-network-results-list')
   await scroller.evaluate('(e)=>e.scrollTop=e.scrollHeight');assert await scroller.evaluate('(e)=>e.scrollTop')>0
   await page.screenshot(path=str(OUT/f'{w}-network-bottom.png'));await locked()
   if w<=760:
    await page.get_by_role('button',name='Open workspace menu',exact=True).click();d=page.get_by_role('dialog',name='Navigate')
    assert await d.get_by_role('button',name='Member Network',exact=True).get_attribute('aria-current')=='page'
    mobileSearch=d.get_by_role('textbox',name='Search members on mobile');await mobileSearch.fill('Marcus');await mobileSearch.press('Enter')
    assert await search.input_value()=='Marcus';assert await d.count()==0
   await nav('Dashboard');await locked()
   composer=page.get_by_placeholder('Share an insight, milestone, or opportunity...');await composer.fill('Mobile QA draft')
   await page.get_by_role('button',name='Tools & activity',exact=True).click()
   await page.locator('#dashboard-tools-panel').wait_for(state='visible');await page.screenshot(path=str(OUT/f'{w}-tools.png'))
   await page.get_by_role('button',name='Social feed',exact=True).click();assert await composer.input_value()=='Mobile QA draft'
   await page.get_by_role('button',name='Post',exact=True).click();assert await page.get_by_text('Mobile QA draft',exact=True).count()>0
   social=page.locator('#dashboard-social-panel');await social.evaluate('(e)=>e.scrollTop=e.scrollHeight');assert await social.evaluate('(e)=>e.scrollTop')>0
   await locked();await nav('Specter Detect')
   content=page.locator('.aetheris-workspace-content');await content.evaluate('(e)=>e.scrollTop=e.scrollHeight')
   print(w,'Specter scroll',await content.evaluate('(e)=>[e.clientHeight,e.scrollHeight,e.scrollTop]'))
   await page.screenshot(path=str(OUT/f'{w}-specter-bottom.png'))
   await content.evaluate('(e)=>e.scrollTop=0');await page.get_by_role('button',name='How it works',exact=True).click();assert await page.locator('.specter-help').is_visible()
   if w<=760:
    await page.get_by_role('button',name='Open workspace menu',exact=True).click();assert await page.get_by_role('dialog',name='Navigate').is_visible();await page.keyboard.press('Escape')
   print(w,'PASS flows; runtime errors',errors);assert not errors
   await page.close()
  await browser.close()
asyncio.run(main())
