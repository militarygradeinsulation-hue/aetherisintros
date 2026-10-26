-- Wire remote data layers: create all base domain tables that have no prior migration.
-- Uses CREATE TABLE IF NOT EXISTS throughout so this is safe to re-run.
-- Adds RLS policies so authenticated users can only access their own rows.

-- ─── Enum types (idempotent) ────────────────────────────────────────────────
do $$ begin
  create type system_status as enum ('draft','active','placing','paused','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type visibility_scope as enum ('private','connections','network','public');
exception when duplicate_object then null; end $$;

do $$ begin
  create type privacy_scope as enum ('private','team','organization','shareable','public');
exception when duplicate_object then null; end $$;

do $$ begin
  create type placement_stage as enum ('Identified','Qualified','Warm Path Found','Intro Requested','Shared','Demo/Discussion','Pilot','Adopted','Referred','Closed/Not Now');
exception when duplicate_object then null; end $$;

do $$ begin
  create type weather_state as enum ('Building','Warm','Active','Waiting','Cooling','Dormant','Reawakening','At Risk');
exception when duplicate_object then null; end $$;

do $$ begin
  create type value_state as enum ('known','modeled','unquantified');
exception when duplicate_object then null; end $$;

-- ─── Core layer ─────────────────────────────────────────────────────────────
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
  system_id text references public.systems(id) on delete cascade,
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
  geography text,
  urgency text not null default 'flexible',
  horizon text,
  is_open boolean not null default true,
  match_score int not null default 0,
  visibility visibility_scope not null default 'connections',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.digital_handshakes (
  id text primary key,
  owner_id uuid not null,
  person_id text not null,
  direction text not null default 'outbound',
  message text,
  context_ids text[] not null default '{}',
  system_ids text[] not null default '{}',
  status text not null default 'pending',
  sent_at timestamptz,
  replied_at timestamptz,
  outcome text,
  next_step text,
  created_at timestamptz not null default now()
);

create table if not exists public.context_capsules (
  id text primary key,
  owner_id uuid not null,
  person_id text not null,
  summary text,
  shared_history text[] not null default '{}',
  open_loop_ids text[] not null default '{}',
  trust_score int not null default 0,
  last_meaningful_exchange timestamptz,
  weather weather_state not null default 'Building',
  mutual_systems text[] not null default '{}',
  intro_count int not null default 0,
  last_intro_at timestamptz,
  notes text,
  updated_at timestamptz not null default now()
);

create table if not exists public.relationship_weather (
  id text primary key,
  owner_id uuid not null,
  person_id text not null,
  state weather_state not null default 'Building',
  momentum_note text,
  last_event_type text,
  last_event_at timestamptz,
  risk_flags text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.open_loops (
  id text primary key,
  owner_id uuid not null,
  person_id text,
  title text not null,
  description text,
  kind text not null default 'follow_up',
  due_at timestamptz,
  closed boolean not null default false,
  closed_at timestamptz,
  outcome_note text,
  created_at timestamptz not null default now()
);

create table if not exists public.trigger_memories (
  id text primary key,
  owner_id uuid not null,
  person_id text not null,
  trigger_type text not null,
  signal text not null,
  observed_at timestamptz not null default now(),
  acted_on boolean not null default false,
  action_note text
);

create table if not exists public.connector_reputation (
  id text primary key,
  owner_id uuid not null,
  connector_id text not null,
  intro_count int not null default 0,
  success_count int not null default 0,
  trust_score int not null default 0,
  response_rate numeric(4,2) not null default 0,
  avg_time_to_respond_days numeric(5,1),
  topics text[] not null default '{}',
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
  capsule_id text,
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
  system_id text,
  circle_id text,
  company_name text,
  direct_value_state value_state not null default 'unquantified',
  direct_value_note text,
  influenced_value_state value_state not null default 'unquantified',
  influenced_value_note text,
  evidence text,
  confidence int not null default 0,
  created_at timestamptz not null default now()
);

-- ─── Relationship OS layer ───────────────────────────────────────────────────
create table if not exists public.opportunity_rooms (
  id text primary key,
  owner_id uuid not null,
  name text not null,
  outcome text not null,
  stage text not null default 'Forming',
  company_id text,
  company_name text,
  people_ids text[] not null default '{}',
  system_ids text[] not null default '{}',
  circle_ids text[] not null default '{}',
  intent_ids text[] not null default '{}',
  open_loop_ids text[] not null default '{}',
  meeting_ids text[] not null default '{}',
  evidence_ids text[] not null default '{}',
  weather text,
  next_action text,
  blockers text[] not null default '{}',
  timeline jsonb not null default '[]',
  value_state value_state not null default 'unquantified',
  value_note text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.relationship_twins (
  id text primary key,
  owner_id uuid not null,
  person_id text not null,
  cares_about text[] not null default '{}',
  decision_style text,
  communication_style text,
  typical_response text,
  what_works text[] not null default '{}',
  what_does_not text[] not null default '{}',
  recent_changes text[] not null default '{}',
  motivations text[] not null default '{}',
  inferences jsonb not null default '[]',
  confidence int not null default 0,
  scope privacy_scope not null default 'private',
  updated_at timestamptz not null default now()
);

create table if not exists public.network_simulations (
  id text primary key,
  owner_id uuid not null,
  question text not null,
  target_kind text not null,
  target_label text not null,
  people_involved text[] not null default '{}',
  paths jsonb not null default '[]',
  sequence text[] not null default '{}',
  friction text[] not null default '{}',
  uncertainty text[] not null default '{}',
  likelihood_band text not null default 'Medium',
  time_band text,
  effort_band text,
  saved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.opportunity_collisions (
  id text primary key,
  owner_id uuid not null,
  headline text not null,
  signals jsonb not null default '[]',
  people_ids text[] not null default '{}',
  system_ids text[] not null default '{}',
  circle_ids text[] not null default '{}',
  why_now text,
  timing_event text,
  window_note text,
  recommended_action text,
  confidence int not null default 0,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists public.latent_network_paths (
  id text primary key,
  owner_id uuid not null,
  target_label text not null,
  target_person_id text,
  kind text not null default 'warm',
  hops jsonb not null default '[]',
  statement text not null,
  strength_band text not null default 'Medium',
  consent_required boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.trust_budget_states (
  id text primary key,
  owner_id uuid not null,
  connector_id text not null,
  asks_last_90 int not null default 0,
  reciprocity int not null default 0,
  fatigue text not null default 'healthy',
  note text,
  updated_at timestamptz not null default now()
);

create table if not exists public.relationship_inbox_items (
  id text primary key,
  owner_id uuid not null,
  kind text not null,
  title text not null,
  person_id text,
  room_id text,
  why_now text,
  what_changed text,
  next_move text,
  priority int not null default 0,
  status text not null default 'open',
  snooze_until date,
  created_at timestamptz not null default now()
);

create table if not exists public.evidence_items (
  id text primary key,
  owner_id uuid not null,
  category text not null,
  source_type text not null default 'derived',
  source_label text,
  statement text not null,
  observed_on date,
  confidence int not null default 0,
  scope privacy_scope not null default 'private',
  shareable boolean not null default false,
  person_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.voice_memory_captures (
  id text primary key,
  owner_id uuid not null,
  person_id text,
  transcript text not null,
  proposals jsonb not null default '[]',
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.autopilot_actions (
  id text primary key,
  owner_id uuid not null,
  kind text not null,
  title text not null,
  person_id text,
  room_id text,
  draft text,
  reason text,
  autonomy_level int not null default 1,
  requires_approval boolean not null default true,
  status text not null default 'proposed',
  created_at timestamptz not null default now()
);

create table if not exists public.network_strategies (
  id text primary key,
  owner_id uuid not null,
  goal text not null,
  horizon text,
  target_roles text[] not null default '{}',
  target_industries text[] not null default '{}',
  target_circles text[] not null default '{}',
  constraints text[] not null default '{}',
  current_people_ids text[] not null default '{}',
  gaps text[] not null default '{}',
  next_moves jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Moat layer (compact jsonb storage) ─────────────────────────────────────
create table if not exists public.professional_passports (id text primary key, owner_id uuid, data jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.network_constitution_rules (id text primary key, data jsonb not null default '{}', created_at timestamptz not null default now());
create table if not exists public.outreach_quality_reviews (id text primary key, owner_id uuid, data jsonb not null default '{}', created_at timestamptz not null default now());
create table if not exists public.outreach_strike_ledgers (id text primary key, owner_id uuid, data jsonb not null default '{}', updated_at timestamptz not null default now());
create table if not exists public.network_questions (id text primary key, owner_id uuid, data jsonb not null default '{}', created_at timestamptz not null default now());
create table if not exists public.serendipity_matches (id text primary key, owner_id uuid, data jsonb not null default '{}', created_at timestamptz not null default now());
create table if not exists public.organization_relationship_passports (id text primary key, owner_id uuid, data jsonb not null default '{}', updated_at timestamptz not null default now());
create table if not exists public.live_events (id text primary key, owner_id uuid, data jsonb not null default '{}', created_at timestamptz not null default now());
create table if not exists public.relationship_gaps (id text primary key, owner_id uuid, data jsonb not null default '{}', created_at timestamptz not null default now());
create table if not exists public.portable_identities (id text primary key, owner_id uuid, data jsonb not null default '{}', updated_at timestamptz not null default now());
create table if not exists public.consent_ledger_entries (id text primary key, owner_id uuid, scope text, data jsonb not null default '{}', updated_at timestamptz not null default now());
create table if not exists public.reciprocity_signals (id text primary key, owner_id uuid, data jsonb not null default '{}', updated_at timestamptz not null default now());
create table if not exists public.relationship_decay_risks (id text primary key, owner_id uuid, data jsonb not null default '{}', updated_at timestamptz not null default now());
create table if not exists public.digital_representative_policies (id text primary key, owner_id uuid, data jsonb not null default '{}', updated_at timestamptz not null default now());
create table if not exists public.introduction_availability (id text primary key, owner_id uuid, data jsonb not null default '{}', updated_at timestamptz not null default now());
create table if not exists public.network_snapshots (id text primary key, owner_id uuid, data jsonb not null default '{}', created_at timestamptz not null default now());
create table if not exists public.outcome_attribution_edges (id text primary key, owner_id uuid, data jsonb not null default '{}', created_at timestamptz not null default now());
create table if not exists public.knowledge_posts (id text primary key, owner_id uuid, data jsonb not null default '{}', created_at timestamptz not null default now());
create table if not exists public.advisory_boards (id text primary key, owner_id uuid, data jsonb not null default '{}', created_at timestamptz not null default now());
create table if not exists public.relationship_context_adapters (id text primary key, owner_id uuid, data jsonb not null default '{}', created_at timestamptz not null default now());
create table if not exists public.relationship_context_queries (id text primary key, owner_id uuid, data jsonb not null default '{}', created_at timestamptz not null default now());

-- ─── Pro layer (compact jsonb storage) ──────────────────────────────────────
create table if not exists public.professional_passport_profiles (id text primary key, owner_id uuid, scope text, data jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.passport_credentials (id text primary key, owner_id uuid, scope text, data jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.proof_of_work_nodes (id text primary key, owner_id uuid, scope text, data jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.proof_of_work_edges (id text primary key, owner_id uuid, scope text, data jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.contextual_reputations (id text primary key, owner_id uuid, scope text, data jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.professional_opportunities (id text primary key, owner_id uuid, scope text, data jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.deal_rooms (id text primary key, owner_id uuid, scope text, data jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.expertise_offers (id text primary key, owner_id uuid, scope text, data jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.professional_referrals (id text primary key, owner_id uuid, scope text, data jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.introducer_records (id text primary key, owner_id uuid, scope text, data jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.capability_problems (id text primary key, owner_id uuid, scope text, data jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.suggested_teams (id text primary key, owner_id uuid, scope text, data jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.capital_profiles (id text primary key, owner_id uuid, scope text, data jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.acquisition_intents (id text primary key, owner_id uuid, scope text, data jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.board_advisory_intents (id text primary key, owner_id uuid, scope text, data jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.industry_rooms (id text primary key, owner_id uuid, scope text, data jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.industry_intelligence_items (id text primary key, owner_id uuid, scope text, data jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.peer_councils (id text primary key, owner_id uuid, scope text, data jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.event_presences (id text primary key, owner_id uuid, scope text, data jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.travel_plans (id text primary key, owner_id uuid, scope text, data jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.professional_availability (id text primary key, owner_id uuid, scope text, data jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.pitch_permission_requests (id text primary key, owner_id uuid, scope text, data jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.professional_boundary_rules (id text primary key, owner_id uuid, scope text, data jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.import_batches (id text primary key, owner_id uuid, scope text, data jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.import_proposals (id text primary key, owner_id uuid, batch_id text, scope text, data jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.relationship_vault_exports (id text primary key, owner_id uuid, scope text, data jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.professional_inbox_decisions (id text primary key, owner_id uuid, scope text, data jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.transaction_records (id text primary key, owner_id uuid, scope text, data jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.marketplace_listings (id text primary key, owner_id uuid, scope text, data jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.knowledge_assets (id text primary key, owner_id uuid, scope text, data jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.human_concierge_reviews (id text primary key, owner_id uuid, scope text, data jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.aetheris_standard_acceptances (id text primary key, owner_id uuid, scope text, data jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now());

-- ─── Permissions + RLS ──────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    -- Core
    'systems','placements','circles','intent_cards','digital_handshakes','context_capsules',
    'relationship_weather','open_loops','trigger_memories','connector_reputation','connection_chains',
    'company_profiles','organization_relationships','availability_windows','meeting_continuity','outcomes',
    -- OS
    'opportunity_rooms','relationship_twins','network_simulations','opportunity_collisions',
    'latent_network_paths','trust_budget_states','relationship_inbox_items','evidence_items',
    'voice_memory_captures','autopilot_actions','network_strategies',
    -- Moat
    'professional_passports','network_constitution_rules','outreach_quality_reviews',
    'outreach_strike_ledgers','network_questions','serendipity_matches',
    'organization_relationship_passports','live_events','relationship_gaps','portable_identities',
    'consent_ledger_entries','reciprocity_signals','relationship_decay_risks',
    'digital_representative_policies','introduction_availability','network_snapshots',
    'outcome_attribution_edges','knowledge_posts','advisory_boards',
    'relationship_context_adapters','relationship_context_queries',
    -- Pro
    'professional_passport_profiles','passport_credentials','proof_of_work_nodes',
    'proof_of_work_edges','contextual_reputations','professional_opportunities',
    'deal_rooms','expertise_offers','professional_referrals','introducer_records',
    'capability_problems','suggested_teams','capital_profiles','acquisition_intents',
    'board_advisory_intents','industry_rooms','industry_intelligence_items','peer_councils',
    'event_presences','travel_plans','professional_availability','pitch_permission_requests',
    'professional_boundary_rules','import_batches','import_proposals',
    'relationship_vault_exports','professional_inbox_decisions','transaction_records',
    'marketplace_listings','knowledge_assets','human_concierge_reviews',
    'aetheris_standard_acceptances'
  ] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Owner-scoped RLS policies (idempotent: drop and recreate).
-- Tables without owner_id (network_constitution_rules) get a public-read policy.

do $$
declare t text;
declare policy_name text;
begin
  foreach t in array array[
    'systems','placements','circles','digital_handshakes','context_capsules',
    'relationship_weather','open_loops','trigger_memories','connector_reputation','connection_chains',
    'organization_relationships','availability_windows','meeting_continuity','outcomes',
    'opportunity_rooms','relationship_twins','network_simulations','opportunity_collisions',
    'latent_network_paths','trust_budget_states','relationship_inbox_items','evidence_items',
    'voice_memory_captures','autopilot_actions','network_strategies',
    'professional_passports','outreach_quality_reviews','outreach_strike_ledgers',
    'network_questions','serendipity_matches','organization_relationship_passports','live_events',
    'relationship_gaps','portable_identities','consent_ledger_entries','reciprocity_signals',
    'relationship_decay_risks','digital_representative_policies','introduction_availability',
    'network_snapshots','outcome_attribution_edges','knowledge_posts','advisory_boards',
    'relationship_context_adapters','relationship_context_queries',
    'professional_passport_profiles','passport_credentials','proof_of_work_nodes',
    'proof_of_work_edges','contextual_reputations','professional_opportunities',
    'deal_rooms','expertise_offers','professional_referrals','introducer_records',
    'capability_problems','suggested_teams','capital_profiles','acquisition_intents',
    'board_advisory_intents','industry_rooms','industry_intelligence_items','peer_councils',
    'event_presences','travel_plans','professional_availability','pitch_permission_requests',
    'professional_boundary_rules','import_batches','import_proposals',
    'relationship_vault_exports','professional_inbox_decisions','transaction_records',
    'marketplace_listings','knowledge_assets','human_concierge_reviews',
    'aetheris_standard_acceptances'
  ] loop
    policy_name := 'owner_policy_' || t;
    execute format('drop policy if exists %I on public.%I', policy_name, t);
    execute format(
      'create policy %I on public.%I to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid())',
      policy_name, t
    );
  end loop;
end $$;

-- intent_cards uses member_id instead of owner_id
drop policy if exists owner_policy_intent_cards on public.intent_cards;
create policy owner_policy_intent_cards on public.intent_cards to authenticated
  using (member_id = auth.uid()) with check (member_id = auth.uid());

-- company_profiles are shared (no owner scope)
drop policy if exists read_policy_company_profiles on public.company_profiles;
create policy read_policy_company_profiles on public.company_profiles to authenticated
  using (true) with check (true);

-- network_constitution_rules are shared (no owner scope)
drop policy if exists read_policy_network_constitution_rules on public.network_constitution_rules;
create policy read_policy_network_constitution_rules on public.network_constitution_rules to authenticated
  using (true);
