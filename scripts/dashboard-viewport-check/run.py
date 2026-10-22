"""Demo-only browser regression; requires running preview, never bypasses member auth."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
OUT=Path('/tmp/browser/fixed-dashboard')
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True)
  results=[]; errors=[]
  for w,h in [(1440,900),(1280,800),(390,844),(320,700)]:
   page=await browser.new_page(viewport={'width':w,'height':h})
   page.on('pageerror',lambda e:errors.append(str(e)))
   await page.goto('http://localhost:8080/demo',wait_until='domcontentloaded')
   await page.locator('.home-feed-page').wait_for(timeout=30000)
   await page.wait_for_timeout(1000)
   async def measure(label):
    m=await page.evaluate('''() => {const d=document.documentElement,p=document.querySelector('.aetheris-workspace-content'),i=document.querySelector('.dashboard-inner-panel:not([hidden])'); return {doc:[d.clientHeight,d.scrollHeight,d.clientWidth,d.scrollWidth],pane:[p.clientHeight,p.scrollHeight,p.clientWidth,p.scrollWidth],inner:i?[i.clientHeight,i.scrollHeight]:null}}''')
    results.append({'viewport':[w,h],'panel':label,**m})
    assert m['doc'][1]<=m['doc'][0]+2,m
    assert m['doc'][3]<=m['doc'][2]+2,m
    assert m['pane'][1]<=m['pane'][0]+2,m
    assert m['pane'][3]<=m['pane'][2]+2,m
   await measure('feed')
   await page.screenshot(path=str(OUT/f'dashboard-{w}.png'))
   textarea=page.locator('#home-social-board textarea').first
   await textarea.fill('Fixed Dashboard regression draft')
   await page.get_by_role('button',name='Tools & activity',exact=True).click()
   await measure('tools')
   await page.screenshot(path=str(OUT/f'tools-{w}.png'))
   await page.get_by_role('button',name='Overview',exact=True).click()
   await measure('overview')
   await page.get_by_role('button',name='Social feed',exact=True).focus()
   await page.keyboard.press('Enter')
   assert await textarea.input_value()=='Fixed Dashboard regression draft'
   await page.locator('#home-social-board').get_by_role('button',name='Post',exact=True).click()
   await page.get_by_text('Fixed Dashboard regression draft',exact=True).wait_for()
   like=page.get_by_role('button',name="Like Sarah Chen's post",exact=True).first
   await like.click(); assert await like.get_attribute('aria-pressed')=='false'
   save=page.get_by_role('button',name="Save Sarah Chen's post",exact=True).first
   await save.click(); assert await save.get_attribute('aria-pressed')=='true'
   await page.locator('#dashboard-social-panel').evaluate('(e)=>e.scrollTop=e.scrollHeight')
   more=page.get_by_role('button',name='Show more updates',exact=True)
   if await more.count():
    before=await page.locator('#home-social-board article').count();await more.click();assert await page.locator('#home-social-board article').count()>before
   await measure('feed-after-post-more')
   fab=page.locator('.ask-dock-fab').first
   assert await fab.is_visible()
   await fab.click();await page.wait_for_timeout(100)
   await page.get_by_role('button',name='Close Ask Intros',exact=True).click()
   if w<768:
    await page.get_by_role('button',name='Open workspace menu',exact=True).click()
    nav=page.get_by_role('navigation',name='Mobile workspace navigation',exact=True)
   else: nav=page.get_by_role('navigation',name='Workspace navigation',exact=True)
   await nav.get_by_role('button',name='Find Introductions',exact=True).click()
   await page.get_by_role('heading',name='Introductions with context.').wait_for()
   assert await page.locator('.editorial-plate img,.editorial-hero img').count()==0
   await page.screenshot(path=str(OUT/f'intros-{w}.png'))
   await page.get_by_role('button',name='New introduction',exact=True).click()
   await page.get_by_role('heading',name='Facilitate Introduction',exact=True).wait_for()
   await page.get_by_role('button',name='Cancel',exact=True).click()
   assert not await page.get_by_role('heading',name='Facilitate Introduction',exact=True).is_visible()
   if w<768:
    await page.get_by_role('button',name='Open workspace menu',exact=True).click()
    nav=page.get_by_role('navigation',name='Mobile workspace navigation',exact=True)
   await nav.get_by_role('button',name='Member Network',exact=True).click()
   await page.get_by_role('textbox',name='Search the member network',exact=True).wait_for()
   await page.close()
  print(json.dumps({'results':results,'errors':errors},indent=2));assert not errors,errors
  await browser.close()
asyncio.run(main())
