-- Forward-only Drizzle 0100. Device context is an additive member-only store.
-- The existing member_workspace_state and private notes remain canonical.
-- Do not replay directly against live production or edit existing journal entries.
CREATE TABLE public.member_context (
  member_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slice text NOT NULL CHECK (slice IN ('profile','preferences','matches','open_intros','butler_tail','drafts')),
  payload jsonb,
  deleted boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (member_id, slice),
  CONSTRAINT member_context_payload_size CHECK (payload IS NULL OR pg_column_size(payload) <= 262144)
);
CREATE INDEX member_context_member_updated ON public.member_context (member_id, updated_at);
CREATE TABLE public.member_context_mutations (
  member_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mutation_id uuid NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (member_id, mutation_id)
);
ALTER TABLE public.member_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_context_mutations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.member_context, public.member_context_mutations FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.member_context TO authenticated;
CREATE POLICY member_context_read_own ON public.member_context
  FOR SELECT TO authenticated USING (member_id = (SELECT auth.uid()));

-- Privileged functions require explicit authentication and never accept
-- an account ID as a caller-controlled parameter. No dynamic SQL.
CREATE OR REPLACE FUNCTION public.ask_context_upsert(
  p_slice text, p_payload jsonb, p_mutation_id uuid, p_deleted boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE me uuid := (SELECT auth.uid());
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '42501'; END IF;
  IF p_mutation_id IS NULL THEN RAISE EXCEPTION 'MUTATION_ID_REQUIRED' USING ERRCODE = '22023'; END IF;
  IF p_slice IS NULL OR p_slice NOT IN ('profile','preferences','matches','open_intros','butler_tail','drafts')
    THEN RAISE EXCEPTION 'INVALID_CONTEXT_SLICE' USING ERRCODE = '22023'; END IF;
  IF NOT p_deleted AND p_payload IS NULL
    THEN RAISE EXCEPTION 'PAYLOAD_REQUIRED' USING ERRCODE = '22023'; END IF;
  IF p_payload IS NOT NULL AND pg_catalog.pg_column_size(p_payload) > 262144
    THEN RAISE EXCEPTION 'CONTEXT_TOO_LARGE' USING ERRCODE = '22023'; END IF;
  INSERT INTO public.member_context_mutations (member_id,mutation_id)
  VALUES (me,p_mutation_id) ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RETURN; END IF;
  INSERT INTO public.member_context(member_id,slice,payload,deleted,updated_at)
  VALUES(me,p_slice,CASE WHEN p_deleted THEN NULL ELSE p_payload END,p_deleted,clock_timestamp())
  ON CONFLICT(member_id,slice) DO UPDATE
  SET payload=excluded.payload, deleted=excluded.deleted, updated_at=excluded.updated_at;
END;
$$;

-- A sentinel row carries the server-side sync cursor. Five seconds of
-- overlap prevent missing concurrent writes; duplicate reads are safe.
CREATE OR REPLACE FUNCTION public.ask_context_since(p_since timestamptz)
RETURNS TABLE(slice text,payload jsonb,deleted boolean,updated_at timestamptz,server_time timestamptz)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE me uuid := (SELECT auth.uid()); cursor_at timestamptz := now() - interval '5 seconds';
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT NULL::text,NULL::jsonb,NULL::boolean,NULL::timestamptz,cursor_at;
  RETURN QUERY
    SELECT c.slice,c.payload,c.deleted,c.updated_at,cursor_at
    FROM public.member_context c
    WHERE c.member_id = me AND (p_since IS NULL OR c.updated_at > p_since);
END;
$$;
REVOKE ALL ON FUNCTION public.ask_context_upsert(text,jsonb,uuid,boolean),
              FUNCTION public.ask_context_since(timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ask_context_upsert(text,jsonb,uuid,boolean),
                 FUNCTION public.ask_context_since(timestamptz) TO authenticated;
