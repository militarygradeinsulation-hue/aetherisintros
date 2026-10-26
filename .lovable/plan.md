# Repair Deal Workspaces, Warm Referrals and Syndication Rooms against the live database

## Problem (confirmed)
- **Deal Workspaces:** the live table has the old layout (name, owner_id, description, status, workspace_type, deal_room_id). The app expects title, created_by, source_type, source_id, scope, next_action, budget_cents, row_version, scope_version and the `create_deal_workspace` / invite functions, which don't exist. Opening or starting a workspace fails.
- **Warm Referrals / Syndication Rooms:** signed-in members have no table permissions at all on referral_suggestions, referral_requests, syndication_rooms or syndication_room_members. The app also writes to `syndication_members`, but the live table is named `syndication_room_members`. Saving, dismissing, snoozing and creating rooms all fail.

## Approach
Additive-only database changes (no drops or renames), keeping the existing rows:
1. Deal Workspaces: add the missing columns to the existing table (nullable or defaulted), backfill `title` from `name` and `created_by` from `owner_id`, then add the missing workspace functions from the repo's workspace migration, adapted to the live table. Existing owner-only access stays in place.
2. Warm Referrals: add owner-scoped insert/update rights through server-validated functions. Members can only change their own suggestions and requests.
3. Syndication Rooms: point the app at the live `syndication_room_members` table, and restore room creation through a server function that adds the creator as the first member. Members only see rooms they belong to.
4. Add small checks that confirm each action now succeeds for the owner and is refused for other members.

## Technical details
- Compare the live columns with what each part of the app reads (repo.ts, warmReferral.functions.ts, syndicationRooms.functions.ts) before writing SQL.
- Historical migration files stay untouched. Every change goes in new migrations.
- Resolve the two monitoring findings after the checks pass.
