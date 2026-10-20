# Observed-schema recovery rehearsal — October 20, 2026

Original Ask Intros project: `c1248cd8-77de-4eaa-8d9d-e7da71e70ae9`. Source main: `9ed70e1c084f4206d058d63a8186a5812a91f30e`.

## Verified result

- Structure-only public catalog captured through read-only queries: 149 tables, 258 functions, 4 enums, 1 view, 642 constraints, 98 non-constraint indexes, 122 triggers, 296 policies, 3,707 relation ACL entries, 802 function ACL entries.
- Connected PostgreSQL: 17.6. Disposable engine: PGlite 0.3.15 / PostgreSQL 17.5.
- All 2582 catalog reconstruction steps passed. Capture SHA-256: `28c5a1474c4dee945f10aa501dde759f176a454ecac09f7a4b6304333127c40b`.
- All 20 pending migrations in `pending-0058-0078.json` applied unchanged and in order; already recorded 0062 was skipped.
- 386 access/workflow assertions passed, 0 failed, using synthetic identities against observed membership helpers. No helper was relaxed or replaced. Suites: private Library, workspaces, deal rooms, Basic/Executive membership. Each suite runs in a rolled-back transaction so fixtures do not contaminate the next suite.
- Existing-table collisions reproduced for 0082, 0090 and 0092; collision probes always roll back.

The captured public definitions/grants are observed; auth/storage/realtime shells and actor records are synthetic. Managed extensions/services, actual Supabase JWT/PostgREST execution, external providers, realtime delivery and concurrent multi-connection behavior are not simulated. Object ownership is not restored. `baselineComplete` means every captured public catalog step was loaded, not that this is a full Supabase clone or production runtime verification.

## Corrections made to the rehearsal

The existing PGlite 0.2.17 engine runs PostgreSQL 16.4, which cannot replay PostgreSQL 17 `MAINTAIN` privileges. The new rehearsal accepts a separate, pinned PostgreSQL 17 engine; it does not drop unsupported grants to obtain a green result. It installs the captured pg_trgm extension, preserves default view-trigger state without an invalid ALTER VIEW trigger operation, and blocks target replay after any failed catalog step.

The observed schema also requires nonempty introduction reasons and a CRM opportunity name. Synthetic fixtures now supply valid values. The shared deal-room test explicitly inserts a name, and the older synthetic baseline includes that required column. These are test-data corrections; no production constraints changed.

## Pending source PR disposition

Older signup PRs #117, #123 and #125 predate the canonical open Basic + reviewed Executive system. Their alternate 0086/0087 SQL must not be replayed over canonical 0086/0087/0091/0092. Current `access.ts` requires confirmed email, approved membership, completed onboarding and non-rejected/non-suspended verification; the observed Basic/Executive RPC tests cover unconfirmed rejection, idempotent Basic claims, private tier reads, no self-approval, admin review and suspended/anonymous denial. Main also retains #123's confirmed message-thread ID handoff. Current theme/readability changes supersede their older styling alternatives. Closing these alternatives as source-superseded does not certify a live signup journey.

## Production recovery remains separate

The available SQL query tool does not establish a restorable backup. Before production application, confirm a usable restore point and recheck the database identity, pending hashes, affected definitions and grants. Use forward-only reconciliation for out-of-order pending migrations and the comment-only ledger collisions; do not edit historical SQL or fabricate ledger entries.

No production schema, data, grants, RLS or ledger changes were made during this rehearsal. The raw supplied catalog and detailed report remain outside the repository; only this metadata summary and reproducible tooling are committed.
