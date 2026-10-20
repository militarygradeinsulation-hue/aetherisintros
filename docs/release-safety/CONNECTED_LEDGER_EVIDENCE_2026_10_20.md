# Connected database migration evidence — October 20, 2026

Read-only catalog and migration-ledger queries against the original Ask Intros project `c1248cd8-77de-4eaa-8d9d-e7da71e70ae9`; source reference main `b651b40d80851b65504e8e4629709183953054d9`. No application records, secrets, production writes, or ledger edits were used.

Both Drizzle and Supabase migration ledgers are readable in this session. The earlier denied-ledger blocker is superseded by this successful read. Source hashes below are SHA-256 of unchanged SQL files. Matching hashes are searched across the complete Drizzle ledger, not just by timestamp.

## Findings

- 20 journaled source files have neither a matching hash nor an entry at their journal timestamp: 0058–0061 and 0063–0078.
- 0062 business posts matches ledger row 58 under a different timestamp: do not replay or relabel it.
- 0082, 0090 and 0092 have entries at their journal timestamps with different hashes; their named tables/functions exist. They require definition comparison, not blind replay or ledger editing.
- 130 distinct created table/function names are missing across the source catalog probe. This is a name-existence check, not a complete schema comparison. Overloaded function signatures, definitions, columns, indexes, policies, triggers and grants need separate verification.
- Existing early_access_members, profiles, user_roles and peer_groups were checked and have RLS enabled. RLS enabled alone does not prove policies enforce the intended boundaries.

## Recovery order

1. Preserve ledger/hash discrepancies and compare schema-only definitions for the affected objects. Confirm database target and a restorable backup.
2. Stage 0058/0059 deal rooms, 0060 index, and 0061 directory stats in an isolated copy; skip already applied 0062.
3. Stage 0063/0064 workspaces, then 0065/0066 private library with export denial; 0067 workbench.
4. Stage 0068 briefs; 0069/0070 track record; 0071/0072 referrals; 0073 diagnostics; 0074 storefront; 0075 syndication; 0076/0077 peer groups; 0078 syndication visibility correction.
5. Exercise anon, distinct members, revoked members and admin through the existing database/browser security tests before a production recovery. Preserve historical SQL bytes and existing ledger rows; forward repairs remain necessary where definitions differ.

The existing synthetic replay remains useful but is not a supplied-live-schema dry run. A restorable production backup and a complete isolated schema comparison have not been verified. No production migration is approved or executed by this report.

## Hash and object matrix

| Migration | Exact hash ledger row | Hash at source timestamp | Created names present / probed |
| --- | --- | --- | ---: |
| `0000_admin_insert_verification_events` | 1 | matches | 0 / 0 |
| `0001_unified_executive_profiles_and_recommendations` | 2 | matches | 3 / 3 |
| `0002_grant_executive_profile_columns` | 3 | matches | 0 / 0 |
| `0003_opportunity_graph_foundation` | 4 | matches | 8 / 8 |
| `0004_opportunity_graph_hardening` | 5 | matches | 8 / 8 |
| `0005_delegate_drafts_privileges` | 6 | matches | 0 / 0 |
| `0006_ceo_operating_system` | 7 | matches | 2 / 2 |
| `0007_ceo_os_tighten_privileges` | 8 | matches | 0 / 0 |
| `0008_ceo_intelligence_layer` | 9 | matches | 3 / 3 |
| `0009_ceo_leverage_layer` | 10 | matches | 6 / 6 |
| `0010_ceo_leverage_canonical_links_and_privileges` | 11 | matches | 0 / 0 |
| `0011_capability_security_spine` | 12 | matches | 25 / 25 |
| `0012_principal_can_always_revoke_delegate` | 13 | matches | 0 / 0 |
| `0013_diagnose_financial_evidence_model` | 14 | matches | 6 / 6 |
| `0014_professional_enrichment_spine` | 15 | matches | 8 / 8 |
| `0015_personal_invite_links` | 16 | matches | 3 / 3 |
| `0016_dm_realtime` | 17 | matches | 0 / 0 |
| `0017_dm_files_policies` | 18 | matches | 0 / 0 |
| `0018_code_only_full_access` | 19 | matches | 1 / 1 |
| `0019_top_connections` | 20 | matches | 1 / 1 |
| `0020_profile_column_grants_and_invite_fallback` | 21 | matches | 1 / 1 |
| `0021_invite_auto_verify` | 22 | matches | 1 / 1 |
| `0022_introduction_outcome_spine` | 23 | matches | 6 / 6 |
| `0023_follow_through_record` | 24 | matches | 3 / 3 |
| `0024_company_continuity` | 25 | matches | 14 / 14 |
| `0025_founding_cohorts` | 26 | matches | 4 / 4 |
| `0026_introduction_notifications` | 27 | matches | 3 / 3 |
| `0027_ask_response_count` | 28 | matches | 2 / 2 |
| `0028_stale_intro_requests` | 29 | matches | 4 / 4 |
| `0029_record_live_database_objects` | 30 | matches | 22 / 22 |
| `0030_lock_down_live_only_objects` | 31 | matches | 1 / 1 |
| `0031_video_meetings` | 32 | matches | 10 / 10 |
| `0032_meeting_outcomes` | 33 | matches | 2 / 2 |
| `0033_meeting_calendar` | 34 | matches | 2 / 2 |
| `0034_weekly_digest` | 35 | matches | 1 / 1 |
| `0035_admin_network_health` | 36 | matches | 1 / 1 |
| `0036_leak_checks` | 37 | matches | 1 / 1 |
| `0037_membership_cards` | 38 | matches | 7 / 7 |
| `0038_profile_linkedin_url` | 39 | matches | 0 / 0 |
| `0039_meeting_recording` | 40 | matches | 3 / 3 |
| `0040_foundation` | 41 | matches | 5 / 5 |
| `0041_growth` | 42 | matches | 5 / 5 |
| `0042_revenue` | 43 | matches | 9 / 9 |
| `0043_google_calendar` | 44 | matches | 3 / 3 |
| `0044_peer_groups` | 45 | matches | 22 / 22 |
| `0045_providers` | 46 | matches | 18 / 18 |
| `0046_impact_report` | 47 | matches | 9 / 9 |
| `0047_workspace_sync` | 48 | matches | 2 / 2 |
| `0048_gmail_signals` | 49 | matches | 0 / 0 |
| `0049_sms_alerts` | 50 | matches | 3 / 3 |
| `0050_member_events` | 51 | matches | 17 / 17 |
| `0051_activation_analytics` | 52 | matches | 9 / 9 |
| `0052_messaging_directory` | 53 | matches | 9 / 9 |
| `0053_warm_paths` | 54 | matches | 6 / 6 |
| `0054_agent_gateway` | 55 | matches | 16 / 16 |
| `0055_reciprocity_nudges` | 56 | matches | 15 / 15 |
| `0056_quick_menu` | 57 | matches | 1 / 1 |
| `0058_deal_rooms` | absent | absent | 0 / 27 |
| `0059_deal_room_idempotency` | absent | absent | 0 / 0 |
| `0060_app_error_rate_limit_index` | absent | absent | 0 / 0 |
| `0061_member_directory_stats` | absent | absent | 0 / 1 |
| `0062_business_posts` | 58 | absent | 1 / 1 |
| `0063_deal_workspaces` | absent | absent | 0 / 31 |
| `0064_deal_workspace_business_roles` | absent | absent | 0 / 34 |
| `0065_private_contact_library` | absent | absent | 0 / 18 |
| `0066_contact_export_denial` | absent | absent | 0 / 4 |
| `0067_business_execution_workbench` | absent | absent | 0 / 0 |
| `0068_meeting_briefs` | absent | absent | 0 / 2 |
| `0069_track_record` | absent | absent | 0 / 2 |
| `0070_reputation_scores` | absent | absent | 0 / 3 |
| `0071_referrals` | absent | absent | 0 / 4 |
| `0072_warm_referral_engine` | absent | absent | 0 / 2 |
| `0073_business_analyst` | absent | absent | 0 / 1 |
| `0074_storefront_proposals` | absent | absent | 0 / 4 |
| `0075_syndication_rooms` | absent | absent | 0 / 9 |
| `0076_peer_group_feed` | absent | absent | 0 / 4 |
| `0077_peer_group_agendas` | absent | absent | 0 / 3 |
| `0078_syndication_creator_insert_visibility` | absent | absent | 0 / 0 |
| `0079_lovable_scan_access_hardening` | 87 | matches | 1 / 1 |
| `0080_member_intro_read_contract` | 88 | matches | 2 / 2 |
| `0081_marketplace_pilot_research_intent` | 89 | matches | 2 / 2 |
| `0082_business_lobby` | absent | **different** | 6 / 6 |
| `0083_providers_relationship_evidence` | 91 | matches | 1 / 1 |
| `0084_live_intro_secure_read_grants` | 92 | matches | 1 / 1 |
| `0085_restore_live_member_capabilities` | 93 | matches | 0 / 0 |
| `0086_restore_launch_mode_signup` | 94 | matches | 1 / 1 |
| `0087_confirmed_member_onboarding` | 95 | matches | 1 / 1 |
| `0088_admin_platform_overview` | 96 | matches | 1 / 1 |
| `0089_verified_owner_admin_provision` | 97 | matches | 0 / 0 |
| `0090_shared_opportunity_exchange` | absent | **different** | 7 / 7 |
| `0091_confirmed_founding_claim` | 99 | matches | 1 / 1 |
| `0092_basic_executive_membership` | absent | **different** | 10 / 10 |
| `0093_private_icp_workspace` | 101 | matches | 2 / 2 |
| `0094_icp_guard_review_history` | 102 | matches | 1 / 1 |

## Missing created names

Names are de-duplicated below; dependencies that replace an existing function or alter a table are not fully modeled by this list.

- function `public.accept_private_library_suggestion`
- function `public.accept_workspace_delivery`
- function `public.accept_workspace_parties`
- function `public.add_deal_milestone`
- function `public.add_workspace_step`
- function `public.advance_deal_stage`
- function `public.approve_workspace_proposal`
- function `public.can_edit_deal`
- function `public.create_deal_room`
- function `public.create_deal_workspace`
- function `public.create_peer_group`
- function `public.create_private_library_import_batch`
- function `public.create_private_library_workspace`
- function `public.create_referral`
- function `public.create_syndication_room`
- function `public.deal_actor_name`
- function `public.deal_log`
- function `public.deal_member_role`
- function `public.deal_member_side`
- function `public.deal_notify`
- function `public.deal_rooms_before_update`
- function `public.deal_rooms_log_details`
- function `public.deal_side_present`
- function `public.deal_transition_allowed`
- function `public.deal_workspace_action_needs_parties`
- function `public.deal_workspace_approvals_guard`
- function `public.deal_workspace_begin`
- function `public.deal_workspace_events_immutable`
- function `public.deal_workspace_freeze_always`
- function `public.deal_workspace_log`
- function `public.deal_workspace_members_guard`
- function `public.deal_workspace_notify`
- function `public.deal_workspace_parties_established`
- function `public.deal_workspace_party_may`
- function `public.deal_workspace_party`
- function `public.deal_workspace_reapproval_backfill`
- function `public.deal_workspace_role_may`
- function `public.deal_workspace_role`
- function `public.deal_workspace_source_counterpart`
- function `public.deal_workspace_terms_approved`
- function `public.deal_workspace_transition_allowed`
- function `public.deal_workspaces_guard`
- function `public.decide_proposal`
- function `public.decline_workspace_parties`
- function `public.decline_workspace_proposal`
- function `public.deny_contact_data_export`
- function `public.ensure_private_library_workspace`
- function `public.finish_private_library_import`
- function `public.get_my_referrals`
- function `public.get_peer_group_feed`
- function `public.get_private_library_record`
- function `public.get_private_library_suggestions`
- function `public.grant_private_library_access`
- function `public.import_private_library_records`
- function `public.invite_deal_member`
- function `public.invite_syndication_member`
- function `public.invite_workspace_member`
- function `public.is_deal_invitee`
- function `public.is_deal_member`
- function `public.is_deal_workspace_member`
- function `public.is_syndication_creator`
- function `public.is_syndication_member`
- function `public.link_workspace_opportunity`
- function `public.list_my_peer_groups`
- function `public.mark_referral_connected`
- function `public.meeting_briefs_guard`
- function `public.member_directory_stats`
- function `public.member_storefront_guard`
- function `public.my_workspace_invitations`
- function `public.outcome_reactions_guard`
- function `public.peer_group_commitments_guard`
- function `public.post_to_peer_group`
- function `public.private_library_can_read`
- function `public.private_library_can_write`
- function `public.proposals_guard`
- function `public.propose_workspace_parties`
- function `public.reject_private_library_suggestion`
- function `public.reject_workspace_delivery`
- function `public.remove_deal_member`
- function `public.remove_workspace_member`
- function `public.respond_deal_invite`
- function `public.respond_workspace_invite`
- function `public.review_deal_milestone`
- function `public.revoke_private_library_access`
- function `public.search_private_library_records`
- function `public.set_workspace_next_action`
- function `public.set_workspace_step_done`
- function `public.submit_deal_milestone`
- function `public.submit_deal_proposal`
- function `public.submit_private_library_suggestion`
- function `public.submit_workspace_delivery`
- function `public.submit_workspace_proposal`
- function `public.syndication_messages_guard`
- function `public.syndication_rooms_guard`
- function `public.track_record_guard`
- function `public.transition_workspace_status`
- function `public.update_workspace_details`
- table `public.business_diagnostics`
- table `public.deal_events`
- table `public.deal_milestones`
- table `public.deal_proposals`
- table `public.deal_room_members`
- table `public.deal_rooms`
- table `public.deal_workspace_approvals`
- table `public.deal_workspace_crm_links`
- table `public.deal_workspace_deliveries`
- table `public.deal_workspace_events`
- table `public.deal_workspace_members`
- table `public.deal_workspace_proposals`
- table `public.deal_workspace_steps`
- table `public.deal_workspaces`
- table `public.meeting_briefs`
- table `public.member_storefronts`
- table `public.outcome_reactions`
- table `public.peer_group_agendas`
- table `public.peer_group_commitments`
- table `public.private_library_enrichment_suggestions`
- table `public.private_library_import_batches`
- table `public.private_library_records`
- table `public.private_library_workspace_members`
- table `public.private_library_workspaces`
- table `public.proposals`
- table `public.referral_requests`
- table `public.referral_suggestions`
- table `public.referrals`
- table `public.reputation_scores`
- table `public.syndication_members`
- table `public.syndication_messages`
- table `public.syndication_rooms`
- table `public.track_record_entries`

## Superseded source PRs

PR #44: canonical 0063 SQL is byte-identical to its original 0057 workspace migration. Canonical 0064 differs from its original 0058 only in the two introductory comment lines. The lifecycle tests and isolated browser harness are identical; the canonical repository adds membership-query error handling and accepted-introduction handoff. PR #45: canonical 0065/0066 SQL and the private-library/export-denial tests are byte-identical to the original 0058/0059 files; the canonical repository adds clearer read errors. Their implementations are preserved on main. Deployment of these objects remains tracked by issue #211; closing duplicate source PRs does not certify live activation.
