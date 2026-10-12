# Ask Intros — Product, Trust, Growth and Revenue Operating Plan
**Status:** working engineering plan; gates are targets, not traction claims or promises of valuation.

## Positioning and north-star result
A relationship operating system that moves **verified business need → relevant person → consented warm introduction → meeting → authorized joint work → evidenced outcome**. 
The north-star product metric is **qualified introductions with a recorded, consented next step or result**, counted by unique introduction IDs. Neither impressions, sent messages, AI calls nor newly created profiles count as a successful introduction.

A $100 million enterprise valuation is an ambition, not a present valuation or a guarantee. Its plausibility depends on retention, recurring gross profit, market liquidity, verified outcome quality and distribution. Example only: a hypothetical valuation at 10× annual recurring revenue would require $10 million ARR; the actual market multiple may be lower, higher, or inapplicable.

## The six connected system contracts

| Connection | Required behavior | Success evidence | Hard failure |
| --- | --- | --- | --- |
| Onboarding → Discovery | An approved, visible member appears in search with the identity they consented to share | Server search + profile read both return the same nonprivate member ID | Empty directory caused by blocked `profiles` SELECT; private email exposure |
| Need/Offer/Proof → Match | A stated business need finds relevant and evidence-qualified offers, with reasons | Match has member IDs, stated need, evidence basis, timing and confidence | Invented proof or paid placement masquerading as relevance |
| Match → Warm Introduction | Both parties give independent, recorded opt-in | One consent-stamped intro request, two named members | One user forges another's acceptance; cold mass-message |
| Introduction → Meeting → Follow-through | Authorized meeting records and check-ins retain context within their allowed scopes | Meeting outcome/check-in references intro ID | Private transcript published or a meeting implied without evidence |
| Accepted Introduction → Workspace | A consenting pair can open a separate invitation-only workspace from the intro ID | Unique workspace source link and private invitation accepted | Acceptance construed as project approval or payment |
| Workspace/Proposal → Outcome/Attribution | Both sides approve versioned terms and delivery; independently attributable results are recorded with evidence | Outcome linked to intro/workspace ID, identified author and known/modelled/unquantified basis | Silent term changes, duplicated value, fabricated ROI |

## Phase P0 — activation and permission safety (before broad acquisition)
1. **Eliminate direct-profile read failures.** Keep direct `profiles` table access private. Expose reviewed, allowlisted fields through scoped RPCs and guard them in JWT/RLS tests. Enforce the same contract in home, directory, inbox, workspaces, meeting briefs and any future mobile client.
2. **Prove one real lifecycle.** Automated acceptance test using two actual accounts: completed profiles → mutual discovery → double opt-in → conversation → meeting follow-up → private workspace invite → two-party terms → delivery → an attributable, consented outcome. No fallback fictional rows in live tests.
3. **Strengthen error honesty.** Never display “saved,” “sent,” “verified,” “matched,” or “completed” before server confirmation. Retry network failures without duplicates; keep typed drafts when saves fail.
4. **Production migration gate.** All SQL changes pass the role-based migration suite, CI, reviewer approval, and staged rollout before production. No silent migrations through page rendering.
5. **Separate data domains.** Personal CRM and contact imports stay private; network sharing requires explicit scope. Private messages, raw contact lists and confidential deal details never enter general search or recommendation prompts.
6. **Observe reliability.** Instrument errors by route and source; monitor signup, profile, discovery, intro, workspace and payments independently. Capture rates, latency and failure counts without logging confidential payloads.

**Exit gate:** new approved member can reach a qualified, double-consented introduction and a recorded next step without staff intervention, tested on desktop and mobile; no RLS regression.

## Phase P1 — two-sided marketplace liquidity and repeat value
1. Capture verified buyer/provider **pilot research interest** privately, preserving opt-ins and never treating research consent as marketing or listing approval. Migration `0081` implements the first step.
2. Select **one wedge** (a bounded vertical and geography) based on real pilot submissions, rather than launching every industry at once. Measure buyer needs, qualified providers, response availability and deal-cycle speed separately.
3. Activate demand-side needs with clear budget/timing/decision authority where provided; validate suppliers with proof-of-work and declared capacity. Never imply a vendor is verified based only on profile text.
4. Build **reverse marketplace** only after pilot demand exists: buyer drafts → explicit publication permission → eligible provider invitations → capped bids → buyer review → negotiated workspace. Provider contact exposure only after buyer approval.
5. Give each participant a private inbox of pending decisions; do not send automatic pitches or expose a buyer's identity simply because a provider meets a score threshold.
6. Attribute outcomes to the source introduction or request **once**, with separate “reported by member,” “confirmed by counterpart,” and “independently verified” states.

**Liquidity indicators:** qualified active needs per wedge, eligible active supply, share of needs receiving an acceptable response, consented intros per need, completed meetings per intro, and verified outcomes. No synthetic denominators.

## Phase P2 — product-led expansion, enterprise readiness
- **Member-to-member invitations:** invited collaborator experiences the value before being asked to import private contacts; referrer consent and opt-out remain explicit.
- **Organization accounts:** add tenant boundaries to independent member identities; define ownership, SSO/SAML, SCIM, admin controls, billing seats, permission transfer, and right to leave an employer while retaining personal identity.
- **Data portability:** approved exports, audit trails, revocation, time-limited sharing, and deletion processing with verified completion.
- **Execution interoperability:** integrate calendar, email, CRM and verified billing with per-connection scopes, retries, audit events, and idempotency keys. Do not promise integrations until authentication and rate-limit behavior are validated.
- **Evidence provenance:** source versioning, permission labels, age/refresh markers, “unknown” confidence, and a challenge/correction path. Prevent AI recommendations from becoming claims of endorsement.
- **AI unit cost controls:** model budgeting, cached evidence summaries, per-account limits, human approval gates, observability of cost per successful outcome, not cost per generated answer.
- **Operational maturity:** disaster recovery, encrypted secrets, vendor audits, pen testing, security incident playbooks, service-level objectives, and an appropriate SOC 2 readiness path before enterprise commitments.

## Revenue model experiments — test, do not assume
1. **Free qualified membership:** enough value to enable liquidity; gate spam and automated outreach by trust, not merely by payment.
2. **Premium professional/CEO subscription:** high-utility intelligence, relationship follow-through, private analysis, deeper CRM and preparation; validate conversion and churn before setting price.
3. **Organization subscription:** managed teams, workspace oversight, auditing and workflow automation with organization boundaries; pilot with real paying customers.
4. **Marketplace transaction/service fee:** only where legal, supported by verified transaction events and explicit commercial consent; do not silently charge merely for a warm introduction.
5. **Professional services/onboarding:** optional, transparent implementation revenue—not a substitute for scalable product recurring revenue.
6. **No paid placement disguised as trust:** commercial promotion must never outrank relevance or appear as independently verified proof.

## Instrumentation source of truth
Each transition should have a unique event, authorized actor, occurred-at timestamp, source ID, tenant/ownership scope, and evidence reference if present. Recommended funnel stages:

`approved_member → onboarded_visible → active_need_or_offer → qualified_match → intro_requested → double_opted_in → meeting_completed → next_step_committed → workspace_started → proposal_agreed → delivery_accepted → outcome_reported → outcome_verified`

- **Conversion:** count *unique entities* moving between adjacent stages in a defined cohort window; permit “not applicable” and censored/incomplete outcomes.
- **Activation:** time to first meaningful intro and first useful received response, not just login.
- **Retention:** member and organization return behavior tied to recorded useful actions; track by cohort and wedge.
- **Revenue:** trial-to-paid, net revenue retention, gross margin, contribution margin, CAC payback, voluntary and involuntary churn, per-organization expansion and payment failure.
- **Network quality:** opt-in acceptance, time to accepted intro, follow-through, reported/verified outcome rates, disputes, unwanted-contact rate and moderation actions.
- **Marketplace quality:** active qualified needs, eligible providers, median relevant proposals per request, time to shortlist, time to accepted delivery, repeat buyer/provider activity.
- **AI economics:** tokens and external-provider spend per verified useful action, privacy incidents, hallucination reports and human override rate.
- **Experiment policy:** define exposure, measured conversion, guardrail metrics, and stop criteria before shipping growth loops. Never claim a lift from modeled or sample data.

## Architecture priorities (decision order)
1. **Permissions and source-of-truth contracts** before new UI.
2. **Real, persistent transitions** before recommendation sophistication.
3. **Auditability and outcome truth** before reputation or monetization claims.
4. **Repeat liquidity in one segment** before geographical/category expansion.
5. **Unit economics and operations** before enterprise promises or a public GMV headline.

## Current work / next engineering tickets
- [x] Profile/avatar access RLS hardening (migration 0079).
- [x] Repair directory and introduction counterpart reads in GitHub (migration 0080; production rollout requires separate approval).
- [ ] Deploy 0080 and run paired-account acceptance checks before promoting the new live member screens.
- [x] Implement authenticated, private marketplace research interest capture (migration 0081; rollout pending).
- [ ] Deploy 0081 after security review; measure actual opt-in buyer/provider demand and form completion.
- [ ] Add opportunity/request lineage to private Workspaces and recorded intro outcomes; never infer deal value from a click.
- [ ] Replace remaining blocked direct-profile SELECTs in meeting briefs, calendar, warm referrals and authenticated member screens via reviewed scoped contracts.
- [ ] Add member/organization cohort metrics for discovery → consent → workspace → evidence, with privacy-safe aggregates and no invented values.
- [ ] Build buyer-governed reverse-marketplace transactions from the validated demand wedge.
- [ ] Build organization/enterprise account and billing model only once repeatable activation, retention and revenue are demonstrated.
