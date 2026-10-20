# DBA handoff: read-only migration state and structure

No application rows, user details, credentials, changes to grants, or ledger writes are requested. Run using an existing authorized DBA connection. Do not send connection strings or private row dumps.

## 1. Read the two ledgers

Run separately so a permission error does not hide the other result. Record the exact error if denied; do not guess state from missing objects.

```sql
BEGIN READ ONLY;
SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at, id;
COMMIT;
```

```sql
BEGIN READ ONLY;
SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;
COMMIT;
```

If a ledger's columns differ, first return only its structure:

```sql
SELECT table_schema, table_name, column_name, data_type
FROM information_schema.columns
WHERE (table_schema,table_name) IN
 (('drizzle','__drizzle_migrations'),('supabase_migrations','schema_migrations'))
ORDER BY table_schema,ordinal_position;
```

The Drizzle ledger uses hashes/timestamps, not necessarily migration names. Match these to the unchanged SQL bytes and `drizzle/migrations/meta/_journal.json`; preserve duplicates/discrepancies as evidence. Never insert entries or mark a migration applied to unblock a queue.

## 2. Obtain structure only

From the existing DBA connection, export **only public schema structure**, no owners or privileges tied to individual users:

```text
pg_dump --schema-only --no-owner --schema=public --file=public_schema.sql
```

Use the DBA's normal secure connection configuration; no connection string belongs in the handoff. Keep role GRANTs in the output: they are needed to test Data API access. Inspect the output before sharing: remove accidental row data, credentials, personally identifying comments/defaults, and environment-specific extensions. Supply a plain SQL schema-only input without psql `\restrict`/`\unrestrict` commands. Unsupported extension or role statements must be reported, not silently discarded by the runner.

If export is unavailable, return the following catalog-only extracts (no app rows):

```sql
BEGIN READ ONLY;
SELECT c.relname,c.relkind,c.relrowsecurity,c.relforcerowsecurity,c.relacl
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' ORDER BY c.relname;
SELECT t.relname, a.attname, format_type(a.atttypid,a.atttypmod) AS type,
 a.attnotnull,pg_get_expr(d.adbin,d.adrelid) AS default_expression
FROM pg_class t JOIN pg_namespace n ON n.oid=t.relnamespace
JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum>0 AND NOT a.attisdropped
LEFT JOIN pg_attrdef d ON d.adrelid=t.oid AND d.adnum=a.attnum
WHERE n.nspname='public' ORDER BY t.relname,a.attnum;
SELECT conrelid::regclass AS object,conname,pg_get_constraintdef(oid,true) AS definition
FROM pg_constraint WHERE connamespace='public'::regnamespace ORDER BY 1,2;
SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY 1,2;
SELECT schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
FROM pg_policies WHERE schemaname='public' ORDER BY tablename,policyname;
SELECT p.oid::regprocedure AS function,p.prosecdef,p.proconfig,p.proacl,pg_get_functiondef(p.oid)
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.prokind IN ('f','p') ORDER BY 1;
SELECT tgrelid::regclass AS object,tgname,pg_get_triggerdef(oid,true)
FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN
 (SELECT oid FROM pg_class WHERE relnamespace='public'::regnamespace) ORDER BY 1,2;
SELECT table_name,view_definition FROM information_schema.views WHERE table_schema='public' ORDER BY table_name;
COMMIT;
```

Catalog extracts assist comparison but are not a complete runnable schema dump. Inspect function bodies/comments for private constants before sharing; if redacted, mark definitions as redacted and do not treat them as validated.

## 3. Interpret pending versus phantom-applied

- **Pending:** no corresponding ledger entry, after exact hash/time mapping. Stage original migrations in order against the supplied structure; resolve existing-object collisions explicitly first. Historical files stay unchanged.
- **Phantom-applied:** a matching entry exists but expected objects do not. Prepare new forward-only reconciliation migrations per dependency group; never replay blindly or edit the old entry.
- **Ambiguous:** ledger denied, hashes differ, partial objects, or missing prerequisites. Remains blocked until the discrepancy is resolved.

Missing objects alone cannot distinguish these cases. The current source-baseline replay is synthetic and establishes neither production state nor permission compatibility.

## 4. Separate approvals still needed

1. Review the ledger/schema comparison and recovery group dry runs before any live recovery.
2. Explicit approval to apply candidate 0095 (currently outside migration history).
3. A distinct privileged operator approval to add one verified founder grant; no seed account or arbitrary-admin grant.
4. Signed-in feature verification before any publication. No branch cleanup is part of this work.
