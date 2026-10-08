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
create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz, last_sign_in_at timestamptz, raw_user_meta_data jsonb not null default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to authenticated, anon, service_role;
grant execute on function auth.uid() to authenticated, anon, service_role;
grant usage on schema public to authenticated, anon, service_role;
-- Supabase's defaults: every new public table is granted to anon and authenticated, so a
-- migration that forgets to revoke is tested with the access it would really have.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;

create function public.touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at := now(); return new; end $$;
create function public.freeze_columns() returns trigger language plpgsql set search_path = public as $$
declare c text; begin if auth.uid() is null then return new; end if;
foreach c in array tg_argv loop if (to_jsonb(new) -> c) is distinct from (to_jsonb(old) -> c) then raise exception 'Column % cannot be changed after creation', c using errcode = '42501'; end if; end loop; return new; end $$;

create table public.profiles (id uuid primary key references auth.users on delete cascade, name text not null default '', onboarded boolean not null default false,
  email text, initials text, title text, company text, location text, focus text, thesis text, bio text, looking_for text, can_help_with text,
  availability text, industries text[], expertise text[], what_i_do text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.asks (id text primary key, author_id uuid references auth.users, ask text not null, is_demo boolean not null default false, response_count int not null default 0, created_at timestamptz not null default now(),
  member_id text, posted text not null default '', urgency text not null default 'medium', industry text not null default '', visibility text not null default 'network');
revoke all on public.asks from anon, authenticated;
grant select, insert, update on public.asks to authenticated;
alter table public.asks enable row level security;
create policy "asks readable" on public.asks for select to authenticated using (true);
create policy "own asks" on public.asks for all to authenticated using (auth.uid() = author_id) with check (auth.uid() = author_id);
create table public.ask_responses (id uuid primary key default gen_random_uuid(), ask_id text not null, user_id uuid not null references auth.users on delete cascade, text text not null, created_at timestamptz not null default now());
grant select, insert, delete on public.ask_responses to authenticated;
alter table public.ask_responses enable row level security;
create policy "own ask responses" on public.ask_responses for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ask author reads responses" on public.ask_responses for select to authenticated
  using (exists (select 1 from public.asks a where a.id = ask_responses.ask_id and a.author_id = auth.uid()));
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
grant select, insert, update on public.notifications to authenticated;
-- Live policy (as in production): any live member may insert a notification for anyone.
create policy "members create notifications" on public.notifications for insert to authenticated
  with check (actor_id is null or actor_id = auth.uid());
alter table public.notifications enable row level security;
create policy "own notifications read" on public.notifications for select to authenticated using (auth.uid() = user_id);
create policy "own notifications update" on public.notifications for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Production-only objects (created outside supabase/ and drizzle/ migrations), copied from the
-- live database so these checks exercise the triggers that actually run there.
create table public.relationships (id uuid primary key default gen_random_uuid(), user_id uuid not null, member_id text not null, kind text not null, created_at timestamptz not null default now(), unique (user_id, member_id, kind));
create table public.follows (id uuid primary key default gen_random_uuid(), follower_id uuid not null, followee_id uuid not null, kind text not null, created_at timestamptz not null default now(), unique (follower_id, followee_id, kind));
grant select, insert, delete on public.follows to authenticated;
alter table public.follows enable row level security;
create policy "follows readable" on public.follows for select to authenticated using (kind <> 'saved' or auth.uid() = follower_id);
create policy "own follows write" on public.follows for insert to authenticated with check (auth.uid() = follower_id);
create table public.dm_threads (id uuid primary key default gen_random_uuid(), member_a uuid not null, member_b uuid not null, intro_context text not null default '', created_by uuid not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (member_a, member_b));
grant select, insert, update on public.dm_threads to authenticated;
alter table public.dm_threads enable row level security;
create policy "participants read threads" on public.dm_threads for select to authenticated using (auth.uid() = member_a or auth.uid() = member_b);
create policy "participants create threads" on public.dm_threads for insert to authenticated with check (auth.uid() = created_by and (auth.uid() = member_a or auth.uid() = member_b));
create table public.dm_messages (id uuid primary key default gen_random_uuid(), thread_id uuid not null references public.dm_threads(id) on delete cascade, sender_id uuid not null, text text not null, created_at timestamptz not null default now());
grant select, insert on public.dm_messages to authenticated;
alter table public.dm_messages enable row level security;
create policy "participants read messages" on public.dm_messages for select to authenticated using (exists (select 1 from public.dm_threads t where t.id = thread_id and (auth.uid() = t.member_a or auth.uid() = t.member_b)));
create policy "participants send messages" on public.dm_messages for insert to authenticated with check (auth.uid() = sender_id and exists (select 1 from public.dm_threads t where t.id = thread_id and (auth.uid() = t.member_a or auth.uid() = t.member_b)));

create function public.set_intro_target() returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if new.target_user_id is null and new.member_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    select p.id into new.target_user_id from public.profiles p where p.id = new.member_id::uuid;
  end if;
  return new;
end $$;
create trigger intro_requests_set_target before insert or update on public.intro_requests for each row execute function set_intro_target();
create trigger intro_requests_touch before update on public.intro_requests for each row execute function touch_updated_at();

create function public.notify_intro_activity() returns trigger language plpgsql security definer set search_path to 'public' as $$
declare v_requester text; v_target text;
begin
  select coalesce(nullif(btrim(name),''),'A member') into v_requester from profiles where id = new.user_id;
  select coalesce(nullif(btrim(name),''),'A member') into v_target   from profiles where id = new.target_user_id;
  if TG_OP = 'INSERT' and new.target_user_id is not null then
    insert into notifications (user_id, kind, text, actor_id, link)
    values (new.target_user_id, 'intro_request', v_requester || ' asked to be introduced: ' || new.reason, new.user_id, '/app/introductions');
    return new;
  end if;
  if TG_OP = 'UPDATE' and new.status is distinct from old.status then
    insert into notifications (user_id, kind, text, actor_id, link)
    values (new.user_id, 'intro_' || new.status,
            v_target || ' ' || case new.status when 'accepted' then 'accepted your introduction request'
              when 'declined' then 'declined your introduction request' when 'connected' then 'is now connected with you'
              else 'updated your introduction request' end,
            new.target_user_id, '/app/introductions');
    if new.status in ('accepted','connected') and new.target_user_id is not null then
      insert into relationships (user_id, member_id, kind) values (new.user_id, new.target_user_id::text, 'connection') on conflict (user_id, member_id, kind) do nothing;
      insert into relationships (user_id, member_id, kind) values (new.target_user_id, new.user_id::text, 'connection') on conflict (user_id, member_id, kind) do nothing;
    end if;
  end if;
  return new;
end $$;
create trigger intro_requests_notify after insert or update on public.intro_requests for each row execute function notify_intro_activity();

-- Tables the live-only objects recorded in 0029 read and write (columns they use).
create type public.verification_status as enum ('pending','scanning','manual_review','needs_more_proof','verified','rejected','suspended');
create table public.member_verifications (id uuid primary key default gen_random_uuid(), user_id uuid not null unique, status public.verification_status not null default 'pending',
  verification_level int not null default 0, legal_name text, display_name text, business_name text, work_email text, business_domain text, professional_url text,
  decision_reason text, risk_flags jsonb not null default '[]', submitted_at timestamptz, scanned_at timestamptz, verified_at timestamptz, updated_at timestamptz not null default now());
create table public.memories (id uuid primary key default gen_random_uuid(), user_id uuid not null, member_id text, kind text not null default 'learning', category text not null default '',
  text text not null, source text not null default '', confidence int not null default 100, scope text not null default 'private', when_label text not null default '', created_at timestamptz not null default now());
create table public.posts (id text primary key, member_id text, author_id uuid, kind text not null default 'Insight', text text not null, when_label text not null default '', created_at timestamptz not null default now(), is_demo boolean not null default false);
create table public.members (id text primary key, name text not null, initials text not null, title text not null, company text not null, location text not null, role text not null, industry text not null,
  bio text not null default '', tags text[] not null default '{}', expertise text[] not null default '{}', needs text[] not null default '{}', offers text[] not null default '{}',
  focus text not null default '', thesis text not null default '', availability text not null default '', mutuals text[] not null default '{}', last_interaction_days int not null default 0,
  relationship_status text not null default 'new', score jsonb not null default '{}', score_total int not null default 0, radar text not null default 'unknown_path',
  why_them text not null default '', why_you text not null default '', why_now text not null default '', best_path text[] not null default '{}', next_action text not null default '',
  dont_do text not null default '', confidence int not null default 0, opportunity_low int, opportunity_high int, intro_state text not null default 'recommended',
  joined text not null default '2025', created_at timestamptz not null default now(), is_demo boolean not null default true);
create table public.crm_activities (id uuid primary key default gen_random_uuid(), owner_id uuid);
create table public.crm_companies (id uuid primary key default gen_random_uuid(), owner_id uuid);
create table public.crm_notes (id uuid primary key default gen_random_uuid(), owner_id uuid);
create table public.crm_opportunities (id uuid primary key default gen_random_uuid(), owner_id uuid);
create table public.crm_people (id uuid primary key default gen_random_uuid(), owner_id uuid);
create table public.crm_tasks (id uuid primary key default gen_random_uuid(), owner_id uuid);
create function public.is_live_member() returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.profiles where id = auth.uid()) $$;
revoke all on function public.is_live_member() from public, anon;
grant execute on function public.is_live_member() to authenticated;

create table public.invitations (id uuid primary key default gen_random_uuid(), code text not null unique, email text, max_uses integer not null default 1, uses integer not null default 0, expires_at timestamptz, revoked boolean not null default false, created_by uuid, created_at timestamptz not null default now());
create table public.early_access_members (id uuid primary key default gen_random_uuid(), user_id uuid not null unique, email text not null, status text not null default 'pending', invite_id uuid);
`

// Rows that exist before the new migrations run, so backfills are exercised.
const SEED = `
insert into auth.users values ('${A}'),('${B}'),('${C}'),('${ADMIN}');
insert into public.profiles(id) values ('${A}'),('${B}'),('${C}'),('${ADMIN}');
insert into public.user_roles values ('${ADMIN}','admin');
-- An ask that already has two replies but a stale count of 0, from before 0027.
insert into public.asks (id, author_id, ask) values ('ask-old', '${A}', 'Looking for a CFO');
insert into public.ask_responses (ask_id, user_id, text) values ('ask-old', '${B}', 'Happy to help'), ('ask-old', '${C}', 'Me too');
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
