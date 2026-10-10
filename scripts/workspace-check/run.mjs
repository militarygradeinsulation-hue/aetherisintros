// Browser check for deal workspaces against a REAL, ISOLATED test environment (a dedicated
// Supabase project with drizzle/migrations applied and three seeded, verified, onboarded members).
// It is not wired into CI and refuses to run without that environment: no stand-ins here, because
// the point is to prove persistence and authorization against the actual database.
//
//   WORKSPACE_E2E_URL=https://<test deployment>  \
//   WORKSPACE_E2E_OWNER=email:password  WORKSPACE_E2E_GUEST=email:password  WORKSPACE_E2E_OUTSIDER=email:password \
//   PLAYWRIGHT_MODULE=<repo>/node_modules/playwright/index.mjs  node scripts/workspace-check/run.mjs
//
// Preconditions: OWNER and GUEST already share a conversation (Messages); OUTSIDER is in neither.
// Re-runs need a fresh conversation, since one workspace exists per source.
const need = [
  "WORKSPACE_E2E_URL",
  "WORKSPACE_E2E_OWNER",
  "WORKSPACE_E2E_GUEST",
  "WORKSPACE_E2E_OUTSIDER",
];
const missing = need.filter((k) => !process.env[k]);
if (missing.length) {
  console.log(`BLOCKED: set ${missing.join(", ")} to run against an isolated test environment.`);
  process.exit(2);
}
const url = process.env.WORKSPACE_E2E_URL.replace(/\/$/, "");
if (/prod|ask-?intros\.(com|app)$/i.test(new URL(url).hostname)) {
  console.log("Refusing to run against a production-looking host.");
  process.exit(2);
}

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
let pass = 0,
  fail = 0;
const ok = (c, m) => {
  c ? pass++ : fail++;
  console.log(c ? "  ✓" : "  ✗", m);
};
const browser = await chromium.launch();

async function signIn(who) {
  const [email, ...rest] = process.env[who].split(":");
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${url}/auth`);
  await page.getByPlaceholder("you@company.com").fill(email);
  await page.getByPlaceholder("Your password").fill(rest.join(":"));
  await page.getByRole("button", { name: /^Sign in/ }).click();
  await page.waitForURL(/\/app/, { timeout: 30000 });
  return page;
}
const openWorkspaces = async (page) => {
  await page.getByRole("button", { name: "Ask Intros" }).first().click();
  await page.getByRole("button", { name: "Workspaces", exact: true }).click();
};

try {
  const owner = await signIn("WORKSPACE_E2E_OWNER");
  await owner.getByRole("button", { name: "Messages" }).first().click();
  await owner.locator("aside button").first().click();
  const title = `E2E workspace ${Date.now()}`;

  // Validation keeps input; failed write keeps input.
  await owner.getByRole("button", { name: "Open workspace" }).click();
  await owner.getByLabel("Workspace title").fill("ab");
  await owner.getByRole("button", { name: "Open workspace" }).last().click();
  ok(
    await owner.getByRole("alert").first().isVisible(),
    "an invalid title is refused with a message",
  );
  await owner.getByLabel("Workspace title").fill(title);
  await owner.getByLabel("Scope").fill("Audit the dispatch process");
  await owner.context().setOffline(true);
  await owner.getByRole("button", { name: "Open workspace" }).last().click();
  await owner.getByText("Your entries are kept").waitFor();
  ok(
    (await owner.getByLabel("Scope").inputValue()) === "Audit the dispatch process",
    "a failed write keeps what was typed",
  );
  await owner.context().setOffline(false);

  // Duplicate submit creates one workspace.
  await owner.getByRole("button", { name: "Open workspace" }).last().dblclick();
  await owner.getByRole("heading", { name: title }).waitFor();
  ok(true, "the workspace opens from the conversation");
  await owner.reload();
  await openWorkspaces(owner);
  ok(
    (await owner.getByRole("listitem").filter({ hasText: title }).count()) === 1,
    "it persists across reload, once",
  );

  // Next steps persist.
  await owner.getByRole("listitem").filter({ hasText: title }).click();
  await owner.getByLabel("New step").fill("Send NDA");
  await owner.getByRole("button", { name: "Add step" }).click();
  await owner.getByLabel("Next action").fill("Share dispatch export");
  await owner.getByRole("button", { name: "Save next action" }).click();
  await owner.reload();
  await openWorkspaces(owner);
  await owner.getByRole("listitem").filter({ hasText: title }).click();
  ok(
    (await owner.getByText("Send NDA").isVisible()) &&
      (await owner.getByLabel("Next action").inputValue()) === "Share dispatch export",
    "steps and next action survive a reload",
  );

  // Guest sees an invitation with no terms; the outsider sees nothing.
  const guest = await signIn("WORKSPACE_E2E_GUEST");
  await openWorkspaces(guest);
  ok(
    (await guest.getByText(title).first().isVisible()) &&
      !(await guest.getByText("Send NDA").count()),
    "the invited person sees the title only, not steps or terms",
  );
  await guest.getByRole("button", { name: "Accept invitation" }).click();
  await guest.getByRole("listitem").filter({ hasText: title }).click();
  ok(await guest.getByText("Send NDA").isVisible(), "after accepting they see the steps");
  const outsider = await signIn("WORKSPACE_E2E_OUTSIDER");
  await openWorkspaces(outsider);
  ok(
    (await outsider.getByRole("listitem").filter({ hasText: title }).count()) === 0,
    "an outsider does not see the workspace",
  );

  // Roles first: nothing consequential until both people accept buyer/provider.
  await guest.reload();
  await openWorkspaces(guest);
  await guest.getByRole("listitem").filter({ hasText: title }).click();
  ok(
    !(await guest.getByText("Scope of the invitation").count()) &&
      (await guest
        .getByText("Approvals and delivery are blocked until both people accept")
        .isVisible()),
    "before roles are accepted, business actions are blocked",
  );
  const buyerOption = await owner
    .getByLabel("Who is the buyer")
    .locator("option:not([value=''])", { hasNotText: "(you)" })
    .first()
    .getAttribute("value");
  await owner.getByLabel("Who is the buyer").selectOption(buyerOption);
  await owner.getByRole("button", { name: "Propose roles" }).click();
  ok(
    !(await owner.getByRole("button", { name: "Accept these roles" }).count()),
    "the proposer cannot accept their own role assignment",
  );
  await guest.reload();
  await openWorkspaces(guest);
  await guest.getByRole("listitem").filter({ hasText: title }).click();
  await guest.getByRole("button", { name: "Accept these roles" }).click();

  // Provider (owner) proposes; both parties approve the same version; provider delivers; buyer accepts.
  await owner.reload();
  await openWorkspaces(owner);
  await owner.getByRole("listitem").filter({ hasText: title }).click();
  await owner.getByRole("button", { name: "Submit proposal" }).first().click();
  await owner.getByLabel("Scope").fill("Audit the dispatch process");
  await owner
    .getByRole("form", { name: "Submit proposal" })
    .getByRole("button", { name: "Submit proposal" })
    .click();
  await owner.getByRole("button", { name: /Approve proposal/ }).click();
  await owner.getByText("You approved this version. Waiting for the other party.").waitFor();
  ok(!(await owner.getByText("The agreed terms").count()), "one approval is not agreement");
  await guest.reload();
  await openWorkspaces(guest);
  await guest.getByRole("listitem").filter({ hasText: title }).click();
  await guest.getByRole("button", { name: /Approve proposal/ }).click();
  ok(
    await guest
      .getByText(
        "Both parties approved the same terms version here. This is not a signed contract.",
      )
      .isVisible(),
    "agreed only after both parties approve, with honest wording",
  );
  await owner.reload();
  await openWorkspaces(owner);
  await owner.getByRole("listitem").filter({ hasText: title }).click();
  await owner.getByRole("button", { name: "Start work" }).click();
  await owner.getByRole("button", { name: "Submit delivery" }).click();
  ok(
    !(await owner.getByRole("button", { name: /Accept delivery/ }).count()),
    "the provider cannot accept their own delivery, owner or not",
  );
  await guest.reload();
  await openWorkspaces(guest);
  await guest.getByRole("listitem").filter({ hasText: title }).click();
  await guest.getByRole("button", { name: /Accept delivery 1/ }).click();
  ok(
    await guest
      .getByText("The buyer recorded acceptance of a delivery here. No payment is recorded.")
      .isVisible(),
    "the buyer accepts, with honest wording",
  );
} catch (e) {
  fail++;
  console.log("  ✗ crashed:", e.message);
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
