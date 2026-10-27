-- 0106: put the already-written access rules into force on 64 member tables.
-- Model chosen by the owner on 2026-10-27: "shared where it should be seen".
--   * every table: row level security enabled, so the existing owner-scoped
--     policy actually applies (each member sees/edits only their own rows)
--   * network-facing surfaces: members may also read other members' rows
--   * two reference tables that had a read-and-write-everything rule are
--     reduced to read-only for members

begin;

-- 1. enable enforcement everywhere
alter table public.acquisition_intents enable row level security;
alter table public.advisory_boards enable row level security;
alter table public.aetheris_standard_acceptances enable row level security;
alter table public.availability_windows enable row level security;
alter table public.board_advisory_intents enable row level security;
alter table public.capability_problems enable row level security;
alter table public.capital_profiles enable row level security;
alter table public.circles enable row level security;
alter table public.company_profiles enable row level security;
alter table public.context_capsules enable row level security;
alter table public.contextual_reputations enable row level security;
alter table public.digital_handshakes enable row level security;
alter table public.digital_representative_policies enable row level security;
alter table public.event_presences enable row level security;
alter table public.expertise_offers enable row level security;
alter table public.import_batches enable row level security;
alter table public.import_proposals enable row level security;
alter table public.industry_intelligence_items enable row level security;
alter table public.industry_rooms enable row level security;
alter table public.intent_cards enable row level security;
alter table public.introducer_records enable row level security;
alter table public.introduction_availability enable row level security;
alter table public.knowledge_assets enable row level security;
alter table public.knowledge_posts enable row level security;
alter table public.latent_network_paths enable row level security;
alter table public.marketplace_listings enable row level security;
alter table public.network_constitution_rules enable row level security;
alter table public.network_questions enable row level security;
alter table public.network_simulations enable row level security;
alter table public.network_snapshots enable row level security;
alter table public.network_strategies enable row level security;
alter table public.open_loops enable row level security;
alter table public.opportunity_collisions enable row level security;
alter table public.opportunity_rooms enable row level security;
alter table public.organization_relationships enable row level security;
alter table public.outcome_attribution_edges enable row level security;
alter table public.outcomes enable row level security;
alter table public.outreach_quality_reviews enable row level security;
alter table public.passport_credentials enable row level security;
alter table public.peer_councils enable row level security;
alter table public.pitch_permission_requests enable row level security;
alter table public.placements enable row level security;
alter table public.portable_identities enable row level security;
alter table public.pro_deal_rooms enable row level security;
alter table public.professional_availability enable row level security;
alter table public.professional_passport_profiles enable row level security;
alter table public.professional_passports enable row level security;
alter table public.professional_referrals enable row level security;
alter table public.proof_of_work_edges enable row level security;
alter table public.proof_of_work_nodes enable row level security;
alter table public.relationship_context_adapters enable row level security;
alter table public.relationship_context_queries enable row level security;
alter table public.relationship_decay_risks enable row level security;
alter table public.relationship_inbox_items enable row level security;
alter table public.relationship_twins enable row level security;
alter table public.relationship_vault_exports enable row level security;
alter table public.relationship_weather enable row level security;
alter table public.serendipity_matches enable row level security;
alter table public.systems enable row level security;
alter table public.transaction_records enable row level security;
alter table public.travel_plans enable row level security;
alter table public.trigger_memories enable row level security;
alter table public.trust_budget_states enable row level security;
alter table public.voice_memory_captures enable row level security;

-- 2. network-facing surfaces: any signed-in member may read
drop policy if exists member_read_marketplace_listings on public.marketplace_listings;
create policy member_read_marketplace_listings on public.marketplace_listings for select to authenticated using (true);
drop policy if exists member_read_expertise_offers on public.expertise_offers;
create policy member_read_expertise_offers on public.expertise_offers for select to authenticated using (true);
drop policy if exists member_read_industry_rooms on public.industry_rooms;
create policy member_read_industry_rooms on public.industry_rooms for select to authenticated using (true);
drop policy if exists member_read_peer_councils on public.peer_councils;
create policy member_read_peer_councils on public.peer_councils for select to authenticated using (true);
drop policy if exists member_read_industry_intelligence_items on public.industry_intelligence_items;
create policy member_read_industry_intelligence_items on public.industry_intelligence_items for select to authenticated using (true);
drop policy if exists member_read_network_questions on public.network_questions;
create policy member_read_network_questions on public.network_questions for select to authenticated using (true);
drop policy if exists member_read_knowledge_posts on public.knowledge_posts;
create policy member_read_knowledge_posts on public.knowledge_posts for select to authenticated using (true);

-- 3. circles are network-visible unless the owner narrowed them
drop policy if exists member_read_circles on public.circles;
create policy member_read_circles on public.circles for select to authenticated
  using (visibility in ('network','public') or owner_id = auth.uid());

-- 4. reference tables: read for members, writes only by privileged roles
drop policy if exists read_policy_company_profiles on public.company_profiles;
drop policy if exists member_read_company_profiles on public.company_profiles;
create policy member_read_company_profiles on public.company_profiles for select to authenticated using (true);
drop policy if exists read_policy_network_constitution_rules on public.network_constitution_rules;
drop policy if exists member_read_network_constitution_rules on public.network_constitution_rules;
create policy member_read_network_constitution_rules on public.network_constitution_rules for select to authenticated using (true);

commit;
