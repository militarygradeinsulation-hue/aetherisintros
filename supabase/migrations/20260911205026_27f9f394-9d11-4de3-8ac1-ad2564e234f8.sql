-- ============ roles ============
do $$ begin
  create type public.app_role as enum ('admin', 'moderator', 'member');
exception when duplicate_object then null; end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles readable" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(), 'admin')
$$;

-- ============ launch settings ============
create table if not exists public.launch_settings (
  id integer primary key default 1,
  mode text not null default 'first_1000',
  capacity integer not null default 1000,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  constraint launch_settings_single check (id = 1),
  constraint launch_settings_mode check (mode in ('first_1000','invite_only','closed'))
);
grant select on public.launch_settings to authenticated, anon;
grant all on public.launch_settings to service_role;
alter table public.launch_settings enable row level security;
create policy "launch settings readable" on public.launch_settings for select to authenticated, anon using (true);
create policy "admins update launch settings" on public.launch_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());
insert into public.launch_settings (id, mode, capacity) values (1, 'first_1000', 1000) on conflict (id) do nothing;

-- ============ whitelist / invitations / waitlist ============
create table if not exists public.whitelist_entries (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  status text not null default 'active',
  added_by uuid,
  note text not null default '',
  created_at timestamptz not null default now()
);
grant all on public.whitelist_entries to service_role;
grant select, insert, update, delete on public.whitelist_entries to authenticated;
alter table public.whitelist_entries enable row level security;
create policy "admins manage whitelist" on public.whitelist_entries for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  email text,
  max_uses integer not null default 1,
  uses integer not null default 0,
  expires_at timestamptz,
  revoked boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now()
);
grant all on public.invitations to service_role;
grant select, insert, update, delete on public.invitations to authenticated;
alter table public.invitations enable row level security;
create policy "admins manage invitations" on public.invitations for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table if not exists public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null default '',
  user_id uuid,
  status text not null default 'waiting',
  source text not null default 'signup',
  requested_at timestamptz not null default now()
);
grant all on public.waitlist_entries to service_role;
grant select, insert, update, delete on public.waitlist_entries to authenticated;
alter table public.waitlist_entries enable row level security;
create policy "admins manage waitlist" on public.waitlist_entries for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============ early access members ============
create table if not exists public.early_access_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  founding_member_number integer unique,
  status text not null default 'pending',
  source text not null default 'first_1000',
  invite_id uuid,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint early_access_status check (status in ('approved','waitlisted','pending','suspended','denied')),
  constraint early_access_number_range check (founding_member_number is null or (founding_member_number between 1 and 100000))
);
grant select, insert, update, delete on public.early_access_members to authenticated;
grant all on public.early_access_members to service_role;
alter table public.early_access_members enable row level security;
create policy "own early access row" on public.early_access_members for select to authenticated using (auth.uid() = user_id);
create policy "admins read early access" on public.early_access_members for select to authenticated using (public.is_admin());
create policy "admins write early access" on public.early_access_members for update to authenticated using (public.is_admin()) with check (public.is_admin());
create trigger early_access_touch before update on public.early_access_members
  for each row execute function public.touch_updated_at();

create or replace function public.is_live_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.early_access_members
    where user_id = auth.uid() and status = 'approved'
  )
$$;

-- public, non-enumerating counter
create or replace function public.founding_stats()
returns table (approved integer, capacity integer, mode text)
language sql stable security definer set search_path = public as $$
  select
    (select count(*)::int from public.early_access_members where status = 'approved' and founding_member_number is not null),
    (select s.capacity from public.launch_settings s where s.id = 1),
    (select s.mode from public.launch_settings s where s.id = 1)
$$;
grant execute on function public.founding_stats() to authenticated, anon;

-- ============ atomic claim ============
create or replace function public.claim_early_access(p_invite_code text default null)
returns table (status text, founding_member_number integer, mode text)
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_mode text;
  v_capacity integer;
  v_taken integer;
  v_next integer;
  v_existing public.early_access_members;
  v_invite public.invitations;
  v_whitelisted boolean := false;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select * into v_existing from public.early_access_members where user_id = v_uid;
  if found and v_existing.status in ('approved','suspended','denied') then
    return query select v_existing.status, v_existing.founding_member_number, (select s.mode from public.launch_settings s where s.id = 1);
    return;
  end if;

  select u.email into v_email from auth.users u where u.id = v_uid;

  select s.mode, s.capacity into v_mode, v_capacity
  from public.launch_settings s where s.id = 1 for update;

  if p_invite_code is not null and length(trim(p_invite_code)) > 0 then
    select * into v_invite from public.invitations
    where lower(code) = lower(trim(p_invite_code))
      and revoked = false
      and uses < max_uses
      and (expires_at is null or expires_at > now())
      and (email is null or lower(email) = lower(v_email))
    for update;
  end if;

  select exists (
    select 1 from public.whitelist_entries w
    where lower(w.email) = lower(v_email) and w.status = 'active'
  ) into v_whitelisted;

  select count(*)::int into v_taken from public.early_access_members
  where status = 'approved' and founding_member_number is not null;

  -- decide
  if v_mode = 'closed' and v_invite.id is null and not v_whitelisted then
    insert into public.early_access_members (user_id, email, status, source)
    values (v_uid, v_email, 'denied', 'closed')
    on conflict (user_id) do update set status = 'denied', source = 'closed', updated_at = now();
    return query select 'denied'::text, null::integer, v_mode;
    return;
  end if;

  if v_mode = 'invite_only' and v_invite.id is null and not v_whitelisted then
    insert into public.early_access_members (user_id, email, status, source)
    values (v_uid, v_email, 'pending', 'invite_only')
    on conflict (user_id) do update set status = 'pending', source = 'invite_only', updated_at = now();
    return query select 'pending'::text, null::integer, v_mode;
    return;
  end if;

  if v_taken >= v_capacity and v_invite.id is null and not v_whitelisted then
    insert into public.early_access_members (user_id, email, status, source)
    values (v_uid, v_email, 'waitlisted', 'capacity')
    on conflict (user_id) do update set status = 'waitlisted', source = 'capacity', updated_at = now();
    insert into public.waitlist_entries (email, user_id, source)
    values (v_email, v_uid, 'capacity') on conflict (email) do nothing;
    return query select 'waitlisted'::text, null::integer, v_mode;
    return;
  end if;

  select coalesce(max(m.founding_member_number), 0) + 1 into v_next
  from public.early_access_members m;

  insert into public.early_access_members
    (user_id, email, status, source, founding_member_number, approved_at, invite_id)
  values
    (v_uid, v_email,'approved',
     case when v_invite.id is not null then 'invite' when v_whitelisted then 'whitelist' else v_mode end,
     v_next, now(), v_invite.id)
  on conflict (user_id) do update set
    status = 'approved',
    founding_member_number = coalesce(early_access_members.founding_member_number, v_next),
    approved_at = coalesce(early_access_members.approved_at, now()),
    invite_id = coalesce(v_invite.id, early_access_members.invite_id),
    updated_at = now();

  if v_invite.id is not null then
    update public.invitations set uses = uses + 1 where id = v_invite.id;
  end if;

  delete from public.waitlist_entries where user_id = v_uid;

  return query select m.status, m.founding_member_number, v_mode
  from public.early_access_members m where m.user_id = v_uid;
end $$;
grant execute on function public.claim_early_access(text) to authenticated;

create or replace function public.join_waitlist(p_email text, p_name text default '')
returns void language sql security definer set search_path = public as $$
  insert into public.waitlist_entries (email, name, source)
  values (lower(trim(p_email)), coalesce(p_name,''), 'landing')
  on conflict (email) do nothing;
$$;
grant execute on function public.join_waitlist(text, text) to authenticated, anon;

-- ============ demo quarantine ============
alter table public.members   add column if not exists is_demo boolean not null default true;
alter table public.companies add column if not exists is_demo boolean not null default true;
alter table public.posts     add column if not exists is_demo boolean not null default false;
alter table public.asks      add column if not exists is_demo boolean not null default false;
alter table public.signals   add column if not exists is_demo boolean not null default true;

update public.members set is_demo = true;
update public.companies set is_demo = true;
update public.signals set is_demo = true;
update public.posts set is_demo = true where author_id is null;
update public.asks set is_demo = true where author_id is null;

grant select on public.members, public.companies, public.signals, public.posts, public.asks,
  public.seed_threads, public.seed_learnings to anon;

drop policy if exists "members readable" on public.members;
create policy "demo members readable" on public.members for select to authenticated, anon using (is_demo = true);

drop policy if exists "companies readable" on public.companies;
create policy "demo companies readable" on public.companies for select to authenticated, anon using (is_demo = true);

drop policy if exists "signals readable" on public.signals;
create policy "demo signals readable" on public.signals for select to authenticated, anon using (is_demo = true);

drop policy if exists "seed threads readable" on public.seed_threads;
create policy "demo threads readable" on public.seed_threads for select to authenticated, anon using (true);

drop policy if exists "seed learnings readable" on public.seed_learnings;
create policy "demo learnings readable" on public.seed_learnings for select to authenticated, anon using (true);

drop policy if exists "posts readable" on public.posts;
create policy "live posts readable" on public.posts for select to authenticated
  using (is_demo = false and author_id is not null and public.is_live_member());
create policy "demo posts readable" on public.posts for select to anon using (is_demo = true);

drop policy if exists "own posts insert" on public.posts;
create policy "live posts insert" on public.posts for insert to authenticated
  with check (auth.uid() = author_id and is_demo = false and public.is_live_member());
create policy "own posts update" on public.posts for update to authenticated
  using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy "own posts delete" on public.posts for delete to authenticated
  using (auth.uid() = author_id);

drop policy if exists "asks readable" on public.asks;
create policy "live asks readable" on public.asks for select to authenticated
  using (is_demo = false and author_id is not null and public.is_live_member());
create policy "demo asks readable" on public.asks for select to anon using (is_demo = true);

drop policy if exists "own asks insert" on public.asks;
create policy "live asks insert" on public.asks for insert to authenticated
  with check (auth.uid() = author_id and is_demo = false and public.is_live_member());
create policy "own asks update" on public.asks for update to authenticated
  using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy "own asks delete" on public.asks for delete to authenticated
  using (auth.uid() = author_id);

-- ============ live profiles ============
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists visibility text not null default 'network';

drop policy if exists "profiles readable by members" on public.profiles;
create policy "approved profiles readable by members" on public.profiles for select to authenticated
  using (
    auth.uid() = id
    or (public.is_live_member() and exists (
      select 1 from public.early_access_members m
      where m.user_id = public.profiles.id and m.status = 'approved'
    ))
  );

-- ============ live social tables ============
create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references auth.users(id) on delete cascade,
  followee_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'follow',
  created_at timestamptz not null default now(),
  unique (follower_id, followee_id, kind),
  constraint follows_kind check (kind in ('follow','connection','saved')),
  constraint follows_not_self check (follower_id <> followee_id)
);
grant select, insert, update, delete on public.follows to authenticated;
grant all on public.follows to service_role;
alter table public.follows enable row level security;
create policy "follows readable by members" on public.follows for select to authenticated
  using (public.is_live_member() and (kind <> 'saved' or auth.uid() = follower_id));
create policy "own follows write" on public.follows for insert to authenticated
  with check (auth.uid() = follower_id and public.is_live_member());
create policy "own follows delete" on public.follows for delete to authenticated
  using (auth.uid() = follower_id);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id text not null,
  author_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.post_comments to authenticated;
grant all on public.post_comments to service_role;
alter table public.post_comments enable row level security;
create policy "comments readable by members" on public.post_comments for select to authenticated using (public.is_live_member());
create policy "own comments insert" on public.post_comments for insert to authenticated
  with check (auth.uid() = author_id and public.is_live_member());
create policy "own comments update" on public.post_comments for update to authenticated
  using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy "own comments delete" on public.post_comments for delete to authenticated
  using (auth.uid() = author_id);

create table if not exists public.post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'like',
  created_at timestamptz not null default now(),
  unique (post_id, user_id, kind),
  constraint reactions_kind check (kind in ('like','save','repost'))
);
grant select, insert, update, delete on public.post_reactions to authenticated;
grant all on public.post_reactions to service_role;
alter table public.post_reactions enable row level security;
create policy "reactions readable by members" on public.post_reactions for select to authenticated using (public.is_live_member());
create policy "own reactions insert" on public.post_reactions for insert to authenticated
  with check (auth.uid() = user_id and public.is_live_member());
create policy "own reactions delete" on public.post_reactions for delete to authenticated
  using (auth.uid() = user_id);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  text text not null,
  actor_id uuid,
  link text not null default '',
  read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "own notifications read" on public.notifications for select to authenticated using (auth.uid() = user_id);
create policy "own notifications update" on public.notifications for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "members create notifications" on public.notifications for insert to authenticated
  with check (public.is_live_member() and (actor_id is null or actor_id = auth.uid()));

-- ============ real direct messaging ============
create table if not exists public.dm_threads (
  id uuid primary key default gen_random_uuid(),
  member_a uuid not null references auth.users(id) on delete cascade,
  member_b uuid not null references auth.users(id) on delete cascade,
  intro_context text not null default '',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dm_threads_distinct check (member_a <> member_b),
  unique (member_a, member_b)
);
grant select, insert, update on public.dm_threads to authenticated;
grant all on public.dm_threads to service_role;
alter table public.dm_threads enable row level security;
create policy "participants read threads" on public.dm_threads for select to authenticated
  using (auth.uid() in (member_a, member_b));
create policy "participants create threads" on public.dm_threads for insert to authenticated
  with check (public.is_live_member() and auth.uid() = created_by and auth.uid() in (member_a, member_b));
create policy "participants update threads" on public.dm_threads for update to authenticated
  using (auth.uid() in (member_a, member_b)) with check (auth.uid() in (member_a, member_b));
create trigger dm_threads_touch before update on public.dm_threads
  for each row execute function public.touch_updated_at();

create table if not exists public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.dm_threads(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);
create index if not exists dm_messages_thread_idx on public.dm_messages (thread_id, created_at);
grant select, insert on public.dm_messages to authenticated;
grant all on public.dm_messages to service_role;
alter table public.dm_messages enable row level security;
create policy "participants read messages" on public.dm_messages for select to authenticated
  using (exists (
    select 1 from public.dm_threads t
    where t.id = dm_messages.thread_id and auth.uid() in (t.member_a, t.member_b)
  ));
create policy "participants send messages" on public.dm_messages for insert to authenticated
  with check (
    auth.uid() = sender_id and public.is_live_member() and exists (
      select 1 from public.dm_threads t
      where t.id = dm_messages.thread_id and auth.uid() in (t.member_a, t.member_b)
    )
  );

-- ============ real introductions between accounts ============
alter table public.intro_requests add column if not exists target_user_id uuid;
drop policy if exists "target reads intro requests" on public.intro_requests;
create policy "target reads intro requests" on public.intro_requests for select to authenticated
  using (auth.uid() = target_user_id);
drop policy if exists "target responds to intro requests" on public.intro_requests;
create policy "target responds to intro requests" on public.intro_requests for update to authenticated
  using (auth.uid() = target_user_id) with check (auth.uid() = target_user_id);

-- ============ circles ============
create table if not exists public.circle_memberships (
  id uuid primary key default gen_random_uuid(),
  circle_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  unique (circle_id, user_id)
);
grant select, insert, delete on public.circle_memberships to authenticated;
grant all on public.circle_memberships to service_role;
alter table public.circle_memberships enable row level security;
create policy "memberships readable by members" on public.circle_memberships for select to authenticated using (public.is_live_member());
create policy "own membership insert" on public.circle_memberships for insert to authenticated
  with check (auth.uid() = user_id and public.is_live_member());
create policy "own membership delete" on public.circle_memberships for delete to authenticated
  using (auth.uid() = user_id);

-- ============ lock private tables to approved members ============
create or replace function public.tighten_noop() returns void language sql as $$ select 1 $$;