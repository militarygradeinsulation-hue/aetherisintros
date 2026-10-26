"""Live regression: entry stays centered through hover and opens on one tap."""
import asyncio
from playwright.async_api import async_playwright


async def main():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        for width, height in [(375, 668), (320, 700), (1280, 1800)]:
            page = await browser.new_page(
                viewport={"width": width, "height": height},
                has_touch=True,
                is_mobile=width < 600,
            )
            await page.goto("http://localhost:8080", wait_until="domcontentloaded")
            button = page.get_by_role("button", name="Enter Intros")
            await button.wait_for(timeout=25000)
            before = await button.bounding_box()
            assert before is not None
            assert abs(before["x"] + before["width"] / 2 - width / 2) < 1
            assert abs(before["y"] + before["height"] / 2 - height / 2) < 1
            await button.hover(force=True)
            await page.wait_for_timeout(350)
            after = await button.bounding_box()
            assert after == before, (before, after)
            await page.touchscreen.tap(
                before["x"] + before["width"] / 2,
                before["y"] + before["height"] / 2,
            )
            await page.locator(".ask-cinematic-entrance").wait_for(state="detached")
            assert await page.get_by_role("link", name="Ask Intros home").first.is_visible()
            print(f"PASS {width}x{height}: stable center and one-tap entry")
            await page.close()
        await browser.close()


asyncio.run(main())