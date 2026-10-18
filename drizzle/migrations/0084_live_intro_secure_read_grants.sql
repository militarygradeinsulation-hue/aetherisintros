-- Correctness-first live network patch. Real introduction targets are resolved
-- exclusively through approved, onboarded public/network profiles.
-- This never routes requests through a guessed name or a demo profile.
CREATE OR REPLACE FUNCTION public.request_verified_intro(
  p_target uuid,
  p_note text DEFAULT 'I would like to explore a mutually useful introduction.'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $intro$
DECLARE
  v_requester uuid := auth.uid();
  v_note text := btrim(coalesce(p_note,''));
  v_id uuid;
  v_created boolean := false;
BEGIN
  IF v_requester IS NULL OR NOT public.is_live_member()
     OR NOT public.is_approved_member(v_requester) THEN
    RAISE EXCEPTION 'Approved membership is required to request an introduction'
      USING ERRCODE = '42501';
  END IF;
  IF p_target IS NULL OR p_target = v_requester THEN
    RAISE EXCEPTION 'Choose a different live member' USING ERRCODE = '22023';
  END IF;
  IF char_length(v_note) < 4 OR char_length(v_note) > 1000 THEN
    RAISE EXCEPTION 'Include an introduction note between 4 and 1000 characters'
      USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_target
      AND p.onboarded = true
      AND p.visibility IN ('network','public')
      AND public.is_approved_member(p.id)
  ) THEN
    RAISE EXCEPTION 'That member is not currently available for introductions'
      USING ERRCODE = '42501';
  END IF;
  -- A submitted request is not accepted and does not automatically authorize
  -- introductions to third parties.
  INSERT INTO public.intro_requests(
    user_id, member_id, target_user_id, status, reason,
    requester_opt_in, member_opt_in
  ) VALUES (
    v_requester, p_target::text, p_target, 'requested', v_note, true, false
  )
  ON CONFLICT(user_id, member_id) DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NOT NULL THEN v_created := true; END IF;
  IF v_id IS NULL THEN
    SELECT r.id INTO v_id FROM public.intro_requests r
    WHERE r.user_id = v_requester AND r.member_id = p_target::text;
  END IF;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Request was not stored' USING ERRCODE = '23514';
  END IF;
  RETURN jsonb_build_object(
    'id', v_id,
    'state', CASE WHEN v_created THEN 'created' ELSE 'existing' END
  );
END;
$intro$;
REVOKE ALL ON FUNCTION public.request_verified_intro(uuid,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_verified_intro(uuid,text) TO authenticated;

-- Provider lookup functions are deliberately scoped to authenticated members,
-- and remain SECURITY DEFINER to avoid opening underlying private tables.
REVOKE ALL ON FUNCTION public.provider_directory() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_provider_requests() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.provider_inbox() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provider_directory() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_provider_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION public.provider_inbox() TO authenticated;

-- The live network already has author-scoped writes and RLS-controlled reads.
-- Seed conversations, seed learnings, and mock signals remain private. Do not
-- grant direct SELECT to those tables to "repair" the real network.
GRANT SELECT ON public.posts, public.asks TO authenticated;
