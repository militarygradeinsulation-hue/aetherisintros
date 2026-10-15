-- Restore explicit authenticated provider permissions and return only the
-- signed-in member's actual relationship evidence. No fictional timestamps,
-- synthetic introductions, or constant trust/strength values.
GRANT USAGE ON SCHEMA public TO authenticated;
DO $$
DECLARE name text;
BEGIN
  FOREACH name IN ARRAY ARRAY[
    'provider_directory','my_provider_requests','provider_inbox',
    'admin_provider_summary','admin_provider_requests'
  ] LOOP
    IF to_regprocedure(format('public.%I()',name)) IS NOT NULL THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I() TO authenticated', name);
    END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.my_relationship_evidence(p_members uuid[] DEFAULT NULL)
RETURNS TABLE (
  member_id uuid,
  message_count integer,
  last_message_at timestamptz,
  introduction_count integer,
  accepted_intro_count integer,
  joined_meetings integer,
  last_meeting_at timestamptz,
  connection_saved boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $relationship$
  WITH me AS (SELECT auth.uid() AS uid),
  visible AS (
    SELECT p.id
    FROM public.profiles p, me
    WHERE me.uid IS NOT NULL AND public.is_live_member()
      AND public.is_approved_member(me.uid)
      AND p.id <> me.uid AND p.onboarded
      AND p.visibility IN ('network','public')
      AND public.is_approved_member(p.id)
      AND (p_members IS NULL OR p.id = ANY(p_members))
    ORDER BY p.id
    LIMIT 100
  )
  SELECT v.id,
    (SELECT count(*)::integer
       FROM public.dm_threads t
       JOIN public.dm_messages m ON m.thread_id = t.id
       WHERE (t.member_a = me.uid AND t.member_b = v.id)
          OR (t.member_b = me.uid AND t.member_a = v.id)),
    (SELECT max(m.created_at)
       FROM public.dm_threads t JOIN public.dm_messages m ON m.thread_id=t.id
       WHERE (t.member_a = me.uid AND t.member_b = v.id)
          OR (t.member_b = me.uid AND t.member_a = v.id)),
    (SELECT count(*)::integer FROM public.intro_requests r
       WHERE (r.user_id = me.uid AND r.target_user_id = v.id)
          OR (r.target_user_id = me.uid AND r.user_id = v.id)),
    (SELECT count(*)::integer FROM public.intro_requests r
       WHERE r.requester_opt_in AND r.member_opt_in AND r.accepted_at IS NOT NULL
         AND ((r.user_id = me.uid AND r.target_user_id = v.id)
           OR (r.target_user_id = me.uid AND r.user_id = v.id))),
    (SELECT count(*)::integer FROM public.meetings mt
       JOIN public.meeting_participants a ON a.meeting_id = mt.id AND a.user_id=me.uid
       JOIN public.meeting_participants b ON b.meeting_id = mt.id AND b.user_id=v.id
       WHERE a.joined_at IS NOT NULL AND b.joined_at IS NOT NULL),
    (SELECT max(greatest(a.joined_at,b.joined_at)) FROM public.meetings mt
       JOIN public.meeting_participants a ON a.meeting_id = mt.id AND a.user_id=me.uid
       JOIN public.meeting_participants b ON b.meeting_id = mt.id AND b.user_id=v.id
       WHERE a.joined_at IS NOT NULL AND b.joined_at IS NOT NULL),
    EXISTS(SELECT 1 FROM public.follows f WHERE f.follower_id=me.uid
      AND f.followee_id=v.id AND f.kind='connection')
  FROM visible v CROSS JOIN me;
$relationship$;
REVOKE ALL ON FUNCTION public.my_relationship_evidence(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.my_relationship_evidence(uuid[]) TO authenticated;
