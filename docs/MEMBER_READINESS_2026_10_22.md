# Member readiness repairs — October 22, 2026

## Source changes

- Give signed-in Insights a current snapshot of the canonical member graph: deduplicated companies, connections, saved members, unread conversations, visible shared content and current introduction states. Loading and failed reads withhold counts. No sample trend lines, communication heatmap, conversion rates or inferred opportunity values are presented. The old sample Insights component was already disconnected; remove that dead branch and preserve the existing labelled demo Insights route and its appearance controls.
- Allow existing Business Lobby, Opportunity Exchange, membership and additional member tools through the protected app's bounded deep-link contract. Expand the single desktop/mobile tool menu. Apply changed route entry props without remounting the member provider tree or feed drafts.
- Keep legacy professional planning records readable, explicitly private and read only in live mode. Their local consent, invitation, credential, capital and room transitions are not shared member workflows. Link to the canonical Workbench, Workspaces, Library, Providers and Peer Groups instead. The demo retains its interactive planners. No stored drafts are deleted or silently imported into shared tables.
- Add administrator-only, on-demand feature API checks. Each table request selects required contract columns with limit zero; diagnostics contain no returned member rows or raw backend errors. Account changes cancel requests and discard the previous report. Missing columns are classified separately from absent tables. A successful read does not certify writes or other members' permissions.
- Recognize PostgREST PGRST205 as missing database/schema-cache evidence. Separate a confirmed disabled LinkedIn provider from an unavailable settings check. The login screen explains confirmed disablement and keeps Google/email available.
- End Member Intelligence loading with an explicit retry when authentication verification rejects.

## Fresh production-connected evidence

Read-only checks through the original Lovable project `c1248cd8-77de-4eaa-8d9d-e7da71e70ae9`:

| Feature | Observed structure |
| --- | --- |
| Private Library | private_library_workspaces, private_library_records and private_library_import_batches absent |
| Track Record evidence | track_record_entries absent |
| Storefront / Proposals | member_storefronts and proposals absent |
| Deal Rooms / Workspaces | deal_rooms, deal_workspaces and deal_workspace_members exist |
| Other recovered areas | meeting_briefs, reputation_scores, referrals, business_diagnostics, syndication_rooms and peer_groups exist |

Existence checks do not validate columns, keys, grants, policies, triggers or workflows. The older blanket claim that every pending feature family is absent is stale.

A deeper structure read confirms incompatible columns in several existing tables. Deal Rooms has owner_id/status instead of the canonical created_by/stage/source contract; Deal Workspaces has name/owner_id instead of title/created_by/source/version columns; workspace membership has member_id without canonical user_id/status. Meeting briefs lack user_id/other_user_id/generated_at; referrals lack referred_to_id; business diagnostics lack user_id/generated_at/health_score; Syndication Rooms lacks room_type. Reputation has member_id/overall_score rather than the user_id/score/rate contract used by the server functions. These are not recovered workflows merely because RLS is enabled or the table name exists. Require complete catalog/ACL comparison and reviewed data-preserving repairs; do not rename owner columns or grant shared access blindly.

The configured production target is `uactagkdvafjombseswx`. A fresh public auth-settings read returned HTTP 200 with linkedin_oidc false and email enabled. The newly connected Supabase account lists three other projects, none matching production; requesting the exact target returns permission denied. Do not use those other projects as replacements, copy member data into them, or resume an unrelated project.

## Recovery rehearsal

`node scripts/recovery/member-families.standalone.mjs` reconstructs the canonical synthetic baseline while omitting 0065/0066, 0069 and 0074. It requires each entire missing family, including routines, to be absent; existing or partial families stop recovery. It then applies the unchanged canonical source in disposable PGlite and exercises Library collaboration/export denial, proposal participants and server-owned track-record verification. Existing synthetic profile records are preserved.

Result: 78 synthetic workflow/access assertions passed. This is a compatibility diagnostic, not a production executor, backup, migration-ledger repair or proof of real Supabase workflow acceptance. No historical SQL, journal, production schema, member rows, grants, policies or ledgers are changed by this release.

## Validation

- TypeScript, 892 unit tests and production build pass locally.
- The full canonical disposable migration suite passes 1,617 assertions.
- 33 isolated browser assertions at 320px, 390px and desktop cover account counts, honest loading/error/empty states, navigation, private-planner boundaries and rejected authentication reads.
- Administrator connection browser checks cover opt-in zero-row reads, sanitized errors, mobile/light/dark presentation and report isolation on account changes.
- GitHub runs the existing full release suites plus the new member-readiness browser and recovery rehearsal checks before release.

## Remaining production acceptance

1. Authorize management access to the exact production project and establish a verified restorable backup/isolated restore. Re-capture complete catalog and both ledgers; build reviewed forward-only repairs for the remaining missing families. Never replay recorded 0062 or silently relabel historical 0082/0090/0092 collisions.
2. Validate every recovered family on the published API using real approved member A, member B, unrelated member, anonymous and administrator sessions. Include signup, confirmation, onboarding, recovery, revocation, attachments, persistent posts/asks/messages, double consent and reload.
3. Configure LinkedIn OIDC credentials privately on the actual backend, verify redirect allowlists and complete consented sign-in/linking. An enabled flag alone is not end-to-end acceptance.
4. Verify configured AI, outbound email, scheduled delivery and meeting transports without claiming a connection from a sample response or sending unsolicited member messages.
5. Professional planners remain private review records until their normalized remote contracts, server-managed transitions, participant permissions and member-reviewed migration are implemented and activated. The boundary is not a claim that shared capital/credential/intelligence workflows are complete.

Track unresolved activation and launch acceptance in issues #211, #228 and #278. Close them only after production evidence, not source build success.
