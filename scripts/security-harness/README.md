# Capability security harness

Loads the live `public` schema (structure only, never data) into an in-memory
Postgres (PGlite), creates disposable users/rows, and exercises the real RLS
policies and RPCs as `authenticated` and `anon`. Nothing touches the live database.

    pg_dump --schema-only --no-owner -n public -f /tmp/public_schema.sql
    mkdir -p /tmp/rlsh && cp scripts/security-harness/*.ts /tmp/rlsh && cd /tmp/rlsh
    bun add @electric-sql/pglite && bun isolation.test.ts

Re-run after every migration that touches approvals, events, links, delegates or capability tables.
