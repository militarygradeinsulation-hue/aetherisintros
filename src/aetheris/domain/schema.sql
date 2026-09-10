-- Aetheris Intros — relational schema for the next-generation platform.
-- Applied only when a database is wired; the preview runs on the local adapter.
-- Ownership + visibility columns exist on every table so RLS can scope reads to
-- the owner, their connections, or the network without further migration.

create type system_status as enum ('draft','active','placing','paused','archived');
create type visibility_scope as enum ('private','connections','network','public');
create type privacy_scope as enum ('private','team','organization','shareable','public');
create type placement_stage as enum ('Identified','Qualified','Warm Path Found','Intro Requested','Shared','Demo/Discussion','Pilot','Adopted','Referred','Closed/Not Now');
create type weather_state as enum ('Building','Warm','Active','Waiting','Cooling','Dormant','Reawakening','At Risk');
create type value_state as enum ('known','modeled','unquantified');

create table if not exists public.systems (
  id text primary key,
  owner_id uuid not null,
  name text not null,
  thesis text not null,
  category text not null,
  description text not null,
  best_fit_companies text[] not null default '{}',
  best_fit_roles text[] not null default '{}',
  industries text[] not null default '{}',
  geography text,
  proof text[] not null default '{}',
  placement_goal text,
  target_placements int not null default 0,
  active_placements int not null default 0,
  adoption_count int not null default 0,
  referral_count int not null default 0,
  value_proposition text,
  evidence text[] not null default '{}',
  expected_friction text,
  who_benefits text,
  status system_status not null default 'draft',
  visibility visibility_scope not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.placements (
  id text primary key,
  owner_id uuid not null,
  system_id text not null references public.systems(id) on delete cascade,
  target_type text not null,
  target_id text not null,
  target_label text not null,
  stage placement_stage not null default 'Identified',
  fit_score int not null default 0,
  circle_relevance int not null default 0,
  timing_score int not null default 0,
  mutual_value text,
  trust_path text[] not null default '{}',
  friction text,
  expected_outcome text,
  reason_fit text,
  reason_now text,
  next_step text,
  unknowns text[] not null default '{}',
  source_type text not null default 'derived',
  confidence int not null default 0,
  evidence_ids text[] not null default '{}',
  scope privacy_scope not null default 'private',
  history jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.circles (
  id text primary key,
  owner_id uuid not null,
  name text not null,
  purpose text not null,
  description text,
  member_ids text[] not null default '{}',
  roles_represented text[] not null default '{}',
  shared_intents text[] not null default '{}',
  active_system_ids text[] not null default '{}',
  open_intro_count int not null default 0,
  opportunities text[] not null default '{}',
  event_ids text[] not null default '{}',
  relevance_score int not null default 0,
  moderator_ids text[] not null default '{}',
  visibility visibility_scope not null default 'network',
  purpose_status text not null default 'active',
  health text,
  discussion jsonb not null default '[]',
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create table if not exists public.intent_cards (
  id text primary key,
  member_id uuid not null,
  type text not null,
  title text not null,
  statement text not null,
  audience text,
  role_filter text[] not null default '{}',
  company_filter text[] not null default '{}',
  industry_filter text[] not null default '{}',
  geography_filter text,
  urgency text not null default 'medium',
  starts_at date not null default current_date,
  expires_at date,
  visibility visibility_scope not null default 'network',
  value_offered text,
  evidence text[] not null default '{}',
  related_system_id text references public.systems(id) on delete set null,
  related_opportunity text,
  status text not null default 'active'
);

create table if not exists public.digital_handshakes (
  id text primary key,
  a_id uuid not null,
  b_id uuid not null,
  justified text not null,
  mutual_value text,
  shared_context text[] not null default '{}',
  timing text,
  potential_conflict text,
  safe_to_share text[] not null default '{}',
  private_context_used int not null default 0,
  what_a_gets text,
  what_b_gets text,
  why_now text,
  confidence int not null default 0,
  a_approved boolean not null default false,
  b_approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.context_capsules (
  id text primary key,
  intro_id text not null,
  owner_id uuid not null,
  member_id uuid not null,
  why_meeting text,
  common_ground text[] not null default '{}',
  mutual_value text,
  start_here text,
  help_a text[] not null default '{}',
  help_b text[] not null default '{}',
  current_intents text[] not null default '{}',
  connected_by text,
  items jsonb not null default '[]',
  protected_items text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.relationship_weather (
  id text primary key,
  owner_id uuid not null,
  member_id uuid not null,
  state weather_state not null,
  why text not null,
  formation int, momentum int, depth int, recency_days int,
  reciprocity int, trust int, open_loops int, context_accumulated int,
  updated_at timestamptz not null default now()
);

create table if not exists public.open_loops (
  id text primary key,
  owner_id uuid not null,
  title text not null,
  owner_side text not null default 'me',
  member_id uuid,
  source text,
  due_at date,
  trigger_condition text,
  status text not null default 'open',
  priority text not null default 'medium',
  evidence text,
  scope privacy_scope not null default 'private',
  opportunity_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.trigger_memories (
  id text primary key,
  owner_id uuid not null,
  member_id uuid not null,
  source_memory text not null,
  trigger_condition text not null,
  matched_event text not null,
  confidence int not null default 0,
  recommended_action text,
  scope privacy_scope not null default 'private',
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists public.connector_reputation (
  id text primary key,
  member_id uuid not null unique,
  intros_accepted int not null default 0,
  conversations_started int not null default 0,
  partnerships_formed int not null default 0,
  outcomes_created int not null default 0,
  context_usefulness numeric(2,1) not null default 0,
  typical_response text,
  intro_style text,
  best_for text[] not null default '{}'
);

create table if not exists public.connection_chains (
  id text primary key,
  owner_id uuid not null,
  target_id uuid not null,
  steps jsonb not null default '[]',
  state text not null default 'mapped',
  recommendation text,
  best_next_hop text
);

create table if not exists public.company_profiles (
  id text primary key,
  name text not null,
  industry text,
  location text,
  size text,
  people_ids text[] not null default '{}',
  strongest_entry text,
  contextual_paths text[] not null default '{}',
  previous_conversations text[] not null default '{}',
  dormant_opportunities text[] not null default '{}',
  relevant_system_ids text[] not null default '{}',
  open_intent_ids text[] not null default '{}',
  related_circle_ids text[] not null default '{}',
  timeline jsonb not null default '[]'
);

create table if not exists public.organization_relationships (
  id text primary key,
  organization_id uuid not null,
  company_name text not null,
  owner_id uuid not null,
  owner_name text not null,
  relationship_type text not null,
  strength int not null default 0,
  scope privacy_scope not null default 'team',
  note text
);

create table if not exists public.availability_windows (
  id text primary key,
  member_id uuid not null,
  label text,
  day text not null,
  start_time text not null,
  end_time text not null,
  timezone text not null default 'ET',
  purpose text not null default 'intro',
  booked_by uuid,
  capsule_id text references public.context_capsules(id) on delete set null,
  meeting_purpose text
);

create table if not exists public.meeting_continuity (
  id text primary key,
  owner_id uuid not null,
  member_id uuid not null,
  when_label text,
  purpose text,
  goals text[] not null default '{}',
  open_loop_ids text[] not null default '{}',
  shared_context text[] not null default '{}',
  questions text[] not null default '{}',
  desired_outcome text,
  closed boolean not null default false,
  after_state jsonb
);

create table if not exists public.outcomes (
  id text primary key,
  owner_id uuid not null,
  type text not null,
  headline text not null,
  member_id uuid,
  system_id text references public.systems(id) on delete set null,
  circle_id text references public.circles(id) on delete set null,
  company_name text,
  direct_value_state value_state not null default 'unquantified',
  direct_value_note text,
  influenced_value_state value_state not null default 'unquantified',
  influenced_value_note text,
  evidence text,
  confidence int not null default 0,
  created_at timestamptz not null default now()
);

-- Data API access. Tune per policy set; user-owned rows stay owner-scoped.
do $$
declare t text;
begin
  foreach t in array array[
    'systems','placements','circles','intent_cards','digital_handshakes','context_capsules',
    'relationship_weather','open_loops','trigger_memories','connector_reputation','connection_chains',
    'company_profiles','organization_relationships','availability_windows','meeting_continuity','outcomes'
  ] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;
