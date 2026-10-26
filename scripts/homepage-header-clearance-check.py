"""Live layout regression: the public header never covers primary phone actions."""
import asyncio
from playwright.async_api import async_playwright


async def main():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        for width, height in [(320, 700), (375, 668), (390, 844), (760, 1024), (1280, 1800)]:
            page = await browser.new_page(
                viewport={"width": width, "height": height},
                has_touch=True,
                is_mobile=width < 600,
                reduced_motion="reduce",
            )
            await page.goto("http://localhost:8080", wait_until="domcontentloaded")
            await page.get_by_role("button", name="Enter Intros").click(timeout=25000)
            await page.evaluate("document.fonts.ready")
            await page.wait_for_timeout(300)
            header = await page.locator(".ael-header").bounding_box()
            action = await page.locator(".ael-hero-actions .ael-btn").first.bounding_box()
            assert header is not None and action is not None
            assert action["y"] >= header["y"] + header["height"] + 16, (width, header, action)
            assert action["x"] >= 0 and action["x"] + action["width"] <= width
            if width == 375:
                await page.screenshot(path="/tmp/browser/homepage-clearance/after.png")
            print(f"PASS {width}x{height}: full primary action below header")
            await page.close()
        await browser.close()


asyncio.run(main())