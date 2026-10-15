-- Restore live-member capabilities without granting access to showcase seed data.
-- Deploy *after* migrations 0080 (approved public profiles), 0083 (providers),
-- and 0084 (atomic verified introductions). This patch is idempotent.
-- Table grants only unlock RLS-authorized actions; never disable row security.
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.posts, public.asks TO authenticated;
GRANT SELECT, INSERT ON TABLE public.ask_responses TO authenticated;
-- Comments and reactions retain their existing grants/policies from the live schema.

-- Read/write RPC permissions. These functions independently check auth.uid(),
-- approved membership and ownership/counterpart visibility. If any are missing
-- from the production schema, raise a deliberate deployment error (do not
-- quietly pretend a successful GRANT applied).
DO $repair$
DECLARE signature text;
BEGIN
  FOREACH signature IN ARRAY ARRAY[
    'public.request_verified_intro(uuid,text)',
    'public.visible_member_profiles(uuid[],integer,integer)',
    'public.my_intro_participant_names(uuid[])',
    'public.my_relationship_evidence(uuid[])',
    'public.provider_directory()',
    'public.my_provider_requests()',
    'public.provider_inbox()',
    'public.is_live_member()',
    'public.is_approved_member(uuid)'
  ] LOOP
    IF to_regprocedure(signature) IS NULL THEN
      RAISE EXCEPTION 'Live Ask Intros RPC is missing: %. Apply the earlier schema migrations first.', signature
        USING ERRCODE = '42883';
    END IF;
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', signature);
  END LOOP;
END
$repair$;

-- Older environments may not have every optional personalized ranking helper.
-- Grant them only when present; unlike the core intro/provider RPCs, their
-- absence must not block the network permission repair.
DO $optional$
DECLARE signature text;
BEGIN
  FOREACH signature IN ARRAY ARRAY[
    'public.my_top_connections()',
    'public.giver_bands(uuid[])'
  ] LOOP
    IF to_regprocedure(signature) IS NOT NULL THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', signature);
    END IF;
  END LOOP;
END
$optional$;

-- Never grant authenticated direct access to members/companies/signals or
-- seed_threads/seed_learnings. Demo is served from packaged fictional data;
-- those tables intentionally have no live-member SELECT rights.
-- RLS on posts and asks enforces is_demo=false and approved membership.
