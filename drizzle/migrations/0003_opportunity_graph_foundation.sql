-- Missions
create table public.missions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  title text not null,
  objective text not null default '',
  mission_type text not null default 'custom',
  target_company text not null default '',
  target_industry text not null default '',
  target_geography text not null default '',
  target_date date,
  horizon text not null default '',
  privacy text not null default 'private',
  status text not null default 'active',
  success_definition text not null default '',
  linked_opportunity_id uuid,
  linked_company_id uuid,
  linked_ask_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint missions_type_chk check (mission_type in ('customers','partnership','capital','hiring','acquisition','market_entry','vendor','advisor','board','custom')),
  constraint missions_status_chk check (status in ('active','paused','completed')),
  constraint missions_privacy_chk check (privacy in ('private','trusted','network'))
);
grant select, insert, update, delete on public.missions to authenticated;
grant all on public.missions to service_role;
alter table public.missions enable row level security;
create policy "own missions" on public.missions for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create trigger missions_touch before update on public.missions for each row execute function public.touch_updated_at();

-- Intent exchange on existing asks
alter table public.asks
  add column if not exists category text not null default 'LOOKING FOR',
  add column if not exists mission_id uuid,
  add column if not exists expires_at timestamptz,
  add column if not exists status text not null default 'active',
  add column if not exists reveal_identity boolean not null default true,
  add column if not exists company text not null default '';
drop policy if exists "live asks readable" on public.asks;
create policy "own asks readable" on public.asks for select to authenticated using (author_id = auth.uid());
create policy "network asks readable" on public.asks for select to authenticated using (
  is_demo = false and author_id is not null and public.is_live_member()
  and visibility in ('network','shareable') and status = 'active'
  and (expires_at is null or expires_at > now())
);

-- Context capsules
create table public.intro_context_capsules (
  id uuid primary key default gen_random_uuid(),
  intro_request_id uuid not null unique references public.intro_requests(id) on delete cascade,
  author_id uuid not null default auth.uid(),
  why_exists text not null default '',
  why_requester text not null default '',
  why_target text not null default '',
  why_now text not null default '',
  first_goal text not null default '',
  shared_context text not null default '',
  excluded_context text not null default '',
  mission_title text not null default '',
  signal_text text not null default '',
  requester_approved boolean not null default true,
  target_approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.intro_context_capsules to authenticated;
grant all on public.intro_context_capsules to service_role;
alter table public.intro_context_capsules enable row level security;
create policy "capsule participants read" on public.intro_context_capsules for select to authenticated using (
  exists (select 1 from public.intro_requests r where r.id = intro_request_id and (r.user_id = auth.uid() or r.target_user_id = auth.uid())));
create policy "requester creates capsule" on public.intro_context_capsules for insert to authenticated with check (
  author_id = auth.uid() and exists (select 1 from public.intro_requests r where r.id = intro_request_id and r.user_id = auth.uid()));
create policy "capsule participants update" on public.intro_context_capsules for update to authenticated using (
  exists (select 1 from public.intro_requests r where r.id = intro_request_id and (r.user_id = auth.uid() or r.target_user_id = auth.uid())))
  with check (exists (select 1 from public.intro_requests r where r.id = intro_request_id and (r.user_id = auth.uid() or r.target_user_id = auth.uid())));
create trigger capsules_touch before update on public.intro_context_capsules for each row execute function public.touch_updated_at();

-- Relationship rooms (only after both sides opt in)
create table public.relationship_rooms (
  id uuid primary key default gen_random_uuid(),
  intro_request_id uuid not null unique references public.intro_requests(id) on delete cascade,
  participant_a uuid not null,
  participant_b uuid not null,
  status text not null default 'open',
  outcome text not null default '',
  next_steps jsonb not null default '[]'::jsonb,
  commitments jsonb not null default '[]'::jsonb,
  shared_links jsonb not null default '[]'::jsonb,
  meeting_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.relationship_rooms to authenticated;
grant all on public.relationship_rooms to service_role;
alter table public.relationship_rooms enable row level security;
create policy "room participants read" on public.relationship_rooms for select to authenticated using (auth.uid() in (participant_a, participant_b));
create policy "room opens after double opt in" on public.relationship_rooms for insert to authenticated with check (
  auth.uid() in (participant_a, participant_b) and exists (
    select 1 from public.intro_requests r where r.id = intro_request_id
      and r.requester_opt_in and r.member_opt_in
      and ((r.user_id = participant_a and r.target_user_id = participant_b) or (r.user_id = participant_b and r.target_user_id = participant_a))));
create policy "room participants update" on public.relationship_rooms for update to authenticated using (auth.uid() in (participant_a, participant_b)) with check (auth.uid() in (participant_a, participant_b));
create trigger rooms_touch before update on public.relationship_rooms for each row execute function public.touch_updated_at();

-- Intro feedback (private by default)
create table public.intro_feedback (
  id uuid primary key default gen_random_uuid(),
  intro_request_id uuid references public.intro_requests(id) on delete cascade,
  member_id text not null default '',
  connector_name text not null default '',
  author_id uuid not null default auth.uid(),
  relevant boolean,
  context_accurate boolean,
  would_take_again boolean,
  outcome_category text not null default 'no_outcome',
  private_note text not null default '',
  shareable boolean not null default false,
  created_at timestamptz not null default now(),
  constraint intro_feedback_outcome_chk check (outcome_category in ('conversation','partnership','customer','hire','investor','advisor','no_outcome','other'))
);
grant select, insert, update, delete on public.intro_feedback to authenticated;
grant all on public.intro_feedback to service_role;
alter table public.intro_feedback enable row level security;
create policy "own feedback" on public.intro_feedback for all to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "shared feedback visible to participant" on public.intro_feedback for select to authenticated using (
  shareable and intro_request_id is not null and exists (select 1 from public.intro_requests r where r.id = intro_request_id and (r.user_id = auth.uid() or r.target_user_id = auth.uid())));

-- Delegates (least privilege; never network members)
create table public.delegates (
  id uuid primary key default gen_random_uuid(),
  principal_id uuid not null default auth.uid(),
  delegate_email text not null,
  delegate_user_id uuid,
  role_label text not null default 'Executive assistant',
  permissions text[] not null default '{}',
  status text not null default 'invited',
  created_at timestamptz not null default now(),
  constraint delegates_status_chk check (status in ('invited','active','revoked')),
  constraint delegates_perm_chk check (permissions <@ array['calendar','crm','draft_messages','relationship_notes','scheduling','opportunity_updates']::text[])
);
grant select, insert, update, delete on public.delegates to authenticated;
grant all on public.delegates to service_role;
alter table public.delegates enable row level security;
create policy "principal manages delegates" on public.delegates for all to authenticated using (principal_id = auth.uid()) with check (principal_id = auth.uid() and public.is_verified_member());
create policy "delegate reads own grant" on public.delegates for select to authenticated using (delegate_user_id = auth.uid() and status = 'active');

-- Passports
create table public.passports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  kind text not null default 'network',
  label text not null default 'Relationship Passport',
  token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  fields text[] not null default '{}',
  selected_ask_id text,
  revoked boolean not null default false,
  created_at timestamptz not null default now(),
  constraint passports_kind_chk check (kind in ('network','shareable')),
  constraint passports_fields_chk check (fields <@ array['identity','company','what_i_do','building','looking_for','can_help_with','open_to','signal','scheduling','recommendations']::text[])
);
grant select, insert, update, delete on public.passports to authenticated;
grant all on public.passports to service_role;
alter table public.passports enable row level security;
create policy "own passports" on public.passports for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid() and public.is_verified_member());

create or replace function public.get_passport(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v public.passports; p public.profiles; a public.asks; out jsonb := '{}'::jsonb;
begin
  select * into v from public.passports where token = p_token and revoked = false;
  if not found then return null; end if;
  if v.kind = 'network' and not public.is_live_member() then return jsonb_build_object('restricted', true); end if;
  if not exists (select 1 from public.member_verifications m where m.user_id = v.owner_id and m.status = 'verified') then return null; end if;
  select * into p from public.profiles where id = v.owner_id;
  out := jsonb_build_object('label', v.label, 'kind', v.kind, 'name', p.name, 'initials', p.initials);
  if 'identity' = any(v.fields) then out := out || jsonb_build_object('title', p.title, 'verified_role', p.verified_role, 'location', p.location); end if;
  if 'company' = any(v.fields) then out := out || jsonb_build_object('company', p.company, 'verified_business', p.verified_business); end if;
  if 'what_i_do' = any(v.fields) then out := out || jsonb_build_object('what_i_do', p.what_i_do); end if;
  if 'building' = any(v.fields) then out := out || jsonb_build_object('building', p.building); end if;
  if 'looking_for' = any(v.fields) then out := out || jsonb_build_object('looking_for', p.looking_for); end if;
  if 'can_help_with' = any(v.fields) then out := out || jsonb_build_object('can_help_with', p.can_help_with); end if;
  if 'open_to' = any(v.fields) then out := out || jsonb_build_object('open_to', p.open_to); end if;
  if 'scheduling' = any(v.fields) then out := out || jsonb_build_object('scheduling_enabled', p.scheduling_enabled); end if;
  if 'signal' = any(v.fields) and v.selected_ask_id is not null then
    select * into a from public.asks where id = v.selected_ask_id and author_id = v.owner_id and visibility in ('network','shareable') and status = 'active';
    if found then out := out || jsonb_build_object('signal', a.ask, 'signal_category', a.category); end if;
  end if;
  if 'recommendations' = any(v.fields) then
    out := out || jsonb_build_object('recommendations', coalesce((select jsonb_agg(jsonb_build_object('body', r.body, 'outcome', r.outcome)) from public.executive_recommendations r where r.recipient_id = v.owner_id and r.display_approved), '[]'::jsonb));
  end if;
  return out;
end $$;
revoke all on function public.get_passport(text) from public;
grant execute on function public.get_passport(text) to anon, authenticated;

-- Digital You rules
create table public.digital_you_rules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  rule_kind text not null,
  action text not null default 'ask',
  params jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  constraint dyr_action_chk check (action in ('block','ask','allow','remind'))
);
grant select, insert, update, delete on public.digital_you_rules to authenticated;
grant all on public.digital_you_rules to service_role;
alter table public.digital_you_rules enable row level security;
create policy "own rules" on public.digital_you_rules for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());