-- Member events: curated dinners, roundtables and virtual sessions run by the Ask Intros team.
--
-- Admins create, publish and cancel events. Members cannot create events in this version. An
-- event's host may edit its description and see who is coming. Members reply going or not
-- going; capacity is enforced here (a full room puts new replies on the waitlist) and the
-- earliest waitlisted member is moved up, and told, when someone drops. Invite-only events
-- are visible only to invitees. The venue address and join link are shown only to members
-- who are going (and to the host and admins).

-- ── Events ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.member_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 3 AND 160),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 4000),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  timezone text NOT NULL DEFAULT 'UTC' CHECK (timezone ~ '^[A-Za-z0-9_+/-]{1,64}$'),
  format text NOT NULL DEFAULT 'in_person' CHECK (format IN ('in_person', 'virtual', 'hybrid')),
  venue text CHECK (venue IS NULL OR char_length(venue) <= 300),
  city text CHECK (city IS NULL OR char_length(city) <= 120),
  -- Virtual sessions: an https link, or null to meet in Ask Intros Meetings.
  join_url text CHECK (join_url IS NULL OR (char_length(join_url) <= 500 AND join_url ~ '^https://[^[:space:]<>"]+$')),
  capacity integer CHECK (capacity IS NULL OR capacity BETWEEN 1 AND 10000),
  visibility text NOT NULL DEFAULT 'all_members' CHECK (visibility IN ('all_members', 'invite_only')),
  host_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled')),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at AND ends_at <= starts_at + interval '7 days'),
  CHECK (format = 'virtual' OR char_length(btrim(coalesce(city, ''))) > 0)
);
CREATE INDEX member_events_starts_idx ON public.member_events (starts_at);

-- Invitations to invite-only events (admins only). notified_at: the invitee has been told.
CREATE TABLE public.event_invites (
  event_id uuid NOT NULL REFERENCES public.member_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

-- Replies. Written only through rsvp_event(); queued_at orders the waitlist.
CREATE TABLE public.event_rsvps (
  event_id uuid NOT NULL REFERENCES public.member_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('going', 'waitlist', 'declined')),
  queued_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  reminded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);
CREATE INDEX event_rsvps_queue_idx ON public.event_rsvps (event_id, status, queued_at);

-- ── Who can see what ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.can_see_member_event(p_event uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.member_events e
     WHERE e.id = p_event
       AND (public.is_admin() OR e.host_id = auth.uid()
            OR (e.status <> 'draft' AND public.is_live_member()
                AND (e.visibility = 'all_members'
                     OR EXISTS (SELECT 1 FROM public.event_invites i WHERE i.event_id = e.id AND i.user_id = auth.uid())))))
$$;
REVOKE ALL ON FUNCTION public.can_see_member_event(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_see_member_event(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_member_event_host(p_event uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.member_events e WHERE e.id = p_event AND e.host_id = auth.uid())
$$;
REVOKE ALL ON FUNCTION public.is_member_event_host(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_member_event_host(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_member_event_invitee(p_event uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.event_invites i WHERE i.event_id = p_event AND i.user_id = auth.uid())
$$;
REVOKE ALL ON FUNCTION public.is_member_event_invitee(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_member_event_invitee(uuid) TO authenticated;

-- Events: the venue address and join link are not readable from the table; members get them
-- from list_member_events() once they are going.
REVOKE ALL ON public.member_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.member_events TO service_role;
GRANT SELECT (id, title, description, starts_at, ends_at, timezone, format, city, capacity, visibility, host_id, status, created_by, created_at, updated_at)
  ON public.member_events TO authenticated;
GRANT INSERT (title, description, starts_at, ends_at, timezone, format, venue, city, join_url, capacity, visibility, host_id, status)
  ON public.member_events TO authenticated;
GRANT UPDATE (title, description, starts_at, ends_at, timezone, format, venue, city, join_url, capacity, visibility, host_id, status)
  ON public.member_events TO authenticated;
GRANT DELETE ON public.member_events TO authenticated;
ALTER TABLE public.member_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members see events open to them" ON public.member_events FOR SELECT TO authenticated
  USING (public.is_admin() OR host_id = auth.uid()
         OR (status <> 'draft' AND public.is_live_member()
             AND (visibility = 'all_members' OR public.is_member_event_invitee(id))));
CREATE POLICY "admins create events" ON public.member_events FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
CREATE POLICY "admins and the host edit events" ON public.member_events FOR UPDATE TO authenticated
  USING (public.is_admin() OR host_id = auth.uid()) WITH CHECK (public.is_admin() OR host_id = auth.uid());
CREATE POLICY "admins delete drafts" ON public.member_events FOR DELETE TO authenticated
  USING (public.is_admin() AND status = 'draft');

REVOKE ALL ON public.event_invites FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.event_invites TO service_role;
GRANT SELECT, DELETE ON public.event_invites TO authenticated;
GRANT INSERT (event_id, user_id) ON public.event_invites TO authenticated;
ALTER TABLE public.event_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own invites, host and admins" ON public.event_invites FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin() OR public.is_member_event_host(event_id));
CREATE POLICY "admins invite" ON public.event_invites FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "admins withdraw invites" ON public.event_invites FOR DELETE TO authenticated USING (public.is_admin());

REVOKE ALL ON public.event_rsvps FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.event_rsvps TO service_role;
GRANT SELECT (event_id, user_id, status, queued_at, created_at, updated_at) ON public.event_rsvps TO authenticated;
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own replies, host and admins" ON public.event_rsvps FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin() OR public.is_member_event_host(event_id));

-- ── Event guard: hosts may change only the description; the time zone must be real ──────
CREATE OR REPLACE FUNCTION public.member_events_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_probe timestamp;
BEGIN
  v_probe := now() AT TIME ZONE NEW.timezone; -- raises on an unknown time zone
  IF TG_OP = 'UPDATE' THEN
    IF auth.uid() IS NOT NULL AND NOT public.is_admin()
       AND (to_jsonb(NEW) - 'description' - 'updated_at') IS DISTINCT FROM (to_jsonb(OLD) - 'description' - 'updated_at') THEN
      RAISE EXCEPTION 'Hosts can edit the description only' USING errcode = '42501';
    END IF;
    NEW.created_by := OLD.created_by;
    NEW.created_at := OLD.created_at;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.member_events_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER member_events_guard BEFORE INSERT OR UPDATE ON public.member_events
  FOR EACH ROW EXECUTE FUNCTION public.member_events_guard();

-- ── Capacity: a "going" reply to a full room becomes "waitlist" ────────────────────────
CREATE OR REPLACE FUNCTION public.event_rsvps_capacity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cap integer; v_going integer; v_was text;
BEGIN
  v_was := NULL;
  IF TG_OP = 'UPDATE' THEN v_was := OLD.status; END IF;
  IF NEW.status = 'going' AND v_was IS DISTINCT FROM 'going' THEN
    -- Lock the event so two replies cannot both take the last place.
    SELECT capacity INTO v_cap FROM public.member_events WHERE id = NEW.event_id FOR UPDATE;
    IF v_cap IS NOT NULL THEN
      SELECT count(*) INTO v_going FROM public.event_rsvps
       WHERE event_id = NEW.event_id AND status = 'going' AND user_id <> NEW.user_id;
      IF v_going >= v_cap THEN NEW.status := 'waitlist'; END IF;
    END IF;
  END IF;
  IF NEW.status = 'waitlist' AND v_was IS DISTINCT FROM 'waitlist' THEN NEW.queued_at := clock_timestamp(); END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.event_rsvps_capacity() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER event_rsvps_capacity BEFORE INSERT OR UPDATE ON public.event_rsvps
  FOR EACH ROW EXECUTE FUNCTION public.event_rsvps_capacity();

-- Move the earliest waitlisted members up while there is room, and tell them.
CREATE OR REPLACE FUNCTION public.promote_event_waitlist(p_event uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cap integer; v_status text; v_title text; v_ends timestamptz; v_going integer; v_uid uuid; v_n integer := 0;
BEGIN
  SELECT capacity, status, title, ends_at INTO v_cap, v_status, v_title, v_ends
    FROM public.member_events WHERE id = p_event FOR UPDATE;
  IF NOT FOUND OR v_status <> 'published' OR v_ends < now() THEN RETURN 0; END IF;
  LOOP
    IF v_cap IS NOT NULL THEN
      SELECT count(*) INTO v_going FROM public.event_rsvps WHERE event_id = p_event AND status = 'going';
      EXIT WHEN v_going >= v_cap;
    END IF;
    SELECT user_id INTO v_uid FROM public.event_rsvps
     WHERE event_id = p_event AND status = 'waitlist' ORDER BY queued_at, user_id LIMIT 1;
    EXIT WHEN NOT FOUND;
    UPDATE public.event_rsvps SET status = 'going' WHERE event_id = p_event AND user_id = v_uid;
    INSERT INTO public.notifications (user_id, kind, text, link)
    VALUES (v_uid, 'event_promoted', 'A place opened up at ' || v_title || '. You are now going.', '/app');
    v_n := v_n + 1;
  END LOOP;
  RETURN v_n;
END $$;
REVOKE ALL ON FUNCTION public.promote_event_waitlist(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.promote_event_waitlist(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.event_rsvps_after() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_left boolean := false;
BEGIN
  IF OLD.status = 'going' THEN
    IF TG_OP = 'DELETE' THEN v_left := true; ELSIF NEW.status <> 'going' THEN v_left := true; END IF;
  END IF;
  IF v_left THEN PERFORM public.promote_event_waitlist(OLD.event_id); END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.event_rsvps_after() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER event_rsvps_after AFTER UPDATE OR DELETE ON public.event_rsvps
  FOR EACH ROW EXECUTE FUNCTION public.event_rsvps_after();

-- ── Event changes: publish tells invitees, cancel tells everyone replying, more room moves
--    the waitlist up ───────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.member_events_after() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    INSERT INTO public.notifications (user_id, kind, text, link)
    SELECT r.user_id, 'event_cancelled', NEW.title || ' has been cancelled.', '/app'
      FROM public.event_rsvps r WHERE r.event_id = NEW.id AND r.status IN ('going', 'waitlist');
  END IF;
  IF NEW.status = 'published' AND OLD.status = 'draft' THEN
    WITH told AS (
      UPDATE public.event_invites SET notified_at = now()
       WHERE event_id = NEW.id AND notified_at IS NULL RETURNING user_id)
    INSERT INTO public.notifications (user_id, kind, text, link)
    SELECT user_id, 'event_invite', 'You are invited to ' || NEW.title || '.', '/app' FROM told;
  END IF;
  IF NEW.status = 'published' AND NEW.capacity IS DISTINCT FROM OLD.capacity THEN
    PERFORM public.promote_event_waitlist(NEW.id);
  END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.member_events_after() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER member_events_after AFTER UPDATE ON public.member_events
  FOR EACH ROW EXECUTE FUNCTION public.member_events_after();

-- Invites: tell the invitee now if the event is already published; withdrawing an invite
-- also withdraws their reply.
CREATE OR REPLACE FUNCTION public.event_invites_before() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status text; v_title text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.user_id) THEN
    RAISE EXCEPTION 'Member not found' USING errcode = '22023';
  END IF;
  NEW.invited_by := coalesce(auth.uid(), NEW.invited_by);
  NEW.notified_at := NULL;
  SELECT status, title INTO v_status, v_title FROM public.member_events WHERE id = NEW.event_id;
  IF v_status = 'published' THEN
    INSERT INTO public.notifications (user_id, kind, text, link)
    VALUES (NEW.user_id, 'event_invite', 'You are invited to ' || v_title || '.', '/app');
    NEW.notified_at := now();
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.event_invites_before() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER event_invites_before BEFORE INSERT ON public.event_invites
  FOR EACH ROW EXECUTE FUNCTION public.event_invites_before();

CREATE OR REPLACE FUNCTION public.event_invites_after_delete() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.event_rsvps r USING public.member_events e
   WHERE r.event_id = OLD.event_id AND r.user_id = OLD.user_id
     AND e.id = r.event_id AND e.visibility = 'invite_only';
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.event_invites_after_delete() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER event_invites_after_delete AFTER DELETE ON public.event_invites
  FOR EACH ROW EXECUTE FUNCTION public.event_invites_after_delete();

-- ── Replying ───────────────────────────────────────────────────────────────────────────
-- p_choice: 'going' (becomes 'waitlist' when the room is full) or 'declined'. Returns the
-- member's resulting status.
CREATE OR REPLACE FUNCTION public.rsvp_event(p_event uuid, p_choice text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status text; v_ends timestamptz; v_old text; v_new text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first' USING errcode = '42501'; END IF;
  IF p_choice IS NULL OR p_choice NOT IN ('going', 'declined') THEN
    RAISE EXCEPTION 'Reply going or not going' USING errcode = '22023';
  END IF;
  IF NOT public.can_see_member_event(p_event) THEN RAISE EXCEPTION 'Event not found' USING errcode = '42501'; END IF;
  SELECT status, ends_at INTO v_status, v_ends FROM public.member_events WHERE id = p_event;
  IF v_status <> 'published' THEN RAISE EXCEPTION 'This event is not taking replies' USING errcode = '22023'; END IF;
  IF v_ends < now() THEN RAISE EXCEPTION 'This event has ended' USING errcode = '22023'; END IF;

  SELECT status INTO v_old FROM public.event_rsvps WHERE event_id = p_event AND user_id = auth.uid() FOR UPDATE;
  IF v_old IS NULL THEN
    INSERT INTO public.event_rsvps (event_id, user_id, status) VALUES (p_event, auth.uid(), p_choice)
    RETURNING status INTO v_new;
  ELSIF p_choice = 'going' AND v_old IN ('going', 'waitlist') THEN
    v_new := v_old;
  ELSE
    UPDATE public.event_rsvps SET status = p_choice WHERE event_id = p_event AND user_id = auth.uid()
    RETURNING status INTO v_new;
  END IF;
  RETURN v_new;
END $$;
REVOKE ALL ON FUNCTION public.rsvp_event(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rsvp_event(uuid, text) TO authenticated;

-- ── Reading ────────────────────────────────────────────────────────────────────────────
-- Every event the caller may see, with counts and their own reply. The venue and join link
-- are included only for members who are going, the host and admins.
CREATE OR REPLACE FUNCTION public.list_member_events()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin boolean := public.is_admin();
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first' USING errcode = '42501'; END IF;
  RETURN coalesce((SELECT jsonb_agg(x ORDER BY (x->>'starts_at')) FROM (
    SELECT jsonb_build_object(
      'id', e.id, 'title', e.title, 'description', e.description, 'starts_at', e.starts_at, 'ends_at', e.ends_at,
      'timezone', e.timezone, 'format', e.format, 'city', e.city, 'capacity', e.capacity, 'visibility', e.visibility,
      'status', e.status, 'host_id', e.host_id,
      'host_name', (SELECT nullif(btrim(p.name), '') FROM public.profiles p WHERE p.id = e.host_id),
      'is_host', e.host_id = auth.uid(),
      'going_count', (SELECT count(*) FROM public.event_rsvps r WHERE r.event_id = e.id AND r.status = 'going'),
      'waitlist_count', (SELECT count(*) FROM public.event_rsvps r WHERE r.event_id = e.id AND r.status = 'waitlist'),
      'my_status', me.status,
      'waitlist_position', CASE WHEN me.status = 'waitlist' THEN (SELECT count(*) FROM public.event_rsvps r
                             WHERE r.event_id = e.id AND r.status = 'waitlist' AND (r.queued_at, r.user_id) <= (me.queued_at, me.user_id)) END,
      'venue', CASE WHEN me.status = 'going' OR e.host_id = auth.uid() OR v_admin THEN e.venue END,
      'join_url', CASE WHEN me.status = 'going' OR e.host_id = auth.uid() OR v_admin THEN e.join_url END,
      'invite_count', CASE WHEN v_admin THEN (SELECT count(*) FROM public.event_invites i WHERE i.event_id = e.id) END
    ) AS x
      FROM public.member_events e
      LEFT JOIN public.event_rsvps me ON me.event_id = e.id AND me.user_id = auth.uid()
     WHERE public.can_see_member_event(e.id)) q), '[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.list_member_events() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_member_events() TO authenticated;

-- Who is coming. Attendees (going) see the names of others going; the host and admins see
-- everyone who replied, with their status (admins also see email, for the export).
CREATE OR REPLACE FUNCTION public.event_attendees(p_event uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin boolean := public.is_admin(); v_host boolean := public.is_member_event_host(p_event);
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first' USING errcode = '42501'; END IF;
  IF v_admin OR v_host THEN
    RETURN coalesce((SELECT jsonb_agg(jsonb_build_object(
        'user_id', r.user_id, 'name', coalesce(nullif(btrim(p.name), ''), 'A member'), 'company', p.company,
        'email', CASE WHEN v_admin THEN p.email END, 'status', r.status, 'replied_at', r.created_at)
        ORDER BY r.status, r.queued_at)
      FROM public.event_rsvps r LEFT JOIN public.profiles p ON p.id = r.user_id
     WHERE r.event_id = p_event AND r.status <> 'declined'), '[]'::jsonb);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.event_rsvps r WHERE r.event_id = p_event AND r.user_id = auth.uid() AND r.status = 'going')
     OR NOT public.can_see_member_event(p_event) THEN
    RAISE EXCEPTION 'Only people going can see who else is going' USING errcode = '42501';
  END IF;
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('user_id', r.user_id, 'name', coalesce(nullif(btrim(p.name), ''), 'A member'))
        ORDER BY p.name)
      FROM public.event_rsvps r LEFT JOIN public.profiles p ON p.id = r.user_id
     WHERE r.event_id = p_event AND r.status = 'going'), '[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.event_attendees(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.event_attendees(uuid) TO authenticated;

-- ── Reminders, 24 hours ahead, once per reply ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.send_event_reminders()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_n integer;
BEGIN
  WITH due AS (
    UPDATE public.event_rsvps r SET reminded_at = now()
      FROM public.member_events e
     WHERE e.id = r.event_id AND r.status = 'going' AND r.reminded_at IS NULL AND e.status = 'published'
       AND e.starts_at > now() AND e.starts_at <= now() + interval '24 hours'
    RETURNING r.user_id, e.title, e.starts_at, e.timezone)
  INSERT INTO public.notifications (user_id, kind, text, link)
  SELECT user_id, 'event_reminder',
         'Coming up: ' || title || ', ' || to_char(starts_at AT TIME ZONE timezone, 'Dy DD Mon, HH24:MI') || ' (' || timezone || ').', '/app'
    FROM due;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END $$;
REVOKE ALL ON FUNCTION public.send_event_reminders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.send_event_reminders() TO service_role;

DO $$ BEGIN IF to_regnamespace('cron') IS NOT NULL THEN PERFORM cron.schedule('ask-intros-event-reminders', '17 * * * *', $job$SELECT public.send_event_reminders()$job$); END IF; END $$;
