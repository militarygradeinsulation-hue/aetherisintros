# Ask Intros Product Readiness Audit

Updated: 2026-10-12

## Product standard

Ask Intros wins when every meaningful interaction is real, permissioned, durable and useful. A lead is information; an introduction is information plus context plus trust. The product must never present a local preview as a shared network action.

## What is live and connected

- Member identity, onboarding, verification, directory access, introductions, messages, asks, outcomes, meetings, peer groups, deal rooms, track record, warm paths, invitations, notifications and recorded capability findings have database-backed paths and policy coverage.
- Meetings support browser video, consent-based notes, pre-meeting briefs, a selfie-camera default and live camera switching.
- The core relationship graph has authorization boundaries and migration-check coverage. The Nexus loop is present: evidence, finding, cause, impact, proposal, approval, action, outcome, verification and memory.

## Release blockers

### 1. Professional / executive layer persists locally

`src/aetheris/domain/pro-repository.ts` always selects `createLocalProLayer()`. The professional layer is account-durable through the `member_workspace_state` sync blob, but it is not normalized into product tables or served through a production Supabase gateway. It contains Passport, proof of work, capital, marketplace, private vault, intelligence rooms and concierge records. Its schema exists only as `src/aetheris/domain/schema.sql`; it is not represented by an applied migration family.

Risk: a member can retain work in their account, but it cannot safely become shared, queryable, permissioned network infrastructure while the interface resembles an enterprise system.

Required completion:
1. Create versioned migrations for the required normalized tables and owner/member scopes.
2. Add RLS, append-only audit events and RPC-only writes for consequential actions.
3. Implement the Supabase TableGateway and choose it for authenticated live members; migrate existing workspace-state records through a member-reviewed import.
4. Migrate existing device state through a member-reviewed import and add browser persistence/authorization tests.

### 2. Two social surfaces are not one feed

`src/intros-ui/views/HomeFeedView.tsx` has a demo-local composer, attachments, comments and reactions. The live route swaps only the social board to the classic Aetheris feed, leaving the surrounding shell with different interaction behavior.

Required completion:
1. One feed contract for posts, comments, reactions, saves, attachments, visibility, moderation and realtime updates.
2. One composer and thread UI across both shells.
3. Confirmed, pending and retry states for every write. Never keep an optimistic activity or memory record after a rejected write.

### 3. Post and ask persistence is fire-and-forget

`src/aetheris/db.ts` sends `savePost` and `saveAsk` through background `fire()`; `store.tsx` adds local state and side effects before server confirmation.

Required completion:
1. Typed save outcomes: saved, duplicate-confirmed, retryable network failure, permission failure, validation failure and unconfirmed timeout.
2. Idempotency key, pending status, rollback and composer-draft preservation.
3. Reconcile pending records during directory refresh.

### 4. External integrations need an activation registry

Asset, vendor, supply, compliance and access intelligence; licensed people search; public search; AI notes/analyst/Butler voice; and business-registry verification are intentionally unavailable without authorized providers.

Required completion:
1. Integration registry with owner, authorization method, data scope, retention, rate limits, failure UX and audit events.
2. Connect only authorized sources. Do not infer financial loss, personal data or profile details from incomplete evidence.

### 5. Draft-branch inventory must be resolved

Open drafts #80 (reviewed LinkedIn enrichment), #74 (executive-module wiring), #65 (durable post saves), #63 (old integration stack), #62/#64 (modal accessibility) and historical feature branches are not a backlog substitute.

Required completion:
1. Rebase each candidate against current main.
2. Accept it, replace it with a current implementation, or close it with a linked decision.
3. Never merge old branches blindly: they predate current migrations, deal rooms, provider consolidation and safety rules.

## Architecture upgrades

1. Collapse duplicated application shells/provider trees into a single source of truth.
2. Break `src/aetheris/App.tsx` into routes and domain controllers.
3. Move large list reads to paginated React Query resources with cache invalidation and realtime reconciliation.
4. Generate Supabase types on every migration and remove live-path escape-hatch `any` calls.
5. Add a complete end-to-end RLS harness to CI.
6. Make attachments server-backed with scanning, limits, ownership, retention and revocation.

## Network-quality upgrades

1. Weekly relationship context refresh, stale-intro intervention and mutual-value checkpoints.
2. Introduction quality: required reason, reciprocal value, warm-path evidence, consent expiry and outcome follow-up.
3. One opportunity timeline: Ask → introduction → meeting → deal room → proposal → commitment → outcome → verified proof.
4. Verification provenance, separate private evidence from public claims, and make reputation appealable.
5. One accountable follow-through queue for tasks, commitments, decisions and meeting outcomes.

## Commercial upgrades

1. Earned membership and capacity-controlled cohorts protect quality before growth.
2. Company workspaces preserve permissioned team memory and relationship continuity.
3. Premium value is verified track record, warm-path access, deal rooms, intelligence briefs and Time Equity—not feature volume.
4. Do not open the marketplace broadly until listings, scope, consent, disclosures, dispute process and outcome attribution are durable.

## Sequenced execution

1. Truthful social writes and one feed contract.
2. Persist or clearly quarantine the professional layer.
3. Rebase/resolve draft branches and consolidate navigation.
4. Add realtime, pagination and end-to-end authorization coverage.
5. Activate external integrations through the registry.
6. Grow cohorts, verified outcomes and company workspaces after the core trust loop is reliable.
