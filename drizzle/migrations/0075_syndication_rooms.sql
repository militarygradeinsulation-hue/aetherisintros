-- Private group decision rooms for co-invest, co-sponsor and co-refer opportunities.
CREATE TABLE public.syndication_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 3 AND 200),
  room_type text NOT NULL DEFAULT 'co-invest' CHECK (room_type IN ('co-invest','co-sponsor','co-refer','other')),
  description text CHECK (description IS NULL OR char_length(description) <= 6000),
  opportunity_size text CHECK (opportunity_size IS NULL OR char_length(opportunity_size) <= 240),
  deadline date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','decided','closed')),
  decision text CHECK (decision IS NULL OR char_length(decision) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);
CREATE TABLE public.syndication_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.syndication_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote text CHECK (vote IN ('in','out','need_more_info')),
  vote_note text CHECK (vote_note IS NULL OR char_length(vote_note) <= 2000),
  voted_at timestamptz,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id)
);
CREATE TABLE public.syndication_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.syndication_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX syndication_members_user_idx ON public.syndication_members (user_id, room_id);
CREATE INDEX syndication_messages_room_idx ON public.syndication_messages (room_id, created_at);

CREATE OR REPLACE FUNCTION public.is_syndication_creator(p_room uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.syndication_rooms r WHERE r.id=p_room AND r.created_by=auth.uid())
$$;
CREATE OR REPLACE FUNCTION public.is_syndication_member(p_room uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_syndication_creator(p_room)
      OR EXISTS (SELECT 1 FROM public.syndication_members m WHERE m.room_id=p_room AND m.user_id=auth.uid())
$$;
REVOKE ALL ON FUNCTION public.is_syndication_creator(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_syndication_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_syndication_creator(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_syndication_member(uuid) TO authenticated;

REVOKE ALL ON public.syndication_rooms, public.syndication_members, public.syndication_messages FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.syndication_rooms, public.syndication_members, public.syndication_messages TO service_role;
GRANT SELECT, DELETE ON public.syndication_rooms TO authenticated;
GRANT UPDATE (title, room_type, description, opportunity_size, deadline, status, decision, closed_at) ON public.syndication_rooms TO authenticated;
GRANT SELECT, DELETE ON public.syndication_members TO authenticated;
GRANT UPDATE (vote, vote_note, voted_at) ON public.syndication_members TO authenticated;
GRANT SELECT, INSERT ON public.syndication_messages TO authenticated;

ALTER TABLE public.syndication_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syndication_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syndication_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "room participants read syndication rooms" ON public.syndication_rooms FOR SELECT TO authenticated USING (public.is_syndication_member(id));
CREATE POLICY "creator edits syndication room" ON public.syndication_rooms FOR UPDATE TO authenticated
  USING (created_by=auth.uid()) WITH CHECK (created_by=auth.uid());
CREATE POLICY "creator deletes syndication room" ON public.syndication_rooms FOR DELETE TO authenticated USING (created_by=auth.uid());

CREATE POLICY "participants read syndication roster" ON public.syndication_members FOR SELECT TO authenticated USING (public.is_syndication_member(room_id));
CREATE POLICY "members update own syndication vote" ON public.syndication_members FOR UPDATE TO authenticated
  USING (user_id=auth.uid() AND public.is_syndication_member(room_id))
  WITH CHECK (user_id=auth.uid() AND public.is_syndication_member(room_id));
CREATE POLICY "creator removes syndication member" ON public.syndication_members FOR DELETE TO authenticated USING (public.is_syndication_creator(room_id));

CREATE POLICY "participants read syndication messages" ON public.syndication_messages FOR SELECT TO authenticated USING (public.is_syndication_member(room_id));
CREATE POLICY "participants post syndication messages" ON public.syndication_messages FOR INSERT TO authenticated
  WITH CHECK (user_id=auth.uid() AND public.is_syndication_member(room_id));



CREATE OR REPLACE FUNCTION public.create_syndication_room(
  p_title text,
  p_room_type text DEFAULT 'co-invest',
  p_description text DEFAULT NULL,
  p_opportunity_size text DEFAULT NULL,
  p_deadline date DEFAULT NULL,
  p_invite_user_ids uuid[] DEFAULT '{}'::uuid[]
) RETURNS public.syndication_rooms
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_room public.syndication_rooms;
  v_invitee uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_live_member() THEN
    RAISE EXCEPTION 'Not authorised' USING errcode='42501';
  END IF;
  IF char_length(btrim(coalesce(p_title,''))) NOT BETWEEN 3 AND 200 THEN
    RAISE EXCEPTION 'Invalid room title' USING errcode='22023';
  END IF;
  IF p_room_type NOT IN ('co-invest','co-sponsor','co-refer','other') THEN
    RAISE EXCEPTION 'Invalid room type' USING errcode='22023';
  END IF;

  INSERT INTO public.syndication_rooms (
    created_by, title, room_type, description, opportunity_size, deadline, status, created_at
  ) VALUES (
    auth.uid(), btrim(p_title), p_room_type,
    CASE WHEN p_description IS NULL THEN NULL ELSE left(btrim(p_description),6000) END,
    CASE WHEN p_opportunity_size IS NULL THEN NULL ELSE left(btrim(p_opportunity_size),240) END,
    p_deadline, 'open', now()
  ) RETURNING * INTO v_room;

  INSERT INTO public.syndication_members (room_id, user_id)
  VALUES (v_room.id, auth.uid())
  ON CONFLICT (room_id,user_id) DO NOTHING;

  FOREACH v_invitee IN ARRAY coalesce(p_invite_user_ids,'{}'::uuid[]) LOOP
    IF v_invitee <> auth.uid() AND public.is_approved_member(v_invitee) THEN
      INSERT INTO public.syndication_members (room_id,user_id)
      VALUES (v_room.id,v_invitee)
      ON CONFLICT (room_id,user_id) DO NOTHING;
    END IF;
  END LOOP;

  RETURN v_room;
END $$;

CREATE OR REPLACE FUNCTION public.invite_syndication_member(p_room_id uuid,p_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_syndication_creator(p_room_id) THEN
    RAISE EXCEPTION 'Not authorised' USING errcode='42501';
  END IF;
  IF p_user_id = auth.uid() OR NOT public.is_approved_member(p_user_id) THEN
    RAISE EXCEPTION 'Invitee is not an active member' USING errcode='22023';
  END IF;
  INSERT INTO public.syndication_members(room_id,user_id)
  VALUES(p_room_id,p_user_id)
  ON CONFLICT (room_id,user_id) DO NOTHING;
END $$;

REVOKE ALL ON FUNCTION public.create_syndication_room(text,text,text,text,date,uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.invite_syndication_member(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_syndication_room(text,text,text,text,date,uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.invite_syndication_member(uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.syndication_rooms_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'Room owner cannot change' USING errcode='42501';
  END IF;
  IF NEW.status='closed' AND OLD.status IS DISTINCT FROM 'closed' THEN NEW.closed_at:=now(); END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.syndication_rooms_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER syndication_rooms_guard BEFORE UPDATE ON public.syndication_rooms FOR EACH ROW EXECUTE FUNCTION public.syndication_rooms_guard();

CREATE OR REPLACE FUNCTION public.syndication_messages_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.user_id:=auth.uid(); NEW.created_at:=now(); RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.syndication_messages_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER syndication_messages_guard BEFORE INSERT ON public.syndication_messages FOR EACH ROW EXECUTE FUNCTION public.syndication_messages_guard();
