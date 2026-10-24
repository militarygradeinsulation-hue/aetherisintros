// Visual parity and draft preservation against the actual demo application.
// EXPERIENCE_BASE_URL=http://127.0.0.1:5173 PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/experience-check/run.mjs
import { mkdirSync } from "node:fs";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const url = new URL("/demo", process.env.EXPERIENCE_BASE_URL || "http://127.0.0.1:5173").href;
const output = process.env.EXPERIENCE_SCREENSHOTS || "/tmp/ask-intros-experience";
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
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
  if (
    (await page.locator("#ledger-post-content").inputValue()) !==
    "Keep this draft across both visual views"
  )
    throw new Error("Feed draft lost");
  if (
    !(await page.evaluate(
      () => window.__draftNode === document.querySelector("#ledger-post-content"),
    ))
  )
    throw new Error("Feed was remounted");
  console.log("Social switch preserves feed DOM and draft");
  if ((await page.locator("#commons-post").inputValue()) !== "Keep this draft across both visual views") throw new Error("Social composer draft did not carry over");
  await page.locator("#commons-post").fill("Edited in Social, retained in Business");
  await page.getByRole("tab", { name: "Intros", exact: false }).click();
  await page.getByRole("tab", { name: "Posts", exact: true }).click();
  if ((await page.locator("#commons-post").inputValue()) !== "Edited in Social, retained in Business") throw new Error("Feed section switch discarded draft");
  await page.getByRole("button", { name: "Business", exact: true }).click();
  if ((await page.locator("#ledger-post-content").inputValue()) !== "Edited in Social, retained in Business") throw new Error("Business composer draft did not carry over");
  await page.getByRole("button", { name: "Social", exact: true }).click();
  await page.getByRole("tab", { name: "Everything", exact: true }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${output}/social.png`, fullPage: false });
  console.log(
    "social title font",
    await page.locator(".commons-welcome h1").evaluate((n) => getComputedStyle(n).fontFamily),
  );
  await page
    .getByRole("navigation", { name: "Social workspace navigation" })
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
  await page
    .getByRole("navigation", { name: "Social workspace navigation" })
    .getByRole("button", { name: "Messages", exact: true })
    .click();
  console.log(
    "Messages inputs",
    await page.locator("input,textarea").evaluateAll((nodes) => nodes.map((n) => n.placeholder)),
  );
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${output}/messages.png`, fullPage: false });
  const composer = page.getByPlaceholder("Write a message...");
  if ((await composer.count()) !== 1) throw new Error("Message composer missing");
  {
    await composer.fill("Unsent message");
    await page.getByRole("button", { name: "Business", exact: true }).click();
    if ((await composer.inputValue()) !== "Unsent message") throw new Error("Message draft lost");
    await page.getByRole("button", { name: "Social", exact: true }).click();
  }
  await page
    .getByRole("navigation", { name: "Social workspace navigation" })
    .getByRole("button", { name: "Meetings", exact: true })
    .click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${output}/meetings.png`, fullPage: false });
  await page.getByRole("switch", { name: "Dark mode" }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${output}/social-light.png`, fullPage: false });
  const palette = await page.evaluate(() => ({
    root: getComputedStyle(document.documentElement).getPropertyValue("--social-card").trim(),
    control: getComputedStyle(document.querySelector(".ledger-native-search")).backgroundColor,
  }));
  if (palette.root !== "#fff" || palette.control !== "rgb(255, 255, 255)")
    throw new Error(
      "Light Social controls did not adopt the light palette: " + JSON.stringify(palette),
    );
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
  console.log("Mobile layout fits viewport");
  if (errors.length) throw new Error(errors.join("\n"));
  console.log("No uncaught browser errors");
} finally {
  await browser.close();
}
