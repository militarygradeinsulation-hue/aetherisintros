# Offline recovery checks

These tools never connect to production. Historical SQL and journal files are read unchanged. Every SQL step is transactional; failed steps roll back, diagnostics continue, and `baselineComplete:false` prevents a deployability claim. Collision probes always roll back.

Install the same pinned disposable dependency used by the migration harness in a temporary folder, then make it available with `NODE_PATH`:

```sh
npm install --prefix /tmp/recovery-deps @electric-sql/pglite@0.2.17
NODE_PATH=/tmp/recovery-deps/node_modules bun scripts/recovery/dry-run-0058-0061.ts --baseline --repo /dev-server --to 78 --collisions --report /tmp/recovery-report.json
NODE_PATH=/tmp/recovery-deps/node_modules bun scripts/recovery/dry-run-0058-0061.ts --schema /tmp/public_schema.sql --repo /dev-server --collisions --report /tmp/recovery-live-schema-report.json
NODE_PATH=/tmp/recovery-deps/node_modules bunx vitest run scripts/recovery/replay.test.ts
```

Default range is 0058–0061; `--from`/`--to` permit subsets of 0058–0078. `--fixture /tmp/additional-structure.sql` adds explicitly supplied synthetic prerequisites, recorded separately in the report. Inputs are trusted SQL executed ONLY inside the disposable engine; never use a private data dump. No automatic SQL stripping, historical rewrites, or fake ledger entries occur. Exit status 2 means a failed baseline, target step, or collision probe. SHA-256 fingerprints record exactly which SQL bytes were evaluated.

## Synthetic baseline prerequisites

`fixtures/platform.sql` supplies empty auth/storage/realtime tables, roles, auth helpers, a publication, and fields referenced by historical SQL. It does not model managed services, realtime delivery, API access, or production settings. Two functions (`relative_label`, `memories_before_insert`) are copied verbatim from 0029 before frozen history to bridge its documented missing-definition ordering gap. No migration is skipped, edited, or reordered. Functions are later replaced by 0029 normally. There is no 0057 file/journal entry; the baseline consists of 19 frozen files and journaled 0000–0056.

## Verified offline result (2026-10-20)

- Platform fixture: PASS.
- Frozen baseline: 19/19 PASS.
- Repo baseline: 57/57 PASS.
- Target 0058–0078: 21/21 PASS, in journal order.
- Collision compatibility probes: 0082 PASS, 0090 PASS on this synthetic baseline; 0092 FAIL because `public.professional_opportunities` is introduced by 0089, outside this replay range. This is a missing prerequisite, not proof of a live collision.
- Dedicated supplied-schema tests detect all three existing-table collisions and prevent replay after a failed supplied schema.

The previously observed live collisions remain unresolved. Successful DDL/function creation does not exercise every deferred PL/pgSQL branch or prove RLS behavior. These are not end-to-end feature tests. Use the DBA handoff before drawing any production conclusion. The full JSON report can be regenerated with the first command above; never commit supplied live schema or private data.
