# Migration normalization 0058–0094 — October 20, 2026

Branch: `reconcile/oct-2026-all-tracks` (from main `8db1cf8d`). Ledger evidence:
`CONNECTED_LEDGER_EVIDENCE_2026_10_20.md` (read-only query against source ref `b651b40d`).

> **Nothing in this change applies, re-applies, recreates, renames or edits any journaled
> migration.** Historical SQL bytes are unchanged (the production Drizzle ledger matches on
> SHA-256, so even a comment edit would turn an "applied" file into an "unknown" one).
> Risk flags therefore live in this manifest, not as comment blocks inside the SQL.
> No production database was contacted while preparing this change.

## What was normalized

| Problem | Fix in this branch |
| --- | --- |
| `drizzle/migrations/0045_peer_group_feed.sql` and `0046_peer_group_agendas.sql` were **not journaled**, duplicated the numbers of applied `0045_providers` / `0046_impact_report`, and diverged from canonical `0076_peer_group_feed` / `0077_peer_group_agendas` (broader `peer_group_members.role` and `peer_groups.max_members` column grants). | Moved byte-for-byte (`git mv`) to `docs/release-safety/superseded/` with a README. They were never shipped by drizzle-kit, so no ledger is affected. |
| `scripts/migration-checks/run.mjs` and `scripts/recovery/probe-missing-objects.mjs` enumerated `NNNN_*.sql` with `readdirSync`, so the disposable-DB harness applied the two unjournaled drafts before 0076/0077 and the recovery probe reported their objects. | Both now follow `meta/_journal.json` order. `run.mjs` exits on drift (unjournaled file or missing journaled file). |
| No guard against future duplicates. | `scripts/migration-checks/journal-integrity.standalone.mjs` (no dependencies): every `NNNN_*.sql` journaled, no duplicate numbers, strictly increasing `idx` and `when`. Policy line added to `docs/MIGRATIONS.md`. |
| Stale comments in `src/aetheris/peer-groups-ui.tsx` pointed at the draft 0045 file. | Point at 0076/0077. |

Result after the move: 94 migration files ↔ 94 journal entries, numbers unique, journal
idx 57 gap preserved (no `0057` exists, intentionally). The next free number is **0096**:
`0095` is reserved by the unapplied `docs/release-safety/0095_icp_owner_grant.candidate.sql`.

## Status matrix 0058–0094

Legend — **PENDING**: journaled, absent from production ledger and objects missing; must be
staged in dependency order on an isolated copy first. **APPLIED**: hash matches a ledger
row; never replay. **COLLISION**: ledger row at the journal timestamp has a different hash
and the objects exist; compare definitions, never replay or edit the ledger.

| Migration | Status | Risk flag / manual verification before production |
| --- | --- | --- |
| 0058_deal_rooms | PENDING | ⚠ 573 lines, 21 SECURITY DEFINER functions, 5 tables. Non-idempotent `CREATE TABLE`/`CREATE POLICY`: a partial earlier run fails the whole file. Confirm none of its 27 objects exist first. |
| 0059_deal_room_idempotency | PENDING | Depends on 0058. |
| 0060_app_error_rate_limit_index | PENDING | ⚠ `CREATE INDEX IF NOT EXISTS` without `CONCURRENTLY` — takes a write lock on `app_errors`; check table size / lock window. |
| 0061_member_directory_stats | PENDING | SECURITY DEFINER, EXECUTE revoked from PUBLIC/anon. Low risk. |
| 0062_business_posts | **APPLIED (ledger row 58, different timestamp)** | ⛔ DO NOT REPLAY OR RELABEL. |
| 0063_deal_workspaces | PENDING | ⚠ 22 SECURITY DEFINER functions, 6 tables. Byte-identical to superseded PR #44 0057. |
| 0064_deal_workspace_business_roles | PENDING | ⚠ Six unguarded `DROP FUNCTION` (no `IF EXISTS`) of 0063 signatures and 8 `ADD COLUMN`s — only valid immediately after 0063 in the same recovery. |
| 0065_private_contact_library | PENDING | ⚠ Contact data. Verify export denial (0066) is applied in the **same** window; never leave 0065 live without 0066. |
| 0066_contact_export_denial | PENDING | Drops/recreates 0065 read policies and search RPC (`IF EXISTS`). |
| 0067_business_execution_workbench | PENDING | ⚠⚠ Drops and re-adds `member_workspace_state_store_key_check` with a fixed key list. If production's constraint was changed after 0047 (e.g. for `icp:` keys), this **silently narrows it**. Diff the live constraint first. Blocks `aetheris.business-execution-v1-live` saves until applied (the UI reports sync failure). |
| 0068_meeting_briefs | PENDING | Owner-scoped RLS. |
| 0069_track_record / 0070_reputation_scores | PENDING | Owner/visibility RLS; required for the live track-record panels. |
| 0071_referrals / 0072_warm_referral_engine | PENDING | 0072 depends on 0071. Warm-referral reads fail until applied (UI now surfaces that error, see Track 3). |
| 0073_business_analyst | PENDING | Single owner policy. |
| 0074_storefront_proposals | PENDING | 8 policies. |
| 0075_syndication_rooms | PENDING | 4 SECURITY DEFINER functions. |
| 0076_peer_group_feed → 0077_peer_group_agendas | PENDING | ⚠ Alters existing (applied 0044) `peer_groups`/`peer_group_members`/`peer_group_posts`; 0077 uses `IF NOT EXISTS` tables but `DROP POLICY IF EXISTS` + recreate. Do **not** use the superseded drafts. |
| 0078_syndication_creator_insert_visibility | PENDING | Must run **last** (replaces a 0075 policy). |
| 0079–0081 | APPLIED | Never replay. |
| 0082_business_lobby | **COLLISION** | ⚠⚠ Compare live tables/policies/functions with the file; additive forward fix only. |
| 0083–0089 | APPLIED | Never replay. |
| 0090_shared_opportunity_exchange | **COLLISION** | ⚠⚠ Same as 0082. Tables are RPC-only (RLS on, no policies, grants revoked). |
| 0091_confirmed_founding_claim | APPLIED | Never replay. |
| 0092_basic_executive_membership | **COLLISION** | ⚠⚠ Same as 0082. |
| 0093_private_icp_workspace | APPLIED (row 101) | ⛔ DO NOT REPLAY. Known blocker: key CHECK excludes `icp:` keys; general `save_workspace_state` bypass — see `icp-reconciliation.proposed.sql`. |
| 0094_icp_guard_review_history | APPLIED (row 102) | ⛔ DO NOT REPLAY. |

Recovery order (unchanged from the ledger evidence): 0058→0059, 0060, 0061; skip 0062;
0063→0064; 0065→0066→0067; 0068; 0069→0070; 0071→0072; 0073; 0074; 0075; 0076→0077;
0078 last. A restorable backup and a full isolated schema comparison are still unverified.

## Verification run for this change

- `node scripts/migration-checks/run.mjs` (disposable PGlite): 1602 passed / 0 failed before
  the move, 1602 passed / 0 failed after (journal-ordered, drafts excluded).
- `node scripts/migration-checks/journal-integrity.standalone.mjs`: passes; verified it fails
  on an injected stray `0045_*.sql` file (and `run.mjs` refuses to start).
