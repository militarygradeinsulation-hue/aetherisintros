import { useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AUDIENCES,
  BUDGET_STATUSES,
  INTENTS,
  LIMITS,
  MESSAGING_PREFS,
  PRICING_BASES,
  TRUST_FACTORS,
  buildPayload,
  emptyValues,
  runSubmit,
  showsBuyer,
  showsProvider,
  validate,
  type PilotErrors,
  type PilotInterestSubmit,
  type PilotInterestValues,
  type PilotProfilePrefill,
} from "./pilot-interest";

const human = (s: string) => s.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
const INTENT_LABEL: Record<string, string> = {
  buy: "I want to find providers",
  offer: "I offer services",
  both: "Both",
  exploring: "Just exploring",
};

export const PILOT_PRIVACY_NOTICE =
  "Responses are used for pilot planning and product feedback. They do not automatically create public listings, enroll contacts, authorize provider outreach, or publish requests; separate approval is required. Please do not share phone numbers, contact lists, banking details, confidential documents or exact sensitive addresses.";

export interface PilotInterestFormProps {
  /** Async persistence contract. Resolve only after the response is confirmed saved; reject otherwise. */
  onSubmit: PilotInterestSubmit;
  /** Already-authorized profile values used to prefill organization details. */
  profile?: PilotProfilePrefill;
  /** Test/demo seam: initial form state. */
  initialValues?: PilotInterestValues;
  /** Test/demo seam: start on the review step. */
  initialStep?: "edit" | "review";
}

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function PilotInterestForm({
  onSubmit,
  profile,
  initialValues,
  initialStep = "edit",
}: PilotInterestFormProps) {
  const [values, setValues] = useState<PilotInterestValues>(
    () => initialValues ?? emptyValues(profile),
  );
  const [step, setStep] = useState<"edit" | "review" | "done">(initialStep);
  const [errors, setErrors] = useState<PilotErrors>({});
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const guard = useRef({ busy: false });

  const set = <K extends keyof PilotInterestValues>(k: K, val: PilotInterestValues[K]) =>
    setValues((v) => ({ ...v, [k]: val }));
  const setBuyer = (patch: Partial<PilotInterestValues["buyer"]>) =>
    setValues((v) => ({ ...v, buyer: { ...v.buyer, ...patch } }));
  const setProvider = (patch: Partial<PilotInterestValues["provider"]>) =>
    setValues((v) => ({ ...v, provider: { ...v.provider, ...patch } }));

  const txt = (
    id: string,
    label: string,
    get: string,
    on: (s: string) => void,
    o: { long?: boolean; hint?: string; type?: string } = {},
  ) => {
    const err = errors[id];
    const common = {
      id,
      value: get,
      onChange: (e: { target: { value: string } }) => on(e.target.value),
      maxLength: o.long ? LIMITS.long : LIMITS.short,
      "aria-invalid": !!err,
      "aria-describedby": err ? `${id}-error` : undefined,
      disabled: pending,
    };
    return (
      <Field id={id} label={label} error={err} hint={o.hint}>
        {o.long ? (
          <Textarea {...common} rows={3} />
        ) : (
          <Input {...common} type={o.type ?? "text"} autoComplete="off" />
        )}
      </Field>
    );
  };
  const check = (id: string, label: string, checked: boolean, on: (b: boolean) => void) => (
    <label htmlFor={id} className="flex items-start gap-2 text-sm">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={pending}
        onChange={(e) => on(e.target.checked)}
        className="mt-1"
      />
      <span>{label}</span>
    </label>
  );

  const goReview = () => {
    const e = validate(values);
    setErrors(e);
    if (Object.keys(e).length === 0) {
      setSubmitError("");
      setStep("review");
    }
  };

  const submit = async () => {
    const e = validate(values);
    if (Object.keys(e).length) {
      setErrors(e);
      setStep("edit");
      return;
    }
    setPending(true);
    setSubmitError("");
    const outcome = await runSubmit(guard.current, onSubmit, buildPayload(values));
    if (outcome.status === "ignored") return;
    setPending(false);
    if (outcome.status === "success") {
      setValues(emptyValues(profile));
      setErrors({});
      setStep("done");
    } else setSubmitError(outcome.message);
  };

  if (step === "done") {
    return (
      <div role="status" className="space-y-3 rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Thanks — your response was saved</h2>
        <p className="text-sm text-muted-foreground">
          It is used for pilot planning only. Nothing was published and no one was contacted.
        </p>
        <Button variant="outline" onClick={() => setStep("edit")}>
          Submit another response
        </Button>
      </div>
    );
  }

  if (step === "review") {
    const payload = buildPayload(values);
    return (
      <section aria-labelledby="pilot-review" className="space-y-4">
        <h2 id="pilot-review" className="text-lg font-semibold">
          Review your response
        </h2>
        <p className="text-sm text-muted-foreground">{PILOT_PRIVACY_NOTICE}</p>
        <dl className="space-y-1 text-sm">
          <div>
            <dt className="inline font-medium">Intent: </dt>
            <dd className="inline">{INTENT_LABEL[payload.intent]}</dd>
          </div>
          <div>
            <dt className="inline font-medium">Organization: </dt>
            <dd className="inline">
              {payload.organization} · {payload.role} · {payload.industry}
            </dd>
          </div>
          <div>
            <dt className="inline font-medium">Location: </dt>
            <dd className="inline">
              {payload.location.city}
              {payload.location.remote ? " (remote OK)" : ""}
            </dd>
          </div>
          {payload.buyer && (
            <div>
              <dt className="inline font-medium">Looking for: </dt>
              <dd className="inline">{String(payload.buyer["need"])}</dd>
            </div>
          )}
          {payload.provider && (
            <div>
              <dt className="inline font-medium">Offering: </dt>
              <dd className="inline">{(payload.provider["categories"] as string[]).join(", ")}</dd>
            </div>
          )}
          <div>
            <dt className="inline font-medium">Research opt-ins: </dt>
            <dd className="inline">
              {[
                payload.optIns.pilotContact && "pilot contact",
                payload.optIns.feedbackInterview && "feedback interview",
                payload.optIns.realPilotProject && "real pilot project",
              ]
                .filter(Boolean)
                .join(", ") || "none"}
            </dd>
          </div>
        </dl>
        {submitError && (
          <p role="alert" className="text-sm text-destructive">
            {submitError}
          </p>
        )}
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStep("edit")} disabled={pending}>
            Back
          </Button>
          <Button onClick={submit} disabled={pending} aria-busy={pending}>
            {pending ? "Submitting…" : "Submit"}
          </Button>
        </div>
      </section>
    );
  }

  const b = values.buyer;
  const p = values.provider;
  return (
    <form
      noValidate
      onSubmit={(ev) => {
        ev.preventDefault();
        goReview();
      }}
      aria-labelledby="pilot-title"
      className="space-y-6"
    >
      <h2 id="pilot-title" className="text-lg font-semibold">
        Marketplace pilot interest
      </h2>
      <p className="text-sm text-muted-foreground">{PILOT_PRIVACY_NOTICE}</p>

      <fieldset
        className="space-y-2"
        aria-describedby={errors["intent"] ? "intent-error" : undefined}
      >
        <legend className="text-sm font-medium">What brings you here?</legend>
        {INTENTS.map((i) => (
          <label key={i} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="intent"
              value={i}
              checked={values.intent === i}
              disabled={pending}
              onChange={() => set("intent", i)}
            />
            {INTENT_LABEL[i]}
          </label>
        ))}
        {errors["intent"] && (
          <p id="intent-error" role="alert" className="text-xs text-destructive">
            {errors["intent"]}
          </p>
        )}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">About you</legend>
        {txt("organization", "Organization", values.organization, (s) => set("organization", s))}
        {txt("role", "Role", values.role, (s) => set("role", s))}
        {txt("industry", "Industry", values.industry, (s) => set("industry", s))}
        {txt("city", "City or region", values.city, (s) => set("city", s), {
          hint: "General area only — no street addresses.",
        })}
        {check("remote", "Open to remote work", values.remote, (x) => set("remote", x))}
        {txt(
          "difficulty",
          "Biggest difficulty finding partners",
          values.difficulty,
          (s) => set("difficulty", s),
          { long: true },
        )}
      </fieldset>

      {showsBuyer(values.intent) && (
        <fieldset className="space-y-3" data-section="buyer">
          <legend className="text-sm font-medium">What you need</legend>
          {txt("buyer.need", "Concrete need", b.need, (s) => setBuyer({ need: s }), { long: true })}
          {txt("buyer.outcome", "Desired outcome", b.outcome, (s) => setBuyer({ outcome: s }), {
            long: true,
          })}
          {txt("buyer.timing", "Timing", b.timing, (s) => setBuyer({ timing: s }))}
          {txt("buyer.location", "Where the work happens", b.location, (s) =>
            setBuyer({ location: s }),
          )}
          {check("buyer.remote", "Remote is fine", b.remote, (x) => setBuyer({ remote: x }))}
          <Field id="buyer.budgetStatus" label="Budget">
            <select
              id="buyer.budgetStatus"
              value={b.budgetStatus}
              disabled={pending}
              onChange={(e) => setBuyer({ budgetStatus: e.target.value as typeof b.budgetStatus })}
              className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
            >
              {BUDGET_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s === "amount" ? "I have an amount" : human(s)}
                </option>
              ))}
            </select>
          </Field>
          {b.budgetStatus === "amount" && (
            <>
              {txt("buyer.budgetAmount", "Budget amount", b.budgetAmount, (s) =>
                setBuyer({ budgetAmount: s }),
              )}
              {txt("buyer.budgetCurrency", "Budget currency (e.g. USD)", b.budgetCurrency, (s) =>
                setBuyer({ budgetCurrency: s }),
              )}
            </>
          )}
          {txt(
            "buyer.hardRequirements",
            "Hard requirements (must have)",
            b.hardRequirements,
            (s) => setBuyer({ hardRequirements: s }),
            { long: true },
          )}
          {txt(
            "buyer.preferences",
            "Preferences (nice to have)",
            b.preferences,
            (s) => setBuyer({ preferences: s }),
            { long: true },
          )}
          {txt(
            "buyer.sourcing",
            "How you source this today / recent experience",
            b.sourcing,
            (s) => setBuyer({ sourcing: s }),
            { long: true },
          )}
        </fieldset>
      )}

      {showsProvider(values.intent) && (
        <fieldset className="space-y-3" data-section="provider">
          <legend className="text-sm font-medium">What you offer</legend>
          {p.categories.map((c, i) => (
            <Field
              key={i}
              id={`provider.category.${i}`}
              label={`Service category ${i + 1}`}
              error={i === 0 ? errors["provider.categories"] : undefined}
            >
              <Input
                id={`provider.category.${i}`}
                value={c}
                maxLength={LIMITS.short}
                disabled={pending}
                autoComplete="off"
                onChange={(e) =>
                  setProvider({
                    categories: p.categories.map((x, j) => (j === i ? e.target.value : x)),
                  })
                }
              />
            </Field>
          ))}
          {p.categories.length < LIMITS.maxCategories && (
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setProvider({ categories: [...p.categories, ""] })}
            >
              Add category
            </Button>
          )}
          {txt(
            "provider.description",
            "Service description",
            p.description,
            (s) => setProvider({ description: s }),
            { long: true },
          )}
          {txt(
            "provider.suitableProjects",
            "Suitable projects",
            p.suitableProjects,
            (s) => setProvider({ suitableProjects: s }),
            { long: true },
          )}
          {txt("provider.regions", "Service regions", p.regions, (s) =>
            setProvider({ regions: s }),
          )}
          {check("provider.remote", "Remote delivery available", p.remote, (x) =>
            setProvider({ remote: x }),
          )}
          {txt("provider.availability", "Availability", p.availability, (s) =>
            setProvider({ availability: s }),
          )}
          <Field
            id="provider.pricingBasis"
            label="Pricing basis"
            error={errors["provider.pricingBasis"]}
          >
            <select
              id="provider.pricingBasis"
              value={p.pricingBasis}
              disabled={pending}
              onChange={(e) =>
                setProvider({ pricingBasis: e.target.value as typeof p.pricingBasis })
              }
              className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
            >
              <option value="">Select…</option>
              {PRICING_BASES.map((s) => (
                <option key={s} value={s}>
                  {human(s)}
                </option>
              ))}
            </select>
          </Field>
          {txt("provider.startingPrice", "Starting price (optional)", p.startingPrice, (s) =>
            setProvider({ startingPrice: s }),
          )}
          {p.startingPrice.trim() &&
            txt(
              "provider.startingCurrency",
              "Starting price currency (e.g. USD)",
              p.startingCurrency,
              (s) => setProvider({ startingCurrency: s }),
            )}
          {txt(
            "provider.portfolioUrl",
            "Portfolio link (optional)",
            p.portfolioUrl,
            (s) => setProvider({ portfolioUrl: s }),
            { type: "url" },
          )}
          {txt(
            "provider.responseInfo",
            "Information you need to respond to a request",
            p.responseInfo,
            (s) => setProvider({ responseInfo: s }),
            { long: true },
          )}
        </fieldset>
      )}

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Preferences (optional)</legend>
        {txt("responseCap", "Preferred maximum responses per request", values.responseCap, (s) =>
          set("responseCap", s),
        )}
        <Field id="audience" label="Audience">
          <select
            id="audience"
            value={values.audience}
            disabled={pending}
            onChange={(e) => set("audience", e.target.value as typeof values.audience)}
            className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
          >
            <option value="">No preference</option>
            {AUDIENCES.map((s) => (
              <option key={s} value={s}>
                {human(s)}
              </option>
            ))}
          </select>
        </Field>
        <Field id="messagingPreference" label="Messaging permission preference">
          <select
            id="messagingPreference"
            value={values.messagingPreference}
            disabled={pending}
            onChange={(e) =>
              set("messagingPreference", e.target.value as typeof values.messagingPreference)
            }
            className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
          >
            <option value="">No preference</option>
            {MESSAGING_PREFS.map((s) => (
              <option key={s} value={s}>
                {human(s)}
              </option>
            ))}
          </select>
        </Field>
        <fieldset className="space-y-1">
          <legend className="text-sm">Trust factors that matter to you</legend>
          {TRUST_FACTORS.map((f) =>
            check(`trust.${f}`, human(f), values.trustFactors.includes(f), (x) =>
              set(
                "trustFactors",
                x ? [...values.trustFactors, f] : values.trustFactors.filter((y) => y !== f),
              ),
            ),
          )}
        </fieldset>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Research preferences (all optional)</legend>
        <p className="text-xs text-muted-foreground">
          These are research preferences only. They do not grant access to anything and are not
          consent to publish.
        </p>
        {check(
          "optin.pilotContact",
          "You may contact me about the pilot",
          values.optIns.pilotContact,
          (x) => set("optIns", { ...values.optIns, pilotContact: x }),
        )}
        {check(
          "optin.feedbackInterview",
          "You may contact me for a feedback interview",
          values.optIns.feedbackInterview,
          (x) => set("optIns", { ...values.optIns, feedbackInterview: x }),
        )}
        {check(
          "optin.realPilotProject",
          "I am willing to discuss a real pilot project",
          values.optIns.realPilotProject,
          (x) => set("optIns", { ...values.optIns, realPilotProject: x }),
        )}
      </fieldset>

      {Object.keys(errors).length > 0 && (
        <p role="alert" className="text-sm text-destructive">
          Please fix the highlighted fields.
        </p>
      )}
      <Button type="submit" disabled={pending}>
        Review
      </Button>
    </form>
  );
}
