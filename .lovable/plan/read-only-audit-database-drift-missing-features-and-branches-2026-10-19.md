# Read-only audit: database drift, missing features and branches

Nothing was changed. All evidence comes from the live database, the project's change files and the git refs, checked on Oct 19 2026.

## Verified findings

**Code and GitHub**
- Project code, local `main` and `origin/main` all point to the same commit, `b89d996` ("Verified match, reverted DB"). There are 0 commits ahead and 0 behind.
- There are 29 remote branches. Besides `main` they include `_agent-publish`, `claude/record-live-db-objects` and several `lovable-backup-claude-record-live-db-objects-*` branches. I can't see the published release commit from here, so it remains unverified.
- The two migration ledgers (the drizzle and supabase_migrations tables) are blocked to this read role. Which migrations are recorded as applied is therefore **unverified**. The live database schema itself is verified below.

**Live database vs migrations 0058–0078 and 0093** (live tables/functions compared with each file's `CREATE` statements)

| Migration | Live status |
|---|---|
| 0058 deal rooms | Missing: all 5 tables and 22 functions |
| 0059, 0060, 0067, 0078 | No new objects to check (they only change indexes, constraints or policies on missing tables) |
| 0061 member directory stats | Missing `member_directory_stats` |
| 0062 business posts | Present (`posts.business` column exists) |
| 0063/0064 deal workspaces | Missing: 8 tables and about 40 functions |
| 0065/0066 private contact library | Missing: 5 tables and 17 functions |
| 0068 meeting briefs | Missing table and guard |
| 0069 track record | Missing table and guard |
| 0070 reputation scores | Missing 2 tables and guard |
| 0071 referrals | Missing table and 3 functions |
| 0072 warm referral engine | Missing `referral_suggestions` and `referral_requests` |
| 0073 business analyst | Missing `business_diagnostics` |
| 0074 storefront/proposals | Missing 2 tables and 2 guards |
| 0075 syndication rooms | Missing 3 tables and `create_syndication_room`, plus 5 helper functions |
| 0076/0077 peer group feed/agendas | Missing 4 functions and 2 tables |
| 0093/0094 private ICP | Present: `icp_save`, `icp_state_guard`, and the two ICP policies |

Overall, almost everything from 0058 to 0077 is missing from the live database. Only 0062 and the ICP work exist live.

**Code that depends on missing objects:** `syndicationRooms.functions.ts` and `SyndicationRoomsPanel.tsx`, `warmReferral.functions.ts`, `storefront.functions.ts`, `meetingBrief.functions.ts`, `aetheris/workspaces/*`, and `aetheris/library/repo.ts`. These features will fail at runtime. That means the earlier "fixed" syndication and warm-referral repairs can't work live.

**Known collisions (from the earlier repair):** 0082, 0090 and 0092 create `business_lobby_windows`, `professional_opportunity_saves` and `member_tiers`. Those tables already exist live, so replaying those files fails. The general `save_workspace_state` function still allows privileged writes that bypass the ICP checks. The proposed fix is unapplied.

**Not checked in this pass:** signup, intros, messaging and CRM objects from 0079–0092 beyond the items above; grants and RLS on the missing objects (they can't exist yet); the published release commit.

## Safe remediation order (each step needs your authorization)

1. **Read the ledger (manual).** Open the database change history in your backend view, or give me a role that can read both ledgers. This confirms whether 0058–0077 are recorded as applied while their objects are missing (phantom-applied) or are simply pending.
2. **Snapshot first.** Export the current data from the database settings before changing anything.
3. **Pick a reconciliation path per migration:**
   - If pending: apply them in order, after checking each one in a disposable test database against the live schema.
   - If phantom-applied: write new forward-only migrations that recreate the missing objects idempotently (`IF NOT EXISTS`, guarded policy creation). Grants and RLS ship in the same migration. Historical files are never edited.
4. **Resolve the 0082/0090/0092 collisions** by comparing objects. Ledger-only reconciliation needs your explicit approval.
5. **Apply the ICP reconciliation** (the proposed `save_workspace_state` block) after approval.
6. **Verify each feature** with the matching `scripts/migration-checks` suite and a signed-in browser check of syndication, referrals, workspaces, library, storefront and meeting briefs.
7. **Clean up branches (manual, on GitHub).** Delete the `lovable-backup-*` and `claude/record-live-db-objects` branches only after confirming their content is merged into `main`. Leave `_agent-publish` alone, since it may be used by publishing.
8. **Publish** only after steps 3–6 pass.

## Needs your authorization
- Access to the ledgers, or confirmation from you of what they record.
- Every migration in steps 3–5.
- Deleting branches on GitHub.
- Publishing.
