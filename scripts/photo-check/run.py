"""Public/demo photo-removal QA; never supplies or bypasses member authentication."""
import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright
OUT = Path('/tmp/browser/remove-photos/verified')
OUT.mkdir(parents=True, exist_ok=True)
async def main():
 async with async_playwright() as p:
  browser = await p.chromium.launch(headless=True)
  errors=[]
  for width in [1440,390,320]:
   page=await browser.new_page(viewport={'width':width,'height':1800})
   page.on('pageerror', lambda e: errors.append(str(e)))
   await page.goto('http://localhost:8080/',wait_until='domcontentloaded')
   await page.get_by_role('heading',name='The Only social platform that runs your business.',exact=True).wait_for(timeout=30000)
   # The opening film waits for the visitor; dismiss it so the hero itself is what gets inspected.
   await page.wait_for_function("""() => {
     const host = document.querySelector('.ask-cinematic-entrance');
     if (!host) return true;
     const button = [...host.querySelectorAll('button')].find(x => /Skip intro|Enter Intros/.test(x.textContent || ''));
     if (button) button.click();
     return false;
   }""", timeout=20000)
   # The hero shows the member's own brand graphics; nothing else may appear in that area.
   hero_extra = await page.evaluate("() => [...document.querySelectorAll('.ael-hero img')].filter(i => !i.closest('.ael-hero-slide')).length")
   assert hero_extra == 0, (width, 'stray hero image', hero_extra)
   assert await page.locator('.ael-compact-story-photo, .ael-membership img').count()==0
   await page.screenshot(path=str(OUT/f'landing-{width}.png'))
   await page.goto('http://localhost:8080/demo',wait_until='domcontentloaded')
   await page.locator('.aetheris-workspace-shell').wait_for(timeout=30000)
   await page.wait_for_timeout(1500)
   for label,key in [('Dashboard','home'),('Member Network','people'),('Find Introductions','intros'),('Memory','memory'),('Work','work'),('Insights','insights')]:
    if width<768:
     await page.get_by_role('button',name='Open workspace menu',exact=True).click()
     await page.get_by_role('navigation',name='Mobile workspace navigation',exact=True).get_by_role('button',name=label,exact=True).click()
    else:
     await page.get_by_role('navigation',name='Workspace navigation',exact=True).get_by_role('button',name=label,exact=True).click()
    await page.wait_for_timeout(700)
    assert await page.locator('.aetheris-workspace-shell').get_attribute('data-workspace-view')==key
    stock=await page.locator('img[src*="unsplash.com"],image[href*="unsplash.com"],.editorial-plate,.eh-hero-art,.masthead-plate,.memory-editorial figure,.work-editorial-masthead figure').count()
    assert stock==0,(key,width,stock)
    dims=await page.evaluate('''() => ({documentHeight:document.scrollingElement.scrollHeight,viewportHeight:innerHeight,documentWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,paneWidth:document.querySelector('.aetheris-workspace-content').clientWidth,paneScrollWidth:document.querySelector('.aetheris-workspace-content').scrollWidth})''')
    assert dims['documentHeight']<=dims['viewportHeight']+2,(key,width,dims)
    assert dims['documentWidth']<=width+2 and dims['paneScrollWidth']<=dims['paneWidth']+2,(key,width,dims)
    assert await page.locator('.ask-dock-fab').is_visible()
    await page.screenshot(path=str(OUT/f'{key}-{width}.png'))
    print(label,width,json.dumps(dims))
    if key=='home':
     textarea=page.locator('#home-social-board textarea').first
     await textarea.fill('Dashboard draft stays intact')
     await page.get_by_role('button',name='Tools & activity',exact=True).focus()
     await page.keyboard.press('Enter')
     assert not await page.locator('#dashboard-social-panel').is_visible()
     assert await page.locator('#dashboard-tools-panel').is_visible()
     await page.get_by_role('button',name='Share an update',exact=True).click()
     assert await page.locator('#dashboard-social-panel').is_visible()
     assert await textarea.input_value()=='Dashboard draft stays intact'
     await textarea.fill('')
   await page.close()
  assert not errors,errors
  print('PASS: photo-free public/demo screens, retained Butler, viewport lock, no overflow or page errors; live /app requires member sign-in.')
  await browser.close()
asyncio.run(main())
