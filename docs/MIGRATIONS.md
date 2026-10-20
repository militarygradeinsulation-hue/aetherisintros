# Database migration policy

- `supabase/migrations/` is **frozen history** (19 files, through 2026-09-16). They are already applied to the live database (`supabase_migrations.schema_migrations`). Never edit, rename, delete or add files there.
- `drizzle/migrations/` is the **only forward path** (0000 onward, tracked in `drizzle.__drizzle_migrations`). Every new schema change is a new Drizzle custom migration applied through the project migration tool.
- Never squash or rewrite either history. Both journals must stay exactly as applied.
- Every new public table ships in the same migration with: explicit GRANTs (minimum needed), RLS enabled, owner-scoped policies, no authenticated TRUNCATE/REFERENCES/TRIGGER, and immutable identity columns (`freeze_columns`).
- Data fixes go through data queries, not migrations (except backfills belonging to an additive schema change).
- Every new migration ships with a suite in `scripts/migration-checks/` that exercises its RLS, grants, triggers and RPCs as `authenticated` and `anon`; run it before pushing.
- No schema change is made by running SQL directly against the live database. Objects created that way (found on 2026-10-08: 19 functions, 25 triggers, `events`, `members_base`, the `members` view) were invisible to review and shipped with public access; they are now recorded in `0029` and locked down in `0030`. If an emergency fix is ever applied directly, record it as a migration the same day.
- Every `SECURITY DEFINER` function either checks the caller (`auth.uid()` or `is_admin()`) or has EXECUTE revoked from `PUBLIC`, `anon` and `authenticated`. Supabase grants EXECUTE to everyone by default.
- Only journaled files may carry an `NNNN_` name in `drizzle/migrations/`. Drafts, superseded duplicates and candidate SQL live under `docs/release-safety/` (never with a bare `NNNN_*.sql` name in the migrations folder). `node scripts/migration-checks/journal-integrity.standalone.mjs` enforces this, and `run.mjs` refuses to run on journal drift. Status of 0058–0094 against the production ledger: `docs/release-safety/MIGRATION_NORMALIZATION_2026_10_20.md`.
