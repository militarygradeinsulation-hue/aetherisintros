# Migration checks

Applies every Drizzle migration from `0022` onward to a fresh in-memory Postgres (PGlite),
on top of a minimal reproduction of the live objects they build on (see `BASE` in
`run.mjs`), then exercises each suite as real `authenticated` and `anon` users against the
actual RLS policies, grants, triggers and RPCs. Nothing touches the live database, and no
schema dump is needed.

    mkdir -p /tmp/mc && cd /tmp/mc && bun add @electric-sql/pglite@0.2.17
    ln -sfn /tmp/mc/node_modules <repo>/scripts/migration-checks/node_modules
    node <repo>/scripts/migration-checks/run.mjs            # every suite
    node <repo>/scripts/migration-checks/run.mjs cohorts    # one suite by name prefix

Pin PGlite 0.2.x: the 0.3.x builds tested here crash on `RAISE` inside PL/pgSQL.

| Suite | Migration | Covers |
| --- | --- | --- |
| `outcomes` | 0022 | consent guard (no self-acceptance, server-owned `accepted_at`), outcome RLS and private notes, check-in timing, admin proof metrics |
| `track-record` | 0023 | opt-in visibility, banding without numbers, minimum sample, counterpart-only evidence |
| `company` | 0024 | RPC-only membership, sharing and withdrawal, approved-only handovers, departure, last-admin guard, coverage |
| `cohorts` | 0025 | admin-only invites, per-row outcomes, email lock and expiry, activation stages, revocation |
| `notifications` | 0026 | one notification per request from any path, acceptance notice, no private context, mark-read scope |
| `ask-responses` | 0027 | backfill of stale counts, count follows replies added and withdrawn, no tampering via others' replies |

Run after any change to these migrations, and add a suite with each new one. The live-schema
harness in `scripts/security-harness` remains the check against the real dumped schema.
