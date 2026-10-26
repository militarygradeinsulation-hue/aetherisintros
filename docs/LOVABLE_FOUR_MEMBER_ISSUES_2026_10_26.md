# Ask Intros: four Lovable findings, evidence and recovery gates

Read-only review: October 26, 2026. Project: original Ask Intros
`c1248cd8-77de-4eaa-8d9d-e7da71e70ae9`. Reviewed GitHub main around
`82809f923b9465d883ed281ad9bfca6aa9eb73b3` and actual public PostgreSQL
catalog through Lovable read-only SQL. No member data exported or modified.

## 1. Passport link creation and revocation

**Confirmed UI regression:** `ProfessionalDraftBoundary` wraps the whole
Passport tab inside `<fieldset disabled>` and a collapsed `<details>`,
including the real, server-backed `PassportManager` and Revoke action.
The secure owner-scoped `passports` table still exists and is available to
authenticated members. This repair moves the real manager outside the locked
legacy planner, without enabling sample-only remote permission actions.

**Additional production gate:** the table's only RLS policy, `own passports`,
has a `WITH CHECK (owner_id = auth.uid() AND is_verified_member())`
condition. An owner whose verification has lapsed may be unable to revoke a
previously shared passport. Revoke access must be independent of *current*
verification while still requiring the true owner and only setting `revoked`
to true. This requires a separately reviewed, forward-only RLS patch, a
verified backup, and tests with a verified owner, lapsed owner, unrelated
member and anonymous caller. **No production policy was changed.**

## 2. Warm referrals and syndication rooms

**Confirmed production contract mismatch:**

- Live `referral_suggestions` exposes `for_member_id`,
  `suggested_member_id`, `score`, `reason`, `context`,
  `dismissed_at` and `actioned_at`. The server instead queries
  `for_user_id`, `target_user_id`, `connector_user_id`,
  `strength_score`, `path_explanation` and `snoozed_until`.
- Live `referral_requests` has `target_member_id` and no
  `suggestion_id`; server sends `target_id` and `suggestion_id`.
- Live `syndication_rooms` has `deal_type`, `target_raise`,
  `close_date` and `metadata`; server attempts `room_type`,
  `opportunity_size`, `deadline` and `decision`.
- Live member and participation tables are `syndication_room_members`
  and `syndication_interests`, not the service's
  `syndication_members` and `syndication_messages`.

The source's future Drizzle migrations 0072 and 0075 cannot safely be
replayed on these existing, differently structured production tables.
Doing so would cause collisions or risk data loss. The repaired UI now
shows referral write errors, and the server checks acknowledgments before
claiming dismissal or snooze. **Actual shared referral and syndication
saving remains blocked until production and code contracts are reconciled.**
Use an audited compatibility adapter or forward-only additive migration
after real member A/B and revocation tests. No mock success, direct
cross-member access, or broad RLS policy shortcuts.

## 3. Trusted Providers "permission denied"

The live database contains `my_provider_requests()` and
`provider_inbox()`, both `SECURITY DEFINER`, owned by `postgres`,
and granted EXECUTE to `authenticated`. Owner-scoped RLS policies
exist for provider requests and matches. In a **simulated authenticated
role with a synthetic non-member UUID**, both functions returned empty
arrays without a permission error. This confirms only that these
functions are callable under those conditions. It does NOT establish
that live member and provider sessions work.

The UI initially invokes all three provider RPCs on mount and does not
retry automatically when its authenticated session becomes available.
This patch retries after INITIAL_SESSION/SIGNED_IN/TOKEN_REFRESHED and
clears stale account data on SIGNED_OUT. Follow-up: test exact member A
request and provider contact B inbox using real authenticated sessions,
compare PostgREST error codes (42501 vs PGRST2xx), and trace the active
JWT, session restoration, role grants, and function-specific error.
Do not grant SELECT on private provider tables to all signed-in users.

## 4. Full CRM & Operations

`CrmPage` preserved the full Ledger component and member preference
`aetheris.crm.view` but conditioned both rendering and switch on
`!section`. The canonical CRM/Pipeline workspace mounts it with
`section='crm'`, so saved `full` preferences and the switch disappear.
Now only the Pipeline-only route hides the full switch; CRM restores
the full twelve-module workspace and persisted choice.

## Release boundaries and verification

- This branch modifies UI and write-error handling only. It does NOT
  apply migrations, rewrite migration history, change other members'
  private records, or call the Lovable AI editor.
- Before publishing: passing TypeScript, unit, full browser/navigation,
  CodeQL, mobile Social/Business, demo and permission tests.
- Database contract and RLS corrections must follow a backup and actual
  production migration ledger comparison with #211 and #278.
- Tests must use verified owner A, revoked/unverified former member A,
  unrelated B, provider contact C and anonymous D; use receipts for
  confirmed shared actions.
