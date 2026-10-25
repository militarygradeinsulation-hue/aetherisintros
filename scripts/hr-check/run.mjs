import { build } from "esbuild";
import { createServer } from "node:http";
import { mkdtempSync, readFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url)),
  out = mkdtempSync(join(tmpdir(), "hr-check-"));
await build({
  entryPoints: [join(here, "entry.tsx")],
  bundle: true,
  format: "esm",
  outdir: out,
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [
    {
      name: "hr-fixtures",
      setup(b) {
        b.onResolve(
          { filter: /(@\/lib\/hr.functions|@\/integrations\/supabase\/client)$/ },
          () => ({ path: join(here, "mock.ts") }),
        );
      },
    },
  ],
});
const server = createServer((req, res) => {
  const asset = ["/entry.js", "/entry.css"].includes(req.url);
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
      : '<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/entry.css"><style>*{box-sizing:border-box}body{margin:0;background:#0b1018;color:#edf3fa;--commons-ink:#edf3fa;--commons-card:#141a24;font-family:system-ui}body.light{background:#f3f6fa;color:#17202e;--commons-ink:#17202e;--commons-card:#fff}a{color:inherit}</style></head><body><div id="root"></div><script type="module" src="/entry.js"></script></body></html>',
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
const shots = process.env.HR_SCREENSHOTS;
if (shots) mkdirSync(shots, { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  await page.goto("http://127.0.0.1:" + server.address().port);
  const nav = (label) =>
    page
      .getByRole("navigation", { name: "HR sections" })
      .getByRole("button", { name: new RegExp("^" + label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) })
      .click();
  await page.getByRole("button", { name: "Review business setup", exact: true }).click();
  if (
    (await page.getByLabel("Business name", { exact: true }).inputValue()) !==
    "Example HVAC Business"
  )
    throw Error("Profile context missing");
  if ((await page.getByLabel("Team size", { exact: true }).inputValue()) !== "")
    throw Error("Invented headcount");
  await page.getByLabel("Team size", { exact: true }).fill("12");
  await page.getByRole("button", { name: "Confirm and save business setup" }).click();
  await page.getByRole("status").getByText("Saved privately").waitFor();
  await nav("People");
  await page.getByRole("button", { name: "Add employee", exact: true }).click();
  await page.getByLabel("Full name *", { exact: true }).fill("Example Employee");
  await page.getByLabel("Job title *", { exact: true }).fill("Installer");
  await page.getByLabel("Manager", { exact: true }).fill("Team lead");
  await page.getByRole("button", { name: "Save employee", exact: true }).click();
  await page.getByRole("heading", { name: "Example Employee", exact: true }).waitFor();
  await page.getByRole("button", { name: "Review and edit", exact: true }).click();
  await page.getByLabel("Job title *", { exact: true }).fill("Lead installer");
  await page.evaluate(() => (window.fail = true));
  await page.getByRole("button", { name: "Save employee", exact: true }).click();
  await page.getByRole("alert").waitFor();
  if ((await page.getByLabel("Job title *", { exact: true }).inputValue()) !== "Lead installer")
    throw Error("Lost failed draft");
  await page.evaluate(() => (window.fail = false));
  await page.getByRole("button", { name: "Save employee", exact: true }).click();
  await page.getByText("Lead installer", { exact: true }).waitFor();
  await nav("Hiring");
  await page.getByRole("button", { name: "Add open role" }).click();
  await page.getByLabel("Role title *", { exact: true }).fill("Service manager");
  await page
    .getByLabel("Responsibilities and essential qualifications *", { exact: true })
    .fill("Lead service operations and train field teams.");
  await page.getByLabel("Role status *", { exact: true }).selectOption("Open");
  await page.getByRole("button", { name: "Save open role" }).click();
  await page.getByRole("heading", { name: "Service manager", exact: true }).waitFor();
  await nav("Onboarding & exits");
  await page.getByText("Build a tailored checklist", { exact: true }).click();
  await page.getByLabel("Employee for checklist").selectOption({ label: "Example Employee" });
  await page.getByLabel("Initial task due date").fill("2026-11-01");
  await page.getByRole("button", { name: "Preview tailored checklist" }).click();
  await page
    .getByText("Review site safety, equipment and job specific training", { exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Save these 7 tasks" }).click();
  await page
    .getByRole("heading", {
      name: "Review site safety, equipment and job specific training",
      exact: true,
    })
    .waitFor();
  await nav("Payroll preparation");
  await page.getByRole("button", { name: "Add hours record" }).click();
  for (const [label, text] of [
    ["Pay period label *", "October"],
    ["Period start *", "2026-10-01"],
    ["Period end *", "2026-10-15"],
    ["Regular hours *", "40"],
    ["Overtime hours *", "2"],
    ["Regular hourly rate *", "20"],
    ["Overtime hourly rate *", "30"],
  ])
    await page.getByLabel(label, { exact: true }).fill(text);
  await page.getByLabel("Employee *", { exact: true }).selectOption({ label: "Example Employee" });
  await page.getByLabel("Hours approval *", { exact: true }).selectOption("Approved");
  await page.getByRole("button", { name: "Save hours record" }).click();
  await page.getByText("Gross estimate: 860.00 USD", { exact: true }).waitFor();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export approved payroll inputs" }).click();
  const csv = readFileSync(await (await download).path(), "utf8");
  if (!csv.includes('"860"') || !csv.includes("Example Employee"))
    throw Error("Payroll export incorrect");
  await nav("HR Butler");
  await page
    .getByLabel("Your question or brief")
    .fill("Prepare an onboarding plan for a technician.");
  await page.getByRole("checkbox").check();
  await page.evaluate(() => (window.aiFail = true));
  await page.getByRole("button", { name: "Ask HR Butler", exact: true }).click();
  await page.getByRole("alert").waitFor();
  if (!(await page.getByLabel("Your question or brief").inputValue()))
    throw Error("AI failure erased brief");
  await page.evaluate(() => (window.aiFail = false));
  await page.getByRole("button", { name: "Ask HR Butler", exact: true }).click();
  await page.getByLabel("Editable response").waitFor();
  await page.getByRole("button", { name: "Save draft to Documents" }).click();
  await page.getByRole("status").getByText("Saved privately").waitFor();
  await nav("Documents");
  await page
    .getByRole("heading", { name: "Example HVAC Business: Conversation", exact: true })
    .waitFor();
  for (const theme of ["dark", "light"])
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate((t) => (document.body.className = t), theme);
      for (const section of [
        "Overview",
        "Business setup",
        "People",
        "Hiring",
        "Candidates",
        "Onboarding & exits",
        "Time off",
        "Policies",
        "Performance",
        "Training",
        "Benefits",
        "Payroll preparation",
        "Documents",
        "HR Butler",
      ]) {
        await nav(section);
        if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1))
          throw Error(`Overflow ${theme} ${width} ${section}`);
        if (shots && width === 390 && ["Overview", "People", "HR Butler"].includes(section))
          await page.screenshot({
            path: join(shots, section.replaceAll(" ", "_") + "-" + theme + ".png"),
            fullPage: true,
          });
      }
    }
  await nav("Business setup");
  await page.getByLabel("Business name", { exact: true }).fill("STALE PRIVATE COMPANY");
  await page.evaluate(() => (window.delay = true));
  await page.getByRole("button", { name: "Confirm and save business setup" }).click();
  await page.waitForFunction(() => Boolean(window.finish));
  await page.evaluate(() => {
    window.delay = false;
    window.switchAccount();
  });
  await page.getByText("Second account", { exact: true }).waitFor();
  await page.evaluate(() => window.finish());
  if (await page.getByText("STALE PRIVATE COMPANY", { exact: false }).count())
    throw Error("Old account response leaked");
  if (await page.getByText("Example Employee", { exact: true }).count())
    throw Error("Old personnel leaked");
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    "PASS HR profile tailoring, create/edit and conflict recovery, hiring, seven-task onboarding, approved payroll CSV, AI retry and saved draft, 84 section/viewport/theme checks, account-switch isolation",
  );
} finally {
  await browser.close();
  server.close();
}
