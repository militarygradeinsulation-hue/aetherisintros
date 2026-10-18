# Read-only inspection: the five current database issues

Nothing was changed. The security scanners (database scan, app MCP scan, dependency scan) report **zero findings**; the dependency scan is out of date (last run Oct 15). The five issues come from the **database linter**, which reports 189 issues grouped into exactly 5 types:

| # | Issue | Severity | Count | Diagnostic |
|---|---|---|---|---|
| 1 | RLS Enabled No Policy | INFO | 15 | Tables have row-level security on but no policies, so browser clients can't read them (locked by default). Linter rule 0008. |
| 2 | Function Search Path Mutable | WARN | 3 | Functions without a fixed `search_path`. Rule 0011. |
| 3 | Extension in Public | WARN | 2 | Extensions installed in the `public` schema. Rule 0014. |
| 4 | Public Can Execute SECURITY DEFINER Function | WARN | 20 | SECURITY DEFINER functions that signed-out (`anon`) callers can execute. Rule 0028. |
| 5 | Signed-In Users Can Execute SECURITY DEFINER Function | WARN | 149 | SECURITY DEFINER functions any `authenticated` user can execute. Rule 0029. |

## Affected code paths
- The linter returns only counts per type, not object names. The exact tables and functions are not listed here, and none are guessed.
- They all live in the database schema defined by the `supabase/migrations/` files. Repairs made through GitHub would be new migration files: `REVOKE EXECUTE ... FROM anon/authenticated`, `SET search_path = public`, policies or deliberate lock-down notes, and moving extensions to an `extensions` schema.
- Before revoking, check callers in `src/` (e.g. `supabase.rpc(...)` in `src/aetheris/admin-connections.tsx`, `src/aetheris/lib/connection-preflight.ts`, RPC-backed stores). Many of the 149 and 20 functions may be called on purpose. Example: `is_live_member` and invite claiming must stay callable.

## Optional next step (read-only)
Run catalog queries (`pg_proc` with `prosecdef`, `pg_class` with `relrowsecurity` and no `pg_policies` rows, `pg_extension`) to list the exact object names for each issue. No changes would be made.
