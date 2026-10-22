# Member readiness repairs — October 22, 2026

## Source changes

- Give signed-in Insights a current snapshot of the canonical member graph: deduplicated companies, connections, saved members, unread conversations, visible shared content and current introduction states. Loading and failed reads withhold counts. No sample trend lines, communication heatmap, conversion rates or inferred opportunity values are presented. The old sample Insights component was already disconnected; remove that dead branch and preserve the existing labelled demo Insights route and its appearance controls.
- Allow existing Business Lobby, Opportunity Exchange, membership and additional member tools through the protected app's bounded deep-link contract. Expand the single desktop/mobile tool menu. Apply changed route entry props without remounting the member provider tree or feed drafts.
- Keep legacy professional planning records readable, explicitly private and read only in live mode. Their local consent, invitation, credential, capital and room transitions are not shared member workflows. Link to the canonical Workbench, Workspaces, Library, Providers and Peer Groups instead. The demo retains its interactive planners. No stored drafts are deleted or silently imported into shared tables.
- Add administrator-only, on-demand feature API checks. Each table request selects required contract columns with limit zero; diagnostics contain no returned member rows or raw backend errors. Account changes cancel requests and discard the previous report. Missing columns are classified separately from absent tables. A successful read does not certify writes or other members' permissions.
- Recognize PostgREST PGRST205 as missing database/schema-cache evidence. Separate a confirmed disabled LinkedIn provider from an unavailable settings check. The login screen explains confirmed disablement and keeps Google/email available.
- End Member Intelligence loading with an explicit retry when authentication verification rejects.

## Backend acceptance

Backend recovery remains a separate deployment procedure. Table-name existence and RLS enabled are not evidence that columns, keys, permissions, triggers and workflow transitions match the application contract. Keep detailed production catalog, access and security observations out of public release notes.

Before activation, establish authorized management access to the actual production target and a verified restorable backup/isolated restore. Compare complete catalogs and migration ledgers, prepare reviewed data-preserving forward repairs, and validate real member and anonymous API acceptance. Source checks alone do not establish production readiness.

## Recovery rehearsal

`node scripts/recovery/member-families.standalone.mjs` reconstructs the canonical synthetic baseline while omitting 0065/0066, 0069 and 0074. It requires each entire missing family, including routines, to be absent; existing or partial families stop recovery. It then applies the unchanged canonical source in disposable PGlite and exercises Library collaboration/export denial, proposal participants and server-owned track-record verification. Existing synthetic profile records are preserved.

Result: 78 synthetic workflow/access assertions passed. This is a compatibility diagnostic, not a production executor, backup, migration-ledger repair or proof of real Supabase workflow acceptance. No historical SQL, journal, production schema, member rows, grants, policies or ledgers are changed by this release.

## Validation

- TypeScript, 892 unit tests and production build pass locally.
- The full canonical disposable migration suite passes 1,617 assertions.
- 33 isolated browser assertions at 320px, 390px and desktop cover account counts, honest loading/error/empty states, navigation, private-planner boundaries and rejected authentication reads.
- Administrator connection browser checks cover opt-in zero-row reads, sanitized errors, mobile/light/dark presentation and report isolation on account changes.
- The existing full local Architect (40 assertions) and contrast/overlay (35 assertions) suites pass. The expanded menu fits 320px, 390px and desktop.
- GitHub runs the existing full release suites plus the new member-readiness browser and recovery rehearsal checks before release.

## Remaining production acceptance

1. Authorize management access to the exact production project and establish a verified restorable backup/isolated restore. Re-capture complete catalog and both ledgers; build reviewed forward-only repairs for the remaining missing families. Never replay recorded 0062 or silently relabel historical 0082/0090/0092 collisions.
2. Validate every recovered family on the published API using real approved member A, member B, unrelated member, anonymous and administrator sessions. Include signup, confirmation, onboarding, recovery, revocation, attachments, persistent posts/asks/messages, double consent and reload.
3. Configure LinkedIn OIDC credentials privately on the actual backend, verify redirect allowlists and complete consented sign-in/linking. An enabled flag alone is not end-to-end acceptance.
4. Verify configured AI, outbound email, scheduled delivery and meeting transports without claiming a connection from a sample response or sending unsolicited member messages.
5. Professional planners remain private review records until their normalized remote contracts, server-managed transitions, participant permissions and member-reviewed migration are implemented and activated. The boundary is not a claim that shared capital/credential/intelligence workflows are complete.

Track unresolved activation and launch acceptance in issues #211, #228 and #278. Close them only after production evidence, not source build success.
