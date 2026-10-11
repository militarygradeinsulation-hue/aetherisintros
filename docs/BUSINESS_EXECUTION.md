# Business execution: staged delivery

## Dependency and feature gates

| Upgrade | Status | Gate or dependency |
|---|---|---|
| 1. Project blueprints | Implemented as a private editable playground/site-improvement template | Authenticated account, migration `0062`; no company/room sharing |
| 2. Proposal comparison | Implemented in the same private workbench | User-entered fields only; missing terms remain unknown; no provider score |
| 3. Engagement portal and approvals | Not implemented | Requires an accepted, resource-scoped engagement and immutable terms/delivery versions with designated parties |
| 4. Capability-team profiles | Not implemented | Requires self-confirmed roles/availability; no multi-party approval authority is inferred |
| 5. Confirmed commitments | Not implemented | Requires authorized-source extraction/entry and responsible-participant confirmation |
| 6. Decision scenarios | Not implemented | Requires explicit assumptions and deterministic calculations separated from evidence |
| 7. Aftercare and renewals | Not implemented | Requires completed-work linkage and opt-in scheduling |
| 8. Field-work capture | Not implemented | Requires bounded media upload and sync-state handling; offline media is deferred |

The CRM is the current integration host. CRM opportunities remain canonical; this workbench creates neither a duplicate opportunity nor a project/deal-room entity. No confirmed write interface exists here for Needs, accepted invitations, the deal-room demo, or another member's workspace. Linking is therefore blocked and no such link is created. After integration, deal workspaces (migrations `0058`–`0059`) are present, but no confirmed write interface was verified for linking; the link remains blocked. The migration is numbered `0062`, after the deal-workspace and private-library migrations.

## Implemented slice

- A member can create and edit a playground/site-improvement blueprint with questions, requirements, work packages, deliverables, dependencies, milestones and required documents.
- Template dates and the budget start unknown. Any amount is labeled **User-entered budget assumption** and requires a paired currency code.
- Proposal comparisons are private to the account owner. Scope, price/currency, timeline, exclusions, HTTPS evidence links and clarification questions are entered by the member. Missing fields stay unknown; the UI does not rank or identify a “best” provider. Evidence links are recorded, not independently verified.
- Live authenticated accounts use the existing versioned `member_workspace_state` store. Migration `0062` adds one live-only allowlisted key; the existing account-owner RLS and optimistic-version RPC remain the persistence boundary. Showcase/demo data is not accepted.
- No contact dataset is imported, exported, attached to reports, sent to AI, or transferred to providers.

## Setup and validation

Apply `drizzle/migrations/0062_business_execution_workbench.sql` through the project's reviewed Drizzle migration process after confirming the required preceding migrations are installed. Do not apply it directly to production. The workbench remains unavailable for persistence until the migration is installed.

Focused checks:

- `npx vitest run src/aetheris/__tests__/business-execution.test.ts src/aetheris/sync/__tests__/sync-logic.test.ts`
- `node scripts/migration-checks/run.mjs business-execution`
- `npx tsc --noEmit -p .`
- `npm run build`

The unit tests validate structure, dependency cycles, unknown proposal fields, budget/currency pairing and evidence URL validation. The migration check uses PGlite to exercise owner reads, cross-user isolation, authenticated writes, stale-version rejection, demo-key rejection and anonymous access. PGlite is not Supabase runtime verification. There is no executed browser journey or production database verification in this slice.

## Acceptance criteria and remaining release gates

- Blueprint structure and proposal terms survive account sync and stale writes cannot overwrite the current workspace version.
- A different authenticated member and an anonymous visitor cannot read or save this account's blueprint/comparison state.
- Budget assumptions are visibly user-entered; unknown values remain blank/null rather than being inferred.
- Need/workspace integration is blocked pending confirmed interfaces. The proposal-comparison output is descriptive only.
- Upgrades 3–8 remain unimplemented, as listed above. No accepted invitation, client approval, team allocation, agreement, commitment, ROI, renewal, upload, notification, transcription or external-provider capability is claimed.
- Before enabling company or guest access, add resource-specific backend grants, invitation/revocation tests, immutable versioned approvals and designated-party enforcement. The current owner-only store intentionally provides none of those permissions.
