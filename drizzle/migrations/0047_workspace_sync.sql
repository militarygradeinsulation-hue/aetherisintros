-- Member workspace sync: the parts of the app that used to live only in one browser
-- (Moat layer, Relationship OS, Professional layer, Platform collections, workspace edits)
-- are saved to the member's account so they follow them to any device. One row per member
-- per store, private to that member. Only the real ("live") stores are accepted; demo or
-- showcase data has no allowed key and can never be stored. Rows go with the account
-- (ON DELETE CASCADE).

CREATE TABLE public.member_workspace_state (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  store_key text NOT NULL CHECK (store_key IN (
    'aetheris-moat-v1-live',
    'aetheris-relationship-os-v1-live',
    'aetheris-pro-v1-live',
    'aetheris-platform-v1-live',
    'aetheris.ledger.patch'
  )),
  data jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(data) = 'object' AND octet_length(data::text) <= 2097152),
  version bigint NOT NULL DEFAULT 1 CHECK (version >= 1),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, store_key)
);
REVOKE ALL ON public.member_workspace_state FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.member_workspace_state TO service_role;
-- Members read and remove their own rows; they may create one with only the key and data
-- (user_id comes from auth.uid(), version starts at 1). Changes go through
-- save_workspace_state so stale writes from another device are rejected.
GRANT SELECT, DELETE ON public.member_workspace_state TO authenticated;
GRANT INSERT (store_key, data) ON public.member_workspace_state TO authenticated;
ALTER TABLE public.member_workspace_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own workspace state read" ON public.member_workspace_state
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own workspace state create" ON public.member_workspace_state
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own workspace state remove" ON public.member_workspace_state
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Saves one store if the caller's copy is based on the current version (0 = never saved).
-- On a stale write nothing changes and the current version and data come back, so the
-- client can merge and try again.
CREATE OR REPLACE FUNCTION public.save_workspace_state(p_key text, p_data jsonb, p_base_version bigint)
RETURNS TABLE (saved boolean, current_version bigint, current_data jsonb, saved_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.member_workspace_state%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in to save your workspace' USING errcode = '42501';
  END IF;

  SELECT * INTO v_row FROM public.member_workspace_state s
    WHERE s.user_id = v_uid AND s.store_key = p_key FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.member_workspace_state AS s (user_id, store_key, data, version, updated_at)
      VALUES (v_uid, p_key, p_data, 1, now())
      ON CONFLICT (user_id, store_key) DO NOTHING
      RETURNING s.* INTO v_row;
    IF FOUND THEN
      RETURN QUERY SELECT true, v_row.version, NULL::jsonb, v_row.updated_at;
      RETURN;
    END IF;
    -- Another device created it a moment ago.
    SELECT * INTO v_row FROM public.member_workspace_state s
      WHERE s.user_id = v_uid AND s.store_key = p_key;
    RETURN QUERY SELECT false, v_row.version, v_row.data, v_row.updated_at;
    RETURN;
  END IF;

  IF v_row.version IS DISTINCT FROM p_base_version THEN
    RETURN QUERY SELECT false, v_row.version, v_row.data, v_row.updated_at;
    RETURN;
  END IF;

  UPDATE public.member_workspace_state s
    SET data = p_data, version = s.version + 1, updated_at = now()
    WHERE s.user_id = v_uid AND s.store_key = p_key
    RETURNING s.* INTO v_row;
  RETURN QUERY SELECT true, v_row.version, NULL::jsonb, v_row.updated_at;
END $$;
REVOKE ALL ON FUNCTION public.save_workspace_state(text, jsonb, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_workspace_state(text, jsonb, bigint) TO authenticated, service_role;
