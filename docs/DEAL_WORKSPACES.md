# Deal workspaces (Phase 2: role matrix, versioned proposals, concurrency)

A private business workspace a member opens from a conversation (`dm_threads`) or an accepted
introduction (`intro_requests`, both opt-ins). Migration: `drizzle/migrations/0057_deal_workspaces.sql`
(not applied to any live database by this change; apply through the project migration tool).

## What it reuses, and what it adds
- **Conversations / introductions** stay where they are. A workspace stores only `source_type` + `source_id`; no message or capsule text is copied, so private content never leaves its audience.
- **Relationship Room** (`relationship_rooms`, 0003) and **intro deals** (`intro_deals`, 0042) are untouched. The in-code `DealRoomsPage` is a seeded demo with no table behind it, so there was nothing persistent to extend. The new tables are the persisted workspace; reported deal value can later be linked to `intro_deals`.
- **CRM**: `deal_workspace_crm_links` lets each member link their *own* `crm_opportunities` row (private per member, checked against `owner_id`). There is no UI for it in Phase 1; the RPC `link_workspace_opportunity` is ready.
- One workspace per source (`UNIQUE (source_type, source_id)`): a second submit, or the other participant, gets the existing workspace.

## Model
`deal_workspaces` (title, scope, next_action, optional budget + currency, optional due date, status, `scope_version`, `row_version`, `accepted_by`), `deal_workspace_members` (owner/counterparty; invited/active/declined/removed), `deal_workspace_steps`, `deal_workspace_proposals` (versioned terms: submitted/approved/declined/superseded), `deal_workspace_events` (append-only history), `deal_workspace_crm_links` (personal, see below).

Lifecycle: `qualified → proposal → agreed → in_progress → delivered → accepted → closed`, `cancelled` from any stage before `accepted`; `proposal → qualified` and `delivered → in_progress` (rework) are allowed. Terminal: `closed`, `cancelled`. The graph lives in `deal_workspace_transition_allowed()`, enforced by a trigger for every writer including the service role, and mirrored in `src/aetheris/workspaces/lifecycle.ts`.

### Role / transition matrix
Single source of truth: `deal_workspace_role_may(role, action)` (mirrored by `roleMay` in `lifecycle.ts`).

| Action | Owner (opened it) | Counterparty (other person from the source) |
| --- | --- | --- |
| Edit draft terms (only while `qualified`) | yes | no |
| Submit a versioned proposal / change | yes | no |
| Approve or decline a proposal | **no** | **yes** |
| Move to in_progress, delivered, back to in_progress, cancel, close | yes | no |
| Accept delivery (`delivered → accepted`) | **no** | **yes** |
| Next action, steps | yes | yes |
| Invite again / remove the counterparty | yes | leave only |

Stage guards enforced by the trigger regardless of caller: `agreed` needs an `approved` proposal for exactly the current `scope_version`, decided by an *active counterparty*; `accepted` needs `accepted_by` to be an active counterparty. `transition_workspace_status` refuses `proposal`, `agreed` and `accepted`; those are reached only by `submit_workspace_proposal`, `approve_workspace_proposal` and `accept_workspace_delivery`.

### Material scope changes
Scope, budget, currency and due date are "terms". While `qualified` they are a draft the owner may edit (each change bumps `scope_version`). After a proposal they change **only** through a new proposal version; the terms in force stay until the counterparty approves that version (renewed approval). Approving a change during `delivered` sends the workspace back to `in_progress`. A trigger rejects any change to the terms without a version bump, so the service role cannot edit them silently.

### Accepted introductions and conversations are not project consent
Opening a workspace from an accepted introduction or a conversation only **invites** the other person. An invitation grants no access (no terms, steps, history, proposals); `my_workspace_invitations()` returns the title and inviter name only. Accepting the invitation activates their membership, nothing more: the stage stays `qualified` until they approve a proposal.

### Concurrency and idempotency
- Creation is idempotent and atomic: `pg_advisory_xact_lock` on the source plus `UNIQUE (source_type, source_id)`; racing creators (and the other participant) receive the same workspace with `created: false`.
- Mutating RPCs take `p_expected` (the `row_version` the client loaded), lock the row `FOR UPDATE`, and fail with SQLSTATE `40001` ("changed since you loaded it") on a mismatch. The UI reloads, shows the message and keeps what the user typed. Steps are independent rows and do not need a version.

### History
`deal_workspace_events` is append-only (update/delete blocked for every writer; only an FK cascade from deleting the workspace removes rows). Each row has the authenticated actor (taken from `auth.uid()`, never a parameter), timestamp, kind, previous and new status, and the scope version. Active members read it; invited, declined and removed people do not.

### Personal CRM opportunity vs the shared room
`link_workspace_opportunity` links one of the caller's own `crm_opportunities` rows. The link is readable only by its owner and is never shown to the other participant; the UI labels it as private and separate from the shared room.

## Authorization
- Tables are SELECT-only for `authenticated`; **every write is a SECURITY DEFINER RPC that takes the actor from `auth.uid()`**.
- Reads require an *active* membership (workspace, steps, proposals, history); a user can additionally read only their own roster row (to answer an invitation). Outsiders, pending, declined and removed people read nothing.
- The only person who can be on the roster besides the owner is the other person from the source. Only the invitee accepts or declines for themselves; a decliner or removed member cannot rejoin on their own.
- The UI says plainly that `agreed` is not a signed contract and that `accepted` records the recipient's acceptance, not a payment.
- Creating, proposing, approving and delivering notify the other active participant in-app (existing `notifications` table). Nothing is sent externally.

## Assistant hooks
Navigation only: `voice-commands.ts` ("workspaces") and `pageMeta` keywords. The assistant gets no write path; invitations, proposals, approvals, stage changes and delivery acceptance are buttons a signed-in member presses.

## Changed / added files
Migration `0057` + journal entry; `scripts/migration-checks/deal-workspaces.check.mjs`; `src/aetheris/workspaces/{lifecycle,repo,StartWorkspace,WorkspacesPage}`; `src/aetheris/__tests__/workspace-lifecycle.test.ts`; `scripts/workspace-check/run.mjs`; wiring in `nav.tsx`, `App.tsx`, `pageMeta.tsx`, `pages/MoreDrawer.tsx`, `voice-commands.ts`, `opportunity-ui.tsx` (accepted introduction entry), `intros-ui/views/LiveMessagesView.tsx` + `IntrosApp.tsx` (conversation entry, "Workspaces" tab).

## Tests and results (run in this change)
| Command | Result |
| --- | --- |
| `npx tsc --noEmit -p .` | pass |
| `npx vitest run` | 39 files, 302 tests pass (17 in `workspace-lifecycle.test.ts`: transitions, role matrix, proposal gating) |
| `node scripts/migration-checks/run.mjs` (PGlite 0.2.17, in-memory) | 1037 passed, 0 failed; `deal-workspaces` suite uses distinct users A/B/C, a visitor and the service role. Covers unauthorized reads/writes, forged actors, pending/declined/removed invitees, membership changes, owner self-approval and self-acceptance, versioned proposals and renewed approval, duplicate and racing creation, stale-version conflicts, failed writes persisting nothing, history fields and immutability, private CRM link |
| `npx vite build` | pass |
| `npx eslint src/aetheris/workspaces src/aetheris/__tests__/workspace-lifecycle.test.ts` | only `prettier/prettier` errors (the repository as a whole is not prettier-formatted, ~53k pre-existing); no other rule violations in these files. A full-repo run was not repeated for this phase |

Note: PGlite runs single-connection, so "concurrent edits" are simulated by passing a stale `p_expected` version and by issuing racing creates; true multi-connection contention needs the isolated Supabase run below.

## Blocked / not run
- **Browser tests against a real database** (`scripts/workspace-check/run.mjs`, updated for proposal → approval → delivery → acceptance) were **not executed**: they need an isolated test deployment plus three seeded verified members; no credentials were read or used. It exits `2` ("BLOCKED") without them and refuses production-looking hosts. It is not in CI. The failed-write and duplicate-submit UI behaviour is implemented (input kept, submit lock) but is not covered by an executed browser test.
- The database checks run on PGlite with a reproduction of the live base schema, not on Supabase; run `scripts/security-harness` against a test project after applying the migration.
- `src/integrations/supabase/types.ts` is not regenerated; the UI uses the untyped client like neighbouring modules.
- The earlier external (Devlo) review failed and is **not** relied on as verification.

## Limitations
Two-party workspaces only; no documents, contracts or payments; the existing Relationship Room and `intro_deals` are not merged with workspaces. Migration 0057 was rewritten in place for this phase because it has not been applied anywhere; if it has been applied to any environment, a follow-up migration would be needed instead.

## Integration contract with PR #43 and the release gate
PR #43 (structured business feed posts, quick-note fixes) is unfinished. Nothing from it was merged, cherry-picked or modified; none of its feed/composer/quick-note files are touched here.

Intended chain: **business post → response → conversation → invitation → accepted room → proposal → delivery → acceptance.**

| Step | Owner of the step | Contract |
| --- | --- | --- |
| business post → response → conversation | PR #43 (+ existing messaging) | Response must end in a `dm_threads` row (or an accepted `intro_requests` row) between the two members. |
| conversation → invitation | this PR | `createWorkspace('dm_thread' \| 'intro_request', sourceId, input)` → `create_deal_workspace`; returns `{id, created}`; idempotent. A post-specific source would need a new `source_type` via a migration. |
| invitation → accepted room | this PR | `respond_workspace_invite(ws, true)` by the invitee only; no consent to terms. |
| proposal → delivery → acceptance | this PR | `submit_workspace_proposal` → `approve_workspace_proposal` (counterparty) → `transition_workspace_status` → `accept_workspace_delivery` (counterparty). |

Rules for #43's side: never copy message or quick-note text into workspace steps, scope or events; link by id only.

**Release gate (outstanding):** a combined end-to-end claim for the whole chain is **not made**. It requires both implementations to be available together and exercised in an isolated environment with distinct authenticated users. Until then, only the segment from conversation/accepted introduction onward is covered, by the database suite above. Remaining cross-PR tests: post → response → conversation → workspace end-to-end; quick notes never leaking into workspace content.

## Outstanding
- Execute `scripts/workspace-check/run.mjs` and a multi-connection concurrency test in an isolated Supabase project.
- Browser tests for the failed-write and duplicate-submit paths against a real environment.
- Cross-PR end-to-end once #43 lands.
- Real-environment accessibility pass; new UI reuses existing classes and labelled controls but was not audited with assistive tech.
