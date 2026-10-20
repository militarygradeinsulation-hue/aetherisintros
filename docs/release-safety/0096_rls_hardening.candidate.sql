-- ============================================================================
-- CANDIDATE 0096 — RLS / permission hardening (October 20, 2026 reconciliation)
-- ============================================================================
-- STATUS: NOT JOURNALED, NOT APPLIED ANYWHERE. Requires owner approval.
--
-- ⚠ MANUAL VERIFICATION REQUIRED BEFORE PRODUCTION
--   * Run scripts/migration-checks/rls-hardening.standalone.mjs (disposable PGlite).
--   * Diff the live definitions of public.is_approved_member(uuid) and, once 0070 is
--     recovered, public.outcome_reactions / public.outcome_reactions_guard() against the
--     source files first. This file assumes the source definitions.
--   * Number 0095 is reserved by 0095_icp_owner_grant.candidate.sql. If both are approved,
--     journal them in that order with `when` > 1792450600107 (0094).
--
-- Every statement is idempotent and guarded with to_regprocedure/to_regclass, so this file
-- is safe to run before or after the pending 0058–0078 recovery (sections that depend on a
-- pending table are skipped until it exists and must then be re-run).
--
-- Does NOT cover (tracked separately, do not duplicate here):
--   * general save_workspace_state() bypass of the 0094 ICP guard and the ICP key CHECK —
--     see icp-reconciliation.proposed.sql
--   * 0082 / 0090 / 0092 ledger collisions — definition comparison first
-- ============================================================================

-- 1. is_approved_member(uuid) -------------------------------------------------------------
-- 0029 recorded this SECURITY DEFINER helper from the live database. It takes an arbitrary
-- user id and has no caller check, and no migration revokes the default PUBLIC EXECUTE, so
-- `rpc('is_approved_member', { p_user })` with only the anon key discloses whether any user
-- id is an approved member (violates docs/MIGRATIONS.md: every SECURITY DEFINER function
-- checks the caller or has EXECUTE revoked). Members keep EXECUTE: their RLS policies
-- (0037 membership cards, 0079 avatars — both TO authenticated) and RPCs call it. No policy
-- that applies to anon calls it; anon-callable RPCs that use it are SECURITY DEFINER.
DO $is_approved_member$
BEGIN
  IF to_regprocedure('public.is_approved_member(uuid)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.is_approved_member(uuid) FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.is_approved_member(uuid) TO authenticated, service_role;
  END IF;
END
$is_approved_member$;

-- 2. outcome_reactions (0070, pending recovery) ---------------------------------------------
-- INSERT requires a visible outcome authored by someone else, but the UPDATE policy only
-- checks reactor_id and authenticated has table-wide UPDATE, so a member could re-point an
-- existing reaction at their OWN outcome (self-endorsement feeding reputation) or backdate
-- created_at. Keep the existing upsert path (reactToOutcome sends the same outcome_id) by
-- freezing outcome_id/created_at in the guard and mirroring the INSERT check on UPDATE.
DO $outcome_reactions$
BEGIN
  IF to_regclass('public.outcome_reactions') IS NULL THEN
    RAISE NOTICE 'outcome_reactions not present (0070 pending) — section 2 skipped; re-run after recovery';
    RETURN;
  END IF;

  CREATE OR REPLACE FUNCTION public.outcome_reactions_guard() RETURNS trigger
  LANGUAGE plpgsql SET search_path = public AS $fn$
  BEGIN
    IF TG_OP = 'INSERT' THEN NEW.reactor_id := auth.uid(); NEW.created_at := now(); END IF;
    IF TG_OP = 'UPDATE' THEN
      IF NEW.reactor_id IS DISTINCT FROM OLD.reactor_id THEN
        RAISE EXCEPTION 'Reaction owner cannot change' USING errcode = '42501';
      END IF;
      IF NEW.outcome_id IS DISTINCT FROM OLD.outcome_id THEN
        RAISE EXCEPTION 'Reaction outcome cannot change' USING errcode = '42501';
      END IF;
      NEW.created_at := OLD.created_at;
    END IF;
    RETURN NEW;
  END $fn$;
  REVOKE ALL ON FUNCTION public.outcome_reactions_guard() FROM PUBLIC, anon, authenticated;

  DROP POLICY IF EXISTS "members update own reaction" ON public.outcome_reactions;
  CREATE POLICY "members update own reaction" ON public.outcome_reactions FOR UPDATE TO authenticated
    USING (reactor_id = auth.uid())
    WITH CHECK (
      reactor_id = auth.uid()
      AND EXISTS (SELECT 1 FROM public.intro_outcomes o WHERE o.id = outcome_id AND o.author_id <> auth.uid())
    );
END
$outcome_reactions$;

-- 3. Document intentional deny-all tables ---------------------------------------------------
-- These tables have RLS enabled, zero policies and client grants revoked: every client read
-- or write is denied and access is only through the service role or the listed
-- SECURITY DEFINER RPCs. The audit (RLS_AUDIT_2026_10_20.md) treats them as correct; the
-- comment makes the intent visible in the catalog so nobody "fixes" them with a USING(true).
DO $comments$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('capability_usage',                     'service role only (capability metering)'),
    ('intro_request_nudges',                 'service role only (reminder ledger)'),
    ('account_deletions',                    'service role only (deletion audit)'),
    ('app_settings',                         'service role only (operator configuration)'),
    ('member_activation',                    'service role only (activation analytics)'),
    ('member_activity_days',                 'service role only (activation analytics)'),
    ('agent_rate_counters',                  'service role only (agent gateway rate limits)'),
    ('agent_inbound_hashes',                 'service role only (agent gateway replay protection)'),
    ('private_library_records',              'RPC only: get_private_library_record / search_private_library_records (0066 export denial)'),
    ('private_library_enrichment_suggestions','RPC only: get_private_library_suggestions (0066 export denial)'),
    ('professional_opportunities',           'RPC only: list_exchange_opportunities / publish_exchange_opportunity / act_on_exchange_opportunity (0090)'),
    ('professional_opportunity_saves',       'RPC only: act_on_exchange_opportunity (0090)'),
    ('professional_opportunity_interests',   'RPC only: act_on_exchange_opportunity (0090)'),
    ('member_tiers',                         'RPC only: my_membership_tier / claim_basic_membership (0092)'),
    ('executive_applications',               'RPC only: apply_for_executive / my_executive_application / admin_executive_applications / review_executive_application (0092)'),
    ('companies',                            'service role only: demo seed (client grants revoked in 0079)'),
    ('signals',                              'service role only: demo seed (client grants revoked in 0079)'),
    ('seed_threads',                         'service role only: demo seed (client grants revoked in 0079)'),
    ('seed_learnings',                       'service role only: demo seed (client grants revoked in 0079)')
  ) AS t(name, note) LOOP
    IF to_regclass(format('public.%I', r.name)) IS NOT NULL THEN
      EXECUTE format('COMMENT ON TABLE public.%I IS %L', r.name,
        'RLS deny-all by design (no client policies). ' || r.note || '. See docs/release-safety/RLS_AUDIT_2026_10_20.md');
    END IF;
  END LOOP;
END
$comments$;

-- 4. Read-only post-apply verification (run manually; returns rows that need attention) ------
-- SELECT c.relname, c.relrowsecurity, count(p.polname) AS policies
--   FROM pg_class c LEFT JOIN pg_policy p ON p.polrelid = c.oid
--  WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'r'
--  GROUP BY 1, 2 HAVING NOT c.relrowsecurity OR count(p.polname) = 0 ORDER BY 1;
-- SELECT has_function_privilege('anon', 'public.is_approved_member(uuid)', 'EXECUTE');  -- expect false
