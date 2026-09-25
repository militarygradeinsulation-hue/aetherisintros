import { PGlite } from '@electric-sql/pglite'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'
import { readFileSync } from 'fs'
export async function makeDb() {
  const db = new PGlite({ extensions: { pg_trgm } })
  await db.exec(`
    create role anon nologin; create role sandbox_exec nologin; create role supabase_admin; create role authenticator; create role supabase_auth_admin; create role supabase_storage_admin; create role dashboard_user; create role pgbouncer; do $$ begin create role postgres; exception when others then null; end $$; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth; grant usage on schema auth to anon, authenticated, service_role;
    create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz default now(), raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claims', true)::json->>'sub','')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(current_setting('request.jwt.claims', true),'{}')::jsonb $$;
    create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claims', true)::json->>'role' $$;
    grant execute on all functions in schema auth to anon, authenticated, service_role;
    create schema if not exists extensions; create extension pg_trgm with schema public;`)
  let sql = readFileSync('/tmp/public_schema.sql', 'utf8')
    .replace(/^\\(un)?restrict .*$/gm, '').replace(/^SET transaction_timeout.*$/m, '').replace(/^SET row_security = off;$/m, '')
    .replace(/^CREATE SCHEMA public;$/m, '')
    .replace(/^COMMENT ON SCHEMA public.*$/m, '')
  // drop C-language pg_trgm functions/types dumped into public (provided by the extension)
  sql = sql.replace(/CREATE FUNCTION public\.\w+\([^;]*?LANGUAGE c[\s\S]*?\$function\$;\n/g, '')
  const fails: string[] = []
  try { await db.exec(sql) } catch (e: any) { fails.push(e.message + ' @ ' + (e.position ? sql.slice(Math.max(0,+e.position-200), +e.position+80) : '')) }
  return { db, fails }
}
if (import.meta.main) { const { fails } = await makeDb(); console.log('failed statements:', fails.length); console.log(fails.slice(0, 15).join('\n')) }
