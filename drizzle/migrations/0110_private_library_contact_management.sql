-- Owner-scoped manual contact maintenance. Imported source cells and privacy boundaries remain immutable.
-- The private contact table intentionally has no direct authenticated SELECT/UPDATE/DELETE grants.
CREATE OR REPLACE FUNCTION public.update_private_library_record(
  p_record_id uuid, p_expected_updated_at timestamptz, p_fields jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_record public.private_library_records%ROWTYPE;
  v_key text;
  v_allowed text[] := ARRAY[
    'name','phone','email','business','title','location','website','industry',
    'raw_contact_person','dnc_status'
  ];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in to edit a contact' USING errcode = '42501';
  END IF;
  SELECT * INTO v_record FROM public.private_library_records WHERE id = p_record_id FOR UPDATE;
  IF NOT FOUND OR NOT public.private_library_can_write(v_record.workspace_id) THEN
    RAISE EXCEPTION 'Contact not available' USING errcode = '42501';
  END IF;
  IF p_expected_updated_at IS NULL OR v_record.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION 'This contact changed since you opened it. Refresh before saving.' USING errcode = '40001';
  END IF;
  IF p_fields IS NULL OR jsonb_typeof(p_fields) IS DISTINCT FROM 'object' OR p_fields = '{}'::jsonb
    OR jsonb_object_length(p_fields) > array_length(v_allowed,1) THEN
    RAISE EXCEPTION 'Provide one or more contact fields' USING errcode = '22023';
  END IF;
  FOR v_key IN SELECT jsonb_object_keys(p_fields) LOOP
    IF NOT v_key = ANY(v_allowed) OR jsonb_typeof(p_fields -> v_key) IS DISTINCT FROM 'string' THEN
      RAISE EXCEPTION 'Unrecognized or invalid contact field' USING errcode = '22023';
    END IF;
  END LOOP;
  IF p_fields ? 'name' AND char_length(btrim(p_fields ->> 'name')) NOT BETWEEN 1 AND 300 THEN
    RAISE EXCEPTION 'Name must be 1–300 characters' USING errcode = '22023';
  END IF;
  IF p_fields ? 'email' AND btrim(p_fields ->> 'email') <> ''
     AND btrim(p_fields ->> 'email') !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'Enter a valid email or leave it blank' USING errcode = '22023';
  END IF;
  IF p_fields ? 'dnc_status' AND btrim(p_fields ->> 'dnc_status') = '' THEN
    RAISE EXCEPTION 'Do-not-contact status cannot be blank' USING errcode = '22023';
  END IF;

  UPDATE public.private_library_records r SET
    name = CASE WHEN p_fields ? 'name' THEN btrim(p_fields ->> 'name') ELSE r.name END,
    phone = CASE WHEN p_fields ? 'phone' THEN btrim(p_fields ->> 'phone') ELSE r.phone END,
    email = CASE WHEN p_fields ? 'email' THEN btrim(p_fields ->> 'email') ELSE r.email END,
    business = CASE WHEN p_fields ? 'business' THEN btrim(p_fields ->> 'business') ELSE r.business END,
    title = CASE WHEN p_fields ? 'title' THEN btrim(p_fields ->> 'title') ELSE r.title END,
    location = CASE WHEN p_fields ? 'location' THEN btrim(p_fields ->> 'location') ELSE r.location END,
    website = CASE WHEN p_fields ? 'website' THEN btrim(p_fields ->> 'website') ELSE r.website END,
    industry = CASE WHEN p_fields ? 'industry' THEN btrim(p_fields ->> 'industry') ELSE r.industry END,
    raw_contact_person = CASE WHEN p_fields ? 'raw_contact_person' THEN btrim(p_fields ->> 'raw_contact_person') ELSE r.raw_contact_person END,
    dnc_status = CASE WHEN p_fields ? 'dnc_status' THEN btrim(p_fields ->> 'dnc_status') ELSE r.dnc_status END
  WHERE r.id = p_record_id
  RETURNING * INTO v_record;
  RETURN to_jsonb(v_record);
END $$;

-- Destructive deletion is owner-only even when a workspace has shared editors.
CREATE OR REPLACE FUNCTION public.delete_private_library_record(
  p_record_id uuid, p_expected_updated_at timestamptz
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_record public.private_library_records%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in to delete a contact' USING errcode = '42501';
  END IF;
  SELECT * INTO v_record FROM public.private_library_records WHERE id = p_record_id FOR UPDATE;
  IF NOT FOUND OR v_record.owner_id IS DISTINCT FROM auth.uid()
     OR NOT EXISTS (
       SELECT 1 FROM public.private_library_workspaces w
       WHERE w.id = v_record.workspace_id AND w.owner_id = auth.uid()
     ) THEN
    RAISE EXCEPTION 'Only the owner can delete this private contact' USING errcode = '42501';
  END IF;
  IF p_expected_updated_at IS NULL OR v_record.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION 'This contact changed since you opened it. Refresh before deleting.' USING errcode = '40001';
  END IF;
  DELETE FROM public.private_library_records WHERE id = p_record_id;
  -- Suggestions for this one contact cascade; import history remains for audit.
  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.update_private_library_record(uuid,timestamptz,jsonb),
  public.delete_private_library_record(uuid,timestamptz)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.update_private_library_record(uuid,timestamptz,jsonb),
  public.delete_private_library_record(uuid,timestamptz)
  TO authenticated;
