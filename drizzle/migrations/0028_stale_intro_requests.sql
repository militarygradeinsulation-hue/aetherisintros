-- Introduction requests that nobody answers no longer die quietly. The requester sees how
-- long each request has waited, can send one reminder after five days, and can withdraw a
-- request that is still unanswered. Withdrawing deletes the pending row, so it leaves the
-- target's inbox and the pair can start fresh later.
--
-- Deletion is limited to unanswered requests: intro_outcomes cascades on delete, so removing
-- an accepted introduction would erase the other member's recorded outcomes (and the
-- evidence behind their follow-through record). Service-role deletes (account removal
-- cascades, admin cleanup) are not affected: the guard applies to signed-in members only.

CREATE OR REPLACE FUNCTION public.intro_requests_delete_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND (OLD.accepted_at IS NOT NULL OR OLD.member_opt_in) THEN
    RAISE EXCEPTION 'An accepted introduction cannot be deleted; its outcomes belong to both members'
      USING errcode = '42501';
  END IF;
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS intro_requests_delete_guard ON public.intro_requests;
CREATE TRIGGER intro_requests_delete_guard BEFORE DELETE ON public.intro_requests
  FOR EACH ROW EXECUTE FUNCTION public.intro_requests_delete_guard();

-- One reminder per request. Server-only: no client grants, written by nudge_intro_request.
CREATE TABLE IF NOT EXISTS public.intro_request_nudges (
  intro_request_id uuid PRIMARY KEY REFERENCES public.intro_requests(id) ON DELETE CASCADE,
  nudged_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.intro_request_nudges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.intro_request_nudges FROM PUBLIC, anon, authenticated;

-- The signed-in member's unanswered requests, oldest first, with what they can do next.
CREATE OR REPLACE FUNCTION public.my_pending_intro_requests()
RETURNS TABLE (id uuid, target_user_id uuid, target_name text, reason text, created_at timestamptz,
               days_waiting int, nudged_at timestamptz, can_nudge boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.target_user_id, coalesce(nullif(btrim(p.name), ''), 'A member'), r.reason, r.created_at,
         floor(extract(epoch FROM now() - r.created_at) / 86400)::int,
         n.nudged_at,
         n.nudged_at IS NULL AND r.created_at <= now() - interval '5 days'
    FROM public.intro_requests r
    LEFT JOIN public.profiles p ON p.id = r.target_user_id
    LEFT JOIN public.intro_request_nudges n ON n.intro_request_id = r.id
   WHERE r.user_id = auth.uid()
     AND r.target_user_id IS NOT NULL
     AND NOT r.member_opt_in
     AND r.status NOT IN ('declined', 'closed')
   ORDER BY r.created_at
$$;
REVOKE ALL ON FUNCTION public.my_pending_intro_requests() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_pending_intro_requests() TO authenticated;

-- Send the one reminder. Only the requester, only for an unanswered request at least five
-- days old, only once.
CREATE OR REPLACE FUNCTION public.nudge_intro_request(p_id uuid) RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.intro_requests; v_name text; v_at timestamptz;
BEGIN
  SELECT * INTO r FROM public.intro_requests WHERE intro_requests.id = p_id;
  IF NOT FOUND OR r.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Request not found' USING errcode = '42501';
  END IF;
  IF r.target_user_id IS NULL OR r.member_opt_in OR r.status IN ('declined', 'closed') THEN
    RAISE EXCEPTION 'This request has already been answered' USING errcode = '22023';
  END IF;
  IF r.created_at > now() - interval '5 days' THEN
    RAISE EXCEPTION 'A reminder can be sent five days after the request' USING errcode = '22023';
  END IF;
  INSERT INTO public.intro_request_nudges (intro_request_id) VALUES (p_id)
    ON CONFLICT (intro_request_id) DO NOTHING RETURNING nudged_at INTO v_at;
  IF v_at IS NULL THEN
    RAISE EXCEPTION 'A reminder was already sent for this request' USING errcode = '22023';
  END IF;
  SELECT coalesce(nullif(btrim(name), ''), 'A member') INTO v_name FROM public.profiles WHERE profiles.id = r.user_id;
  INSERT INTO public.notifications (user_id, kind, text, actor_id, link)
  VALUES (r.target_user_id, 'intro_reminder',
          coalesce(v_name, 'A member') || ' is still hoping for an answer on their introduction request',
          r.user_id, '/app/introductions');
  RETURN v_at;
END $$;
REVOKE ALL ON FUNCTION public.nudge_intro_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nudge_intro_request(uuid) TO authenticated;
