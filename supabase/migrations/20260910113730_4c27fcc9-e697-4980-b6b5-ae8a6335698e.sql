create type public.privacy_scope_v2 as enum ('private','team','organization','shareable','public');

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  name text not null default 'New member',
  initials text not null default 'NM',
  title text not null default '',
  company text not null default '',
  location text not null default '',
  focus text not null default '',
  thesis text not null default '',
  bio text not null default '',
  looking_for text not null default '',
  can_help_with text not null default '',
  want_to_meet text not null default '',
  intro_preferences text not null default '',
  boundaries text not null default '',
  values_text text not null default '',
  availability text not null default '',
  industries text[] not null default '{}',
  expertise text[] not null default '{}',
  portrait_key text,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles readable by members" on public.profiles for select to authenticated using (true);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create table public.members (
  id text primary key,
  name text not null,
  initials text not null,
  title text not null,
  company text not null,
  location text not null,
  role text not null,
  industry text not null,
  bio text not null default '',
  tags text[] not null default '{}',
  expertise text[] not null default '{}',
  needs text[] not null default '{}',
  offers text[] not null default '{}',
  focus text not null default '',
  thesis text not null default '',
  availability text not null default '',
  mutuals text[] not null default '{}',
  last_interaction_days int not null default 0,
  relationship_status text not null default 'new',
  score jsonb not null default '{}',
  score_total int not null default 0,
  radar text not null default 'unknown_path',
  why_them text not null default '',
  why_you text not null default '',
  why_now text not null default '',
  best_path text[] not null default '{}',
  next_action text not null default '',
  dont_do text not null default '',
  confidence int not null default 0,
  opportunity_low int,
  opportunity_high int,
  intro_state text not null default 'recommended',
  joined text not null default '2025',
  created_at timestamptz not null default now()
);
grant select on public.members to authenticated;
grant all on public.members to service_role;
alter table public.members enable row level security;
create policy "members readable" on public.members for select to authenticated using (true);

create table public.companies (
  id text primary key,
  name text not null,
  industry text not null default '',
  location text not null default '',
  about text not null default '',
  member_ids text[] not null default '{}'
);
grant select on public.companies to authenticated;
grant all on public.companies to service_role;
alter table public.companies enable row level security;
create policy "companies readable" on public.companies for select to authenticated using (true);

create table public.posts (
  id text primary key,
  member_id text,
  author_id uuid references auth.users on delete cascade,
  kind text not null default 'Insight',
  text text not null,
  detail text not null default '',
  when_label text not null default 'Just now',
  response_count int not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert on public.posts to authenticated;
grant all on public.posts to service_role;
alter table public.posts enable row level security;
create policy "posts readable" on public.posts for select to authenticated using (true);
create policy "own posts insert" on public.posts for insert to authenticated with check (auth.uid() = author_id);

create table public.asks (
  id text primary key,
  member_id text,
  author_id uuid references auth.users on delete cascade,
  ask text not null,
  detail text not null default '',
  why_now text not null default '',
  offer text not null default '',
  industry text not null default '',
  location text not null default '',
  urgency text not null default 'medium',
  posted text not null default 'Just now',
  response_count int not null default 0,
  visibility text not null default 'network',
  created_at timestamptz not null default now()
);
grant select, insert on public.asks to authenticated;
grant all on public.asks to service_role;
alter table public.asks enable row level security;
create policy "asks readable" on public.asks for select to authenticated using (visibility = 'network' or auth.uid() = author_id);
create policy "own asks insert" on public.asks for insert to authenticated with check (auth.uid() = author_id);

create table public.ask_responses (
  id uuid primary key default gen_random_uuid(),
  ask_id text not null,
  user_id uuid not null references auth.users on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.ask_responses to authenticated;
grant all on public.ask_responses to service_role;
alter table public.ask_responses enable row level security;
create policy "own ask responses" on public.ask_responses for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.signals (
  id text primary key,
  member_id text not null,
  kind text not null,
  text text not null,
  when_label text not null default 'This week'
);
grant select on public.signals to authenticated;
grant all on public.signals to service_role;
alter table public.signals enable row level security;
create policy "signals readable" on public.signals for select to authenticated using (true);

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
  unique (user_id, member_id)
);
grant select, insert, update, delete on public.intro_requests to authenticated;
grant all on public.intro_requests to service_role;
alter table public.intro_requests enable row level security;
create policy "own intro requests" on public.intro_requests for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.relationships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  member_id text not null,
  kind text not null,
  created_at timestamptz not null default now(),
  unique (user_id, member_id, kind)
);
grant select, insert, delete on public.relationships to authenticated;
grant all on public.relationships to service_role;
alter table public.relationships enable row level security;
create policy "own relationships" on public.relationships for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.threads (
  id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  member_id text not null,
  intro_context text not null default '',
  commitment text not null default '',
  suggested text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.threads to authenticated;
grant all on public.threads to service_role;
alter table public.threads enable row level security;
create policy "own threads" on public.threads for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id text not null,
  user_id uuid not null references auth.users on delete cascade,
  sender text not null default 'me',
  text text not null,
  at_label text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
create policy "own messages" on public.messages for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  kind text not null default 'learning',
  category text not null default 'People',
  member_id text,
  text text not null,
  source text not null default 'Your action',
  confidence int not null default 100,
  scope public.privacy_scope_v2 not null default 'private',
  when_label text not null default 'Just now',
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.memories to authenticated;
grant all on public.memories to service_role;
alter table public.memories enable row level security;
create policy "own memories" on public.memories for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.preferences (
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.preferences to authenticated;
grant all on public.preferences to service_role;
alter table public.preferences enable row level security;
create policy "own preferences" on public.preferences for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.seed_threads (
  id text primary key,
  member_id text not null,
  intro_context text not null default '',
  unread boolean not null default false,
  commitment text not null default '',
  suggested text not null default '',
  messages jsonb not null default '[]'
);
grant select on public.seed_threads to authenticated;
grant all on public.seed_threads to service_role;
alter table public.seed_threads enable row level security;
create policy "seed threads readable" on public.seed_threads for select to authenticated using (true);

create table public.seed_learnings (
  id text primary key,
  category text not null,
  text text not null,
  source text not null default '',
  confidence int not null default 90,
  scope public.privacy_scope_v2 not null default 'private',
  when_label text not null default 'Recently'
);
grant select on public.seed_learnings to authenticated;
grant all on public.seed_learnings to service_role;
alter table public.seed_learnings enable row level security;
create policy "seed learnings readable" on public.seed_learnings for select to authenticated using (true);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, initials)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(coalesce(new.email,'member'), '@', 1)),
    upper(left(coalesce(new.raw_user_meta_data->>'name', coalesce(new.email,'M')), 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger intro_requests_touch before update on public.intro_requests for each row execute function public.touch_updated_at();