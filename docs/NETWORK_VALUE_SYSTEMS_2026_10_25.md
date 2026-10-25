# Ask Intros network systems

Implementation branch: `feat/network-value-tools`. This is the first implementation of the three requested network workflows, not a declaration that production services or payments are active.

## Member experience

Capacity Exchange is available under My Work and Business Tools. Verified members save an approximate service area, publish Available or Needed posts for up to 30 days, filter by radius, and send a private request. The owner proposes terms; the requester must accept the exact current version. The capacity Letters section retains this record and opens the existing member conversation. It does not silently send messages or commit a member to work. Expiry removes discoverability without deleting agreed records.

Benchmark Pools is available under Intelligence and Business Tools. Members contribute response time, quote follow-up within 48 hours, or close rate. A separately reviewed company enrollment determines the legal business and stable trade, size, and region cohort. One representative contributes for each business. Comparisons are available only for metrics the member contributed in the same released quarter. The Butler receives the actual released evidence and instructions to ask for operating volumes and economics before estimating value. The Executive Report can import this evidence with its qualification that contributions are not audited.

Referral Settlement is available under Ask Intros and Business Tools. A connector prepares immutable first-invoice terms. All three distinct parties acknowledge the same SHA-256 fingerprint before the connector may release the canonical introduction. The buyer confirms acceptance and the meeting; the seller confirms proposal, closed-won and first-invoice payment. Server-side ordering and permissions prevent the assistant from closing a deal on a member's behalf. An invoice confirmation produces a projection, never a Stripe or bank payout claim. Members can download the terms and confirmation record.

No concept companies, people, metrics, deals, amounts or posts are seeded into member storage. Test-only fixtures are labelled as examples. Form defaults are proposed terms for review. The pilot's illustrative 10% platform share is not activated commercial pricing and must be reviewed before release as a paid service.

## Data protection and authority

All nine new tables have RLS enabled and direct anonymous/member access revoked. Authenticated callers use an account-bound, validated server function and the permission-checked `network_value` RPC. Its private dispatcher checks live approved membership, verification, ownership and participant roles. Service credentials are not used by the member server function. A keyed account boundary rejects stale responses after account changes.

Coordinates are stored at one decimal place and other members receive only approximate five-mile distance buckets. This is approximate location, not a guarantee against inference by a determined requester. Posts use the location captured at creation and enforce their own maximum radius. Existing capacity records stay available to their participants after expiry. Accepted terms cannot be silently overwritten.

Benchmark releases use `HAVING count(DISTINCT business_key) >= 10` in the publishing query. Raw peer values and company identities never leave the dispatcher. Enrollment is assigned by a trusted operator from business verification evidence, not self-entered company names. Fixed cohorts, completed quarters, rounded percentile values, bucketed counts and immutable releases reduce differencing attacks. A minimum of ten is not a mathematical anonymity guarantee; collusion and background knowledge remain relevant. Contributions can be withdrawn, removing comparison access; previously published aggregate releases remain unchanged.

Electronic acknowledgements record the authenticated user, typed name, exact terms hash, consent wording and server timestamp. This is an audit record, not a claim that a third-party e-signature provider or any jurisdiction-specific agreement requirement has been completed.

## Activation sequence

1. Apply `drizzle/migrations/0096_network_value_systems.sql` through the managed migration path in `docs/MIGRATIONS.md`. The frozen Supabase migration folder is unchanged. Do not run ad hoc production DDL. Read back table grants, RLS and function execution rights after activation.
2. Verify real signed-in approved and verified member accounts. Exercise member switching, unauthorized reads, failed writes, expiry, location radius, and both participants' Letters flows.
3. Assign benchmark enrollments from independently reviewed legal businesses. The unique business key must not be reused for multiple representatives. Define an operator process or scheduled service job for `network_value_private.publish_benchmarks(completed_quarter)`. No automatic production publishing job or enrollment console is supplied in this change.
4. Recover the pre-existing referral schema before enabling introduction release. Read-only inspection on October 25 found the live `referrals` table still has signup-referral columns and `public.create_referral(uuid,uuid,text,uuid)` is missing. This change does not overwrite that table. The readiness response and UI disable release until the canonical function exists; preserved signatures remain readable.
5. Confirm actual platform pricing and referral eligibility, complete the required agreement review, then implement Stripe Connect. Required work includes connected-account onboarding and capability readiness, seller authorization and payment collection, verified webhooks, idempotent fee/transfer accounting, reconciliation, refunds, disputes and failed payouts. A seller's invoice-paid confirmation must never itself trigger an unverified transfer. Choose a documented Connect charge model before implementing payment execution.
6. Run real authenticated end-to-end checks and review mobile screenshots before production publication.

Payments, automatic bank payouts, automatic benchmark publication, profile enrollment administration and production migration activation are not supplied or claimed active by this branch. Capacity Exchange is the first candidate for production activation once its schema and account checks are complete.

## Validation

- Production build and TypeScript compilation passed.
- Before merging current main: 983 tests passed across 168 files. After merging main at `30edbc3a`: 1,016 tests pass and four homepage-copy assertions fail across three unchanged test files. The affected landing source and tests are identical to main; this branch does not alter them. All seven new database role/state-machine tests and three domain tests pass with the updated dependencies.
- Existing canonical migration harness: 1,624 checks passed, zero failures.
- New database tests cover anonymous/direct-table denial, business verification, private locations and Letters, stale terms rejection, expiry, explicit contribution consent, legal-company deduplication, nine-company suppression versus ten-company release, immutable releases, give-to-get, identical three-party signatures, introduction idempotency and responsible milestone actors.
- The browser harness covers responsive dark/light layouts, failure-preserved drafts, private request handoff, Butler evidence, and stale account responses. It is wired into GitHub checks. Local execution is blocked by the environment: Chromium fails to start because `socket()` is not permitted. No screenshots or browser passes are claimed locally.
- No live schema writes, payment setup or transfers were performed. Read-only catalog inspection established the referral dependency above.

## Remaining network roadmap

Buying pools, paid inbound gates, Rule Watch and Playbook Exchange remain planned. Exit and succession should extend the existing acquisition/succession area; Tap to Meet should extend existing Event Mode. This avoids introducing duplicate systems while keeping the requested capabilities visible in `roadmap.md`.
