# Ask Intros: contractor network and field operations expansion

Prepared October 25, 2026. This is an implementation sequence, not a representation that the services are live. Follow `docs/MIGRATIONS.md` and `docs/CONNECTION_MEMORY_SECURITY_AUDIT_2026_10_25.md`: no production table changes before full ledger recovery, restorable backup, RLS review and two-account published API checks.

## Product architecture

Do **not** add 27 new top-level menus. Reuse existing capability hosts, canonical member identity, consent, CRM, Capacity Exchange, Referral Settlement, meetings/audio, Business Tools, Butler, and private workspace state. Group features under:

- **Work / Field Operations:** Payment reliability, Price Check, Coverage Pact, Overflow, Urgent Asks, Missed Call Rescue, Lien & Pay Applications, photo estimates, apprentice rotation.
- **Network / Opportunities:** Customer referrals, storm capacity, shadow days, contractor verification, construction signals.
- **Intelligence / Aetheris:** Demand Pulse, Secret Shopper, Cash Weather, Bid Pricing, Buyer Panel, anonymized market indices.
- **Butler:** English/Spanish assisted messages, consented call assistance and explicit action review, later a telephone entry point.

All data is either owned by the member, explicitly counterpart-authorized, or thresholded and anonymized. No synthetic numbers or unverifiable claims in real-member views.

## Release order and definition of done

### Gate 0: restore production readiness first

Issue #211 / #278: authoritative management access to the **real** production Supabase project, verified restore point, actual catalog/ledger reconciliation (missing table and routine families), reviewed forward-only migrations, two-member and revoked-user API acceptance, real mobile QA, and passing GitHub checks. **No regulated, financial, or reputation workflows ship publicly before Gate 0.**

### Slice 1: useful private contractor documents (implemented as drafting only)

Two Business Tools reuse signed-in profile validation, existing `business_tool_drafts`, reviewed AI refinement, saved-version conflicts, explicit exports and fail-closed errors:

- **Lien & Notice Prep:** project context, evidence packet, draft notice, independent jurisdiction verification worksheet, authorized-review checklist. Never compute or claim a statutory date, entitlement, filing, notice completion or legal advice. No automatic sending.
- **Pay Application Draft:** project/period, contract, earned-to-date, withheld retainage and prior certified amounts, with provisional USD arithmetic and conflict refusal. Attach evidence and get the payer's required form and approval separately. No invoice, payment, certification, lien waiver or escrow action occurs.

Next extension: manual deadline entry with authoritative source URL, source timestamp, review status, owner, reminder acknowledgment and revocation. Only a qualified, verified rule provider can populate legal deadlines automatically after jurisdiction-specific review.

### Slice 2: payment and demand reliability (first shared production features)

1. **Payment Reputation:** store *paid-only* reports with immutable reporter, payer, dates and evidence provenance. Require adequate proof of payment, restrict raw invoice data to participants and authorized reviewers, one report per verified transaction, and allow payer dispute/correction. Hold disputed rows out of scoring. Show aggregate days-to-pay bands and sample count only after a conservative distinct-reporter and volume threshold, with freshness limits. Publish no individually traceable reports; do not infer creditworthiness or automatically underwrite loans.
2. **Overflow Routing:** this is routing an *end customer job*, not a member introduction. From a canonical CRM lead, require customer permission before sharing name/contact. Display anonymized trade/region/scope to qualified recipients; give a timed accept/decline window; hand over private details only when approved. Separate referral-fee acceptance and actual settlement from routing, and record a completed outcome. Prevent duplicate paid claims.
3. **Missed Call Rescue:** connect an opted-in member-owned phone number and a provider-signed inbound webhook to a deduplication ledger. Detect unanswered new leads, check automated-text consent/opt-outs and local restrictions, send at most one approved acknowledgment per defined window, collect only requested details and write a confirmed owned CRM record. Provide visible provider failure and a manual fallback. No cold messaging, call recording or unverified one-minute SLA.
4. **Urgent Asks:** responders explicitly opt into trade/region/availability, a two-hour expiration is enforced server-side, members can mute urgent notifications and accept manually; don't bypass introduction consent.
5. **Price Check:** member-opt-in invoices are normalized by units, exact material/service spec, geography, currency and date; guard against supplier collusion, small samples, outliers and reidentification. Show medians/ranges with count and freshness, never a fabricated 'fair price'.
6. **Demand Pulse:** derive coarse, lagged market signals only from consented, deduplicated requests, with minimum unique companies per cell; suppress sparsely populated counties/trades.

### Slice 3: measured Aetheris operations

7. **Secret Shopper:** approved tests only on member-owned phone/form/email channels, explicit frequency, scope, disclosable synthetic inquiry identity and call-recording notices as required. Record delivery attempts, timestamps and provider receipts; do not report an unanswered test as lost revenue without validated baselines.
8. **Photo-to-Estimate:** private site image upload, project scope and a vision-generated *draft* with source photo anchors, confidence, exclusions, labor and materials assumptions. No measurement or hidden-defect guarantees. Only member-approved amounts may become bids.
9. **Voice-Line Butler:** hosted business phone entry with signed caller-to-account verification, no access based on caller ID alone, transcript review, explicit confirmation for all writes, safe driving UX, opt-out and retention controls. Reuse existing Butler actions rather than a new shadow agent.
10. **Live Call Copilot:** visible multi-party consent and revocation for transcription, prompts based only on permitted CRM data, and post-call drafts that require review. Do not surreptitiously listen.
11. **Cash Weather:** use a member's authorized receivables, known commitments and coarse network indices, not another member's confidential invoice data. Publish forecast ranges, assumptions and missing-data warnings.
12. **Construction Signals:** start with officially licensed permit/registry sources for selected counties; record source, permit ID, geography, freshness and confidence; never invent contractor assignment.
13. **Simulated Buyer Panel:** consented, sufficiently aggregated historical objections; show scenarios as directional critique, not quantified win probability.

### Slice 4: trade resilience, training and trust

14. **Coverage Pact:** a small verified peer group agrees service territory, activation rules, customer consent, insurance, on-call windows, compensation and cancellations before routing a job.
15. **Apprentice Rotation:** agreements with supervisors and apprentices, trade/insurance/age and employment-law checks; each company confirms hours, with no automatic employee reassignment.
16. **Shadow Days:** host/visitor accept, confidential-data boundaries and event confirmation; only reciprocally confirmed attendance can contribute to track record.
17. **Bilingual Butler:** user chooses English or Spanish, messages show original + reviewed translation, retains meaning of terms and consent, allows correction and opts out; no unapproved auto-send.
18. **Prove-It Credentials:** private evidence with expiry/revocation, qualified verifier, and signed yes/no proof; never expose raw policy limits, revenue or bond docs by default.
19. **Storm Mobilization:** verified crews, valid credentials, capacity, explicit dispatch opt-in, anti-fraud screening and geographic operating terms.

### Slice 5: partner-led / regulated expansion, disabled by default

20. **Milestone Escrow:** partner with a duly licensed escrow/payment provider; never hold client money in Ask Intros accounts or call a delayed ordinary transfer escrow. Milestone photos are evidence, not self-executing release.
21. **Invoice Advance:** lender/factor owns capital, regulated decisions, disclosures and adverse-action processes; member separately consents to each evidence release. No automated approval from payment reputation.
22. **Group Insurance:** licensed insurer/broker verifies underwriting, disclosures, compensation and privacy.
23. **Intros Prime:** separate insured/bonded prime contracting entity, detailed subcontract agreements and liability allocation.
24. **Systems-first Acquisitions:** explicit seller opt-in, strict information barriers separating Aetheris analysis from potential buy-side access and conflict controls.
25. **Bid Pricing Model:** opt-in normalized bid history with statistically sufficient trades and regions; calibrated probability intervals, sample count, drift checks, and a human-approved bid.
26. **Member Data Co-op:** opt-in per approved use, no reidentification or unapproved resale, transparent licenses, democratic governance and auditable member revenue allocation.
27. **Demand finance and market extensions:** retain the ability to feed verified outcomes into future insurance, financing and procurement products only through an independently approved contract and permission path. This is a cross-cutting dependency, not permission to reuse all member data.

## Shared contracts required for each workstream

- **Ownership:** member/account IDs are server verified, not derived from editable profiles. RLS must protect every read, write, export and attachment.
- **Consent:** end-customer disclosure, member matching, call recording, translation, quote sharing, data pooling and automated messages each have independent revocable consent.
- **Receipts:** no success toast until matching row/version or provider-signed delivery receipt. Failed actions retain editable drafts; provide retry and idempotency keys.
- **Evidence:** user assertion != independent verification. Persist source, event date, verification tier, correction/appeal and expiration.
- **Privacy:** strict isolation; aggregated cells require minimum distinct contributors, sample count, suppression, time delay, and periodic small-sample review.
- **Partners:** payment, insurance, lending, escrow and prime contracts stay disabled until contracts, provider connectivity, licensing, coverage and operational dispute handling pass acceptance.
- **Release:** separate source merge, schema activation, provider activation, end-to-end acceptance and publication. A GitHub merge alone does not prove the production feature works.

## Existing systems to extend rather than duplicate

`src/features/network-value` (Capacity Exchange, Benchmark Pools, referral settlement), `src/aetheris/crm`, `src/features/business-tools`, `src/lib/aiGateway.server.ts`, `src/aetheris/meeting-audio.tsx`, `src/aetheris/AskIntrosDock.tsx`, `src/aetheris/access.ts`, `src/lib/auth-gate.ts`, `drizzle/migrations/` and `scripts/migration-checks/`. Maintain separate Social and Business appearances while sharing identity and record graphs.

## Next engineering PR after this draft release

1. Reconcile production schema and unblock member-acceptance tests.
2. Implement Payment Reputation's consent, corroboration, dispute state machine, row security, aggregation suppression, replay/double-report defense and read-only evidence display **behind a feature gate**.
3. Implement Overflow Routing's consent gate and CRM-backed transfer/receipt flow; wire no money until a provider is approved.
4. Implement Missed Call Rescue's provider adapter and webhook signature/deduplication test harness; keep automated texts disabled until consent and verified sender configuration.
