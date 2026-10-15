import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PilotInterestForm, PILOT_PRIVACY_NOTICE } from "../PilotInterestForm";
import { PilotInterestExample } from "../PilotInterestExample";
import {
  PilotPersistenceBlockedError,
  buildPayload,
  emptyValues,
  runSubmit,
  safeUrl,
  validate,
  type PilotInterestValues,
} from "../pilot-interest";

const base = (over: Partial<PilotInterestValues> = {}): PilotInterestValues => ({
  ...emptyValues(),
  intent: "exploring",
  organization: " Acme ",
  role: "CEO",
  industry: "Software",
  city: "Austin",
  difficulty: "Hard to find trusted partners",
  ...over,
});
const buyerFilled = (v: PilotInterestValues) => ({
  ...v,
  buyer: { ...v.buyer, need: "Roofing", outcome: "New roof", timing: "Q1", location: "Austin" },
});
const providerFilled = (v: PilotInterestValues) => ({
  ...v,
  provider: {
    ...v.provider,
    categories: ["Roofing"],
    description: "We roof",
    suitableProjects: "Commercial",
    regions: "TX",
    availability: "Now",
    pricingBasis: "fixed" as const,
  },
});

describe("intent branching", () => {
  const html = (intent: PilotInterestValues["intent"]) =>
    renderToStaticMarkup(
      <PilotInterestForm onSubmit={async () => {}} initialValues={base({ intent })} />,
    );
  it("shows only the relevant section", () => {
    expect(html("exploring")).not.toContain("data-section");
    expect(html("buy")).toContain('data-section="buyer"');
    expect(html("buy")).not.toContain('data-section="provider"');
    expect(html("offer")).toContain('data-section="provider"');
    expect(html("offer")).not.toContain('data-section="buyer"');
    const both = html("both");
    expect(both).toContain('data-section="buyer"');
    expect(both).toContain('data-section="provider"');
  });
  it("prefills from profile, shows privacy notice, and optional opt-ins are unchecked", () => {
    const out = renderToStaticMarkup(
      <PilotInterestForm onSubmit={async () => {}} profile={{ organization: "Prefilled Co" }} />,
    );
    expect(out).toContain("Prefilled Co");
    expect(out).toContain("separate approval is required");
    expect(PILOT_PRIVACY_NOTICE).toContain("do not automatically create public listings");
    expect(out).not.toMatch(/id="optin\.[a-zA-Z]+"[^>]*checked/);
  });
  it("example integration renders", () => {
    expect(renderToStaticMarkup(<PilotInterestExample />)).toContain("Marketplace pilot interest");
  });
});

describe("validation", () => {
  it("requires core fields", () => {
    const e = validate(emptyValues());
    for (const k of ["intent", "organization", "role", "industry", "city", "difficulty"])
      expect(e[k]).toBeTruthy();
    expect(validate(base())).toEqual({});
  });
  it("requires buyer / provider fields only when active", () => {
    expect(validate(base({ intent: "buy" }))["buyer.need"]).toBeTruthy();
    expect(validate(base({ intent: "buy" }))["provider.description"]).toBeUndefined();
    expect(validate(base({ intent: "offer" }))["provider.categories"]).toBeTruthy();
    expect(validate(buyerFilled(base({ intent: "buy" })))).toEqual({});
    expect(validate(providerFilled(base({ intent: "offer" })))).toEqual({});
  });
  it("budget and price need currency; max three categories; length bounds", () => {
    const v = buyerFilled(base({ intent: "buy" }));
    v.buyer.budgetStatus = "amount";
    v.buyer.budgetAmount = "100";
    expect(validate(v)["buyer.budgetCurrency"]).toBeTruthy();
    const p = providerFilled(base({ intent: "offer" }));
    p.provider.startingPrice = "5";
    expect(validate(p)["provider.startingCurrency"]).toBeTruthy();
    p.provider.categories = ["a", "b", "c", "d"];
    expect(validate(p)["provider.categories"]).toBeTruthy();
    expect(validate(base({ difficulty: "x".repeat(1001) }))["difficulty"]).toBeTruthy();
    expect(validate(base({ responseCap: "99" }))["responseCap"]).toBeTruthy();
  });
  it("validates URLs safely", () => {
    expect(safeUrl("https://example.com/a")).toBeTruthy();
    for (const bad of [
      "javascript:alert(1)",
      "ftp://example.com",
      "https://" + "user" + ":" + "pw" + "@" + "example.com",
      "not a url",
      "https://localhost",
    ])
      expect(safeUrl(bad)).toBeNull();
    const p = providerFilled(base({ intent: "offer" }));
    p.provider.portfolioUrl = "javascript:alert(1)";
    expect(validate(p)["provider.portfolioUrl"]).toBeTruthy();
  });
});

describe("payload", () => {
  it("defaults all opt-ins to false and trims", () => {
    const out = buildPayload(base());
    expect(out.optIns).toEqual({
      pilotContact: false,
      feedbackInterview: false,
      realPilotProject: false,
    });
    expect(out.organization).toBe("Acme");
  });
  it("excludes inactive sections and empty optional fields", () => {
    const v = providerFilled(buyerFilled(base({ intent: "buy" })));
    const out = buildPayload(v);
    expect(out.buyer).toBeDefined();
    expect(out.provider).toBeUndefined();
    expect(out.preferences).toBeUndefined();
    expect(out.buyer).not.toHaveProperty("budgetAmount");
    expect(out.buyer).not.toHaveProperty("hardRequirements");
    expect(buildPayload(base({ ...v, intent: "exploring" }))).not.toHaveProperty("buyer");
    const dropped = {
      ...v,
      buyer: { ...v.buyer, budgetStatus: "prefer_not_to_say" as const, budgetAmount: "9" },
    };
    expect(buildPayload(dropped).buyer).not.toHaveProperty("budgetAmount");
  });
});

describe("submit guard", () => {
  it("blocks duplicate submits while pending", async () => {
    let release!: () => void;
    const fn = vi.fn(
      () =>
        new Promise<void>((r) => {
          release = r;
        }),
    );
    const guard = { busy: false };
    const payload = buildPayload(base());
    const first = runSubmit(guard, fn, payload);
    expect(await runSubmit(guard, fn, payload)).toEqual({ status: "ignored" });
    expect(fn).toHaveBeenCalledTimes(1);
    release();
    expect(await first).toEqual({ status: "success" });
    expect(guard.busy).toBe(false);
  });
  it("reports rejection as error without success and allows retry", async () => {
    const guard = { busy: false };
    const payload = buildPayload(base());
    const out = await runSubmit(
      guard,
      async () => {
        throw new Error("secret server detail");
      },
      payload,
    );
    expect(out.status).toBe("error");
    expect(JSON.stringify(out)).not.toContain("secret server detail");
    expect(guard.busy).toBe(false);
    const blocked = await runSubmit(
      guard,
      async () => {
        throw new PilotPersistenceBlockedError();
      },
      payload,
    );
    expect(blocked).toMatchObject({ status: "error" });
  });
});
