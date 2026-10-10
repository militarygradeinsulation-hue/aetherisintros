-- Deal rooms: a private room where the business that follows an introduction, an answered ask,
-- a conversation or a CRM opportunity actually happens, so the platform sees outcomes.
-- Private by default: only accepted members of a room (and its creator) read anything in it;
-- someone invited sees just the room itself so they can accept or decline. Stages, proposals,
-- milestones and membership change only through the validated functions below, each of which
-- appends to an insert-only timeline. Closing a room that came from an introduction records
-- the closer's outcome on the existing introduction outcome spine (0022), never a copy.

-- ── Tables ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.deal_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 2 AND 160),
  stage text NOT NULL DEFAULT 'interested'
    CHECK (stage IN ('interested','proposal','agreed','in_progress','delivered','closed','cancelled','disputed')),
  outcome text CHECK (outcome IN ('won','lost','withdrawn')),
  -- Which side of the deal the owner is on; everyone else's side follows from their role.
  owner_side text NOT NULL DEFAULT 'buyer' CHECK (owner_side IN ('buyer','provider')),
  source_kind text NOT NULL DEFAULT 'manual' CHECK (source_kind IN ('intro','ask','thread','opportunity','manual')),
  source_id text CHECK (char_length(source_id) <= 100),
  need text NOT NULL DEFAULT '' CHECK (char_length(need) <= 4000),
  scope text NOT NULL DEFAULT '' CHECK (char_length(scope) <= 4000),
  deliverables text NOT NULL DEFAULT '' CHECK (char_length(deliverables) <= 4000),
  budget_low numeric CHECK (budget_low >= 0 AND budget_low <= 1000000000000),
  budget_high numeric CHECK (budget_high >= 0 AND budget_high <= 1000000000000),
  currency text NOT NULL DEFAULT 'USD' CHECK (currency ~ '^[A-Z]{3}$'),
  target_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT deal_rooms_budget_order_chk CHECK (budget_low IS NULL OR budget_high IS NULL OR budget_high >= budget_low),
  CONSTRAINT deal_rooms_source_chk CHECK ((source_kind = 'manual') = (source_id IS NULL)),
  CONSTRAINT deal_rooms_outcome_chk CHECK (
    (stage = 'closed' AND outcome IN ('won','lost'))
    OR (stage = 'cancelled' AND outcome = 'withdrawn')
    OR (stage NOT IN ('closed','cancelled') AND outcome IS NULL))
);
CREATE INDEX deal_rooms_source_idx ON public.deal_rooms (source_kind, source_id);
CREATE INDEX deal_rooms_created_by_idx ON public.deal_rooms (created_by);

CREATE TABLE public.deal_room_members (
  room_id uuid NOT NULL REFERENCES public.deal_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner','buyer','provider','introducer','guest')),
  invited_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);
CREATE INDEX deal_room_members_user_idx ON public.deal_room_members (user_id);

CREATE TABLE public.deal_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.deal_rooms(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 2 AND 200),
  due_date date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','submitted','accepted','changes_requested')),
  submitted_at timestamptz,
  submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  sort integer NOT NULL DEFAULT 0,
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX deal_milestones_room_idx ON public.deal_milestones (room_id, sort);

CREATE TABLE public.deal_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.deal_rooms(id) ON DELETE CASCADE,
  version integer NOT NULL CHECK (version >= 1),
  author uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  summary text NOT NULL CHECK (char_length(btrim(summary)) BETWEEN 3 AND 4000),
  amount numeric CHECK (amount >= 0 AND amount <= 1000000000000),
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','accepted','declined','superseded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  UNIQUE (room_id, version)
);

-- Append-only timeline. Members may add notes and links themselves; every other kind is
-- written by the functions below.
CREATE TABLE public.deal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.deal_rooms(id) ON DELETE CASCADE,
  actor uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('created','stage_changed','proposal_submitted','proposal_accepted','proposal_declined',
    'milestone_added','milestone_submitted','milestone_accepted','milestone_changes_requested',
    'member_invited','member_joined','member_declined','member_removed','details_updated','note','link','intro_outcome_recorded')),
  detail jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(detail) = 'object' AND octet_length(detail::text) <= 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT deal_events_note_chk CHECK (kind <> 'note' OR char_length(btrim(coalesce(detail->>'text', ''))) BETWEEN 1 AND 2000),
  CONSTRAINT deal_events_link_chk CHECK (kind <> 'link' OR (
    coalesce(detail->>'url', '') ~* '^https?://[^[:space:]]+$' AND char_length(detail->>'url') <= 500
    AND char_length(coalesce(detail->>'label', '')) <= 200))
);
CREATE INDEX deal_events_room_idx ON public.deal_events (room_id, created_at);

-- ── Membership helpers (SECURITY DEFINER so policies never recurse) ──────────────────────
-- Accepted member, or the room's creator.
CREATE OR REPLACE FUNCTION public.is_deal_member(p_room uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.deal_room_members m WHERE m.room_id = p_room AND m.user_id = auth.uid() AND m.accepted_at IS NOT NULL)
    OR EXISTS (SELECT 1 FROM public.deal_rooms r WHERE r.id = p_room AND r.created_by = auth.uid()))
$$;
-- Invited, not yet answered: may read the room itself to decide.
CREATE OR REPLACE FUNCTION public.is_deal_invitee(p_room uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.deal_room_members m WHERE m.room_id = p_room AND m.user_id = auth.uid() AND m.accepted_at IS NULL)
$$;
-- Accepted member who is a party to the work (not a guest), in a room that is still open.
CREATE OR REPLACE FUNCTION public.can_edit_deal(p_room uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.deal_room_members m JOIN public.deal_rooms r ON r.id = m.room_id
                  WHERE m.room_id = p_room AND m.user_id = auth.uid() AND m.accepted_at IS NOT NULL
                    AND m.role <> 'guest' AND r.stage NOT IN ('closed','cancelled'))
$$;
REVOKE ALL ON FUNCTION public.is_deal_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_deal_invitee(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_edit_deal(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_deal_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_deal_invitee(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_deal(uuid) TO authenticated;

-- The side (buyer / provider) an accepted member is on; null for introducers, guests and outsiders.
CREATE OR REPLACE FUNCTION public.deal_member_side(p_room uuid, p_user uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE m.role WHEN 'owner' THEN r.owner_side WHEN 'buyer' THEN 'buyer' WHEN 'provider' THEN 'provider' END
    FROM public.deal_room_members m JOIN public.deal_rooms r ON r.id = m.room_id
   WHERE m.room_id = p_room AND m.user_id = p_user AND m.accepted_at IS NOT NULL
$$;
CREATE OR REPLACE FUNCTION public.deal_side_present(p_room uuid, p_side text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.deal_room_members m WHERE m.room_id = p_room AND m.accepted_at IS NOT NULL
                   AND public.deal_member_side(p_room, m.user_id) = p_side)
$$;
CREATE OR REPLACE FUNCTION public.deal_member_role(p_room uuid, p_user uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.role FROM public.deal_room_members m WHERE m.room_id = p_room AND m.user_id = p_user AND m.accepted_at IS NOT NULL
$$;
REVOKE ALL ON FUNCTION public.deal_member_side(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.deal_side_present(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.deal_member_role(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- The one place stage transitions are defined (mirrored in src/aetheris/deals-core.ts).
CREATE OR REPLACE FUNCTION public.deal_transition_allowed(p_from text, p_to text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT (p_from, p_to) IN (VALUES
    ('interested','proposal'), ('proposal','agreed'), ('agreed','in_progress'), ('in_progress','delivered'), ('delivered','closed'),
    ('interested','cancelled'), ('proposal','cancelled'), ('agreed','cancelled'), ('in_progress','cancelled'), ('delivered','cancelled'), ('disputed','cancelled'),
    ('in_progress','disputed'), ('delivered','disputed'), ('disputed','in_progress'), ('disputed','closed'))
$$;
REVOKE ALL ON FUNCTION public.deal_transition_allowed(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.deal_transition_allowed(text, text) TO authenticated;

-- Internal: timeline entry and notices to the room's other accepted members.
CREATE OR REPLACE FUNCTION public.deal_log(p_room uuid, p_kind text, p_detail jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.deal_events (room_id, actor, kind, detail) VALUES (p_room, auth.uid(), p_kind, coalesce(p_detail, '{}'::jsonb));
  UPDATE public.deal_rooms SET updated_at = now() WHERE id = p_room;
END $$;
CREATE OR REPLACE FUNCTION public.deal_notify(p_room uuid, p_text text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, kind, text, actor_id, link)
  SELECT m.user_id, 'deal_update', left(p_text, 300), auth.uid(), '/app'
    FROM public.deal_room_members m
   WHERE m.room_id = p_room AND m.accepted_at IS NOT NULL AND m.user_id IS DISTINCT FROM auth.uid();
END $$;
REVOKE ALL ON FUNCTION public.deal_log(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.deal_notify(uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.deal_actor_name()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce((SELECT nullif(btrim(p.name), '') FROM public.profiles p WHERE p.id = auth.uid()), 'A member')
$$;
REVOKE ALL ON FUNCTION public.deal_actor_name() FROM PUBLIC, anon, authenticated;

-- ── Privileges and policies ────────────────────────────────────────────────────────────
REVOKE ALL ON public.deal_rooms FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.deal_room_members FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.deal_milestones FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.deal_proposals FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.deal_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.deal_rooms, public.deal_room_members, public.deal_milestones, public.deal_proposals, public.deal_events TO service_role;

GRANT SELECT ON public.deal_rooms, public.deal_room_members, public.deal_milestones, public.deal_proposals, public.deal_events TO authenticated;
-- Parties edit the working terms directly; stage, outcome, source and need change only via functions.
GRANT UPDATE (title, scope, deliverables, budget_low, budget_high, currency, target_date) ON public.deal_rooms TO authenticated;
GRANT INSERT (room_id, kind, detail) ON public.deal_events TO authenticated;

ALTER TABLE public.deal_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members and invitees see the room" ON public.deal_rooms FOR SELECT TO authenticated
  USING (public.is_deal_member(id) OR public.is_deal_invitee(id));
CREATE POLICY "parties edit open rooms" ON public.deal_rooms FOR UPDATE TO authenticated
  USING (public.can_edit_deal(id)) WITH CHECK (public.can_edit_deal(id));

CREATE POLICY "members see the roster, invitees their own row" ON public.deal_room_members FOR SELECT TO authenticated
  USING (public.is_deal_member(room_id) OR user_id = auth.uid());
CREATE POLICY "members see milestones" ON public.deal_milestones FOR SELECT TO authenticated
  USING (public.is_deal_member(room_id));
CREATE POLICY "members see proposals" ON public.deal_proposals FOR SELECT TO authenticated
  USING (public.is_deal_member(room_id));
CREATE POLICY "members see the timeline" ON public.deal_events FOR SELECT TO authenticated
  USING (public.is_deal_member(room_id));
CREATE POLICY "members add notes and links" ON public.deal_events FOR INSERT TO authenticated
  WITH CHECK (actor = auth.uid() AND kind IN ('note','link') AND public.is_deal_member(room_id));

-- updated_at, and a timeline entry naming the working terms someone changed.
CREATE OR REPLACE FUNCTION public.deal_rooms_before_update() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER deal_rooms_before_update BEFORE UPDATE ON public.deal_rooms
  FOR EACH ROW EXECUTE FUNCTION public.deal_rooms_before_update();

CREATE OR REPLACE FUNCTION public.deal_rooms_log_details() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_fields text[] := '{}';
BEGIN
  IF NEW.title IS DISTINCT FROM OLD.title THEN v_fields := array_append(v_fields, 'title'); END IF;
  IF NEW.scope IS DISTINCT FROM OLD.scope THEN v_fields := array_append(v_fields, 'scope'); END IF;
  IF NEW.deliverables IS DISTINCT FROM OLD.deliverables THEN v_fields := array_append(v_fields, 'deliverables'); END IF;
  IF NEW.budget_low IS DISTINCT FROM OLD.budget_low OR NEW.budget_high IS DISTINCT FROM OLD.budget_high OR NEW.currency IS DISTINCT FROM OLD.currency THEN
    v_fields := array_append(v_fields, 'budget');
  END IF;
  IF NEW.target_date IS DISTINCT FROM OLD.target_date THEN v_fields := array_append(v_fields, 'target_date'); END IF;
  IF cardinality(v_fields) > 0 THEN
    INSERT INTO public.deal_events (room_id, actor, kind, detail) VALUES (NEW.id, auth.uid(), 'details_updated', jsonb_build_object('fields', to_jsonb(v_fields)));
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.deal_rooms_log_details() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER deal_rooms_log_details AFTER UPDATE ON public.deal_rooms
  FOR EACH ROW EXECUTE FUNCTION public.deal_rooms_log_details();

-- ── Create ─────────────────────────────────────────────────────────────────────────────
-- From an accepted introduction, a reply to an ask, a conversation, one of your CRM
-- opportunities, or from scratch. The need/context is snapshotted from the source when not
-- given. The creator becomes the owner; the counterpart (for an intro, ask or thread it must
-- be the other person in it) is invited and has to accept. Opening the same source again
-- returns the room you already share.
CREATE OR REPLACE FUNCTION public.create_deal_room(
  p_source_kind text, p_source_id text, p_title text, p_need text DEFAULT '', p_side text DEFAULT 'buyer', p_counterpart uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_title text := btrim(coalesce(p_title, ''));
  v_src uuid;
  v_other uuid;
  v_snapshot text := '';
  v_found boolean := false;
  v_id uuid;
  v_role text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in to open a deal room' USING errcode = '42501'; END IF;
  IF p_source_kind IS NULL OR p_source_kind NOT IN ('intro','ask','thread','opportunity','manual') THEN
    RAISE EXCEPTION 'Unknown source for a deal room' USING errcode = '22023';
  END IF;
  IF p_side IS NULL OR p_side NOT IN ('buyer','provider') THEN RAISE EXCEPTION 'Choose whether you are buying or providing' USING errcode = '22023'; END IF;
  IF char_length(v_title) < 2 OR char_length(v_title) > 160 THEN RAISE EXCEPTION 'Give the room a title (2 to 160 characters)' USING errcode = '22023'; END IF;
  IF char_length(coalesce(p_need, '')) > 4000 THEN RAISE EXCEPTION 'Keep the need under 4,000 characters' USING errcode = '22023'; END IF;

  IF p_source_kind = 'manual' THEN
    IF nullif(btrim(coalesce(p_source_id, '')), '') IS NOT NULL THEN RAISE EXCEPTION 'A room started from scratch has no source' USING errcode = '22023'; END IF;
  ELSE
    v_src := public.intro_member_uuid(p_source_id);
    IF v_src IS NULL THEN RAISE EXCEPTION 'That source was not found' USING errcode = '22023'; END IF;
    IF p_source_kind = 'intro' THEN
      SELECT true, CASE WHEN r.user_id = v_uid THEN r.target_user_id ELSE r.user_id END,
             concat_ws(E'\n', nullif(btrim(r.reason), ''), nullif(btrim(r.mutual_value), ''))
        INTO v_found, v_other, v_snapshot
        FROM public.intro_requests r
       WHERE r.id = v_src AND r.requester_opt_in AND r.member_opt_in AND (r.user_id = v_uid OR r.target_user_id = v_uid);
      IF v_found IS NOT TRUE THEN RAISE EXCEPTION 'Only an introduction you are part of, accepted by both sides, can become a deal room' USING errcode = '42501'; END IF;
    ELSIF p_source_kind = 'ask' THEN
      SELECT true, CASE WHEN a.author_id = v_uid THEN x.user_id ELSE a.author_id END,
             concat_ws(E'\n\n', 'Ask: ' || a.ask, 'Reply: ' || x.text)
        INTO v_found, v_other, v_snapshot
        FROM public.ask_responses x JOIN public.asks a ON a.id = x.ask_id
       WHERE x.id = v_src AND (a.author_id = v_uid OR x.user_id = v_uid);
      IF v_found IS NOT TRUE THEN RAISE EXCEPTION 'Only the person who asked or the person who replied can open a deal room from a reply' USING errcode = '42501'; END IF;
    ELSIF p_source_kind = 'thread' THEN
      SELECT true, CASE WHEN t.member_a = v_uid THEN t.member_b ELSE t.member_a END, t.intro_context
        INTO v_found, v_other, v_snapshot
        FROM public.dm_threads t
       WHERE t.id = v_src AND (t.member_a = v_uid OR t.member_b = v_uid);
      IF v_found IS NOT TRUE THEN RAISE EXCEPTION 'Only the two people in a conversation can open a deal room from it' USING errcode = '42501'; END IF;
    ELSE
      SELECT true INTO v_found FROM public.crm_opportunities o WHERE o.id = v_src AND o.owner_id = v_uid;
      IF v_found IS NOT TRUE THEN RAISE EXCEPTION 'Only your own CRM opportunities can become a deal room' USING errcode = '42501'; END IF;
    END IF;

    -- The room you already share for this source.
    SELECT r.id INTO v_id FROM public.deal_rooms r JOIN public.deal_room_members m ON m.room_id = r.id AND m.user_id = v_uid
     WHERE r.source_kind = p_source_kind AND r.source_id = v_src::text AND r.stage NOT IN ('closed','cancelled')
     ORDER BY r.created_at LIMIT 1;
    IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  END IF;

  IF p_counterpart IS NOT NULL THEN
    IF p_counterpart = v_uid THEN RAISE EXCEPTION 'You are already in the room' USING errcode = '22023'; END IF;
    IF p_source_kind IN ('intro','ask','thread') AND p_counterpart IS DISTINCT FROM v_other THEN
      RAISE EXCEPTION 'From this source you can only invite the other person in it' USING errcode = '42501';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = p_counterpart) THEN RAISE EXCEPTION 'That member was not found' USING errcode = '22023'; END IF;
  END IF;

  INSERT INTO public.deal_rooms (created_by, title, owner_side, source_kind, source_id, need)
  VALUES (v_uid, v_title, p_side, p_source_kind, v_src::text,
          left(coalesce(nullif(btrim(coalesce(p_need, '')), ''), v_snapshot, ''), 4000))
  RETURNING id INTO v_id;
  INSERT INTO public.deal_room_members (room_id, user_id, role, invited_by, accepted_at) VALUES (v_id, v_uid, 'owner', v_uid, now());
  PERFORM public.deal_log(v_id, 'created', jsonb_build_object('source_kind', p_source_kind, 'source_id', v_src::text, 'side', p_side));

  IF p_counterpart IS NOT NULL THEN
    v_role := CASE p_side WHEN 'buyer' THEN 'provider' ELSE 'buyer' END;
    INSERT INTO public.deal_room_members (room_id, user_id, role, invited_by) VALUES (v_id, p_counterpart, v_role, v_uid);
    PERFORM public.deal_log(v_id, 'member_invited', jsonb_build_object('user_id', p_counterpart, 'role', v_role));
    INSERT INTO public.notifications (user_id, kind, text, actor_id, link)
    VALUES (p_counterpart, 'deal_invite', left(public.deal_actor_name() || ' invited you to a private deal room: ' || v_title || '. Accept to see it.', 300), v_uid, '/app');
  END IF;
  RETURN v_id;
END $$;

-- ── Membership ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.invite_deal_member(p_room uuid, p_user uuid, p_role text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_title text; v_stage text;
BEGIN
  IF public.deal_member_role(p_room, v_uid) IS DISTINCT FROM 'owner' THEN RAISE EXCEPTION 'Only the room owner can invite people' USING errcode = '42501'; END IF;
  IF p_role IS NULL OR p_role NOT IN ('buyer','provider','introducer','guest') THEN RAISE EXCEPTION 'Choose a role' USING errcode = '22023'; END IF;
  SELECT title, stage INTO v_title, v_stage FROM public.deal_rooms WHERE id = p_room;
  IF v_stage IN ('closed','cancelled') THEN RAISE EXCEPTION 'This room is finished' USING errcode = '22023'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = p_user) THEN RAISE EXCEPTION 'That member was not found' USING errcode = '22023'; END IF;
  IF EXISTS (SELECT 1 FROM public.deal_room_members m WHERE m.room_id = p_room AND m.user_id = p_user) THEN
    RAISE EXCEPTION 'They are already in this room or invited' USING errcode = '23505';
  END IF;
  INSERT INTO public.deal_room_members (room_id, user_id, role, invited_by) VALUES (p_room, p_user, p_role, v_uid);
  PERFORM public.deal_log(p_room, 'member_invited', jsonb_build_object('user_id', p_user, 'role', p_role));
  INSERT INTO public.notifications (user_id, kind, text, actor_id, link)
  VALUES (p_user, 'deal_invite', left(public.deal_actor_name() || ' invited you to a private deal room: ' || v_title || '. Accept to see it.', 300), v_uid, '/app');
END $$;

CREATE OR REPLACE FUNCTION public.respond_deal_invite(p_room uuid, p_accept boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_role text;
BEGIN
  SELECT role INTO v_role FROM public.deal_room_members WHERE room_id = p_room AND user_id = v_uid AND accepted_at IS NULL;
  IF v_role IS NULL THEN RAISE EXCEPTION 'There is no invitation to answer' USING errcode = '22023'; END IF;
  IF p_accept THEN
    UPDATE public.deal_room_members SET accepted_at = now() WHERE room_id = p_room AND user_id = v_uid;
    PERFORM public.deal_log(p_room, 'member_joined', jsonb_build_object('role', v_role));
    PERFORM public.deal_notify(p_room, public.deal_actor_name() || ' joined your deal room.');
  ELSE
    DELETE FROM public.deal_room_members WHERE room_id = p_room AND user_id = v_uid;
    PERFORM public.deal_log(p_room, 'member_declined', '{}'::jsonb);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.remove_deal_member(p_room uuid, p_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF public.deal_member_role(p_room, v_uid) IS DISTINCT FROM 'owner' THEN RAISE EXCEPTION 'Only the room owner can remove people' USING errcode = '42501'; END IF;
  IF p_user = v_uid THEN RAISE EXCEPTION 'The owner stays in the room' USING errcode = '22023'; END IF;
  DELETE FROM public.deal_room_members WHERE room_id = p_room AND user_id = p_user;
  IF NOT FOUND THEN RAISE EXCEPTION 'They are not in this room' USING errcode = '22023'; END IF;
  PERFORM public.deal_log(p_room, 'member_removed', jsonb_build_object('user_id', p_user));
END $$;

-- ── Stages ─────────────────────────────────────────────────────────────────────────────
-- 'agreed' is reached only by accepting a proposal. Delivered is marked by the provider side
-- and a delivered room is closed by the buyer side (when that side is in the room).
CREATE OR REPLACE FUNCTION public.advance_deal_stage(p_room uuid, p_to text, p_note text DEFAULT '', p_outcome text DEFAULT NULL, p_category text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text := public.deal_member_role(p_room, auth.uid());
  v_side text := public.deal_member_side(p_room, auth.uid());
  v_from text; v_kind text; v_source text; v_currency text; v_title text;
  v_outcome text;
  v_intro uuid; v_amount numeric; v_band text := 'undisclosed'; v_cat text; v_ostage text;
BEGIN
  IF v_role IS NULL OR v_role = 'guest' THEN RAISE EXCEPTION 'Only the people doing this deal can move it' USING errcode = '42501'; END IF;
  IF char_length(coalesce(p_note, '')) > 1000 THEN RAISE EXCEPTION 'Keep the note under 1,000 characters' USING errcode = '22023'; END IF;
  SELECT stage, source_kind, source_id, currency, title INTO v_from, v_kind, v_source, v_currency, v_title
    FROM public.deal_rooms WHERE id = p_room FOR UPDATE;
  IF p_to = 'agreed' THEN RAISE EXCEPTION 'Terms are agreed by accepting a proposal' USING errcode = '22023'; END IF;
  IF NOT public.deal_transition_allowed(v_from, p_to) THEN
    RAISE EXCEPTION 'A deal cannot move from % to %', v_from, p_to USING errcode = '22023';
  END IF;
  IF p_to = 'delivered' AND v_side IS DISTINCT FROM 'provider' AND public.deal_side_present(p_room, 'provider') THEN
    RAISE EXCEPTION 'The provider marks the work delivered' USING errcode = '42501';
  END IF;
  IF p_to = 'closed' AND v_from = 'delivered' AND v_side IS DISTINCT FROM 'buyer' AND public.deal_side_present(p_room, 'buyer') THEN
    RAISE EXCEPTION 'The buyer confirms delivery and closes the deal' USING errcode = '42501';
  END IF;
  IF p_to = 'closed' THEN
    IF p_outcome IS NULL OR p_outcome NOT IN ('won','lost') THEN RAISE EXCEPTION 'Say whether the deal was won or lost' USING errcode = '22023'; END IF;
    v_outcome := p_outcome;
  ELSIF p_to = 'cancelled' THEN
    v_outcome := 'withdrawn';
  END IF;

  UPDATE public.deal_rooms SET stage = p_to, outcome = v_outcome WHERE id = p_room;
  PERFORM public.deal_log(p_room, 'stage_changed', jsonb_strip_nulls(jsonb_build_object('from', v_from, 'to', p_to, 'note', nullif(btrim(coalesce(p_note, '')), ''), 'outcome', v_outcome)));
  PERFORM public.deal_notify(p_room, public.deal_actor_name() || ' moved ' || v_title || ' to ' || replace(p_to, '_', ' ') || '.');

  -- A finished room that came from an introduction feeds the outcome spine, once per person.
  IF p_to IN ('closed','cancelled') AND v_kind = 'intro' THEN
    v_intro := public.intro_member_uuid(v_source);
    IF v_intro IS NOT NULL
       AND EXISTS (SELECT 1 FROM public.intro_requests r WHERE r.id = v_intro AND r.requester_opt_in AND r.member_opt_in AND (r.user_id = v_uid OR r.target_user_id = v_uid))
       AND NOT EXISTS (SELECT 1 FROM public.intro_outcomes o WHERE o.intro_request_id = v_intro AND o.author_id = v_uid AND o.stage IN ('outcome','no_outcome')) THEN
      IF v_outcome = 'won' THEN
        v_ostage := 'outcome';
        v_cat := coalesce(p_category, 'other');
        IF v_cat NOT IN ('customer','partnership','hire','investor','advisor','board','vendor','acquisition','knowledge','other') THEN v_cat := 'other'; END IF;
        SELECT amount INTO v_amount FROM public.deal_proposals WHERE room_id = p_room AND status = 'accepted' ORDER BY version DESC LIMIT 1;
        IF v_currency = 'USD' AND v_amount IS NOT NULL THEN
          IF v_amount < 10000 THEN v_band := 'under_10k';
          ELSIF v_amount < 100000 THEN v_band := '10k_100k';
          ELSIF v_amount < 1000000 THEN v_band := '100k_1m';
          ELSE v_band := 'over_1m';
          END IF;
        END IF;
      ELSE
        v_ostage := 'no_outcome';
      END IF;
      INSERT INTO public.intro_outcomes (intro_request_id, author_id, stage, outcome_category, value_band, attribution, shareable)
      VALUES (v_intro, v_uid, v_ostage, v_cat, v_band, 'direct', false);
      PERFORM public.deal_log(p_room, 'intro_outcome_recorded', jsonb_build_object('stage', v_ostage));
    END IF;
  END IF;
  RETURN p_to;
END $$;

-- ── Proposals ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.submit_deal_proposal(p_room uuid, p_summary text, p_amount numeric DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_side text := public.deal_member_side(p_room, auth.uid()); v_stage text; v_version integer; v_id uuid;
BEGIN
  IF v_side IS NULL THEN RAISE EXCEPTION 'Only the buyer or provider side can propose terms' USING errcode = '42501'; END IF;
  IF char_length(btrim(coalesce(p_summary, ''))) < 3 OR char_length(p_summary) > 4000 THEN RAISE EXCEPTION 'Describe the proposal (3 to 4,000 characters)' USING errcode = '22023'; END IF;
  IF p_amount IS NOT NULL AND (p_amount < 0 OR p_amount > 1000000000000) THEN RAISE EXCEPTION 'That amount is not valid' USING errcode = '22023'; END IF;
  SELECT stage INTO v_stage FROM public.deal_rooms WHERE id = p_room FOR UPDATE;
  IF v_stage NOT IN ('interested','proposal') THEN RAISE EXCEPTION 'Proposals are made before terms are agreed' USING errcode = '22023'; END IF;
  SELECT coalesce(max(version), 0) + 1 INTO v_version FROM public.deal_proposals WHERE room_id = p_room;
  UPDATE public.deal_proposals SET status = 'superseded' WHERE room_id = p_room AND status = 'submitted';
  INSERT INTO public.deal_proposals (room_id, version, author, summary, amount) VALUES (p_room, v_version, v_uid, btrim(p_summary), p_amount)
  RETURNING id INTO v_id;
  IF v_stage = 'interested' THEN
    UPDATE public.deal_rooms SET stage = 'proposal' WHERE id = p_room;
    PERFORM public.deal_log(p_room, 'stage_changed', jsonb_build_object('from', 'interested', 'to', 'proposal'));
  END IF;
  PERFORM public.deal_log(p_room, 'proposal_submitted', jsonb_strip_nulls(jsonb_build_object('proposal_id', v_id, 'version', v_version, 'amount', p_amount)));
  PERFORM public.deal_notify(p_room, public.deal_actor_name() || ' sent proposal v' || v_version || ' in your deal room.');
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.decide_proposal(p_proposal uuid, p_accept boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_room uuid; v_author uuid; v_status text; v_version integer; v_side text; v_author_side text; v_stage text;
BEGIN
  SELECT room_id, author, status, version INTO v_room, v_author, v_status, v_version FROM public.deal_proposals WHERE id = p_proposal;
  IF v_room IS NULL OR NOT public.is_deal_member(v_room) THEN RAISE EXCEPTION 'Proposal not found' USING errcode = '42501'; END IF;
  SELECT stage INTO v_stage FROM public.deal_rooms WHERE id = v_room FOR UPDATE;
  SELECT status INTO v_status FROM public.deal_proposals WHERE id = p_proposal;
  IF v_status <> 'submitted' THEN RAISE EXCEPTION 'This proposal was already decided or replaced' USING errcode = '22023'; END IF;
  IF v_author = v_uid THEN RAISE EXCEPTION 'You cannot accept or decline your own proposal' USING errcode = '42501'; END IF;
  v_side := public.deal_member_side(v_room, v_uid);
  IF v_side IS NULL THEN RAISE EXCEPTION 'Only the buyer or provider side decides on a proposal' USING errcode = '42501'; END IF;
  v_author_side := public.deal_member_side(v_room, v_author);
  IF v_author_side = v_side THEN RAISE EXCEPTION 'The other side decides on this proposal' USING errcode = '42501'; END IF;
  IF p_accept THEN
    IF v_stage <> 'proposal' THEN RAISE EXCEPTION 'Terms can only be agreed while proposals are open' USING errcode = '22023'; END IF;
    UPDATE public.deal_proposals SET status = 'accepted', decided_by = v_uid, decided_at = now() WHERE id = p_proposal;
    UPDATE public.deal_proposals SET status = 'superseded' WHERE room_id = v_room AND id <> p_proposal AND status = 'submitted';
    UPDATE public.deal_rooms SET stage = 'agreed' WHERE id = v_room;
    PERFORM public.deal_log(v_room, 'proposal_accepted', jsonb_build_object('proposal_id', p_proposal, 'version', v_version));
    PERFORM public.deal_log(v_room, 'stage_changed', jsonb_build_object('from', v_stage, 'to', 'agreed'));
    PERFORM public.deal_notify(v_room, public.deal_actor_name() || ' accepted proposal v' || v_version || '. Terms are agreed.');
  ELSE
    UPDATE public.deal_proposals SET status = 'declined', decided_by = v_uid, decided_at = now() WHERE id = p_proposal;
    PERFORM public.deal_log(v_room, 'proposal_declined', jsonb_build_object('proposal_id', p_proposal, 'version', v_version));
    PERFORM public.deal_notify(v_room, public.deal_actor_name() || ' declined proposal v' || v_version || '.');
  END IF;
END $$;

-- ── Milestones ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.add_deal_milestone(p_room uuid, p_title text, p_due date DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_sort integer;
BEGIN
  IF NOT public.can_edit_deal(p_room) THEN RAISE EXCEPTION 'Only the people doing this deal can add milestones to an open room' USING errcode = '42501'; END IF;
  IF char_length(btrim(coalesce(p_title, ''))) < 2 OR char_length(p_title) > 200 THEN RAISE EXCEPTION 'Name the milestone (2 to 200 characters)' USING errcode = '22023'; END IF;
  SELECT coalesce(max(sort), 0) + 1 INTO v_sort FROM public.deal_milestones WHERE room_id = p_room;
  INSERT INTO public.deal_milestones (room_id, title, due_date, sort, created_by) VALUES (p_room, btrim(p_title), p_due, v_sort, auth.uid())
  RETURNING id INTO v_id;
  PERFORM public.deal_log(p_room, 'milestone_added', jsonb_strip_nulls(jsonb_build_object('milestone_id', v_id, 'title', btrim(p_title), 'due', p_due)));
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.submit_deal_milestone(p_milestone uuid, p_note text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_room uuid; v_status text; v_title text; v_stage text;
BEGIN
  SELECT room_id, status, title INTO v_room, v_status, v_title FROM public.deal_milestones WHERE id = p_milestone;
  IF v_room IS NULL OR NOT public.can_edit_deal(v_room) THEN RAISE EXCEPTION 'Milestone not found' USING errcode = '42501'; END IF;
  IF public.deal_member_side(v_room, v_uid) IS DISTINCT FROM 'provider' AND public.deal_side_present(v_room, 'provider') THEN
    RAISE EXCEPTION 'The provider submits milestones' USING errcode = '42501';
  END IF;
  IF v_status NOT IN ('open','changes_requested') THEN RAISE EXCEPTION 'This milestone is already submitted or accepted' USING errcode = '22023'; END IF;
  SELECT stage INTO v_stage FROM public.deal_rooms WHERE id = v_room;
  IF v_stage NOT IN ('agreed','in_progress') THEN RAISE EXCEPTION 'Milestones are submitted once terms are agreed and before delivery' USING errcode = '22023'; END IF;
  IF char_length(coalesce(p_note, '')) > 1000 THEN RAISE EXCEPTION 'Keep the note under 1,000 characters' USING errcode = '22023'; END IF;
  UPDATE public.deal_milestones SET status = 'submitted', submitted_at = now(), submitted_by = v_uid WHERE id = p_milestone;
  PERFORM public.deal_log(v_room, 'milestone_submitted', jsonb_strip_nulls(jsonb_build_object('milestone_id', p_milestone, 'title', v_title, 'note', nullif(btrim(coalesce(p_note, '')), ''))));
  PERFORM public.deal_notify(v_room, public.deal_actor_name() || ' submitted the milestone “' || v_title || '” for review.');
END $$;

CREATE OR REPLACE FUNCTION public.review_deal_milestone(p_milestone uuid, p_accept boolean, p_note text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_room uuid; v_status text; v_title text; v_by uuid;
BEGIN
  SELECT room_id, status, title, submitted_by INTO v_room, v_status, v_title, v_by FROM public.deal_milestones WHERE id = p_milestone;
  IF v_room IS NULL OR NOT public.can_edit_deal(v_room) THEN RAISE EXCEPTION 'Milestone not found' USING errcode = '42501'; END IF;
  IF v_status <> 'submitted' THEN RAISE EXCEPTION 'Only a submitted milestone can be reviewed' USING errcode = '22023'; END IF;
  IF v_by = v_uid THEN RAISE EXCEPTION 'Someone else reviews what you submitted' USING errcode = '42501'; END IF;
  IF public.deal_member_side(v_room, v_uid) IS DISTINCT FROM 'buyer' AND public.deal_side_present(v_room, 'buyer') THEN
    RAISE EXCEPTION 'The buyer accepts milestones' USING errcode = '42501';
  END IF;
  IF char_length(coalesce(p_note, '')) > 1000 THEN RAISE EXCEPTION 'Keep the note under 1,000 characters' USING errcode = '22023'; END IF;
  IF p_accept THEN
    UPDATE public.deal_milestones SET status = 'accepted', accepted_at = now() WHERE id = p_milestone;
    PERFORM public.deal_log(v_room, 'milestone_accepted', jsonb_build_object('milestone_id', p_milestone, 'title', v_title));
    PERFORM public.deal_notify(v_room, public.deal_actor_name() || ' accepted the milestone “' || v_title || '”.');
  ELSE
    UPDATE public.deal_milestones SET status = 'changes_requested' WHERE id = p_milestone;
    PERFORM public.deal_log(v_room, 'milestone_changes_requested', jsonb_strip_nulls(jsonb_build_object('milestone_id', p_milestone, 'title', v_title, 'note', nullif(btrim(coalesce(p_note, '')), ''))));
    PERFORM public.deal_notify(v_room, public.deal_actor_name() || ' asked for changes on “' || v_title || '”.');
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.create_deal_room(text, text, text, text, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.invite_deal_member(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.respond_deal_invite(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.remove_deal_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.advance_deal_stage(uuid, text, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_deal_proposal(uuid, text, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.decide_proposal(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.add_deal_milestone(uuid, text, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_deal_milestone(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_deal_milestone(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_deal_room(text, text, text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.invite_deal_member(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_deal_invite(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_deal_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.advance_deal_stage(uuid, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_deal_proposal(uuid, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decide_proposal(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_deal_milestone(uuid, text, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_deal_milestone(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_deal_milestone(uuid, boolean, text) TO authenticated;
