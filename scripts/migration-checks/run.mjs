// Migration checks: applies drizzle/migrations 0022 onward to a fresh in-memory Postgres
// (PGlite) on top of a minimal reproduction of the live schema they depend on, then runs
// each suite as real `authenticated` / `anon` users against the actual RLS policies, grants,
// triggers and RPCs. Nothing touches the live database. See README.md.
import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const migrationsDir = join(here, '..', '..', 'drizzle', 'migrations')
const FIRST = 22 // earlier migrations are already live and reproduced by BASE below
const migrations = readdirSync(migrationsDir)
  .filter(f => /^\d{4}_.*\.sql$/.test(f) && Number(f.slice(0, 4)) >= FIRST)
  .sort()

const A = '00000000-0000-4000-8000-00000000000a' // requester
const B = '00000000-0000-4000-8000-00000000000b' // target
const C = '00000000-0000-4000-8000-00000000000c' // outsider
const ADMIN = '00000000-0000-4000-8000-0000000000ad'

// The slice of the live schema (supabase/migrations + drizzle 0000–0021) these migrations
// build on, reproduced with the same RLS shape. Keep in sync if those objects change.
const BASE = `
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to authenticated, anon, service_role;
grant execute on function auth.uid() to authenticated, anon, service_role;
grant usage on schema public to authenticated, anon, service_role;

create function public.touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at := now(); return new; end $$;
create function public.freeze_columns() returns trigger language plpgsql set search_path = public as $$
declare c text; begin if auth.uid() is null then return new; end if;
foreach c in array tg_argv loop if (to_jsonb(new) -> c) is distinct from (to_jsonb(old) -> c) then raise exception 'Column % cannot be changed after creation', c using errcode = '42501'; end if; end loop; return new; end $$;

create table public.profiles (id uuid primary key references auth.users on delete cascade, name text not null default '', onboarded boolean not null default false);
create table public.asks (id text primary key, author_id uuid references auth.users, ask text not null, is_demo boolean not null default false, created_at timestamptz not null default now());
create table public.user_roles (user_id uuid, role text);
create function public.has_role(u uuid, r text) returns boolean language sql stable security definer set search_path = public as $$ select exists(select 1 from public.user_roles where user_id = u and role = r) $$;
create function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$ select public.has_role(auth.uid(), 'admin') $$;
grant execute on function public.is_admin() to authenticated;

create table public.intro_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  member_id text not null,
  status text not null default 'requested',
  reason text not null default '',
  mutual_value text not null default '',
  requester_opt_in boolean not null default true,
  member_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  target_user_id uuid,
  unique (user_id, member_id)
);
grant select, insert, update, delete on public.intro_requests to authenticated;
alter table public.intro_requests enable row level security;
create policy "own intro requests" on public.intro_requests for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "target reads intro requests" on public.intro_requests for select to authenticated using (auth.uid() = target_user_id);
create policy "target responds to intro requests" on public.intro_requests for update to authenticated using (auth.uid() = target_user_id) with check (auth.uid() = target_user_id);

create table public.notifications (id uuid primary key default gen_random_uuid(), user_id uuid not null, kind text not null, text text not null, actor_id uuid, link text not null default '', read boolean not null default false, created_at timestamptz not null default now());
grant select, update on public.notifications to authenticated;
alter table public.notifications enable row level security;
create policy "own notifications read" on public.notifications for select to authenticated using (auth.uid() = user_id);
create policy "own notifications update" on public.notifications for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.invitations (id uuid primary key default gen_random_uuid(), code text not null unique, email text, max_uses integer not null default 1, uses integer not null default 0, expires_at timestamptz, revoked boolean not null default false, created_by uuid, created_at timestamptz not null default now());
create table public.early_access_members (id uuid primary key default gen_random_uuid(), user_id uuid not null unique, email text not null, status text not null default 'pending', invite_id uuid);
`

// Rows that exist before the new migrations run, so backfills are exercised.
const SEED = `
insert into auth.users values ('${A}'),('${B}'),('${C}'),('${ADMIN}');
insert into public.profiles(id) values ('${A}'),('${B}'),('${C}'),('${ADMIN}');
insert into public.user_roles values ('${ADMIN}','admin');
-- An accepted introduction from before 0022, and an assistant-style request with no target.
insert into public.intro_requests (id,user_id,member_id,target_user_id,member_opt_in,updated_at) values
  ('11111111-1111-4111-8111-111111111111','${C}','${B}','${B}',true, now() - interval '40 days');
insert into public.intro_requests (id,user_id,member_id) values ('22222222-2222-4222-8222-222222222222','${C}','${A}');
-- A request to a demo member (non-uuid id): never targetable, must not skew metrics.
insert into public.intro_requests (user_id,member_id) values ('${A}','demo-marcus-lee');
`

async function boot() {
  const db = new PGlite()
  await db.exec(BASE)
  await db.exec(SEED)
  for (const m of migrations) await db.exec(readFileSync(join(migrationsDir, m), 'utf8'))
  const as = async (uid, sql, params = []) => {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false); set role ${uid ? 'authenticated' : 'anon'};`)
    try { return { rows: (await db.query(sql, params)).rows } } catch (e) { return { error: e.message } } finally { await db.exec('reset role') }
  }
  const svc = async sql => { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false)`); return (await db.query(sql)).rows }
  return { db, as, svc }
}

const only = process.argv.slice(2)
const suites = readdirSync(here).filter(f => f.endsWith('.check.mjs')).sort()
  .filter(f => !only.length || only.some(o => f.startsWith(o)))
let pass = 0, fail = 0
console.log(`Migrations: ${migrations.join(', ')}`)
for (const file of suites) {
  console.log(`\n${file.replace('.check.mjs', '')}`)
  const ok = (cond, msg) => { if (cond) { pass++; console.log('  ✓', msg) } else { fail++; console.log('  ✗', msg) } }
  const ctx = { ...(await boot()), ok, A, B, C, ADMIN }
  try { await (await import(join(here, file))).default(ctx) } catch (e) { fail++; console.log('  ✗ suite crashed:', e.message) }
  await ctx.db.close()
}
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
