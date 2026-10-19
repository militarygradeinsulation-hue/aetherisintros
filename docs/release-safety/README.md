# Prospect Intelligence release-safety audit

## Restored history

0082_business_lobby.sql, 0090_shared_opportunity_exchange.sql and
0092_basic_executive_membership.sql match commit
`a7ebe8262766e23fb1e86449989e285c496a1081` byte-for-byte. No journal or snapshot
edits were made by this repair. Journal indices and timestamps remain increasing;
the older index gap is preserved. 0093/0094 snapshots are empty custom-migration
metadata, not evidence that database objects were verified.

## Deployment blockers

- Existing business lobby, opportunity-save and membership tables conflict with
  unapplied historical CREATE TABLE statements. Do not disable historical files.
  Compare existing objects, policies, grants, functions and triggers against every
  historical statement before proposing ledger reconciliation or additive fixes.
- The legacy workspace key constraint excludes ICP keys. Simply permitting them
  exposes the existing SECURITY DEFINER general save RPC bypass of 0094's guard.
- 0093/0094 use the existing admin role plus account ownership, not a unique founder
  role. Another admin cannot access another account's prospects, but multiple
  admins can use their own workspaces. Exact single-owner access is not established.
- Existing policies/triggers are not replay-idempotent. Do not replay them blindly.

## Unapplied proposal

`icp-reconciliation.proposed.sql` replaces only the general save and reviewed ICP
save functions, blocking ICP writes through the general RPC and enforcing payload,
consent, transition and immutable-contact-review rules. Identical retries return
the saved version without duplicating timeline events. It does not resolve the
historical ledger, ICP key constraint or single-owner access requirement. It is not
an applied migration and must not be represented as a deployed security fix.

## Verification

- `node scripts/migration-checks/icp-release-safety.standalone.mjs`: 25 checks passed
  against disposable PGlite, including reproduction of current blockers, direct
  client forgery rejection after the proposed repair, other-account/admin isolation,
  consent, manual transitions, duplicate-history protection and legacy saves.
- Four existing application regression files: 39 tests passed.
- Automatic compilation: latest observed entry reports build OK.
- Restored historical files: no diff against the reference commit.
- No live database writes, production deployment or publication in this repair.
- GitHub remote synchronization and authenticated live workflow remain unverified.