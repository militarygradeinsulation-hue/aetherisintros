import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
OUT=Path('/tmp/browser/mobile-redesign')
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True)
  for w,h in [(320,700),(390,844),(430,932),(1440,900)]:
   page=await browser.new_page(viewport={'width':w,'height':h},reduced_motion='reduce'); errors=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   await page.goto('http://localhost:8080/demo'); await page.get_by_role('button',name='Ask Intros dashboard',exact=True).wait_for(timeout=90000)
   if w<761:
    assert not await page.locator('.dashboard-demo-composer textarea').is_visible()
    await page.screenshot(path=str(OUT/f'{w}-dashboard.png'))
    fit=await page.locator('.aetheris-workspace-content').evaluate('(e)=>[e.clientHeight,e.scrollHeight]');assert fit[1]<=fit[0]+2
    first=await page.locator('.dashboard-demo-post').first.bounding_box();assert first and first['y']<h-160
    await page.locator('.mobile-composer-trigger').click()
    text=page.locator('.dashboard-demo-composer textarea');await text.fill('Mobile draft preservation check')
    await page.locator('input[type=file]').first.set_input_files({'name':'mobile-note.txt','mimeType':'text/plain','buffer':b'attachment check'})
    await page.screenshot(path=str(OUT/f'{w}-composer.png'))
    await page.locator('.mobile-composer-trigger').click();await page.get_by_role('button',name='Tools & activity',exact=True).click();await page.get_by_role('button',name='Social feed',exact=True).click()
    await page.locator('.mobile-composer-trigger').click();assert await text.input_value()=='Mobile draft preservation check'
    assert await page.get_by_role('button',name='Remove mobile-note.txt').count()==1
    await page.get_by_role('button',name='Post',exact=True).click();assert await page.get_by_text('Mobile draft preservation check',exact=False).count()>0
    await page.locator('.mobile-composer-trigger').click()
    like=page.get_by_role('button',name="Like Marcus Lee's post",exact=True);await like.click();assert await like.get_attribute('aria-pressed')=='true'
    save=page.get_by_role('button',name="Save Marcus Lee's post",exact=True);await save.click()
    await page.get_by_role('button',name="Comment on Marcus Lee's post",exact=True).click();await page.get_by_role('textbox',name='Your comment').fill('Useful context');await page.get_by_role('button',name='Reply',exact=True).click();assert await page.get_by_text('Useful context',exact=False).count()>0
    menu=page.get_by_role('button',name='Open workspace menu',exact=True);assert await menu.locator('svg').is_visible(); assert await menu.locator('span').inner_text()=='Menu';await menu.click();dialog=page.get_by_role('dialog',name='Navigate',exact=True)
    await page.screenshot(path=str(OUT/f'{w}-menu.png'))
    await page.keyboard.press('Shift+Tab');assert await page.evaluate("document.querySelector('.specter-mobile-menu').contains(document.activeElement)")
    await page.keyboard.press('Tab');await page.keyboard.press('Escape');assert await menu.evaluate('(e)=>e===document.activeElement')
    await menu.click();await page.get_by_role('button',name='Close navigation menu',exact=True).click(position={'x':2,'y':100});assert not await dialog.count()
    await menu.click();await dialog.get_by_role('button',name='Messages',exact=True).click()
    await menu.click();search=dialog.get_by_role('textbox',name='Search members on mobile');await search.fill('Marcus');await search.press('Enter');await page.locator('.ix-network-viewport').wait_for();assert await page.get_by_text('Marcus Lee',exact=True).count()>0
    await menu.click();search=dialog.get_by_role('textbox',name='Search members on mobile');await search.fill('');await dialog.get_by_role('button',name='Member Network',exact=True).click()
   else:
    assert await page.locator('.dashboard-demo-composer textarea').is_visible()
    await page.screenshot(path=str(OUT/f'{w}-dashboard.png'))
    await page.get_by_role('navigation',name='Workspace navigation',exact=True).get_by_role('button',name='Member Network',exact=True).click()
   await page.locator('.ix-network-viewport').wait_for()
   await page.screenshot(path=str(OUT/f'{w}-network.png'))
   dims=await page.evaluate('''()=>({doc:[document.documentElement.scrollWidth,document.documentElement.clientWidth,document.documentElement.scrollHeight,document.documentElement.clientHeight],panes:[...document.querySelectorAll('.specter-app-canvas,.aetheris-workspace-content,.ix-network-results-layout')].map(e=>({cls:e.className,h:e.clientHeight,sh:e.scrollHeight,overflow:getComputedStyle(e).overflowY}))})''')
   assert dims['doc'][0]<=w+2
   await page.locator('.aetheris-workspace-content').evaluate('(e)=>e.scrollTop=e.scrollHeight')
   scrolled=await page.locator('.aetheris-workspace-content').evaluate('(e)=>e.scrollTop');assert scrolled>0 if w<761 else True
   await page.screenshot(path=str(OUT/f'{w}-network-bottom.png'))
   print(json.dumps({'viewport':[w,h],'network':dims,'networkScrolled':scrolled,'errors':errors}));assert not errors
   await page.close()
  await browser.close()
asyncio.run(main())
