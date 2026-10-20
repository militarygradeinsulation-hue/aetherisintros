# Direct member activation implementation

Status: incremental branch work, not a release certification.
Branch: improvements/member-activation-direct-20261020

## First patch
- Clarify root search and social descriptions around business needs, relevant connections and mutual consent.
- Preserve CEO positioning, canonical URL, imagery, route component, sitemap inclusion and access gates.
- No visible landing, onboarding or Home behavior changes are included in this first patch.
- Build, unit, browser and production tests have not been run by this author.

## Remaining implementation
- Inspect current Landing.tsx and existing tests before changing visible copy. Replace unsupported exclusivity and platform-count claims with a concrete connection-focused promise; retain layout, brand styling and approved access destinations.
- Audit existing onboarding need/offer fields, visibility settings and confirmed persistence contracts. Reuse them; do not introduce a parallel datastore or imply sharing consent.
- Compose first-use and next-action states from authorized existing records without resetting saved Home arrangements. Show truthful empty, disconnected and error states.
- Add focused regression coverage and run available typecheck, build and responsive/light/dark checks. Record actual outcomes.

## Branch reconciliation
- Refresh PR #226 and #227 status and inspect final diffs before any merge recommendation. Their rehearsals and synthetic checks do not certify production behavior.
- Compare #60 and #80 requirements with current main and recovered work; extract only missing requirements, never merge wholesale.
- PR #229 coding-agent session failed because included AI credits were exhausted; its creation is not implementation evidence.

## Real-account acceptance gate
Use two authorized real member accounts A/B and a third unrelated account C.
1. A and B sign up, confirm and complete onboarding through the existing access policy.
2. Each discovers the other using only allowed public fields.
3. A requests an introduction; B receives it; independent consent is recorded.
4. Authorized messages and a next step persist after reload.
5. Failed writes preserve drafts and retry without duplicate confirmed records.
6. C cannot access private CRM, messages or workspace data.
7. Repeat critical steps at phone width and in light/dark appearance.
Record source IDs, test timestamps and redacted receipts; never copy confidential payloads.

## Separate approvals
This branch is not permission to merge, deploy, alter production schemas/grants/ledgers, send messages, activate paid services or rewrite history. Database recovery requires backup, ledger/order reconciliation and separately approved rollout.
