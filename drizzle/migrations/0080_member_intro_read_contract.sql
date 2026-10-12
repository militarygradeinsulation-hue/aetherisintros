-- Restore the live member/intro read connections without granting arbitrary
-- SELECT on public.profiles. These are purpose-limited, consent-aware read APIs.
-- Only the explicitly listed public profile fields are returned, never email,
-- boundaries, notes, verification proof, or account/private settings.

CREATE OR REPLACE FUNCTION public.visible_member_profiles(
  p_member_ids uuid[] DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
) RETURNS TABLE(profile jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501';
  END IF;
  IF coalesce(cardinality(p_member_ids), 0) > 100 THEN
    RAISE EXCEPTION 'Too many member ids' USING ERRCODE = '22023';
  END IF;
  RETURN QUERY
  SELECT jsonb_build_object(
    'id', p.id,
    'name', coalesce(p.name, ''),
    'initials', coalesce(p.initials, ''),
    'title', coalesce(p.title, ''),
    'company', coalesce(p.company, ''),
    'location', coalesce(p.location, ''),
    'focus', coalesce(p.focus, ''),
    'thesis', coalesce(p.thesis, ''),
    'bio', coalesce(p.bio, ''),
    'looking_for', coalesce(p.looking_for, ''),
    'can_help_with', coalesce(p.can_help_with, ''),
    'want_to_meet', coalesce(p.want_to_meet, ''),
    'availability', coalesce(p.availability, ''),
    'industries', coalesce(to_jsonb(p.industries), '[]'::jsonb),
    'expertise', coalesce(to_jsonb(p.expertise), '[]'::jsonb),
    'avatar_url', p.avatar_url,
    'onboarded', p.onboarded,
    'created_at', p.created_at,
    'what_i_do', coalesce(p.what_i_do, ''),
    'building', coalesce(to_jsonb(p)->>'building', ''),
    'open_to', CASE WHEN jsonb_typeof(to_jsonb(p)->'open_to') = 'array' THEN to_jsonb(p)->'open_to' ELSE '[]'::jsonb END,
    'scheduling_enabled', coalesce((to_jsonb(p)->>'scheduling_enabled')::boolean, false),
    'verified_role', to_jsonb(p)->>'verified_role'
  )
  FROM public.profiles p
  WHERE
    (p_member_ids IS NULL OR p.id = ANY(p_member_ids))
    AND (
      p.id = auth.uid()
      OR (
        public.is_live_member()
        AND public.is_approved_member(p.id)
        AND p.onboarded
        AND coalesce(p.visibility, 'network') IN ('network', 'public')
      )
    )
  ORDER BY p.name, p.id
  LIMIT least(greatest(coalesce(p_limit, 100), 1), 100)
  OFFSET least(greatest(coalesce(p_offset, 0), 0), 10000);
END
$function$;
REVOKE ALL ON FUNCTION public.visible_member_profiles(uuid[], integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.visible_member_profiles(uuid[], integer, integer)
  TO authenticated;

-- The people already involved in an introduction need to know the other
-- participant's name even when direct profile SELECT is disabled. A caller
-- may retrieve names only for introductions in which they participate; this
-- never returns email, phone, private notes, or any unrelated member.
CREATE OR REPLACE FUNCTION public.my_intro_participant_names(
  p_intro_ids uuid[] DEFAULT NULL
) RETURNS TABLE(intro_request_id uuid, other_id uuid, other_name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_live_member() THEN
    RAISE EXCEPTION 'Verified membership required' USING ERRCODE = '42501';
  END IF;
  IF coalesce(cardinality(p_intro_ids), 0) > 100 THEN
    RAISE EXCEPTION 'Too many introduction ids' USING ERRCODE = '22023';
  END IF;
  RETURN QUERY
  SELECT r.id,
         CASE WHEN r.user_id = auth.uid() THEN r.target_user_id ELSE r.user_id END,
         coalesce(nullif(btrim(p.name), ''), 'Member')
  FROM public.intro_requests r
  JOIN public.profiles p ON p.id =
       CASE WHEN r.user_id = auth.uid() THEN r.target_user_id ELSE r.user_id END
  WHERE (r.user_id = auth.uid() OR r.target_user_id = auth.uid())
    AND (p_intro_ids IS NULL OR r.id = ANY(p_intro_ids))
  ORDER BY r.updated_at DESC, r.id
  LIMIT 100;
END
$function$;
REVOKE ALL ON FUNCTION public.my_intro_participant_names(uuid[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.my_intro_participant_names(uuid[])
  TO authenticated;
