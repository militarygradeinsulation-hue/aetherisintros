-- CANDIDATE forward-only migration (proposed number 0095). NOT applied, NOT journaled.
-- Applying it through the project migration tool writes to the live database, so it
-- needs Joseph's explicit approval first. Tested only in disposable PGlite:
--   node scripts/migration-checks/icp-owner-grant.standalone.mjs
--
-- 1. Explicit single-owner grant (one account per capability): Prospect Intelligence requires BOTH the admin role AND a row in
--    private_owner_grants. No row => fail closed. Nobody is granted here; a grant is a
--    separate, approved data insert by a privileged operator (service role), never by a client.
-- 2. Key allowlist: existing keys kept verbatim; adds only 'icp:profiles' and
--    'icp:person:<uuid>'.
-- 3. Every ICP write (insert/update/delete) must come from inside icp_save, which marks the
--    transaction; the general save_workspace_state RPC and direct table writes are refused.
-- 4. icp_save: payload validation, owner check, transition rules, retry idempotency.

CREATE TABLE IF NOT EXISTS public.private_owner_grants (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  capability text NOT NULL CHECK (capability IN ('prospect_intelligence')),
  granted_by text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, capability)
);
REVOKE ALL ON public.private_owner_grants FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.private_owner_grants TO service_role;
ALTER TABLE public.private_owner_grants ENABLE ROW LEVEL SECURITY;
-- Single owner: at most one account may hold each capability. The table is new in this
-- migration, so no existing rows can conflict; on replay, audit rows before relying on it
-- (CREATE UNIQUE INDEX fails loudly rather than silently if duplicates were ever inserted).
CREATE UNIQUE INDEX IF NOT EXISTS private_owner_grants_one_owner ON public.private_owner_grants (capability);
-- No authenticated policies: members cannot read or write grants. Checked via the function below.

CREATE OR REPLACE FUNCTION public.has_private_owner_grant(p_capability text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL
     AND public.has_role(auth.uid(), 'admin')
     AND EXISTS (SELECT 1 FROM public.private_owner_grants g
                  WHERE g.user_id = auth.uid() AND g.capability = p_capability)
$$;
REVOKE ALL ON FUNCTION public.has_private_owner_grant(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_private_owner_grant(text) TO authenticated, service_role;

ALTER TABLE public.member_workspace_state DROP CONSTRAINT IF EXISTS member_workspace_state_store_key_check;
ALTER TABLE public.member_workspace_state ADD CONSTRAINT member_workspace_state_store_key_check CHECK (
  store_key IN ('aetheris-moat-v1-live','aetheris-relationship-os-v1-live','aetheris-pro-v1-live','aetheris-platform-v1-live','aetheris.ledger.patch','icp:profiles')
  OR store_key ~ '^icp:person:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
);

CREATE OR REPLACE FUNCTION public.icp_state_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE k text := CASE WHEN TG_OP = 'DELETE' THEN OLD.store_key ELSE NEW.store_key END;
BEGIN
  IF k LIKE 'icp:%' OR (TG_OP = 'UPDATE' AND OLD.store_key LIKE 'icp:%') THEN
    IF TG_OP = 'DELETE' THEN
      -- Only account deletion (cascade, parent row already gone) may remove review history.
      IF EXISTS (SELECT 1 FROM auth.users WHERE id = OLD.user_id) THEN
        RAISE EXCEPTION 'Prospect review history is retained';
      END IF;
      RETURN OLD;
    END IF;
    IF coalesce(current_setting('app.icp_reviewed_write', true), '') <> NEW.user_id::text THEN
      RAISE EXCEPTION 'Use the private reviewed prospect workflow';
    END IF;
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;
DROP TRIGGER IF EXISTS icp_private_workspace_guard ON public.member_workspace_state;
CREATE TRIGGER icp_private_workspace_guard BEFORE INSERT OR UPDATE OR DELETE ON public.member_workspace_state
  FOR EACH ROW EXECUTE FUNCTION public.icp_state_guard();

DROP POLICY IF EXISTS icp_private_read_guard ON public.member_workspace_state;
CREATE POLICY icp_private_read_guard ON public.member_workspace_state AS RESTRICTIVE FOR SELECT TO authenticated
  USING (store_key NOT LIKE 'icp:%' OR public.has_private_owner_grant('prospect_intelligence'));

-- General RPC: unchanged behaviour for legacy keys; refuses ICP keys outright.
CREATE OR REPLACE FUNCTION public.save_workspace_state(p_key text, p_data jsonb, p_base_version bigint)
RETURNS TABLE (saved boolean, current_version bigint, current_data jsonb, saved_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_row public.member_workspace_state%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in to save your workspace' USING errcode = '42501'; END IF;
  IF p_key LIKE 'icp:%' THEN RAISE EXCEPTION 'Use icp_save for reviewed prospect changes'; END IF;
  SELECT * INTO v_row FROM public.member_workspace_state s WHERE s.user_id = v_uid AND s.store_key = p_key FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.member_workspace_state AS s (user_id, store_key, data, version, updated_at)
      VALUES (v_uid, p_key, p_data, 1, now()) ON CONFLICT (user_id, store_key) DO NOTHING RETURNING s.* INTO v_row;
    IF FOUND THEN RETURN QUERY SELECT true, v_row.version, NULL::jsonb, v_row.updated_at; RETURN; END IF;
    SELECT * INTO v_row FROM public.member_workspace_state s WHERE s.user_id = v_uid AND s.store_key = p_key;
    RETURN QUERY SELECT false, v_row.version, v_row.data, v_row.updated_at; RETURN;
  END IF;
  IF v_row.version IS DISTINCT FROM p_base_version THEN
    RETURN QUERY SELECT false, v_row.version, v_row.data, v_row.updated_at; RETURN;
  END IF;
  UPDATE public.member_workspace_state s SET data = p_data, version = s.version + 1, updated_at = now()
    WHERE s.user_id = v_uid AND s.store_key = p_key RETURNING s.* INTO v_row;
  RETURN QUERY SELECT true, v_row.version, NULL::jsonb, v_row.updated_at;
END $$;
REVOKE ALL ON FUNCTION public.save_workspace_state(text, jsonb, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_workspace_state(text, jsonb, bigint) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.icp_save(p_key text, p_data jsonb, p_expected bigint DEFAULT 0) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u uuid := auth.uid(); v bigint; old_data jsonb; person uuid; a text; b text;
  allowed jsonb := '{"new":["shortlisted","draft","dismissed","not_appropriate"],"shortlisted":["draft","dismissed","not_appropriate"],"draft":["approved","dismissed","not_appropriate"],"approved":["draft","invited","dismissed","not_appropriate"],"invited":["accepted","not_appropriate"],"accepted":["follow_up","not_appropriate"],"follow_up":["not_appropriate"],"dismissed":["shortlisted"],"not_appropriate":[]}';
BEGIN
  IF NOT public.has_private_owner_grant('prospect_intelligence') THEN RAISE EXCEPTION 'Private owner access required'; END IF;
  IF p_key <> 'icp:profiles' AND p_key !~ '^icp:person:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN RAISE EXCEPTION 'Invalid key'; END IF;
  IF p_data IS NULL OR jsonb_typeof(p_data) <> 'object' OR p_expected IS NULL OR p_expected < 0 THEN RAISE EXCEPTION 'Invalid payload or version'; END IF;
  IF octet_length(p_data::text) > 100000 THEN RAISE EXCEPTION 'Input too large'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(u::text || p_key));
  SELECT version, data INTO v, old_data FROM public.member_workspace_state WHERE user_id = u AND store_key = p_key;
  -- Lost-response retry: identical payload at the saved or just-previous version returns the saved row.
  IF old_data = p_data AND (p_expected = v OR p_expected = v - 1) THEN RETURN jsonb_build_object('version', v, 'data', old_data); END IF;
  IF coalesce(v, 0) <> p_expected THEN RAISE EXCEPTION 'Changed elsewhere. Reload before saving.'; END IF;
  IF p_key LIKE 'icp:person:%' THEN
    person := substring(p_key from 12)::uuid;
    IF NOT EXISTS (SELECT 1 FROM public.crm_people WHERE id = person AND owner_id = u AND NOT archived) THEN RAISE EXCEPTION 'Person is not in your CRM'; END IF;
    a := coalesce(old_data->>'status', 'new'); b := p_data->>'status';
    IF b IS NULL OR NOT allowed ? b OR (b <> a AND NOT (allowed->a ? b)) THEN RAISE EXCEPTION 'Invalid transition'; END IF;
    IF jsonb_typeof(p_data->'note') IS DISTINCT FROM 'string' OR jsonb_typeof(p_data->'consent') IS DISTINCT FROM 'boolean' OR length(p_data->>'note') > 300 THEN RAISE EXCEPTION 'Invalid review fields'; END IF;
    IF b = ANY (ARRAY['approved','invited','accepted','follow_up']) AND (length(trim(p_data->>'note')) = 0 OR (p_data->>'consent')::boolean = false) THEN RAISE EXCEPTION 'Review note and confirm contact permission'; END IF;
    IF a = ANY (ARRAY['approved','invited','accepted','follow_up']) AND b <> 'draft' AND (old_data->>'note' IS DISTINCT FROM p_data->>'note' OR old_data->'consent' IS DISTINCT FROM p_data->'consent') THEN RAISE EXCEPTION 'Edited notes require review again'; END IF;
    IF a = b AND b = ANY (ARRAY['invited','accepted','follow_up']) AND p_data <> old_data THEN RAISE EXCEPTION 'Repeated contact statuses cannot change review history'; END IF;
    IF p_data = old_data THEN RETURN jsonb_build_object('version', v, 'data', old_data); END IF;
    IF b <> a THEN
      INSERT INTO public.crm_activities(owner_id, kind, subject, detail, person_id)
        VALUES (u, CASE WHEN b = ANY (ARRAY['invited','accepted','follow_up']) THEN 'message' ELSE 'note' END, 'Prospect review: ' || b, p_data->>'note', person);
      INSERT INTO public.entity_events(owner_id, entity_type, entity_id, event, summary, source)
        VALUES (u, 'crm_person', person::text, 'prospect_review', 'Prospect review: ' || b, 'app');
      IF b = ANY (ARRAY['invited','accepted','follow_up']) THEN UPDATE public.crm_people SET last_activity_at = now() WHERE id = person AND owner_id = u; END IF;
    END IF;
  END IF;
  PERFORM set_config('app.icp_reviewed_write', u::text, true);
  INSERT INTO public.member_workspace_state(user_id, store_key, data, version) VALUES (u, p_key, p_data, 1)
    ON CONFLICT (user_id, store_key) DO UPDATE SET data = excluded.data, version = member_workspace_state.version + 1, updated_at = now()
    RETURNING version INTO v;
  PERFORM set_config('app.icp_reviewed_write', '', true);
  RETURN jsonb_build_object('version', v, 'data', p_data);
END $$;
REVOKE ALL ON FUNCTION public.icp_save(text, jsonb, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.icp_save(text, jsonb, bigint) TO authenticated;
