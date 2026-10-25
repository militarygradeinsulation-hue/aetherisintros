import { build } from "esbuild";
import { createServer } from "node:http";
import { mkdtempSync, readFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url)),
  out = mkdtempSync(join(tmpdir(), "network-value-"));
await build({
  entryPoints: [join(here, "entry.tsx")],
  bundle: true,
  format: "esm",
  outdir: out,
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [
    {
      name: "test-fixtures",
      setup(b) {
        b.onResolve(
          {
            filter:
              /(@\/lib\/networkValue.functions|@\/integrations\/supabase\/client|@\/aetheris\/nav)$/,
          },
          () => ({ path: join(here, "mock.ts") }),
        );
      },
    },
  ],
});
const server = createServer((req, res) => {
  const asset = req.url === "/entry.js" || req.url === "/entry.css";
  res.setHeader(
    "Content-Type",
    req.url === "/entry.js"
      ? "text/javascript"
      : req.url === "/entry.css"
        ? "text/css"
        : "text/html",
  );
  res.end(
    asset
      ? readFileSync(join(out, req.url.slice(1)))
      : '<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/entry.css"><style>*{box-sizing:border-box}body{margin:0;background:#0b1018;color:#edf3fa;--commons-ink:#edf3fa;--commons-card:#141a24;font-family:system-ui}body.light{background:#f3f6fa;color:#17202e;--commons-ink:#17202e;--commons-card:#fff}nav{padding:12px}a{color:inherit}button{min-height:44px}</style></head><body><div id="root"></div><script type="module" src="/entry.js"></script></body></html>',
  );
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ?? resolve(here, "../../node_modules/playwright/index.mjs")
);
const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
    : {}),
});
const screenshots = process.env.NETWORK_SCREENSHOTS;
if (screenshots) mkdirSync(screenshots, { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:" + server.address().port);
  await page.getByRole("heading", { name: "Example crew availability", exact: true }).waitFor();
  await page.getByRole("button", { name: "Needed", exact: true }).click();
  await page.getByRole("heading", { name: "No current needed posts" }).waitFor();
  await page.getByRole("button", { name: "Available", exact: true }).click();
  await page
    .getByLabel("Note to the owner")
    .fill("Can we agree the dates and safety responsibilities?");
  await page.evaluate(() => (window.fail = true));
  await page.getByRole("button", { name: "Request this", exact: true }).click();
  await page.getByRole("alert").waitFor();
  if (!(await page.getByLabel("Note to the owner").inputValue()))
    throw Error("Failed request erased note");
  await page.evaluate(() => (window.fail = false));
  await page.getByRole("button", { name: "Request this", exact: true }).click();
  await page
    .getByRole("region", { name: "Capacity letters" })
    .getByText("Can we agree the dates and safety responsibilities?")
    .waitFor();
  await page.getByRole("button", { name: "Open member conversation" }).click();
  if (!(await page.evaluate(() => window.conversation)))
    throw Error("Conversation handoff missing");
  await page
    .getByRole("navigation", { name: "Test pages" })
    .getByRole("button", { name: "benchmarks", exact: true })
    .click();
  await page.getByRole("heading", { name: "Benchmark pools", exact: true }).waitFor();
  await page.evaluate(() => {
    window.addEventListener("aetheris:open-assistant", (e) => (window.prompt = e.detail.question));
  });
  await page.getByRole("button", { name: "Explain the gap with Ask Intros" }).click();
  if (!(await page.evaluate(() => window.prompt)).includes("Do not invent revenue"))
    throw Error("Assistant lost evidence scope");
  await page.getByRole("button", { name: "Close rate", exact: true }).click();
  await page.getByText("COMPARISON NOT YET AVAILABLE").waitFor();
  await page.getByLabel(/Your close rate/).fill("25");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Share this metric" }).click();
  await page.getByText(/You have shared 1 of 3/).waitFor();
  for (const theme of ["dark", "light"])
    for (const width of [320, 390, 1280])
      for (const mode of ["capacity", "benchmarks", "settlements"]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate((t) => (document.body.className = t), theme);
        await page
          .getByRole("navigation", { name: "Test pages" })
          .getByRole("button", { name: mode, exact: true })
          .click();
        if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1))
          throw Error(`Overflow ${mode} ${width} ${theme}`);
        if (screenshots && width === 390)
          await page.screenshot({
            path: join(screenshots, `${mode}-${theme}.png`),
            fullPage: true,
          });
      }
  await page
    .getByRole("navigation", { name: "Test pages" })
    .getByRole("button", { name: "capacity", exact: true })
    .click();
  await page.evaluate(() => (window.delay = true));
  await page.getByLabel("Distance radius").selectOption("30");
  await page.evaluate(() => {
    window.delay = false;
    window.switchAccount();
  });
  await page.getByRole("heading", { name: "No current available posts" }).waitFor();
  await page.evaluate(() => window.finish());
  if (await page.getByText("Example Company", { exact: false }).count())
    throw Error("Old account response crossed boundary");
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    "PASS capacity tabs and requests, preserved failed draft, Letters handoff, benchmark contribution and evidence handoff, 18 responsive/theme combinations, stale account response rejection",
  );
} finally {
  await browser.close();
  server.close();
}
