// Member marketplace pilot-interest form: types, validation, payload minimisation and submit guard.
// Pure logic (no I/O). Responses are research preferences only - never access grants or publication consent.

export const INTENTS = ["buy", "offer", "both", "exploring"] as const;
export type PilotIntent = (typeof INTENTS)[number];

export const BUDGET_STATUSES = ["amount", "not_determined", "prefer_not_to_say"] as const;
export type BudgetStatus = (typeof BUDGET_STATUSES)[number];

export const PRICING_BASES = [
  "fixed",
  "hourly",
  "daily",
  "monthly_retainer",
  "milestone",
  "custom",
] as const;
export type PricingBasis = (typeof PRICING_BASES)[number];

export const AUDIENCES = ["my_network", "verified_members", "approved_matches"] as const;
export type PilotAudience = (typeof AUDIENCES)[number];

export const MESSAGING_PREFS = ["intro_first", "direct_after_approval", "no_messages"] as const;
export type MessagingPreference = (typeof MESSAGING_PREFS)[number];

export const TRUST_FACTORS = [
  "verified_identity",
  "references",
  "portfolio",
  "mutual_connections",
  "prior_work",
] as const;
export type TrustFactor = (typeof TRUST_FACTORS)[number];

export const LIMITS = {
  short: 120,
  long: 1000,
  url: 300,
  maxCategories: 3,
  responseCapMax: 20,
} as const;

export interface BuyerSection {
  need: string;
  outcome: string;
  timing: string;
  location: string;
  remote: boolean;
  budgetStatus: BudgetStatus;
  budgetAmount: string;
  budgetCurrency: string;
  hardRequirements: string;
  preferences: string;
  sourcing: string;
}

export interface ProviderSection {
  categories: string[];
  description: string;
  suitableProjects: string;
  regions: string;
  remote: boolean;
  availability: string;
  pricingBasis: PricingBasis | "";
  startingPrice: string;
  startingCurrency: string;
  portfolioUrl: string;
  responseInfo: string;
}

/** Form state. Inactive conditional sections are kept (so Back/edit loses nothing) but never submitted. */
export interface PilotInterestValues {
  intent: PilotIntent | "";
  organization: string;
  role: string;
  industry: string;
  city: string;
  remote: boolean;
  difficulty: string;
  buyer: BuyerSection;
  provider: ProviderSection;
  responseCap: string;
  audience: PilotAudience | "";
  messagingPreference: MessagingPreference | "";
  trustFactors: TrustFactor[];
  optIns: { pilotContact: boolean; feedbackInterview: boolean; realPilotProject: boolean };
}

export interface PilotInterestPayload {
  intent: PilotIntent;
  organization: string;
  role: string;
  industry: string;
  location: { city: string; remote: boolean };
  difficulty: string;
  buyer?: Record<string, unknown>;
  provider?: Record<string, unknown>;
  preferences?: {
    responseCap?: number;
    audience?: PilotAudience;
    messagingPreference?: MessagingPreference;
    trustFactors?: TrustFactor[];
  };
  optIns: { pilotContact: boolean; feedbackInterview: boolean; realPilotProject: boolean };
}

export type PilotInterestSubmit = (payload: PilotInterestPayload) => Promise<void>;

export interface PilotProfilePrefill {
  organization?: string;
  role?: string;
  industry?: string;
  city?: string;
}

export const emptyValues = (prefill: PilotProfilePrefill = {}): PilotInterestValues => ({
  intent: "",
  organization: prefill.organization ?? "",
  role: prefill.role ?? "",
  industry: prefill.industry ?? "",
  city: prefill.city ?? "",
  remote: false,
  difficulty: "",
  buyer: {
    need: "",
    outcome: "",
    timing: "",
    location: "",
    remote: false,
    budgetStatus: "not_determined",
    budgetAmount: "",
    budgetCurrency: "",
    hardRequirements: "",
    preferences: "",
    sourcing: "",
  },
  provider: {
    categories: [""],
    description: "",
    suitableProjects: "",
    regions: "",
    remote: false,
    availability: "",
    pricingBasis: "",
    startingPrice: "",
    startingCurrency: "",
    portfolioUrl: "",
    responseInfo: "",
  },
  responseCap: "",
  audience: "",
  messagingPreference: "",
  trustFactors: [],
  optIns: { pilotContact: false, feedbackInterview: false, realPilotProject: false },
});

export const showsBuyer = (i: PilotIntent | "") => i === "buy" || i === "both";
export const showsProvider = (i: PilotIntent | "") => i === "offer" || i === "both";

export type PilotErrors = Record<string, string>;

/** Accepts only http(s) URLs without embedded credentials. Returns the normalised URL or null. */
export function safeUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s || s.length > LIMITS.url) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (u.username || u.password || !u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

const CURRENCY = /^[A-Za-z]{3}$/;
const MONEY = /^\d{1,12}(\.\d{1,2})?$/;

export function validate(v: PilotInterestValues): PilotErrors {
  const e: PilotErrors = {};
  const req = (key: string, val: string, label: string, max: number = LIMITS.short) => {
    const t = val.trim();
    if (!t) e[key] = `${label} is required.`;
    else if (t.length > max) e[key] = `${label} must be ${max} characters or fewer.`;
  };
  const opt = (key: string, val: string, label: string, max: number = LIMITS.long) => {
    if (val.trim().length > max) e[key] = `${label} must be ${max} characters or fewer.`;
  };
  if (!v.intent) e["intent"] = "Choose what brings you here.";
  req("organization", v.organization, "Organization");
  req("role", v.role, "Role");
  req("industry", v.industry, "Industry");
  req("city", v.city, "City or region");
  req("difficulty", v.difficulty, "Biggest difficulty finding partners", LIMITS.long);

  if (showsBuyer(v.intent)) {
    const b = v.buyer;
    req("buyer.need", b.need, "Concrete need", LIMITS.long);
    req("buyer.outcome", b.outcome, "Desired outcome", LIMITS.long);
    req("buyer.timing", b.timing, "Timing");
    req("buyer.location", b.location, "Location");
    opt("buyer.hardRequirements", b.hardRequirements, "Hard requirements");
    opt("buyer.preferences", b.preferences, "Preferences");
    opt("buyer.sourcing", b.sourcing, "Current sourcing");
    if (b.budgetStatus === "amount") {
      if (!MONEY.test(b.budgetAmount.trim()))
        e["buyer.budgetAmount"] = "Enter a budget amount (numbers only).";
      if (!CURRENCY.test(b.budgetCurrency.trim()))
        e["buyer.budgetCurrency"] = "Enter a 3-letter currency code, e.g. USD.";
    }
  }

  if (showsProvider(v.intent)) {
    const p = v.provider;
    const cats = p.categories.map((c) => c.trim()).filter(Boolean);
    if (cats.length === 0) e["provider.categories"] = "Add at least one service category.";
    else if (cats.length > LIMITS.maxCategories)
      e["provider.categories"] = `Up to ${LIMITS.maxCategories} categories.`;
    else if (cats.some((c) => c.length > LIMITS.short))
      e["provider.categories"] = `Each category must be ${LIMITS.short} characters or fewer.`;
    req("provider.description", p.description, "Service description", LIMITS.long);
    req("provider.suitableProjects", p.suitableProjects, "Suitable projects", LIMITS.long);
    req("provider.regions", p.regions, "Service regions");
    req("provider.availability", p.availability, "Availability");
    if (!p.pricingBasis) e["provider.pricingBasis"] = "Choose a pricing basis.";
    if (p.startingPrice.trim()) {
      if (!MONEY.test(p.startingPrice.trim()))
        e["provider.startingPrice"] = "Starting price must be a number.";
      if (!CURRENCY.test(p.startingCurrency.trim()))
        e["provider.startingCurrency"] = "Enter a 3-letter currency code, e.g. USD.";
    }
    if (p.portfolioUrl.trim() && !safeUrl(p.portfolioUrl))
      e["provider.portfolioUrl"] = "Enter a valid http(s) link without a username or password.";
    opt("provider.responseInfo", p.responseInfo, "Information needed to respond");
  }

  if (v.responseCap.trim()) {
    const n = Number(v.responseCap);
    if (!Number.isInteger(n) || n < 1 || n > LIMITS.responseCapMax)
      e["responseCap"] = `Response cap must be a whole number from 1 to ${LIMITS.responseCapMax}.`;
  }
  return e;
}

const t = (s: string) => s.trim();
const maybe = <T>(o: Record<string, unknown>, k: string, val: T | "" | undefined) => {
  if (val !== "" && val !== undefined) o[k] = val;
};

/** Builds the minimal payload: inactive conditional sections and empty optional fields are excluded. */
export function buildPayload(v: PilotInterestValues): PilotInterestPayload {
  if (!v.intent) throw new Error("intent required");
  const out: PilotInterestPayload = {
    intent: v.intent,
    organization: t(v.organization),
    role: t(v.role),
    industry: t(v.industry),
    location: { city: t(v.city), remote: v.remote },
    difficulty: t(v.difficulty),
    optIns: {
      pilotContact: v.optIns.pilotContact === true,
      feedbackInterview: v.optIns.feedbackInterview === true,
      realPilotProject: v.optIns.realPilotProject === true,
    },
  };
  if (showsBuyer(v.intent)) {
    const b = v.buyer;
    const o: Record<string, unknown> = {
      need: t(b.need),
      outcome: t(b.outcome),
      timing: t(b.timing),
      location: t(b.location),
      remote: b.remote,
      budgetStatus: b.budgetStatus,
    };
    if (b.budgetStatus === "amount") {
      o["budgetAmount"] = t(b.budgetAmount);
      o["budgetCurrency"] = t(b.budgetCurrency).toUpperCase();
    }
    maybe(o, "hardRequirements", t(b.hardRequirements));
    maybe(o, "preferences", t(b.preferences));
    maybe(o, "sourcing", t(b.sourcing));
    out.buyer = o;
  }
  if (showsProvider(v.intent)) {
    const p = v.provider;
    const o: Record<string, unknown> = {
      categories: p.categories.map(t).filter(Boolean),
      description: t(p.description),
      suitableProjects: t(p.suitableProjects),
      regions: t(p.regions),
      remote: p.remote,
      availability: t(p.availability),
      pricingBasis: p.pricingBasis,
    };
    if (t(p.startingPrice)) {
      o["startingPrice"] = t(p.startingPrice);
      o["startingCurrency"] = t(p.startingCurrency).toUpperCase();
    }
    const url = t(p.portfolioUrl) ? safeUrl(p.portfolioUrl) : null;
    maybe(o, "portfolioUrl", url ?? "");
    maybe(o, "responseInfo", t(p.responseInfo));
    out.provider = o;
  }
  const prefs: NonNullable<PilotInterestPayload["preferences"]> = {};
  if (t(v.responseCap)) prefs.responseCap = Number(v.responseCap);
  if (v.audience) prefs.audience = v.audience;
  if (v.messagingPreference) prefs.messagingPreference = v.messagingPreference;
  if (v.trustFactors.length) prefs.trustFactors = [...v.trustFactors];
  if (Object.keys(prefs).length) out.preferences = prefs;
  return out;
}

export type SubmitOutcome =
  { status: "success" } | { status: "error"; message: string } | { status: "ignored" };

/** Raised by integrations that have no authorised persistence yet. */
export class PilotPersistenceBlockedError extends Error {
  constructor() {
    super("Saving pilot interest is not available yet. Nothing was submitted.");
    this.name = "PilotPersistenceBlockedError";
  }
}

/**
 * Runs onSubmit once at a time. `guard.busy` blocks duplicate submits synchronously (before React re-renders).
 * Success is reported only if onSubmit resolves; the payload is never logged.
 */
export async function runSubmit(
  guard: { busy: boolean },
  onSubmit: PilotInterestSubmit,
  payload: PilotInterestPayload,
): Promise<SubmitOutcome> {
  if (guard.busy) return { status: "ignored" };
  guard.busy = true;
  try {
    await onSubmit(payload);
    return { status: "success" };
  } catch (err) {
    return {
      status: "error",
      message:
        err instanceof PilotPersistenceBlockedError
          ? err.message
          : "Submission failed. Your answers are kept; please try again.",
    };
  } finally {
    guard.busy = false;
  }
}
