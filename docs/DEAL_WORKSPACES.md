# Deal workspaces (Phase 3: buyer/provider roles, two-party approval, delivery records)

A private business workspace a member opens from a conversation (`dm_threads`) or an accepted
introduction (`intro_requests`, both opt-ins). Migrations: `0057_deal_workspaces.sql` and `0058_deal_workspace_business_roles.sql`
(neither applied to any live database by this change; apply through the project migration tool, in order).

## What it reuses, and what it adds
- **Conversations / introductions** stay where they are. A workspace stores only `source_type` + `source_id`; no message or capsule text is copied, so private content never leaves its audience.
- **Relationship Room** (`relationship_rooms`, 0003) and **intro deals** (`intro_deals`, 0042) are untouched. The in-code `DealRoomsPage` is a seeded demo with no table behind it, so there was nothing persistent to extend. The new tables are the persisted workspace; reported deal value can later be linked to `intro_deals`.
- **CRM**: `deal_workspace_crm_links` lets each member link their *own* `crm_opportunities` row (private per member, checked against `owner_id`). There is no UI for it in Phase 1; the RPC `link_workspace_opportunity` is ready.
- One workspace per source (`UNIQUE (source_type, source_id)`): a second submit, or the other participant, gets the existing workspace.

## Model
`deal_workspaces` (title, scope, next_action, optional budget + currency, optional due date, status, `scope_version`, `row_version`, `accepted_by`), `deal_workspace_members` (owner/counterparty; invited/active/declined/removed), `deal_workspace_steps`, `deal_workspace_proposals` (versioned terms: submitted/approved/declined/superseded), `deal_workspace_events` (append-only history), `deal_workspace_crm_links` (personal, see below).

Lifecycle: `qualified → proposal → agreed → in_progress → delivered → accepted → closed`, `cancelled` from any stage before `accepted`; `proposal → qualified` and `delivered → in_progress` (rework) are allowed. Terminal: `closed`, `cancelled`. The graph lives in `deal_workspace_transition_allowed()`, enforced by a trigger for every writer including the service role, and mirrored in `src/aetheris/workspaces/lifecycle.ts`.

### Two separate axes: room admin vs business party
- **Room role** (`owner` / `counterparty`): who opened the room. It grants only admin actions: edit the draft (while `qualified`), invite/remove, cancel, close. It never grants a business approval.
- **Business party** (`buyer` / `provider`): assigned explicitly and **accepted by both people** (`propose_workspace_parties` by one, `accept_workspace_parties` by the *other*; the proposer cannot accept their own proposal; `decline_workspace_parties` clears it). Buyer/provider is never inferred from who created the room; the buyer may be the owner or the invitee.
- Until both active members hold distinct accepted parties (`deal_workspace_parties_established`), **every consequential action is refused**: submit/approve/decline a proposal, start work, submit/accept/reject a delivery. A trigger also refuses entry to `proposal`, `agreed`, `in_progress`, `delivered`, `accepted` without established parties, for every writer.
- Roles are **locked** once terms are agreed (or while a change awaits re-approval): reassignment and member removal are refused, and a members trigger rejects party edits even from the service role. So nobody can escalate or swap sides unilaterally, and approvals never outlive their parties.

### Role / transition matrix
Source of truth: `deal_workspace_role_may` (admin), `deal_workspace_party_may` (business) and `deal_workspace_action_needs_parties`; mirrored by `roleMay` / `may` in `lifecycle.ts`.

| Action | Owner (admin) | Buyer | Provider |
| --- | --- | --- | --- |
| Edit draft terms (only while `qualified`) | yes | – | – |
| Cancel (before acceptance) / close (after acceptance) | yes | – | – |
| Invite again / remove (before agreement) | yes | leave only (if counterparty) | leave only (if counterparty) |
| Propose / accept / decline buyer-provider assignment | yes | yes | yes (accept: not the proposer) |
| Submit a versioned proposal or change | – | yes | yes |
| Approve / decline a proposal version | **no** | **yes, for itself** | **yes, for itself** |
| Start work (`agreed → in_progress`) | – | no | **yes** |
| Submit delivery (`in_progress → delivered`) | – | no | **yes** |
| Accept / send back delivery | – | **yes** | no |
| Next action, steps | yes | yes | yes |

("–" = the admin/party column alone grants nothing; a person's rights are the union of their room role and their party, e.g. an owner who is the provider may do the provider rows, but never the buyer rows.)

### Terms, approval and re-approval
- A proposal version is **immutable** (trigger, all writers). `deal_workspace_approvals` holds one row per (version, person), append-only; the actor is `auth.uid()`; a replayed approval is refused; a trigger refuses an approval row for a non-member, a non-accepted party or a version that is not open.
- **Agreement** = both the buyer and the provider approved the **same** version. One approval changes nothing but is recorded and shown ("approved by …"). Only then are the terms applied, `scope_version` set to that version, and the stage becomes `agreed`. A trigger re-checks this for every writer.
- **Re-approval workflow** for a material change after agreement (`agreed`, `in_progress` or `delivered`): either party submits a new version. The workspace moves to `proposal` and remembers the stage in `resume_status`. **Progression is blocked** (no start, delivery or acceptance) and the previously approved terms stay in force; consent is not silently invalidated. Then:
  - both parties approve the new version → its terms apply, the stage resumes (`agreed`/`in_progress`; a `delivered` workspace returns to `in_progress`), and any open delivery made against the old terms is `superseded`;
  - either party declines (or a newer version replaces it, which supersedes the old one) → the old terms and the remembered stage resume.
- `transition_workspace_status` only handles `start_work` (provider), `cancelled`, `closed` (owner) and `proposal → qualified` (owner, no open change). Everything else goes through the dedicated RPCs.

### Delivery
`deal_workspace_deliveries` (versioned, immutable core): only the **provider** submits, recording the `terms_version` it was made against. Only the **buyer** accepts, naming `p_delivery_version` and `p_terms_version`; stale or superseded versions, a changed terms version, or acceptance by the provider/owner are refused. The guard trigger additionally refuses `accepted` unless an accepted delivery decided by the active buyer at the current terms version exists. Acceptance records the fact that the buyer accepted the delivery here; no payment or contract is implied.

### Accepted introductions and conversations are not project consent
Opening a workspace only **invites** the other person. A pending invitee reads **nothing** from the workspace tables (RLS: active members only), nor approvals, deliveries or history. `my_workspace_invitations()` returns exactly: inviter id and name, room title, and the inviter's explicit invitation message (≤500 chars) – no scope, budget, due date, steps or roles. Accepting (`respond_workspace_invite`) is self-only, a single conditional update, and refused for declined, revoked or removed invitations. It grants no business role: the stage stays `qualified` until roles are accepted and terms approved. Source conversations remain protected by their own policies; only `source_type`/`source_id` are stored.

### Concurrency and idempotency
- Creation is idempotent and atomic: `pg_advisory_xact_lock` on the source plus `UNIQUE (source_type, source_id)`; racing creators (and the other participant) receive the same workspace with `created: false`.
- Mutating RPCs take `p_expected` (the `row_version` the client loaded), lock the row `FOR UPDATE`, and fail with SQLSTATE `40001` ("changed since you loaded it") on a mismatch. The UI reloads, shows the message and keeps what the user typed. Steps are independent rows and do not need a version.

### History
`deal_workspace_events` is append-only (update/delete blocked for every writer; only an FK cascade removes rows). Each row has the authenticated actor (from `auth.uid()`, never a parameter), timestamp, action kind, previous and new stage, the terms version and (for delivery actions) the delivery version. It deliberately holds **no private payloads**: step text, next-action text, titles, scope and delivery notes are not logged. Active members read it.

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
Migrations `0057` + `0058` + journal entries; `scripts/migration-checks/deal-workspaces.check.mjs`; `src/aetheris/workspaces/{lifecycle,repo,StartWorkspace,WorkspacesPage}`; `src/aetheris/__tests__/workspace-lifecycle.test.ts`; `scripts/workspace-check/run.mjs`; wiring in `nav.tsx`, `App.tsx`, `pageMeta.tsx`, `pages/MoreDrawer.tsx`, `voice-commands.ts`, `opportunity-ui.tsx` (accepted introduction entry), `intros-ui/views/LiveMessagesView.tsx` + `IntrosApp.tsx` (conversation entry, "Workspaces" tab).

## Existing records (migration handling)
`0058` ends by calling `deal_workspace_reapproval_backfill()` once (EXECUTE revoked from clients). Workspaces that already sat in `agreed`, `in_progress` or `delivered` under 0057 had no buyer/provider and no two-party approval, so **no consent is invented**: they move to `proposal` with the old stage in `resume_status`, an actor-less `migrated_requires_reapproval` event is written, and progression is blocked until the people accept roles and approve (or decline) a terms version. `accepted`, `closed`, `cancelled` and `qualified` rows are untouched. `0057` had not been applied anywhere when this was written, so on a fresh database the backfill is a no-op; its behaviour on legacy rows is covered by the suite using simulated legacy rows, not real data.

## Tests and results (run in this change)
| Command | Result |
| --- | --- |
| `npx tsc --noEmit -p .` | pass |
| `npx vitest run` | 39 files, 304 tests pass (`workspace-lifecycle.test.ts`: transitions, party-aware matrix, blocked-until-roles, re-approval gating) |
| `node scripts/migration-checks/run.mjs` (PGlite 0.2.17, in-memory) | 1136 passed, 0 failed; the `deal-workspaces` suite (221 assertions) uses distinct users A/B/C, a visitor and the service role. Covers pending preview vs blocked content, outsider/declined/revoked access, self-only acceptance, owner approval bypass, provider self-acceptance, missing/unaccepted roles, role assignment abuse, replayed/stale/forged approvals, stale terms and delivery confirmations, re-approval (pause, decline-resume, renewed approval), roles independent of the owner, unchanged data after every denied mutation, history contents, and the backfill |
| `npx vite build` | pass |
| `npx eslint src/aetheris/workspaces src/aetheris/__tests__/workspace-lifecycle.test.ts` | 0 errors; these files, `scripts/migration-checks/deal-workspaces.check.mjs` and `scripts/workspace-check/run.mjs` were formatted with the repo prettier config. Wiring files already in the repo (e.g. `App.tsx`) are not prettier-formatted repository-wide and were not mass-reformatted |

PGlite checks are **not equivalent to Supabase runtime verification**. PGlite is single-connection, so "concurrent" approvals/edits are simulated by two calls made from one loaded `row_version` (exactly one succeeds, the other gets `40001`); true multi-connection contention needs an isolated Supabase project.

## Blocked / not run
- **Browser tests against a real database** (`scripts/workspace-check/run.mjs`, updated for roles → both-party approval → provider delivery → buyer acceptance) were **not executed**: they need an isolated test deployment plus three seeded verified members; no credentials were read or used. It exits `2` ("BLOCKED") without them and refuses production-looking hosts. It is not in CI. The failed-write and duplicate-submit UI behaviour is implemented (input kept, submit lock) but is not covered by an executed browser test.
- The database checks run on PGlite with a reproduction of the live base schema, not on Supabase; run `scripts/security-harness` against a test project after applying the migration.
- `src/integrations/supabase/types.ts` is not regenerated; the UI uses the untyped client like neighbouring modules.
- The earlier external (Devlo) review failed and is **not** relied on as verification.

## Limitations
Two-party workspaces only; no documents, contracts or payments; the existing Relationship Room and `intro_deals` are not merged with workspaces. Phase 3 is a new migration (`0058`) that alters 0057's objects, so it is safe whether or not 0057 was applied. Two parties only; there is no UI to change roles after agreement (by design) and no dispute process.

## Integration contract with PR #43 and the release gate
PR #43 (structured business feed posts, quick-note fixes) is unfinished. Nothing from it was merged, cherry-picked or modified; none of its feed/composer/quick-note files are touched here.

Intended chain: **business post → response → conversation → invitation → accepted room → proposal → delivery → acceptance.**

| Step | Owner of the step | Contract |
| --- | --- | --- |
| business post → response → conversation | PR #43 (+ existing messaging) | Response must end in a `dm_threads` row (or an accepted `intro_requests` row) between the two members. |
| conversation → invitation | this PR | `createWorkspace('dm_thread' \| 'intro_request', sourceId, input, inviteMessage)` → `create_deal_workspace`; returns `{id, created}`; idempotent. A post-specific source would need a new `source_type` via a migration. |
| invitation → accepted room | this PR | `respond_workspace_invite(ws, true)` by the invitee only; no consent to terms or roles. |
| proposal → delivery → acceptance | this PR | `propose/accept_workspace_parties` → `submit_workspace_proposal` → `approve_workspace_proposal` (each party) → `transition_workspace_status('in_progress')` (provider) → `submit_workspace_delivery` (provider) → `accept_workspace_delivery(ws, ver, deliveryVersion, termsVersion)` (buyer). |

Rules for #43's side: never copy message or quick-note text into workspace steps, scope or events; link by id only.

**Release gate (outstanding):** a combined end-to-end claim for the whole chain is **not made**. It requires both implementations to be available together and exercised in an isolated environment with distinct authenticated users. Until then, only the segment from conversation/accepted introduction onward is covered, by the database suite above. Remaining cross-PR tests: post → response → conversation → workspace end-to-end; quick notes never leaking into workspace content.

## Outstanding
- Run the migrations and `scripts/security-harness` on an isolated Supabase test project (RLS, grants and SECURITY DEFINER behaviour are only simulated on PGlite).
- Execute `scripts/workspace-check/run.mjs` and a multi-connection concurrency test in an isolated Supabase project.
- Browser tests for the failed-write and duplicate-submit paths against a real environment.
- Cross-PR end-to-end once #43 lands.
- Real-environment accessibility pass; new UI reuses existing classes and labelled controls but was not audited with assistive tech.
