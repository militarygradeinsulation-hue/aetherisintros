-- Contact data is available only through bounded, permission-checked view RPCs.
DROP POLICY IF EXISTS private_library_records_read ON public.private_library_records;
DROP POLICY IF EXISTS private_library_suggestions_read ON public.private_library_enrichment_suggestions;
REVOKE ALL ON public.private_library_records, public.private_library_enrichment_suggestions
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.private_library_import_batches TO authenticated;

DROP FUNCTION IF EXISTS public.search_private_library_records(text, integer, uuid);

CREATE OR REPLACE FUNCTION public.search_private_library_records(
  p_query text DEFAULT '', p_limit integer DEFAULT 50, p_workspace_id uuid DEFAULT NULL,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(id uuid, record_type text, name text, business text, title text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT r.id, r.record_type, r.name, r.business, r.title
  FROM public.private_library_records r
  WHERE auth.uid() IS NOT NULL
    AND (p_workspace_id IS NULL OR r.workspace_id = p_workspace_id)
    AND public.private_library_can_read(r.workspace_id)
    AND (nullif(btrim(coalesce(p_query,'')),'') IS NULL
      OR concat_ws(' ',r.name,r.phone,r.email,r.business,r.title,r.location,r.website,r.industry)
        ILIKE '%' || left(btrim(p_query),200) || '%')
  ORDER BY r.created_at DESC, r.id
  LIMIT least(greatest(coalesce(p_limit,50),1),50)
  OFFSET least(greatest(coalesce(p_offset,0),0),1000000)
$$;

CREATE OR REPLACE FUNCTION public.get_private_library_record(p_record_id uuid)
RETURNS SETOF public.private_library_records
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT r.* FROM public.private_library_records r
  WHERE r.id = p_record_id AND auth.uid() IS NOT NULL
    AND public.private_library_can_read(r.workspace_id)
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_private_library_suggestions(
  p_record_id uuid, p_limit integer DEFAULT 50
)
RETURNS SETOF public.private_library_enrichment_suggestions
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT s.* FROM public.private_library_enrichment_suggestions s
  WHERE s.record_id = p_record_id AND auth.uid() IS NOT NULL
    AND public.private_library_can_read(s.workspace_id)
  ORDER BY s.created_at DESC, s.id
  LIMIT least(greatest(coalesce(p_limit,50),1),50)
$$;

CREATE OR REPLACE FUNCTION public.deny_contact_data_export()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  RAISE EXCEPTION 'Contact data export is disabled by policy' USING errcode = '42501';
END $$;

REVOKE ALL ON FUNCTION public.search_private_library_records(text,integer,uuid,integer),
  public.get_private_library_record(uuid),
  public.get_private_library_suggestions(uuid,integer),
  public.deny_contact_data_export()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_private_library_records(text,integer,uuid,integer),
  public.get_private_library_record(uuid),
  public.get_private_library_suggestions(uuid,integer),
  public.deny_contact_data_export()
  TO authenticated;

-- Direct-message attachments are another supported route for sending or retrieving source lists.
DO $$
BEGIN
  IF to_regclass('storage.objects') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "dm participants read files" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "dm participants upload files" ON storage.objects';
    EXECUTE 'CREATE POLICY "dm participants read non-tabular files" ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = ''dm-files'' AND name !~* ''\.(csv|tsv|xls|xlsx|xlsm|ods)$''
        AND public.is_uuid_text((storage.foldername(name))[1]) AND EXISTS (
          SELECT 1 FROM public.dm_threads t
          WHERE t.id::text = (storage.foldername(name))[1] AND auth.uid() IN (t.member_a, t.member_b)))';
    EXECUTE 'CREATE POLICY "dm participants upload non-tabular files" ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = ''dm-files'' AND name !~* ''\.(csv|tsv|xls|xlsx|xlsm|ods)$''
        AND owner = auth.uid() AND public.is_live_member()
        AND public.is_uuid_text((storage.foldername(name))[1]) AND EXISTS (
          SELECT 1 FROM public.dm_threads t
          WHERE t.id::text = (storage.foldername(name))[1] AND auth.uid() IN (t.member_a, t.member_b)))';
    EXECUTE 'CREATE POLICY "dm contact spreadsheets denied" ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated
      USING (bucket_id <> ''dm-files'' OR name !~* ''\.(csv|tsv|xls|xlsx|xlsm|ods)$'')';
    EXECUTE 'CREATE POLICY "dm contact spreadsheets upload denied" ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
      WITH CHECK (bucket_id <> ''dm-files'' OR name !~* ''\.(csv|tsv|xls|xlsx|xlsm|ods)$'')';
  END IF;
END $$;
