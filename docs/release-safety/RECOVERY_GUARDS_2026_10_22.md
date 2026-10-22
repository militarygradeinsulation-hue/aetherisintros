# Offline recovery guard improvements — October 22, 2026

Tracks #211. No historical SQL, migration journal, application behavior or production state is changed by this patch.

## Scope

- Added an offline complete-ledger classifier and source fingerprints. Exact hashes at older timestamps remain applied; conflicting or duplicate evidence fails closed. Unknown ledger history is preserved for review.
- Reject recorded 0062, separately reconciled collisions 0082/0090/0092, duplicates, reversed lists and unjournaled replay targets. Flag pending entries older than the latest ledger timestamp rather than assuming ordinary migration execution will recover them.
- Optionally bind the catalog rehearsal to a supplied ledger export and refuse replay of targets not confirmed pending by that export. Ledger discrepancies remain blockers even if isolated DDL succeeds. No SQL/ledger executor or automatic collision repair is provided.
- Stop after the first failed recovery target. Fingerprint collision probe SQL; regressions exercise rollback of preceding data updates, grants and DDL on success, expected collision, and unrelated failure.
- Verify reconstructed column ACLs and RLS with two synthetic members and an anonymous actor, including cross-member write denial, denied identity changes, private-column denial and caller-scoped SECURITY DEFINER reads. Extend observed-security rehearsal to the existing RLS-hardening candidate suite within a rollback transaction.

## Evidence and limits

The current repository already includes PR #226's observed-catalog loader and PR #233's journal-integrity and RLS-candidate work. These changes extend that work. They do not replace the dated production evidence or assert that the pending migration state has remained unchanged.

The October 20 catalog capture is not present in this checkout. The full 2,582-step observed-catalog reconstruction and its production-derived ACL behavior have **not** been rerun in this pass. New catalog tests use synthetic structure and identities. The synthetic source-history replay includes 0062 only to build a fresh database; that is distinct from the production recovery list, which excludes it. PGlite does not certify Supabase Auth, PostgREST/JWT execution, Storage, Realtime, production owners/default privileges or real member workflows.

## Required before production activation

1. Establish an authorized database management connection and confirm the exact production target privately.
2. Verify a restorable backup/restore point and an isolated restore test before any recovery write. Structure exports and ledger exports are not backups.
3. Recapture both complete ledgers and authoritative structure/ACLs; compare source hashes, object definitions, columns, constraints, indexes, triggers, policies and permissions. Review unknown rows and mismatches without rewriting historical SQL or ledger evidence.
4. Rehearse a reviewed new forward-only recovery package in dependency order on the isolated restore, preserving existing member records and grants. Recover the 20 confirmed pending migrations only if fresh evidence still supports them. Never replay/relabel 0062. Reconcile 0082/0090/0092 through separate new repairs based on authoritative definition differences; a duplicate-table error alone does not identify those differences.
5. Run member A/member B/anonymous/revoked-member/admin checks through real API and browser paths, including Library sharing/revocation/export denial, workspace roles/lifecycle, deal rooms, referrals, diagnostics and peer groups. Verify managed services and retain existing member data/functionality.
6. Obtain the appropriate operator approval for the exact reviewed production package and any privileged grant, apply under the approved recovery procedure, then verify real workflows before activation/publication. Candidate 0095 and 0096 remain outside the journal and require separate review/approval.

No production migration, member-record change, ledger write, candidate activation or Lovable editor action was performed.
