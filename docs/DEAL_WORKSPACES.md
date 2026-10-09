# Deal workspaces (Phase 1)

A private business workspace a member opens from a conversation (`dm_threads`) or an accepted
introduction (`intro_requests`, both opt-ins). Migration: `drizzle/migrations/0057_deal_workspaces.sql`
(not applied to any live database by this change; apply through the project migration tool).

## What it reuses, and what it adds
- **Conversations / introductions** stay where they are. A workspace stores only `source_type` + `source_id`; no message or capsule text is copied, so private content never leaves its audience.
- **Relationship Room** (`relationship_rooms`, 0003) and **intro deals** (`intro_deals`, 0042) are untouched. The in-code `DealRoomsPage` is a seeded demo with no table behind it, so there was nothing persistent to extend. The new tables are the persisted workspace; reported deal value can later be linked to `intro_deals`.
- **CRM**: `deal_workspace_crm_links` lets each member link their *own* `crm_opportunities` row (private per member, checked against `owner_id`). There is no UI for it in Phase 1; the RPC `link_workspace_opportunity` is ready.
- One workspace per source (`UNIQUE (source_type, source_id)`): a second submit, or the other participant, gets the existing workspace.

## Model
`deal_workspaces` (title, scope, next_action, optional budget + currency, optional due date, status), `deal_workspace_members` (owner/collaborator; invited/active/declined/removed), `deal_workspace_steps`, `deal_workspace_confirmations`, `deal_workspace_events` (append-only).

Lifecycle: `qualified → proposal → agreed → in_progress → delivered → accepted → closed`, `cancelled` from any stage before `accepted`; `proposal → qualified` and `delivered → in_progress` (rework) are allowed. Terminal: `closed`, `cancelled`. The graph lives in `deal_workspace_transition_allowed()` (enforced by a trigger for every writer, including the service role) and is mirrored in `src/aetheris/workspaces/lifecycle.ts`.

## Authorization
- Tables are SELECT-only for `authenticated`; **every write is a SECURITY DEFINER RPC that takes the actor from `auth.uid()`** (no actor parameter, so IDs cannot be forged).
- Reads: workspace + roster for active and *invited* members (an invitee needs the terms to decide); steps, confirmations and history for active members only. Outsiders, declined and removed members read nothing.
- Writes: owner – terms, stage moves, invite/remove; any active participant – next action, steps, confirmations; invitee – accept/decline for themselves only. The only person who can be on the roster besides the owner is the other person from the source.
- `agreed` and `accepted` are reached only when **every active participant (at least two) confirms for themselves**; changing scope/budget/currency/due date voids earlier "agreed" confirmations. The UI says plainly that this is not a signed contract and that no payment is recorded.
- Creating a workspace notifies the invitee in-app (existing `notifications` table). Nothing is sent externally.

## Assistant hooks
Navigation only: `voice-commands.ts` ("workspaces") and `pageMeta` keywords. The assistant gets no write path; invitations, stage changes and confirmations are buttons a signed-in member presses.

## Changed / added files
Migration `0057` + journal entry; `scripts/migration-checks/deal-workspaces.check.mjs`; `src/aetheris/workspaces/{lifecycle,repo,StartWorkspace,WorkspacesPage}`; `src/aetheris/__tests__/workspace-lifecycle.test.ts`; `scripts/workspace-check/run.mjs`; wiring in `nav.tsx`, `App.tsx`, `pageMeta.tsx`, `pages/MoreDrawer.tsx`, `voice-commands.ts`, `opportunity-ui.tsx` (accepted introduction entry), `intros-ui/views/LiveMessagesView.tsx` + `IntrosApp.tsx` (conversation entry, "Workspaces" tab).

## Tests and results (run in this change)
| Command | Result |
| --- | --- |
| `npx tsc --noEmit -p .` | pass |
| `npx vitest run` | 39 files, 300 tests pass (15 new in `workspace-lifecycle.test.ts`) |
| `node scripts/migration-checks/run.mjs` (PGlite 0.2.17, in-memory) | 999 passed, 0 failed (84 new, three distinct users + visitor + service role) |
| `npx eslint .` | 54,394 problems vs 53,869 before: the +525 are all `prettier/prettier` formatting in the new/edited files (the repository is not prettier-formatted: 53k pre-existing); non-formatting errors (156) and warnings (77) are unchanged |
| `npx vite build` | pass |

## Blocked
- **Browser tests against a real database** (`scripts/workspace-check/run.mjs`) are written but were **not executed**: they need an isolated test deployment plus three seeded verified members, which are not available here (no credentials were read or used). The script exits `2` ("BLOCKED") without them and refuses production-looking hosts. The existing in-browser stub suites were deliberately not reused for persistence/authorization. Not added to CI.
- The database checks run on PGlite with a reproduction of the live base schema, not on Supabase itself; run the live-schema harness in `scripts/security-harness` after applying the migration to a test project.
- `src/integrations/supabase/types.ts` is generated and was not regenerated; the UI uses the same untyped client as neighbouring modules.

## Limitations
Two-party workspaces only (the roster is the two people from the source); no document/contract/payment features; no CRM-link UI; the existing Relationship Room and `intro_deals` are not yet merged with workspaces.

## Phase 1 / PR #43 integration (not touched here)
PR #43 (structured business feed posts, quick-note fixes) was not read into this branch and none of its feed/composer/quick-note files were modified. Later connection points: a structured post's "convert to workspace" action can call `createWorkspace()` once the post has a conversation or accepted-introduction source (or a new `source_type` is added by a migration); `StartWorkspaceButton` is source-agnostic. Cross-PR tests still to write once both land: feed post → conversation → workspace end-to-end, and that quick notes never leak into workspace steps/events.
