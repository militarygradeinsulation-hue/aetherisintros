# Ask Intros — live network incident repair and release checklist
**Observed issues:** real introduction requests rejected as samples; posts/asks read permission failures; Trusted Providers RPC permission failures; success appearing without saved requests; new contacts shown as 9999 days dormant.

## Verified in GitHub source
- `src/aetheris/lib/intro-request.ts` uses `request_verified_intro(p_target, p_note)` and refuses success unless a server-supplied request ID and a valid receipt state are returned.
- `src/intros-ui/liveMembers.tsx` gets real member IDs from `visible_member_profiles`, with no demo fallback.
- `src/aetheris/live.ts` reads only real authored posts/asks in live mode, not `seed_learnings`, `seed_threads`, or `signals`.
- `src/aetheris/domain/engine.ts` treats contacts with no recorded exchange as new/building rather than artificially dormant; additional sentinel protection and tests remain in the release branch.
- `drizzle/migrations/0080`, `0083`, `0084`, and `0085` contain relevant RPCs and grants. **A local GitHub/PGlite migration pass does not prove production Supabase has these objects.**

## Production preflight (privileged database operator only)
1. Confirm which Supabase project and database the published Ask Intros app actually uses. Compare its deployed app environment with the target project **without logging service-role keys or session tokens**. Confirm backups and a release window.
2. From the production migration-history ledger, identify the latest successfully applied version. Apply *all pending reviewed migrations in order*, especially `0080_member_intro_read_contract.sql`, `0083_providers_relationship_evidence.sql`, `0084_live_intro_secure_read_grants.sql`, and `0085_restore_live_member_capabilities.sql`. Do not apply `0085` against an older database missing prerequisite tables and functions; the patch deliberately stops with an error if required RPCs do not exist.
3. Use an administrative SQL console to verify the function definitions and privileges (read-only checks):

```sql
SELECT to_regprocedure('public.request_verified_intro(uuid,text)') AS intro_rpc,
       to_regprocedure('public.visible_member_profiles(uuid[],integer,integer)') AS member_rpc,
       to_regprocedure('public.provider_directory()') AS providers_rpc,
       to_regprocedure('public.my_provider_requests()') AS provider_requests_rpc,
       to_regprocedure('public.provider_inbox()') AS provider_inbox_rpc;

SELECT has_table_privilege('authenticated','public.posts','SELECT') AS posts_read,
       has_table_privilege('authenticated','public.posts','INSERT') AS posts_write,
       has_table_privilege('authenticated','public.asks','SELECT') AS asks_read,
       has_table_privilege('authenticated','public.asks','INSERT') AS asks_write,
       has_function_privilege('authenticated','public.request_verified_intro(uuid,text)','EXECUTE') AS intro_request_exec,
       has_function_privilege('authenticated','public.provider_directory()','EXECUTE') AS providers_exec;

SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename IN ('posts','asks','intro_requests')
ORDER BY tablename, policyname;
```

4. Verify using **two separate approved test member accounts** with real onboarded profiles. A request from A to B must create exactly one `intro_requests` record with `user_id=A`, `target_user_id=B`, `requester_opt_in=true`, `member_opt_in=false`. Repeat must return `existing`. A must see a server-confirmed pending request, B must be able to decide, and no third party should see or accept it. A test with a sample slug, self-ID, or unapproved account must fail safely with no saved request.
5. Check an approved member can read actual posts/asks, create a post and an ask, then see each in the feed and My Asks after reload. Verify an unrelated/anonymous caller cannot access private documents or unauthorized member records.
6. Open Trusted Providers as an approved member and confirm `provider_directory()`, `my_provider_requests()`, and `provider_inbox()` return valid arrays. Confirm RLS blocks another member's private requests.
7. Verify a new contact with no direct message or completed meeting is **Building / No exchange recorded**, never `No exchange in 9999 days`, in Organization and Handshake after deploying the frontend changes.
8. Verify browser error notices display a database outage instead of substituting demo entries. Confirm return to normal after restored database access. Monitor PostgREST 42501 permission failures for live calls.

## Security boundaries
**Do not** GRANT authenticated direct SELECT on `public.members`, `public.companies`, `public.signals`, `public.seed_threads`, or `public.seed_learnings`. These are quarantined showcase tables. Fix the live data queries and production migrations instead. Do not disable RLS or give client code the service-role key. GRANT on RLS-protected `posts` and `asks` is not a substitute for policies; review both.

## Deployment status
The GitHub branch contains source and migration changes. **Production database execution, the published frontend rollout, and verification with real member accounts require an authorized deployment session and cannot be claimed complete from GitHub CI alone.**


## October 17 production database inspection and registration correction

The linked Lovable project **Ask Intros** was inspected with read-only database queries before modifying registration configuration. Results, without customer records:

- Prior launch mode: `invite_only`, capacity 1,000.
- Live `request_verified_intro`, `visible_member_profiles`, `provider_directory`, `my_provider_requests` and `provider_inbox` functions exist and authenticated EXECUTE was granted.
- Authenticated read/write table grants for `posts` and `asks` exist, with RLS policies visible. This is a schema/privilege check, **not** a signed-in end-to-end demonstration.
- 9 approved member records and 9 verified member records were counted before the registration change.
- The deployed `claim_early_access` function was an older code-required implementation, inconsistent with GitHub's reviewed `0086_restore_launch_mode_signup.sql`.

**Action completed:** The reviewed main-branch `0086_restore_launch_mode_signup.sql` function replacement was applied to the linked project database. The `launch_settings` row was changed from `invite_only` to `first_1000`; capacity remains 1,000. Verification after the write showed `first_1000`, the new whitelist/capacity/legacy-invite rules in the function, authenticated EXECUTE, and unchanged approved/verified member totals.

**Still required to claim complete:**

1. Use a **new email account** in the published frontend, verify email, confirm no invite is required and that the membership is approved without bypassing the business verification gate.
2. Complete the required verification and onboarding, then check a real People list, saved ask/post, durable DM, and introduction to a different opted-in verified member.
3. Confirm the published frontend commit and runtime Supabase project both match the GitHub code; production migrations run separately from GitHub CI.
4. Monitor errors and unexpected signups; if emergency closure is necessary, an authorized admin may set `launch_settings.mode` to `invite_only` while preserving existing memberships.

Do not confuse existence/permissions of backend functions with confirmed user flow. No test accounts were created, no existing member private records were inspected, and no RLS policies were disabled during this database correction.
