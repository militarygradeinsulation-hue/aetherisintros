-- Professional enrichment (LinkedIn) attached to canonical crm_people. Owner-only reads; writes only via RPCs.
CREATE TABLE public.person_external_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  person_id uuid NOT NULL REFERENCES public.crm_people(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'linkedin' CHECK (provider = 'linkedin'),
  external_url text NOT NULL DEFAULT '' CHECK (char_length(external_url) <= 300),
  external_handle text CHECK (external_handle IS NULL OR external_handle ~ '^[a-z0-9_%-]{2,100}$'),
  status text NOT NULL DEFAULT 'candidate' CHECK (status IN ('candidate','confirmed','rejected','conflict')),
  confirmed_by uuid,
  confirmed_at timestamptz,
  last_checked_at timestamptz NOT NULL DEFAULT now(),
  last_changed_at timestamptz,
  latest_snapshot_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX person_external_profiles_handle_uq ON public.person_external_profiles (owner_id, provider, external_handle) WHERE external_handle IS NOT NULL;
CREATE UNIQUE INDEX person_external_profiles_one_confirmed ON public.person_external_profiles (person_id, provider) WHERE status = 'confirmed';
CREATE INDEX person_external_profiles_person_idx ON public.person_external_profiles (owner_id, person_id);
REVOKE ALL ON public.person_external_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.person_external_profiles TO authenticated;
GRANT ALL ON public.person_external_profiles TO service_role;
ALTER TABLE public.person_external_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner reads external profiles" ON public.person_external_profiles FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE TRIGGER person_external_profiles_freeze BEFORE UPDATE ON public.person_external_profiles
  FOR EACH ROW EXECUTE FUNCTION public.freeze_columns('owner_id','person_id','provider','external_handle','created_at');

CREATE TABLE public.person_enrichment_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  person_id uuid NOT NULL REFERENCES public.crm_people(id) ON DELETE CASCADE,
  external_profile_id uuid REFERENCES public.person_external_profiles(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'linkedin' CHECK (provider = 'linkedin'),
  source_channel text NOT NULL CHECK (source_channel IN ('assistant_connector','manual','direct_api')),
  run_id uuid REFERENCES public.capability_runs(id) ON DELETE SET NULL,
  query jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(query) = 'object'),
  normalized jsonb NOT NULL CHECK (jsonb_typeof(normalized) = 'object'),
  content_hash text NOT NULL,
  checked_at timestamptz NOT NULL DEFAULT now(),
  match_confidence numeric NOT NULL DEFAULT 0 CHECK (match_confidence BETWEEN 0 AND 1),
  match_reasons text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT snapshot_allowed_fields CHECK (
    (normalized - ARRAY['full_name','first_name','last_name','title','company','location','follower_count','profile_url']) = '{}'::jsonb)
);
CREATE INDEX person_enrichment_snapshots_person_idx ON public.person_enrichment_snapshots (owner_id, person_id, checked_at DESC);
REVOKE ALL ON public.person_enrichment_snapshots FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.person_enrichment_snapshots TO authenticated;
GRANT ALL ON public.person_enrichment_snapshots TO service_role;
ALTER TABLE public.person_enrichment_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner reads enrichment snapshots" ON public.person_enrichment_snapshots FOR SELECT TO authenticated USING (owner_id = auth.uid());

CREATE OR REPLACE FUNCTION public.enrichment_snapshot_append_only() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'Enrichment snapshots are append-only' USING errcode = '42501'; END $$;
CREATE TRIGGER person_enrichment_snapshots_append_only BEFORE UPDATE ON public.person_enrichment_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.enrichment_snapshot_append_only();

ALTER TABLE public.person_external_profiles ADD CONSTRAINT person_external_profiles_latest_fk
  FOREIGN KEY (latest_snapshot_id) REFERENCES public.person_enrichment_snapshots(id) ON DELETE SET NULL;

-- Strips anything outside the allow-list and coerces types.
CREATE OR REPLACE FUNCTION public.enrichment_clean(p jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT jsonb_strip_nulls(jsonb_build_object(
    'full_name', nullif(left(btrim(p->>'full_name'), 160), ''),
    'first_name', nullif(left(btrim(p->>'first_name'), 80), ''),
    'last_name', nullif(left(btrim(p->>'last_name'), 80), ''),
    'title', nullif(left(btrim(p->>'title'), 200), ''),
    'company', nullif(left(btrim(p->>'company'), 160), ''),
    'location', nullif(left(btrim(p->>'location'), 160), ''),
    'follower_count', CASE WHEN (p->>'follower_count') ~ '^[0-9]{1,9}$' THEN to_jsonb((p->>'follower_count')::int) END,
    'profile_url', nullif(left(btrim(p->>'profile_url'), 300), '')))
$$;

CREATE OR REPLACE FUNCTION public.linkedin_handle(p_url text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT nullif(lower(substring(coalesce(p_url,'') from '(?i)linkedin\.com/in/([A-Za-z0-9_%-]{2,100})')), '')
$$;

-- Confirm a selected candidate against the canonical person. Never merges; returns conflict on a duplicate handle.
CREATE OR REPLACE FUNCTION public.confirm_professional_profile(p_run_id uuid, p_person_id uuid, p_candidate jsonb, p_query jsonb,
  p_channel text, p_confidence numeric, p_reasons text[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_norm jsonb; v_handle text; v_hash text; v_other public.person_external_profiles;
  v_prof public.person_external_profiles; v_prev public.person_enrichment_snapshots; v_snap uuid; v_inserted boolean := false; r public.capability_runs;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING errcode = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.crm_people WHERE id = p_person_id AND owner_id = v_uid) THEN RAISE EXCEPTION 'Person not found' USING errcode = '42501'; END IF;
  IF p_channel NOT IN ('assistant_connector','manual','direct_api') THEN RAISE EXCEPTION 'Invalid source channel'; END IF;
  IF p_run_id IS NOT NULL THEN
    SELECT * INTO r FROM public.capability_runs WHERE id = p_run_id;
    IF NOT FOUND OR r.owner_id <> v_uid OR r.capability_id <> 'enrich.person.professional' OR r.subject_id <> p_person_id::text THEN
      RAISE EXCEPTION 'Run not found' USING errcode = '42501';
    END IF;
  END IF;
  v_norm := public.enrichment_clean(p_candidate);
  v_handle := public.linkedin_handle(v_norm->>'profile_url');
  IF v_handle IS NULL THEN RAISE EXCEPTION 'A LinkedIn profile link (linkedin.com/in/…) is required to confirm' USING errcode = '22023'; END IF;
  v_norm := v_norm || jsonb_build_object('profile_url', 'https://www.linkedin.com/in/' || v_handle);
  v_hash := md5(v_norm::text);

  SELECT * INTO v_other FROM public.person_external_profiles WHERE owner_id = v_uid AND provider = 'linkedin' AND external_handle = v_handle;
  IF FOUND AND v_other.person_id <> p_person_id AND v_other.status IN ('confirmed','conflict') THEN
    RETURN jsonb_build_object('status','conflict','conflict_person_id', v_other.person_id, 'handle', v_handle);
  END IF;
  IF FOUND AND v_other.person_id <> p_person_id THEN
    -- An unconfirmed/rejected row for another person: reassigning would be a silent merge. Treat as conflict.
    RETURN jsonb_build_object('status','conflict','conflict_person_id', v_other.person_id, 'handle', v_handle);
  END IF;

  -- Demote any other confirmed profile for this person (the member explicitly chose this one).
  UPDATE public.person_external_profiles SET status = 'candidate'
    WHERE person_id = p_person_id AND provider = 'linkedin' AND status = 'confirmed' AND external_handle IS DISTINCT FROM v_handle;

  IF v_other.id IS NULL THEN
    INSERT INTO public.person_external_profiles (owner_id, person_id, provider, external_url, external_handle, status, confirmed_by, confirmed_at, last_checked_at)
    VALUES (v_uid, p_person_id, 'linkedin', v_norm->>'profile_url', v_handle, 'confirmed', v_uid, now(), now()) RETURNING * INTO v_prof;
  ELSE
    UPDATE public.person_external_profiles SET status = 'confirmed', confirmed_by = v_uid, confirmed_at = coalesce(confirmed_at, now()),
      external_url = v_norm->>'profile_url', last_checked_at = now() WHERE id = v_other.id RETURNING * INTO v_prof;
  END IF;

  SELECT * INTO v_prev FROM public.person_enrichment_snapshots WHERE external_profile_id = v_prof.id ORDER BY checked_at DESC LIMIT 1;
  IF v_prev.id IS NOT NULL AND v_prev.content_hash = v_hash THEN
    v_snap := v_prev.id;
  ELSE
    INSERT INTO public.person_enrichment_snapshots (owner_id, person_id, external_profile_id, provider, source_channel, run_id, query, normalized, content_hash, match_confidence, match_reasons)
    VALUES (v_uid, p_person_id, v_prof.id, 'linkedin', p_channel, p_run_id,
      jsonb_strip_nulls(jsonb_build_object('full_name', left(p_query->>'full_name',160), 'company', left(p_query->>'company',160), 'title', left(p_query->>'title',200), 'location', left(p_query->>'location',160))),
      v_norm, v_hash, least(greatest(coalesce(p_confidence,0),0),1), coalesce(p_reasons[1:8],'{}'))
    RETURNING id INTO v_snap;
    v_inserted := true;
    UPDATE public.person_external_profiles SET latest_snapshot_id = v_snap, last_changed_at = CASE WHEN v_prev.id IS NOT NULL THEN now() ELSE last_changed_at END WHERE id = v_prof.id;
    IF v_prev.id IS NOT NULL AND ((v_prev.normalized->>'title') IS DISTINCT FROM (v_norm->>'title') OR (v_prev.normalized->>'company') IS DISTINCT FROM (v_norm->>'company')) THEN
      INSERT INTO public.entity_events (owner_id, entity_type, entity_id, event, summary, detail, source)
      VALUES (v_uid, 'person', p_person_id::text, 'enrichment.role_changed',
        left('Role change on LinkedIn: ' || coalesce(v_prev.normalized->>'title','—') || ' at ' || coalesce(v_prev.normalized->>'company','—') || ' → ' || coalesce(v_norm->>'title','—') || ' at ' || coalesce(v_norm->>'company','—'), 500),
        jsonb_build_object('snapshot_id', v_snap, 'previous_snapshot_id', v_prev.id, 'provider', 'linkedin'), 'capability');
    END IF;
  END IF;
  INSERT INTO public.entity_events (owner_id, entity_type, entity_id, event, summary, detail, source)
  VALUES (v_uid, 'person', p_person_id::text, 'enrichment.verified', 'Professional info checked on LinkedIn',
    jsonb_build_object('snapshot_id', v_snap, 'changed', v_inserted, 'channel', p_channel, 'run_id', p_run_id), 'capability');
  RETURN jsonb_build_object('status','confirmed','profile_id', v_prof.id, 'snapshot_id', v_snap, 'inserted', v_inserted,
    'previous', CASE WHEN v_prev.id IS NULL THEN NULL ELSE v_prev.normalized END, 'normalized', v_norm);
END $$;

CREATE OR REPLACE FUNCTION public.reject_professional_candidate(p_person_id uuid, p_profile_url text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_handle text := public.linkedin_handle(p_profile_url); v_row public.person_external_profiles;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING errcode = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.crm_people WHERE id = p_person_id AND owner_id = v_uid) THEN RAISE EXCEPTION 'Person not found' USING errcode = '42501'; END IF;
  IF v_handle IS NULL THEN RETURN; END IF;
  SELECT * INTO v_row FROM public.person_external_profiles WHERE owner_id = v_uid AND provider = 'linkedin' AND external_handle = v_handle;
  IF NOT FOUND THEN
    INSERT INTO public.person_external_profiles (owner_id, person_id, provider, external_url, external_handle, status)
    VALUES (v_uid, p_person_id, 'linkedin', 'https://www.linkedin.com/in/' || v_handle, v_handle, 'rejected');
  ELSIF v_row.person_id = p_person_id AND v_row.status <> 'rejected' THEN
    UPDATE public.person_external_profiles SET status = 'rejected' WHERE id = v_row.id;
  END IF;
END $$;

-- Executes an approved field proposal on the canonical person. Only approved queue rows; only allow-listed fields.
CREATE OR REPLACE FUNCTION public.apply_professional_field(p_proposal_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); p public.capability_proposals; a public.approval_queue; v_field text; v_to text; v_person uuid; v_old text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING errcode = '42501'; END IF;
  SELECT * INTO p FROM public.capability_proposals WHERE id = p_proposal_id;
  IF NOT FOUND OR p.owner_id <> v_uid THEN RAISE EXCEPTION 'Proposal not found' USING errcode = '42501'; END IF;
  IF p.action->>'kind' <> 'update_person_field' THEN RAISE EXCEPTION 'Not a field update'; END IF;
  SELECT * INTO a FROM public.approval_queue WHERE id = p.approval_id;
  IF NOT FOUND OR a.status <> 'approved' OR a.user_id <> v_uid THEN RAISE EXCEPTION 'This change has not been approved' USING errcode = '42501'; END IF;
  v_field := p.action->>'field'; v_to := left(coalesce(p.action->>'to',''), 300); v_person := (p.action->>'personId')::uuid;
  IF v_field NOT IN ('title','company_name','location','linkedin_url') THEN RAISE EXCEPTION 'Field not allowed'; END IF;
  IF p.target_type <> 'person' OR p.target_id <> v_person::text THEN RAISE EXCEPTION 'Proposal target mismatch'; END IF;
  EXECUTE format('SELECT %I FROM public.crm_people WHERE id = $1 AND owner_id = $2', v_field) INTO v_old USING v_person, v_uid;
  EXECUTE format('UPDATE public.crm_people SET %I = $1 WHERE id = $2 AND owner_id = $3', v_field) USING v_to, v_person, v_uid;
  INSERT INTO public.entity_events (owner_id, entity_type, entity_id, event, summary, detail, source)
  VALUES (v_uid, 'person', v_person::text, 'enrichment.field_applied', left('Updated ' || v_field || ' from LinkedIn', 200),
    jsonb_build_object('field', v_field, 'from', v_old, 'to', v_to, 'snapshot_id', p.action->>'snapshotId', 'proposal_id', p.id, 'approval_id', a.id), 'capability');
END $$;

REVOKE ALL ON FUNCTION public.confirm_professional_profile(uuid, uuid, jsonb, jsonb, text, numeric, text[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_professional_candidate(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.apply_professional_field(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_professional_profile(uuid, uuid, jsonb, jsonb, text, numeric, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_professional_candidate(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_professional_field(uuid) TO authenticated;
