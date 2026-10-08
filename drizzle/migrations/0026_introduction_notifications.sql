-- Introduction notifications, created by the database so every path (app, assistant/MCP,
-- future integrations) notifies the right person exactly once. Text never includes the
-- requester's private context: only who asked and what to do next.

CREATE OR REPLACE FUNCTION public.notify_intro_events() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.target_user_id IS NOT NULL AND NEW.target_user_id <> NEW.user_id THEN
    SELECT coalesce(nullif(p.name, ''), 'A member') INTO v_name FROM public.profiles p WHERE p.id = NEW.user_id;
    INSERT INTO public.notifications (user_id, actor_id, kind, text, link)
    VALUES (NEW.target_user_id, NEW.user_id, 'intro_request',
            coalesce(v_name, 'A member') || ' asked for an introduction. Nothing happens until you accept.', 'intros');
  ELSIF TG_OP = 'UPDATE' AND OLD.accepted_at IS NULL AND NEW.accepted_at IS NOT NULL THEN
    SELECT coalesce(nullif(p.name, ''), 'A member') INTO v_name FROM public.profiles p WHERE p.id = NEW.target_user_id;
    INSERT INTO public.notifications (user_id, actor_id, kind, text, link)
    VALUES (NEW.user_id, NEW.target_user_id, 'intro_accepted',
            coalesce(v_name, 'A member') || ' accepted your introduction. You can open a Relationship Room.', 'intros');
  END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.notify_intro_events() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS intro_requests_notify ON public.intro_requests;
-- Plain AFTER UPDATE (not UPDATE OF accepted_at): accepted_at is stamped by a BEFORE trigger,
-- so it never appears in the client's SET list and a column-scoped trigger would not fire.
CREATE TRIGGER intro_requests_notify AFTER INSERT OR UPDATE ON public.intro_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_intro_events();

-- Mark the signed-in member's notifications read (all, or the given ids).
CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_ids uuid[] DEFAULT NULL)
RETURNS integer LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$
  WITH u AS (
    UPDATE public.notifications SET read = true
     WHERE user_id = auth.uid() AND NOT read AND (p_ids IS NULL OR id = ANY (p_ids))
    RETURNING 1
  ) SELECT count(*)::int FROM u
$$;
REVOKE ALL ON FUNCTION public.mark_notifications_read(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read(uuid[]) TO authenticated;

CREATE INDEX IF NOT EXISTS notifications_unread_idx ON public.notifications (user_id, created_at DESC) WHERE NOT read;
