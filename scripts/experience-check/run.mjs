// Visual parity and draft preservation against the actual demo application.
// EXPERIENCE_BASE_URL=http://127.0.0.1:5173 PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/experience-check/run.mjs
import { mkdirSync } from "node:fs";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const url = new URL("/demo", process.env.EXPERIENCE_BASE_URL || "http://127.0.0.1:5173").href;
const output = process.env.EXPERIENCE_SCREENSHOTS || "/tmp/ask-intros-experience";
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const checkButler = async () => {
    const button = page.locator('.ix-assistant .ask-dock-fab');
    if (await button.count() !== 1) throw new Error('Expected one canonical Butler launcher');
    const blob = button.locator('.ask-dock-blob');
    if (!await blob.isVisible()) throw new Error('Social Butler blob is hidden');
    const bounds = await button.boundingBox();
    const viewport = page.viewportSize();
    if (!bounds || bounds.x < 0 || bounds.y < 0 || bounds.x + bounds.width > viewport.width || bounds.y + bounds.height > viewport.height) throw new Error('Butler is outside the viewport');
    await button.click();
    await page.getByRole('dialog', { name: 'Ask Intros', exact: true }).waitFor();
    await button.click();
    await page.getByRole('dialog', { name: 'Ask Intros', exact: true }).waitFor({ state: 'hidden' });
    console.log('Social Butler blob is visible and opens its canonical dialog');
  };
  const checkIntroductions = async (mobile = false) => {
    const nav = page.getByRole('navigation', { name: mobile ? 'Mobile navigation' : 'Desktop navigation', exact: true });
    await nav.getByRole('button', { name: 'Ask Intros', exact: true }).click();
    await page.getByRole('heading', { name: 'Ask Intros', exact: true }).waitFor();
    await page.getByRole('tabpanel').locator('canvas[data-effect="particle-drift"]').waitFor({ state: 'attached' });
    const color = await page.locator('canvas[data-effect="particle-drift"]').evaluate(canvas => getComputedStyle(canvas).getPropertyValue('--ambient-beam').trim());
    if (!color || !await page.evaluate(color => CSS.supports('color', color), color)) throw new Error('Radar animation color is invalid: ' + color);
    await page.getByRole('tab', { name: 'Introductions', exact: true }).click();
    await page.getByRole('tabpanel', { name: 'Introductions', exact: true }).waitFor();
    await nav.getByRole('button', { name: 'Home', exact: true }).click();
    await page.getByRole('heading', { name: 'Today, in good company.' }).waitFor();
    console.log(`${mobile ? 'Mobile' : 'Desktop'} Ask Intros opens radar and introductions`);
  };
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  console.log("Navigation returned");
  await page.getByRole("button", { name: "Social", exact: true }).waitFor({ timeout: 90000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${output}/business.png`, fullPage: false });
  console.log("Business loaded");
  await page.locator("#ledger-post-content").fill("Keep this draft across both visual views");
  await page.evaluate(() => {
    window.__draftNode = document.querySelector("#ledger-post-content");
  });
  await page.getByRole("button", { name: "Social", exact: true }).click();
  await page.getByRole("heading", { name: "Today, in good company." }).waitFor();
  await checkButler();
  await page.locator("#commons-post").fill("Original Bridge draft");
  await page.getByRole("tab", { name: "Intros", exact: false }).click();
  await page.getByRole("tab", { name: "Posts", exact: true }).click();
  if ((await page.locator("#commons-post").inputValue()) !== "Original Bridge draft") throw new Error("Bridge draft lost across tabs");
  await page.getByRole("button", { name: "Business", exact: true }).click();
  if ((await page.locator("#ledger-post-content").inputValue()) !== "Keep this draft across both visual views") throw new Error("Business draft lost");
  if (!(await page.evaluate(() => window.__draftNode === document.querySelector("#ledger-post-content")))) throw new Error("Canonical feed remounted");
  await page.getByRole("button", { name: "Social", exact: true }).click();
  await page.getByRole("tab", { name: "Everything", exact: true }).click();
  if ((await page.locator("#commons-post").inputValue()) !== "Original Bridge draft") throw new Error("Bridge draft lost across views");
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${output}/social.png`, fullPage: false });
  const material = await page.locator('.commons-card').first().evaluate(node => {
    const style = getComputedStyle(node);
    return { radius: parseFloat(style.borderTopLeftRadius), background: style.backgroundImage, material: style.getPropertyValue('--glass-material').trim() };
  });
  if (material.radius < 24 || material.background === 'none' || !material.material) throw new Error('Bridge glass and rounded shape tokens are missing: ' + JSON.stringify(material));
  console.log('Published Bridge glass and rounded cards verified', material);
  console.log(
    "social title font",
    await page.locator(".commons-welcome h1").evaluate((n) => getComputedStyle(n).fontFamily),
  );
  await page
    .getByRole("navigation", { name: "Desktop navigation" })
    .getByRole("button", { name: "People", exact: true })
    .click();
  const search = page.getByPlaceholder("Name or keyword...");
  await search.fill("Marcus");
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${output}/social-people.png`, fullPage: false });
  await page.getByRole("button", { name: "Business", exact: true }).click();
  if ((await search.inputValue()) !== "Marcus") throw new Error("Directory filter lost");
  await page.getByRole("button", { name: "Social", exact: true }).click();
  console.log("People filters preserved");
  await checkIntroductions();
  await page
    .getByRole("navigation", { name: "Desktop navigation" })
    .getByRole("button", { name: "Messages", exact: true })
    .click();
  console.log(
    "Messages inputs",
    await page.locator("input,textarea").evaluateAll((nodes) => nodes.map((n) => n.placeholder)),
  );
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${output}/messages.png`, fullPage: false });
  const composer = page.locator('input[placeholder="Write a message..."]:visible,textarea[placeholder="Write a message..."]:visible');
  if ((await composer.count()) !== 1) throw new Error("Message composer missing");
  {
    await composer.fill("Unsent message");
    await page.getByRole("button", { name: "Business", exact: true }).click();
    
    await page.getByRole("button", { name: "Social", exact: true }).click();
    if ((await composer.inputValue()) !== "Unsent message") throw new Error("Bridge message draft lost");
  }
  await page
    .getByRole("navigation", { name: "Desktop navigation" })
    .getByRole("button", { name: "Meetings", exact: true })
    .click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${output}/meetings.png`, fullPage: false });
  await page.getByRole("switch", { name: "Dark mode" }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${output}/social-light.png`, fullPage: false });
  const palette = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--commons-card").trim());
  if (palette !== "#fff") throw new Error("Original Bridge light palette missing: " + palette);
  console.log("Light Social theme checked");
  await page.reload();
  await page.getByRole("button", { name: "Social", exact: true }).waitFor();
  await page.waitForFunction(() => document.documentElement.dataset.experience === "social");
  console.log("Social preference restored");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${output}/mobile.png`, fullPage: false });
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
    throw new Error("Mobile horizontal overflow");
  await checkButler();
  await checkIntroductions(true);
  console.log("Mobile layout fits viewport");
  if (errors.length) throw new Error(errors.join("\n"));
  console.log("No uncaught browser errors");
} finally {
  await browser.close();
}
