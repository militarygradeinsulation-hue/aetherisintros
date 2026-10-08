-- Notifications become database-owned, so the bell can be trusted.
--
-- Production already notifies on introduction activity through notify_intro_activity
-- (trigger intro_requests_notify, created outside this repo's migrations), which also
-- creates the two-way connection on acceptance. It is deliberately left untouched.
--
-- The gap was everything else: notifications for messages and follows were inserted by
-- the browser, and the "members create notifications" policy let any member insert a
-- notification for ANY member with ANY text and no sender. Nothing displayed them before;
-- once the bell shows them, that is a phishing channel. Messages and follows now notify
-- from triggers, and members can no longer insert notifications at all.

-- A new direct message notifies the other participant of the thread.
CREATE OR REPLACE FUNCTION public.notify_new_message() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_to uuid; v_name text;
BEGIN
  SELECT CASE WHEN t.member_a = NEW.sender_id THEN t.member_b ELSE t.member_a END
    INTO v_to FROM public.dm_threads t WHERE t.id = NEW.thread_id;
  IF v_to IS NULL OR v_to = NEW.sender_id THEN RETURN NULL; END IF;
  SELECT coalesce(nullif(btrim(p.name), ''), 'A member') INTO v_name FROM public.profiles p WHERE p.id = NEW.sender_id;
  INSERT INTO public.notifications (user_id, actor_id, kind, text, link)
  VALUES (v_to, NEW.sender_id, 'message', coalesce(v_name, 'A member') || ' sent you a message.', 'messages');
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.notify_new_message() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS dm_messages_notify ON public.dm_messages;
CREATE TRIGGER dm_messages_notify AFTER INSERT ON public.dm_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

-- A new connection or follow notifies the person followed (saves stay private).
CREATE OR REPLACE FUNCTION public.notify_new_follow() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text;
BEGIN
  IF NEW.kind NOT IN ('connection','follow') OR NEW.followee_id = NEW.follower_id THEN RETURN NULL; END IF;
  SELECT coalesce(nullif(btrim(p.name), ''), 'A member') INTO v_name FROM public.profiles p WHERE p.id = NEW.follower_id;
  INSERT INTO public.notifications (user_id, actor_id, kind, text, link)
  VALUES (NEW.followee_id, NEW.follower_id, NEW.kind,
          coalesce(v_name, 'A member') || CASE WHEN NEW.kind = 'connection' THEN ' connected with you.' ELSE ' is following your work.' END,
          'people');
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.notify_new_follow() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS follows_notify ON public.follows;
CREATE TRIGGER follows_notify AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_follow();

-- Members can no longer write notifications directly; only the database creates them.
DROP POLICY IF EXISTS "members create notifications" ON public.notifications;
REVOKE INSERT ON public.notifications FROM authenticated, anon;

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
