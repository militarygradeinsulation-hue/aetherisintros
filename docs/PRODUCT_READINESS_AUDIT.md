# Ask Intros Product Readiness Audit

Updated: 2026-10-12

## Product standard

Ask Intros wins when every meaningful interaction is real, permissioned, durable and useful. A lead is information; an introduction is information plus context plus trust. The product must never present a local preview as a shared network action.

## What is live and connected

- Member identity, onboarding, verification, directory access, introductions, messages, asks, outcomes, meetings, peer groups, deal rooms, track record, warm paths, invitations, notifications and recorded capability findings have database-backed paths and policy coverage.
- Meetings support browser video, consent-based notes, pre-meeting briefs, a selfie-camera default and live camera switching.
- The core relationship graph has authorization boundaries and migration-check coverage. The Nexus loop is present: evidence, finding, cause, impact, proposal, approval, action, outcome, verification and memory.

## Release blockers: do not market these as live shared product features

### 1. Professional / executive layer persists locally

`src/aetheris/domain/pro-repository.ts` always selects `createLocalProLayer()` in `getProDataLayer()`. The professional layer is account-durable through the `member_workspace_state` sync blob, but it is not normalized into product tables or served through a production Supabase gateway. It contains Passport, proof of work, capital, marketplace, private vault, intelligence rooms and concierge records. Its schema exists only as `src/aetheris/domain/schema.sql`; it is not represented by an applied migration family.

Risk: a member can retain work in their account, but it cannot safely become shared, queryable, permissioned network infrastructure while the interface resembles an enterprise system.

Required completion:

1. Create a versioned migration for the required normalized tables and owner/member scopes.
2. Add RLS, append-only audit events and RPC-only writes for consequential actions.
3. Implement the Supabase `TableGateway`, inject it into `getProDataLayer()` for authenticated live members, and migrate existing workspace-state records through a member-reviewed import.
4. Add authorization and browser persistence tests before exposing a feature as live.

### 2. Two social surfaces are not one feed

`src/intros-ui/views/HomeFeedView.tsx` has a demo-local composer, attachments, comments and reactions. The live route swaps the social board to the classic Aetheris feed, leaving the surrounding new shell and its social controls with different data behavior.

Risk: members encounter a feed that looks unified but has two interaction models.

Required completion:

1. Make one feed contract cover posts, comments, reactions, saves, attachments, visibility, moderation and realtime updates.
2. Use the same composer and thread UI in both home shells.
3. Give every write confirmed, pending and retry states; never retain an optimistic activity or memory record after a rejected write.

### 3. Post and ask persistence is fire-and-forget

`src/aetheris/db.ts` sends `savePost` and `saveAsk` with a background `fire()` helper. `store.tsx` adds local state and side effects before server confirmation.

Risk: a member can believe a post, ask, memory or activity event is live when RLS, validation or network failure rejected it.

Required completion:

1. Replace these helpers with typed save outcomes: saved, duplicate-confirmed, retryable network failure, permission failure, validation failure and unconfirmed timeout.
2. Add an idempotency key, pending status, rollback and composer-draft preservation.
3. Make directory refresh reconcile pending records instead of dropping or duplicating them.

### 4. Major integrations are correctly marked unavailable, but lack an activation path

The following are intentionally disconnected: asset, vendor, supply, compliance and access intelligence; licensed people search; public search; AI notes/analyst/Butler voice when keys are absent; business-registry verification.

Required completion:

1. Add an integration registry with owner, authorization method, data scope, retention, rate limits, failure UX and audit events.
2. Connect only authorized sources. Do not infer financial loss, personal data or profile details from incomplete evidence.

### 5. Draft-branch inventory must be resolved

Open drafts #80 (reviewed LinkedIn enrichment), #74 (recovered executive-module wiring), #65 (durable post saves), #63 (old integration stack), #62/#64 (modal accessibility) and several historical feature branches are not a backlog substitute.

Required completion:

1. Rebase each candidate against current main.
2. Accept it, replace it with a current implementation, or close it with a linked decision.
3. Never merge old branches blindly: they predate current migrations, deal rooms, provider consolidation and safety rules.

## Architecture upgrades

1. Collapse the duplicated application shells and provider trees into a single source of truth with explicit feature boundaries.
2. Break `src/aetheris/App.tsx` into routes and domain controllers; it is now a high-risk merge and regression hotspot.
3. Move large list reads to paginated React Query resources with cache invalidation and realtime reconciliation.
4. Generate Supabase types on every migration and remove escape-hatch `any` calls from live paths.
5. Add a complete end-to-end RLS harness to CI. Local migration checks are necessary but not enough.
6. Make all attachments server-backed with scanning, limits, ownership, retention and revocation. Do not treat device-local files as shared artifacts.

## Network-quality upgrades

1. Relationship health: weekly context refresh, stale-intro intervention and explicit mutual-value checkpoints.
2. Introduction quality: required reason, reciprocal value, warm-path evidence, consent expiry and outcome follow-up.
3. Opportunity graph: connect Ask, introduction, meeting, deal room, proposal, commitment, outcome and verified proof into one timeline.
4. Trust system: keep verification evidence separate from public claims, show provenance and make reputation appealable.
5. Business execution: combine tasks, commitments, decisions and meeting outcomes into one accountable follow-through queue.

## Commercial upgrades

1. Membership access and cohorts: earned entry, application review and capacity controls protect quality before growth.
2. Company workspaces: permissioned team memory, relationship continuity and owner-controlled exports.
3. Premium value: verified track record, warm-path access, deal rooms, intelligence briefs and time-equity measurement—not feature volume.
4. Marketplace: do not open it broadly until listings, scope, consent, disclosure, dispute process and outcome attribution are durable.

## Sequenced execution

1. Truthful social writes and one feed contract.
2. Persist or clearly quarantine the professional layer.
3. Rebase/resolve draft branches and consolidate navigation.
4. Add realtime, pagination and end-to-end authorization coverage.
5. Activate external integrations through the registry.
6. Grow cohorts, verified outcomes and company workspaces only after the core trust loop is reliable.
