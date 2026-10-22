# Restore storage for the ten existing feature areas

## Verified findings
- Live catalog reads confirm the requested feature tables are missing.
- The full intended schemas and workflow functions already exist in historical migrations `0058–0078`.
- Those migrations predate the newest applied ledger entry, so simply replaying them through the migrator can skip them.
- Several schemas use composite primary keys or `user_id` as the primary key; replacing these without retaining their unique constraints would break current clients.

## Implementation
1. Create forward-only recovery migrations for all ten areas, reusing the existing contracts without changing historical files.
2. Include each feature's necessary functions, triggers, indexes and grants—not just its tables. Include workspace business-role, private-library export-denial, track-record and syndication creator-visibility dependencies.
3. Give newly created tables `id uuid primary key default gen_random_uuid()` and `created_at timestamptz default now()`. Preserve existing composite conflict targets as unique constraints and preserve `user_id` uniqueness for reputation upserts.
4. Use `CREATE TABLE IF NOT EXISTS`, check existing-object compatibility, and avoid overwriting any live data or unrelated policies.
5. Preserve owner-only private data, accepted participant collaboration and explicit invitation workflows. Keep derived reputation scores and generated business analyses server-written; blanket owner-write policies would let members fabricate these results.
6. Repair the confirmed Warm Referral write-permission mismatch with narrowly scoped permissions and transition validation; do not grant unrestricted participant updates.
7. Test the complete recovery in disposable PostgreSQL-compatible storage with two distinct users and an outsider before applying it through the managed migration tool.
8. Read back the live tables, columns, grants, policies and required functions after application. Test existing authenticated UI flows with a legitimate member session when available.

## Technical details
- New application foreign keys reference `public.profiles` or store plain UUIDs, not `auth.users`.
- Deal Rooms uses `deal_rooms`, `deal_room_members`, `deal_milestones`, `deal_proposals`, `deal_events`; links/documents and workflow events follow the current client rather than new invented tables.
- Deal Workspaces uses the existing eight-table workspace/steps/proposals/events/CRM-links/approvals/deliveries contract.
- Private Contact Library uses its five `private_library_*` tables and guarded access/search/import functions, preserving export restrictions.
- Remaining storage: `meeting_briefs`, `track_record_entries`, `reputation_scores`, `outcome_reactions`, `referrals`, `referral_suggestions`, `referral_requests`, `business_diagnostics`, `member_storefronts`, `proposals`, `syndication_rooms`, `syndication_members`, `syndication_messages`.
- Do not change UI, routing, historical migration SQL, private ICP authorization or unrelated features. No publication is requested.

## Verification limits
Schema creation alone will not establish that all ten flows work end-to-end. Authenticated UI verification needs a legitimate member session; no requesting-user session could be minted during the preceding task.