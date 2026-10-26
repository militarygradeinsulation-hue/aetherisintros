# Trade Network first source slice: capacity, photo scope and payment evidence

This is a narrow technical companion to the master 27-item roadmap in
`docs/FIELD_NETWORK_EXPANSION_2026_10_25.md` (PR #349) and tracking epic #350.
It does not replace #211 (production database recovery) or #278 (live acceptance).
Source code is not a claim of production deployment, provider connectivity or saved shared records.

## 1. Overflow jobs and urgent asks

`src/features/network-value/job-routing.ts` adapts to the EXISTING
`networkValue({action:"capacity_post"})` contract. No new table, provider, RPC
or second network graph is added. Within Capacity Exchange, the member can choose:

- **Standard capacity/need:** existing behavior; normal start/expiry window.
- **Overflow job:** creates a needed post with a summary for verified
  nearby capacity. It does not transfer customer identity, create a CRM lead,
  assign a worker or trigger a financial obligation.
- **Urgent capacity:** creates a needed post expiring exactly two hours after
  submission. It does not send notifications to responders or promise an SLA.

Posting overflow or urgency requires an explicit privacy-review checkbox.
A conservative detector also rejects emails, common US phone numbers and
street address strings. This detector is a precaution, NOT reliable redaction;
posters must remove all identifying information themselves and obtain the
customer's specific permission BEFORE any named contact transfer.
Existing private Capacity Letters are used for receiving offers and
counterparty-accepted terms. Any actual downstream customer handoff
requires new consented CRM-side code and member authorization.

User feedback after a successful post switches to the posted kind.
No success is claimed until the existing server function confirms the write.
Where migration 0096 is missing, the existing failure state remains visible.

## 2. Photo to Estimate

`src/features/photo-estimate/PhotoEstimatePage.tsx` is accessible from the
member Work tools, both shell navigation surfaces and explicit Butler navigation.
The member chooses up to three images and describes the scope. The browser
resizes to small JPEG and removes camera EXIF metadata. Upload consent is
independent and unchecked by default. Images stay local until the member
clicks **Create unsent scope draft**.

`src/lib/photoEstimate.functions.ts` authenticates the member, verifies the
profile belongs to the session, bounds body lengths and image count, applies
a best-effort local rate check, and calls the configured OpenAI Responses API
with `OPENAI_API_KEY` (not the Lovable editor or AI gateway). Provider errors
must not clear the member's draft. Response is an editable, unsent **unpriced**
scope with visible observations, material categories, risks and measurement
questions. No pixel-derived quantities, hidden damage claims, labor/cost
certification or automatic customer dispatch. Nothing is stored server-side
by this feature. Provider retention remains subject to provider controls.
Instance-local throttles are not sufficient as global production cost controls.

To release broadly: confirm API key/model, configure durable account-scoped
quota/abuse limits, run consent and data-deletion review, add opt-in private
project storage if members need cross-device drafts, verify on iPhone and
Android, then perform a sample estimator approval on an actual job.

## 3. Payment Reputation core (not published)

`src/features/network-value/payment-reputation.ts` contains a pure,
non-publishing calculation; there is NO runtime payment rating page.
To calculate a cohort it requires >=5 uniquely identified confirmed paid
invoices from >=3 distinct verified payee businesses within 365 days.
It excludes unverified self-reporting, disputes, reversals, consent
withdrawal, impossible or future dates, and duplicate IDs. It emits only
rounded average calendar days to pay, a band for how many invoices were
included and the as-of month. No invoice-level disclosures.

Before publishing any payment claim: verified legal business identities,
source-of-truth paid receipts, independent corroboration, dispute/appeal
and correction lifecycle, permissioned evidence access, reviewer/audit
history, anti-Sybil and cohort-differencing review, multi-account RLS tests.
Do not treat the aggregate as a credit score, factor underwriting or debt
collection justification.

## Release and QA boundaries

1. Existing production Supabase target is not accessible through the connected
   Supabase management account. Do NOT modify a different project, blindly
   replay migrations or change migration ledgers.
2. Existing Lovable management access exposes a separate *Remix of Ask Intros*,
   not the original production project; do NOT deploy the remix as the live app.
3. Require production build, TypeScript, unit tests and Bridge visual parity,
   then 320/390px and desktop real-browser checks in both appearances.
4. Run `npx vitest run src/features/network-value/job-routing.test.ts src/features/network-value/payment-reputation.test.ts`,
   `npx tsc --noEmit -p .`, `npm run build` and established network tests.
5. Follow up with authorized member A/B/outsider/revoked API tests for
   Capacity Exchange plus actual AI provider and customer consent acceptance.

Broader design and regulated-product dependencies belong in the master
roadmap and GitHub epic #350, not in this source-slice record.
