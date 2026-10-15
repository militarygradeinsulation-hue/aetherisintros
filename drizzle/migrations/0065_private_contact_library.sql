-- Private imported contacts stay outside the member directory and operational CRM.
CREATE TABLE public.private_library_workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 100),
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX private_library_one_default_workspace ON public.private_library_workspaces(owner_id) WHERE is_default;

CREATE TABLE public.private_library_workspace_members (
  workspace_id uuid NOT NULL REFERENCES public.private_library_workspaces(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission text NOT NULL CHECK (permission IN ('read','edit')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, member_id),
  CHECK (owner_id <> member_id)
);
CREATE INDEX private_library_workspace_members_member_idx ON public.private_library_workspace_members(member_id, workspace_id);

CREATE OR REPLACE FUNCTION public.private_library_can_read(p_workspace_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.private_library_workspaces w
    WHERE w.id = p_workspace_id AND (
      w.owner_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.private_library_workspace_members m
        WHERE m.workspace_id = w.id AND m.member_id = auth.uid())
    )
  )
$$;

CREATE OR REPLACE FUNCTION public.private_library_can_write(p_workspace_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.private_library_workspaces w
    WHERE w.id = p_workspace_id AND (
      w.owner_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.private_library_workspace_members m
        WHERE m.workspace_id = w.id AND m.member_id = auth.uid() AND m.permission = 'edit')
    )
  )
$$;

CREATE TABLE public.private_library_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.private_library_workspaces(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_file text NOT NULL CHECK (char_length(source_file) BETWEEN 1 AND 255),
  source_format text NOT NULL CHECK (source_format IN ('csv','xlsx')),
  file_hash text NOT NULL CHECK (file_hash ~ '^[0-9a-f]{64}$'),
  total_rows integer NOT NULL CHECK (total_rows BETWEEN 1 AND 50000),
  imported_count integer NOT NULL DEFAULT 0 CHECK (imported_count >= 0),
  row_errors jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(row_errors) = 'array'),
  status text NOT NULL DEFAULT 'reviewing' CHECK (status IN ('reviewing','completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, file_hash)
);

CREATE TABLE public.private_library_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.private_library_workspaces(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES public.private_library_import_batches(id),
  import_key text NOT NULL CHECK (char_length(import_key) BETWEEN 1 AND 200),
  record_type text NOT NULL CHECK (record_type IN ('person','organization')),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 300),
  phone text NOT NULL DEFAULT '' CHECK (char_length(phone) <= 500),
  email text NOT NULL DEFAULT '' CHECK (char_length(email) <= 500),
  business text NOT NULL DEFAULT '' CHECK (char_length(business) <= 500),
  title text NOT NULL DEFAULT '' CHECK (char_length(title) <= 500),
  location text NOT NULL DEFAULT '' CHECK (char_length(location) <= 1000),
  website text NOT NULL DEFAULT '' CHECK (char_length(website) <= 2000),
  industry text NOT NULL DEFAULT '' CHECK (char_length(industry) <= 500),
  raw_contact_person text NOT NULL DEFAULT '' CHECK (char_length(raw_contact_person) <= 1000),
  source_file text NOT NULL DEFAULT '' CHECK (char_length(source_file) <= 255),
  source_sheet text NOT NULL DEFAULT '' CHECK (char_length(source_sheet) <= 255),
  source_row integer NOT NULL CHECK (source_row > 0),
  source_reference text NOT NULL DEFAULT '' CHECK (char_length(source_reference) <= 2000),
  dnc_status text NOT NULL DEFAULT 'unknown' CHECK (char_length(dnc_status) <= 200),
  verification_status text NOT NULL DEFAULT 'unverified' CHECK (verification_status = 'unverified'),
  duplicate_candidate boolean NOT NULL DEFAULT false,
  original_columns jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(original_columns) = 'object' AND octet_length(original_columns::text) <= 100000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, import_key)
);
CREATE INDEX private_library_records_workspace_name_idx ON public.private_library_records(workspace_id, lower(name));
CREATE INDEX private_library_records_batch_idx ON public.private_library_records(batch_id, source_row);

CREATE TABLE public.private_library_enrichment_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.private_library_workspaces(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  record_id uuid NOT NULL REFERENCES public.private_library_records(id) ON DELETE CASCADE,
  candidate_key text NOT NULL CHECK (char_length(candidate_key) BETWEEN 1 AND 100),
  candidate_name text NOT NULL CHECK (char_length(candidate_name) BETWEEN 1 AND 300),
  confidence numeric NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 1),
  source_url text NOT NULL CHECK (
    source_url ~* '^https://[^[:space:]]+$' AND char_length(source_url) <= 2000
    AND source_url !~ '[?#]' AND substring(source_url from '^https://[^/]+') !~ '@'
  ),
  source_channel text NOT NULL CHECK (source_channel IN ('manual','assistant_connector')),
  sourced_at timestamptz NOT NULL,
  fields jsonb NOT NULL CHECK (jsonb_typeof(fields) = 'object'),
  field_evidence jsonb NOT NULL CHECK (jsonb_typeof(field_evidence) = 'object'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  accepted_fields text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz
);
CREATE INDEX private_library_suggestions_record_idx
  ON public.private_library_enrichment_suggestions(workspace_id, record_id, created_at DESC);

ALTER TABLE public.private_library_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_library_workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_library_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_library_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_library_enrichment_suggestions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.private_library_workspaces, public.private_library_workspace_members,
  public.private_library_import_batches, public.private_library_records,
  public.private_library_enrichment_suggestions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.private_library_workspaces, public.private_library_workspace_members,
  public.private_library_import_batches, public.private_library_records,
  public.private_library_enrichment_suggestions TO authenticated;
GRANT ALL ON public.private_library_workspaces, public.private_library_workspace_members,
  public.private_library_import_batches, public.private_library_records,
  public.private_library_enrichment_suggestions TO service_role;

CREATE POLICY private_library_workspaces_read ON public.private_library_workspaces
  FOR SELECT TO authenticated USING (public.private_library_can_read(id));
CREATE POLICY private_library_members_read ON public.private_library_workspace_members
  FOR SELECT TO authenticated USING (owner_id = auth.uid() OR member_id = auth.uid());
CREATE POLICY private_library_batches_read ON public.private_library_import_batches
  FOR SELECT TO authenticated USING (public.private_library_can_read(workspace_id));
CREATE POLICY private_library_records_read ON public.private_library_records
  FOR SELECT TO authenticated USING (public.private_library_can_read(workspace_id));
CREATE POLICY private_library_suggestions_read ON public.private_library_enrichment_suggestions
  FOR SELECT TO authenticated USING (public.private_library_can_read(workspace_id));

CREATE TRIGGER private_library_workspaces_freeze BEFORE UPDATE ON public.private_library_workspaces
  FOR EACH ROW EXECUTE FUNCTION public.freeze_columns('owner_id','is_default','created_at');
CREATE TRIGGER private_library_workspaces_touch BEFORE UPDATE ON public.private_library_workspaces
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER private_library_members_freeze BEFORE UPDATE ON public.private_library_workspace_members
  FOR EACH ROW EXECUTE FUNCTION public.freeze_columns('workspace_id','owner_id','member_id','created_at');
CREATE TRIGGER private_library_batches_freeze BEFORE UPDATE ON public.private_library_import_batches
  FOR EACH ROW EXECUTE FUNCTION public.freeze_columns('workspace_id','owner_id','source_format','file_hash','created_at');
CREATE TRIGGER private_library_batches_touch BEFORE UPDATE ON public.private_library_import_batches
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER private_library_records_freeze BEFORE UPDATE ON public.private_library_records
  FOR EACH ROW EXECUTE FUNCTION public.freeze_columns('workspace_id','owner_id','batch_id','import_key','created_at');
CREATE TRIGGER private_library_records_touch BEFORE UPDATE ON public.private_library_records
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER private_library_suggestions_freeze BEFORE UPDATE ON public.private_library_enrichment_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.freeze_columns('workspace_id','owner_id','record_id','candidate_key','source_url','sourced_at','created_at');

CREATE OR REPLACE FUNCTION public.ensure_private_library_workspace()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid uuid := auth.uid(); v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING errcode = '42501'; END IF;
  INSERT INTO public.private_library_workspaces(owner_id, name, is_default)
    VALUES (v_uid, 'My private Library', true)
    ON CONFLICT (owner_id) WHERE is_default DO NOTHING;
  SELECT id INTO v_id FROM public.private_library_workspaces WHERE owner_id = v_uid AND is_default;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.create_private_library_workspace(p_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid uuid := auth.uid(); v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING errcode = '42501'; END IF;
  IF char_length(btrim(coalesce(p_name,''))) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Workspace name must be 1–100 characters'; END IF;
  INSERT INTO public.private_library_workspaces(owner_id, name) VALUES (v_uid, btrim(p_name)) RETURNING id INTO v_id;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.grant_private_library_access(p_workspace_id uuid, p_member_id uuid, p_permission text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR NOT EXISTS (SELECT 1 FROM public.private_library_workspaces WHERE id = p_workspace_id AND owner_id = v_uid) THEN
    RAISE EXCEPTION 'Workspace not found' USING errcode = '42501';
  END IF;
  IF p_member_id IS NULL OR p_member_id = v_uid OR p_permission NOT IN ('read','edit')
     OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_member_id) THEN RAISE EXCEPTION 'Invalid member or permission'; END IF;
  INSERT INTO public.private_library_workspace_members(workspace_id, owner_id, member_id, permission)
    VALUES (p_workspace_id, v_uid, p_member_id, p_permission)
    ON CONFLICT (workspace_id, member_id) DO UPDATE SET permission = excluded.permission;
END $$;

CREATE OR REPLACE FUNCTION public.revoke_private_library_access(p_workspace_id uuid, p_member_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.private_library_workspaces WHERE id = p_workspace_id AND owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'Workspace not found' USING errcode = '42501';
  END IF;
  DELETE FROM public.private_library_workspace_members WHERE workspace_id = p_workspace_id AND member_id = p_member_id;
END $$;

CREATE OR REPLACE FUNCTION public.create_private_library_import_batch(
  p_workspace_id uuid, p_source_file text, p_source_format text, p_file_hash text, p_total_rows integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_owner uuid; v_id uuid; v_existing boolean := false;
BEGIN
  IF auth.uid() IS NULL OR NOT public.private_library_can_write(p_workspace_id) THEN RAISE EXCEPTION 'Workspace not found' USING errcode = '42501'; END IF;
  SELECT owner_id INTO v_owner FROM public.private_library_workspaces WHERE id = p_workspace_id;
  INSERT INTO public.private_library_import_batches(workspace_id, owner_id, source_file, source_format, file_hash, total_rows)
    VALUES (p_workspace_id, v_owner, left(p_source_file,255), p_source_format, p_file_hash, p_total_rows)
    ON CONFLICT (workspace_id, file_hash) DO NOTHING
    RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    v_existing := true;
    SELECT id INTO v_id FROM public.private_library_import_batches WHERE workspace_id = p_workspace_id AND file_hash = p_file_hash;
  END IF;
  RETURN jsonb_build_object('id', v_id, 'existing', v_existing);
END $$;

CREATE OR REPLACE FUNCTION public.import_private_library_records(p_batch_id uuid, p_rows jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_batch public.private_library_import_batches; v_item jsonb; v_record jsonb; v_errors jsonb := '[]'::jsonb;
  v_inserted integer := 0; v_existing integer := 0; v_added integer; v_key text; v_row integer;
BEGIN
  SELECT * INTO v_batch FROM public.private_library_import_batches WHERE id = p_batch_id;
  IF NOT FOUND OR NOT public.private_library_can_write(v_batch.workspace_id) THEN RAISE EXCEPTION 'Import not found' USING errcode = '42501'; END IF;
  IF jsonb_typeof(p_rows) <> 'array' OR jsonb_array_length(p_rows) > 500 THEN RAISE EXCEPTION 'Import chunks must contain at most 500 rows'; END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
    v_record := v_item->'record';
    v_key := v_item->>'import_key';
    v_row := CASE WHEN coalesce(v_record->>'source_row','') ~ '^[0-9]+$' THEN (v_record->>'source_row')::integer ELSE 0 END;
    BEGIN
      IF char_length(coalesce(v_key,'')) NOT BETWEEN 1 AND 200
        OR v_record->>'record_type' NOT IN ('person','organization')
        OR char_length(btrim(coalesce(v_record->>'name',''))) NOT BETWEEN 1 AND 300
        OR coalesce(v_record->>'verification_status','') <> 'unverified'
        OR jsonb_typeof(v_record->'original_columns') <> 'object'
        OR octet_length((v_record->'original_columns')::text) > 100000
        OR v_row < 1 THEN
        RAISE EXCEPTION 'Invalid or incomplete row';
      END IF;
      INSERT INTO public.private_library_records (
        workspace_id, owner_id, batch_id, import_key, record_type, name, phone, email, business, title,
        location, website, industry, raw_contact_person, source_file, source_sheet, source_row,
        source_reference, dnc_status, verification_status, duplicate_candidate, original_columns
      ) VALUES (
        v_batch.workspace_id, v_batch.owner_id, v_batch.id, v_key, v_record->>'record_type', btrim(v_record->>'name'),
        coalesce(v_record->>'phone',''), coalesce(v_record->>'email',''), coalesce(v_record->>'business',''),
        coalesce(v_record->>'title',''), coalesce(v_record->>'location',''), coalesce(v_record->>'website',''),
        coalesce(v_record->>'industry',''), coalesce(v_record->>'raw_contact_person',''),
        left(coalesce(v_record->>'source_file',v_batch.source_file),255), left(coalesce(v_record->>'source_sheet',''),255),
        v_row, coalesce(v_record->>'source_reference',''), coalesce(nullif(v_record->>'dnc_status',''),'unknown'),
        'unverified', coalesce((v_record->>'duplicate_candidate')::boolean,false), v_record->'original_columns'
      ) ON CONFLICT (workspace_id, import_key) DO NOTHING;
      GET DIAGNOSTICS v_added = ROW_COUNT;
      IF v_added = 1 THEN v_inserted := v_inserted + 1; ELSE v_existing := v_existing + 1; END IF;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors || jsonb_build_array(jsonb_build_object(
        'source_sheet',left(coalesce(v_record->>'source_sheet',''),255),
        'source_row',v_row,'message','Row could not be saved; review its field lengths and values.'));
    END;
  END LOOP;
  RETURN jsonb_build_object('inserted',v_inserted,'existing',v_existing,'errors',v_errors);
END $$;

CREATE OR REPLACE FUNCTION public.finish_private_library_import(p_batch_id uuid, p_row_errors jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF jsonb_typeof(p_row_errors) <> 'array' OR jsonb_array_length(p_row_errors) > 50000 THEN RAISE EXCEPTION 'Invalid row error report'; END IF;
  UPDATE public.private_library_import_batches b
    SET status = 'completed',
        imported_count = (SELECT count(*)::integer FROM public.private_library_records r WHERE r.batch_id = b.id),
        row_errors = p_row_errors
    WHERE b.id = p_batch_id AND public.private_library_can_write(b.workspace_id);
  IF NOT FOUND THEN RAISE EXCEPTION 'Import not found' USING errcode = '42501'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.search_private_library_records(
  p_query text DEFAULT '', p_limit integer DEFAULT 100, p_workspace_id uuid DEFAULT NULL
)
RETURNS SETOF public.private_library_records LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, pg_temp AS $$
  SELECT r.* FROM public.private_library_records r
  WHERE (p_workspace_id IS NULL OR r.workspace_id = p_workspace_id)
    AND public.private_library_can_read(r.workspace_id)
    AND (nullif(btrim(coalesce(p_query,'')),'') IS NULL
      OR concat_ws(' ',r.name,r.phone,r.email,r.business,r.title,r.location,r.website,r.industry) ILIKE '%' || left(btrim(p_query),200) || '%')
  ORDER BY r.created_at DESC
  LIMIT least(greatest(coalesce(p_limit,100),1),100)
$$;

CREATE OR REPLACE FUNCTION public.submit_private_library_suggestion(
  p_record_id uuid, p_candidate_key text, p_candidate_name text, p_confidence numeric,
  p_source_url text, p_source_channel text, p_sourced_at timestamptz, p_fields jsonb, p_field_evidence jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_record public.private_library_records; v_key text; v_value jsonb; v_id uuid; v_observed_at timestamptz;
  v_allowed text[] := ARRAY['business','title','location','website','industry'];
BEGIN
  SELECT * INTO v_record FROM public.private_library_records WHERE id = p_record_id;
  IF NOT FOUND OR NOT public.private_library_can_write(v_record.workspace_id) THEN RAISE EXCEPTION 'Contact not found' USING errcode = '42501'; END IF;
  IF p_source_channel NOT IN ('manual','assistant_connector') OR coalesce(p_source_url,'') !~* '^https://[^[:space:]]+$'
     OR char_length(p_source_url) > 2000 OR p_source_url ~ '[?#]'
     OR substring(p_source_url from '^https://[^/]+') ~ '@' THEN
    RAISE EXCEPTION 'A public HTTPS source URL without credentials, query strings, or fragments is required';
  END IF;
  IF jsonb_typeof(p_fields) <> 'object' OR jsonb_typeof(p_field_evidence) <> 'object'
     OR p_fields = '{}'::jsonb OR (p_fields - v_allowed) <> '{}'::jsonb THEN RAISE EXCEPTION 'No supported evidence-backed fields were provided'; END IF;
  FOR v_key, v_value IN SELECT key, value FROM jsonb_each(p_fields) LOOP
    IF jsonb_typeof(v_value) <> 'string' OR char_length(v_value#>>'{}') > 2000
      OR NOT (p_field_evidence ? v_key)
      OR p_field_evidence->v_key->>'source_url' IS DISTINCT FROM p_source_url
      OR coalesce(p_field_evidence->v_key->>'observed_at','') = '' THEN
      RAISE EXCEPTION 'Every suggested field needs source URL and timestamp evidence';
    END IF;
    v_observed_at := (p_field_evidence->v_key->>'observed_at')::timestamptz;
    IF v_observed_at IS NULL OR v_observed_at > now() + interval '5 minutes' THEN
    RAISE EXCEPTION 'Field evidence needs a valid observation timestamp';
    END IF;
  END LOOP;
  INSERT INTO public.private_library_enrichment_suggestions (
    workspace_id, owner_id, record_id, candidate_key, candidate_name, confidence, source_url, source_channel,
    sourced_at, fields, field_evidence
  ) VALUES (
    v_record.workspace_id, v_record.owner_id, v_record.id, left(p_candidate_key,100),
    left(btrim(p_candidate_name),300), least(greatest(coalesce(p_confidence,0),0),1),
    p_source_url, p_source_channel, p_sourced_at, p_fields, p_field_evidence
  ) RETURNING id INTO v_id;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.accept_private_library_suggestion(p_suggestion_id uuid, p_fields text[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_suggestion public.private_library_enrichment_suggestions; v_field text;
  v_allowed text[] := ARRAY['business','title','location','website','industry'];
BEGIN
  SELECT * INTO v_suggestion FROM public.private_library_enrichment_suggestions WHERE id = p_suggestion_id;
  IF NOT FOUND OR NOT public.private_library_can_write(v_suggestion.workspace_id)
     OR v_suggestion.status <> 'pending' THEN RAISE EXCEPTION 'Suggestion not found' USING errcode = '42501'; END IF;
  IF coalesce(cardinality(p_fields),0) = 0 OR NOT (p_fields <@ v_allowed) THEN RAISE EXCEPTION 'Choose supported fields to accept'; END IF;
  FOREACH v_field IN ARRAY p_fields LOOP
    IF NOT (v_suggestion.fields ? v_field) OR NOT (v_suggestion.field_evidence ? v_field) THEN
      RAISE EXCEPTION 'Accepted fields must have source evidence';
    END IF;
  END LOOP;
  UPDATE public.private_library_records SET
    business = CASE WHEN 'business' = ANY(p_fields) THEN v_suggestion.fields->>'business' ELSE business END,
    title = CASE WHEN 'title' = ANY(p_fields) THEN v_suggestion.fields->>'title' ELSE title END,
    location = CASE WHEN 'location' = ANY(p_fields) THEN v_suggestion.fields->>'location' ELSE location END,
    website = CASE WHEN 'website' = ANY(p_fields) THEN v_suggestion.fields->>'website' ELSE website END,
    industry = CASE WHEN 'industry' = ANY(p_fields) THEN v_suggestion.fields->>'industry' ELSE industry END
    WHERE id = v_suggestion.record_id;
  UPDATE public.private_library_enrichment_suggestions
    SET status = 'accepted', accepted_fields = p_fields, accepted_at = now()
    WHERE id = p_suggestion_id;
END $$;

CREATE OR REPLACE FUNCTION public.reject_private_library_suggestion(p_suggestion_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_suggestion public.private_library_enrichment_suggestions;
BEGIN
  SELECT * INTO v_suggestion FROM public.private_library_enrichment_suggestions WHERE id = p_suggestion_id;
  IF NOT FOUND OR NOT public.private_library_can_write(v_suggestion.workspace_id)
     OR v_suggestion.status <> 'pending' THEN RAISE EXCEPTION 'Suggestion not found' USING errcode = '42501'; END IF;
  UPDATE public.private_library_enrichment_suggestions SET status = 'rejected' WHERE id = p_suggestion_id;
END $$;

REVOKE ALL ON FUNCTION public.private_library_can_read(uuid), public.private_library_can_write(uuid),
  public.ensure_private_library_workspace(), public.create_private_library_workspace(text),
  public.grant_private_library_access(uuid,uuid,text), public.revoke_private_library_access(uuid,uuid),
  public.create_private_library_import_batch(uuid,text,text,text,integer),
  public.import_private_library_records(uuid,jsonb), public.finish_private_library_import(uuid,jsonb),
  public.search_private_library_records(text,integer,uuid),
  public.submit_private_library_suggestion(uuid,text,text,numeric,text,text,timestamptz,jsonb,jsonb),
  public.accept_private_library_suggestion(uuid,text[]), public.reject_private_library_suggestion(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.private_library_can_read(uuid), public.private_library_can_write(uuid),
  public.ensure_private_library_workspace(), public.create_private_library_workspace(text),
  public.grant_private_library_access(uuid,uuid,text), public.revoke_private_library_access(uuid,uuid),
  public.create_private_library_import_batch(uuid,text,text,text,integer),
  public.import_private_library_records(uuid,jsonb), public.finish_private_library_import(uuid,jsonb),
  public.search_private_library_records(text,integer,uuid),
  public.submit_private_library_suggestion(uuid,text,text,numeric,text,text,timestamptz,jsonb,jsonb),
  public.accept_private_library_suggestion(uuid,text[]), public.reject_private_library_suggestion(uuid)
  TO authenticated;
