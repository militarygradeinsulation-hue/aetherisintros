# November 24 release preflight — live ledger evidence

Read-only inspection of the actual Lovable Cloud Ask Intros database, using the
original project rather than an unrelated external Supabase instance:

- Current GitHub journal: 113 entries. Live Drizzle ledger: 90 rows.
- 25 journal timestamps are absent; two live timestamps are not in the journal.
  Timestamp gaps alone cannot identify unapplied SQL; compare exact hashes.
- 87 rows have SHA-256-shaped hashes. Three have explicit manual markers,
  corresponding to 0106, 0107 and 0108 at their original journal timestamps.
- The current planner previously rejected the entire ledger because these
  three values were not SHA-256. It now accepts only exact manual markers
  at their correct timestamps and classifies them MANUAL_UNVERIFIED.
  The markers are evidence for investigation, not proof of applied SQL.

Preserve both ledgers and every original migration. Never replay all pending
timestamps, replace a marker with a fabricated hash, insert missing ledger
rows, or use a destructive restore. Run the existing offline planner and
catalog rehearsal against a fresh private ledger/catalog export. Do not
commit raw catalog definitions, credentials, or member rows to this repository.

Before live activation, verify an actual backup and restore path in the
hosting account, reconcile the missing and manually marked groups using
current definitions and permissions, and validate the proposed forward-only
migration against a disposable production-compatible schema. Verify real
member account and outsider isolation, then coordinate code and SQL changes.
The connected Lovable tools expose query and publish, not backup/restore or
Git branch synchronization controls. No production writes have been made.
