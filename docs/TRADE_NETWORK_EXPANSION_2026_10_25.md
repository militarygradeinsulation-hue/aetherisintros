# Trade Network and Aetheris Field Intelligence expansion
Reviewed: 2026-10-25 · implementation: `feature/trade-field-workflows-20261025`

## Release truth and dependencies

Ask Intros has member authentication, verification, CRM, requests, Capacity Exchange, private Letters,
Referral Settlement, HR, evidence/track record, Butler, meetings/voice and a server-only AI path.
**Code in main is not proof of a deployed production workflow.** Production backend reconciliation
is still tracked in #211 and #278. The connected Supabase management account does not manage the
original project ID `uactagkdvafjombseswx`. Do not apply or replay SQL against unrelated projects,
rewrite historical migration ledgers, or publish the accessible “Remix of Ask Intros” as the original.

The baseline for every expansion is: approved verified member identity, tenant-isolated persistent
state, accurate receipts for writes, consent/provenance, participant-specific read permissions,
reversible decisions where appropriate, abuse monitoring, and real multi-account release checks.
Feature names must never imply payments, underwriting, emergency dispatch, insurance coverage,
legal compliance, or autonomous execution that has not been verified in production.

## First source increment in this branch

1. **Overflow routing preview through existing Capacity Exchange.** The workflow posts only a
   non-identifying *needed capacity* opportunity. Nearby verified members can request the work;
   the existing private Letter handles bilateral negotiated terms. A potential downstream transfer
   of customer contact details happens only after that customer agrees. There is no one-tap customer
   transfer, automatic settlement, or autonomous scheduling yet.
2. **Two-hour urgent capacity posts.** Existing needed posts get a two-hour server-validated
   expiry window. They remain location-discoverable to verified members; opt-in responder lists,
   targeted push/SMS, guaranteed acceptance and service-level timers are **not** yet connected.
3. **Photo-to-estimate scope preview.** Explicitly authorized member photos are downsized in
   the browser, camera metadata stripped and sent on command to the existing server-only
   OpenAI configuration, not Lovable's editor gateway. Output is an editable, unsent, unpriced
   scope and measurement checklist. No image/video persistence, client quote, dimension
   measurement, structural guarantee or automatic price is represented.
4. **Payment reputation calculation boundary.** Pure, tested domain logic suppresses output
   until there are at least five confirmed paid invoices from three separate verified payee
   businesses, with explicit aggregation consent. Self-reports, disputed invoices, reversals,
   future/unpaid records and old records are excluded. It exposes only aggregate days-to-pay,
   a rounded sample band and month, not individual reports. This **does not** ingest, verify,
   store or publish production payment records. Business identity, dispute/appeal lifecycle,
   anti-Sybil controls and partner/processor receipts are required before public deployment.

These are incremental source features, not an “all 27 built” claim. The first two extend existing
Capacity; the third uses the existing server API key; the fourth is a non-publishing core.

## Portfolio and build order

| Feature | Reuse / dependency | Release condition |
| --- | --- | --- |
| Payment reputation | Verified businesses, paid-invoice evidence, existing settlement events | Independent verified receipts; subject notice/dispute/correction; suppressed published cohorts; anti-Sybil controls |
| Price check | Benchmark Pools privacy release engine | Opt-in sourced purchases, normalized unit/trade/region/currency/period, minimum cohort, confidence bands |
| Coverage pact | Capacity, Letters, bilateral term acceptance | Explicit reciprocal response obligations, expiration, license/insurance checks, named substitutions and three-way consent where necessary |
| Overflow routing | Capacity, referrals, CRM, Letters | Consent-gated customer transfer; accepted provider; attribution; optional settlement only with separately approved terms |
| Urgent asks | Capacity, notifications, opt-in availability | Verified opted-in responders only, short TTL, alert delivery receipts, clock starts at true dispatch time |
| Missed-call rescue | Telephony provider, SMS, member CRM | Number ownership + forward/webhook verification, signed webhooks, caller consent/opt-out, spam controls, documented delivery and CRM idempotency |
| Demand pulse | Consented capacity/asks/verified jobs | Coarsened region/trade/week, minimum contributing firms, no reconstruction through drill-down, lag and data coverage shown |
| Apprentice rotation | People & HR, credential and insurance | Employer/training agreements, lawful supervision, hours confirmation, labor classification and safety requirements |
| Shadow days | Events, Track Record, consent | Confirmed attendance both sides, host review, private boundaries and no automatic credential inflation |
| Bilingual Butler | Member messaging, Butler, opt-in preferences | Source and translation both retained; notices and consent unaltered; member approval for consequential sends |
| Secret-shopper agent | Golden Report and evidence ledger | Recorded business owner consent, controlled test endpoints, lawful disclosure/recording, calling cost caps, verified response metrics |
| Cash weather | CRM receivables, consented timing & demand signals | Actual member-owned amounts, explainable assumptions, forecasts with uncertainty, avoid confident claims from sparse external data |
| Photo-to-estimate | OpenAI vision, Business Tools and proposals | Trade scope QA; explicit source measurements/prices, upload security, deletion controls, estimator approval before issuance |
| Live call copilot | Meeting capture, consent and CRM context | All-party recording/transcription consent; real-time prompt latency, access rules, no automatic price promises |
| Voice-line Butler | Butler commands, voice auth and confirmations | Verified inbound caller, anti-spoof checks, live action review, human confirmation for posts and financial actions |
| Prove-it credentials | Verification proof storage, member passport | Issuer attestation, expiry/revocation, signed public yes/no claims, documents never leave private scope |
| Milestone escrow | Deal rooms, photo evidence, third-party escrow | Licensed escrow/payment partner; disputes, held-funds terms, KYC/AML and no custody by Intros |
| Construction signal feed | Specter/public data, geography | Per-county authorized permits/registries, dedupe/provenance, no invented contractor need, user-interest controls |
| Simulated buyer panel | Opted-in win/loss debriefs, AI | Synthetic directional feedback labelled non-predictive; no personal data leaked from debrief corpus |
| Invoice advance | Payment reputation and factoring partner | Lending/factoring partner bears credit and compliance obligations, explicit member application and no balance sheet exposure |
| Lien and pay-application agent | Contract dates, state rules, verified photo progress | Jurisdiction/time-zone-aware legal rules checked by counsel, user approval before any notices; no fake filing/guaranteed deadline |
| Group insurance | Verified businesses, safety and outcome evidence | Licensed broker/carrier, regulated eligibility/rating and user-controlled sharing |
| Intros Prime | Verified capability, capacity, signed contracts | Separate contracting entity, bonding, insurance, labor/subcontract controls and customer/worker protections |
| Storm mobilization | Capacity, credentials, urgent needs | Incident activation, verification recency, lawful solicitation, rate visibility, resource/safety dispatch rules |
| Systems-first acquisitions | Member-owned company data, separate Aetheris entity | Independent opt-in, firewall from private Intros data, disclosed conflicts and valuation/capital governance |
| Bid pricing model | Thousands of consented, quality-checked bid outcomes | Calibrated uncertainty by trade/region/job, leakage tests, legal review and bias/market impact assessment |
| Member data cooperative | Explicit enterprise/member governance | Separate informed opt-in, withdrawal economics, disclosure-risk testing, published data sale terms and member revenue allocation |

## Sprint priorities

**Gate 0 — Production trust first:** reconcile migration journals and real application schema, obtain backup/restore
proof, test approved member A/B, unrelated member, blocked/revoked/anonymous/admin. Confirm source deployment.
Never quietly activate advanced workflows when an RPC/table is missing.

**Gate 1 — Revenue movement without holding money:** promote Overflow/urgent after live exchange acceptance,
then implement member-facing consented customer handoff, dedicated outcomes and matching in the existing CRM.
Build payment evidence ingestion, subject dispute and minimum-sample release next. Separately connect a verified
telephony partner for missed-call rescue and prove both inbound and outbound delivery.

**Gate 2 — Measured operations:** secret-shopper opt-in tests and photo scope reviewer; then verified regional
price checks, demand pulse and cash forecasts, all with confidence/data-density labels.

**Gate 3 — Skilled workforce and hands-free execution:** coverage pacts, apprenticeship/shadow days,
bilingual messages, live call copilot and phone-number Butler after voice/action consent acceptance.

**Gate 4 — Regulated products:** legal notice integrations, licensed factoring, brokered insurance, escrow,
prime contracting, cooperative data sales and acquisitions each need partner/licensing approval before
financial execution. Do not assume a payment processor alone makes holding funds lawful.

## Permanent controls

- No customer contact record or precise worksite address in a discoverable capacity post.
- No customer referral without the customer's specific permission.
- No verified payment statistics from unverified self-attestation. Subjects may review and challenge.
- Do not publish aggregates when small-cell or differencing risk exposes businesses.
- Do not turn member data into lender, advertiser or acquirer intelligence without specific revocable opt-in.
- No automatic calls, SMS, voice recording, legal filing, settlement or financial decision without
  consent, provider configuration, relevant compliance review and server-confirmed receipts.
- No fake completed actions, guaranteed lead response, guaranteed financial outcome, verified
  license, insurance coverage or membership eligibility when evidence is absent.
- Any external AI or call service must be server-keyed, bounded, member-consented and rate-limited
  with costs and failure states visible. Temporary instance-local throttles are not global quotas.
- Keep every new feature behind its verified backend activation gate; UI and local tests alone are insufficient.

## Verification commands

- `npx tsc --noEmit -p .`
- `npx vitest run src/features/network-value/job-routing.test.ts src/features/network-value/payment-reputation.test.ts`
- `npm run build`
- Existing network systems suite: `node scripts/migration-checks/run.mjs`
- Visual checks: phone widths 320/390 px, desktop 1280 px, light/dark themes, and both views
- Production gate: matching live migration ledger, RLS, verified rate-limits, member A/B separation,
  auth-revocation and real provider acceptance.

This roadmap complements, not supersedes, #211 and #278 or the existing network systems release.
