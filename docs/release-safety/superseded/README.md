# Superseded, never-journaled migration drafts

These files used to sit in `drizzle/migrations/` with `NNNN_` names but were **never in
`drizzle/migrations/meta/_journal.json`**, so drizzle-kit never shipped them. Their
journaled replacements are the canonical versions:

| Archived file | Canonical journaled migration | Journal idx `0045` / `0046` is actually |
| --- | --- | --- |
| `0045_peer_group_feed.superseded-by-0076.sql` | `drizzle/migrations/0076_peer_group_feed.sql` | `0045_providers` (applied, ledger row 46) |
| `0046_peer_group_agendas.superseded-by-0077.sql` | `drizzle/migrations/0077_peer_group_agendas.sql` | `0046_impact_report` (applied, ledger row 47) |

Why they were moved (October 20, 2026 reconciliation):

- They duplicated the numbers of two applied migrations, and their SQL diverges from the
  journaled 0076/0077 (the 0045 draft grants broader column-level INSERT/UPDATE on
  `peer_group_members`, including `role`, and allows writes to `peer_groups.max_members`).
- `scripts/migration-checks/run.mjs` and `scripts/recovery/probe-missing-objects.mjs`
  listed files with `readdirSync` instead of the journal, so the disposable-DB harness was
  applying these drafts **before** 0076/0077 — i.e. it tested a schema production would
  never get. Both scripts now follow the journal and the harness fails on drift.

Bytes are unchanged (`git mv` only). **Do not move these back into `drizzle/migrations/`
and do not apply them anywhere.** Peer-group feed/agenda recovery uses 0076 → 0077, see
`docs/release-safety/MIGRATION_NORMALIZATION_2026_10_20.md`.
