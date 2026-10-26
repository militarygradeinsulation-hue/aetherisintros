-- Warm referrals: add the columns the app writes, keep legacy columns in sync, and grant owner-scoped access.
ALTER TABLE public.referral_suggestions
  ADD COLUMN IF NOT EXISTS for_user_id uuid,
  ADD COLUMN IF NOT EXISTS target_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS connector_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS path_explanation text,
  ADD COLUMN IF NOT EXISTS shared_context text,
  ADD COLUMN IF NOT EXISTS strength_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS snoozed_until timestamptz,
  ADD COLUMN IF NOT EXISTS generated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS acted_at timestamptz;

CREATE OR REPLACE FUNCTION public.referral_suggestions_sync() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.for_member_id := coalesce(NEW.for_member_id, NEW.for_user_id);
  NEW.for_user_id := coalesce(NEW.for_user_id, NEW.for_member_id);
  IF NEW.for_user_id IS DISTINCT FROM NEW.for_member_id THEN
    RAISE EXCEPTION 'referral suggestion owner mismatch';
  END IF;
  NEW.suggested_member_id := coalesce(NEW.suggested_member_id, NEW.target_user_id, NEW.connector_user_id, NEW.for_member_id);
  NEW.reason := coalesce(NEW.reason, NEW.path_explanation);
  NEW.score := coalesce(NEW.strength_score, NEW.score);
  NEW.updated_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS referral_suggestions_sync ON public.referral_suggestions;
CREATE TRIGGER referral_suggestions_sync BEFORE INSERT OR UPDATE ON public.referral_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.referral_suggestions_sync();

ALTER TABLE public.referral_requests
  ADD COLUMN IF NOT EXISTS suggestion_id uuid REFERENCES public.referral_suggestions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target_id uuid;

CREATE OR REPLACE FUNCTION public.referral_requests_sync() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.target_member_id := coalesce(NEW.target_member_id, NEW.target_id);
  NEW.target_id := coalesce(NEW.target_id, NEW.target_member_id);
  IF TG_OP = 'INSERT' AND NEW.requester_id IS DISTINCT FROM auth.uid() AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'referral requests are created by the requester';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS referral_requests_sync ON public.referral_requests;
CREATE TRIGGER referral_requests_sync BEFORE INSERT OR UPDATE ON public.referral_requests
  FOR EACH ROW EXECUTE FUNCTION public.referral_requests_sync();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.referral_suggestions, public.referral_requests TO authenticated;
GRANT ALL ON public.referral_suggestions, public.referral_requests TO service_role;

-- Syndication rooms: add the fields the app uses, a discussion table, and non-recursive access rules.
ALTER TABLE public.syndication_rooms
  ADD COLUMN IF NOT EXISTS room_type text NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS opportunity_size text,
  ADD COLUMN IF NOT EXISTS deadline date,
  ADD COLUMN IF NOT EXISTS decision text,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

ALTER TABLE public.syndication_room_members
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS vote text,
  ADD COLUMN IF NOT EXISTS vote_note text,
  ADD COLUMN IF NOT EXISTS voted_at timestamptz;
UPDATE public.syndication_room_members SET user_id = member_id WHERE user_id IS NULL;
ALTER TABLE public.syndication_room_members ALTER COLUMN joined_at SET DEFAULT now();

CREATE OR REPLACE FUNCTION public.syndication_members_sync() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.member_id := coalesce(NEW.member_id, NEW.user_id);
  NEW.user_id := coalesce(NEW.user_id, NEW.member_id);
  IF NEW.user_id IS DISTINCT FROM NEW.member_id THEN RAISE EXCEPTION 'member mismatch'; END IF;
  IF NEW.vote IS NOT NULL AND NEW.vote NOT IN ('in', 'out', 'need_more_info') THEN RAISE EXCEPTION 'invalid vote'; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS syndication_members_sync ON public.syndication_room_members;
CREATE TRIGGER syndication_members_sync BEFORE INSERT OR UPDATE ON public.syndication_room_members
  FOR EACH ROW EXECUTE FUNCTION public.syndication_members_sync();

CREATE OR REPLACE FUNCTION public.is_syndication_room_creator(p_room uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.syndication_rooms r WHERE r.id = p_room AND r.created_by = auth.uid())
$$;
CREATE OR REPLACE FUNCTION public.is_syndication_room_member(p_room uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.syndication_room_members m WHERE m.room_id = p_room AND m.member_id = auth.uid())
$$;
REVOKE ALL ON FUNCTION public.is_syndication_room_creator(uuid), public.is_syndication_room_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_syndication_room_creator(uuid), public.is_syndication_room_member(uuid) TO authenticated;

DROP POLICY IF EXISTS syn_rooms_access ON public.syndication_rooms;
CREATE POLICY syn_rooms_read ON public.syndication_rooms FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR visibility = 'public' OR public.is_syndication_room_member(id));
CREATE POLICY syn_rooms_insert ON public.syndication_rooms FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY syn_rooms_update ON public.syndication_rooms FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_syndication_room_member(id))
  WITH CHECK (created_by = (SELECT r.created_by FROM public.syndication_rooms r WHERE r.id = syndication_rooms.id));
CREATE POLICY syn_rooms_delete ON public.syndication_rooms FOR DELETE TO authenticated
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS syn_members_access ON public.syndication_room_members;
CREATE POLICY syn_members_read ON public.syndication_room_members FOR SELECT TO authenticated
  USING (member_id = auth.uid() OR public.is_syndication_room_creator(room_id) OR public.is_syndication_room_member(room_id));
CREATE POLICY syn_members_insert ON public.syndication_room_members FOR INSERT TO authenticated
  WITH CHECK (public.is_syndication_room_creator(room_id));
CREATE POLICY syn_members_update_own ON public.syndication_room_members FOR UPDATE TO authenticated
  USING (member_id = auth.uid()) WITH CHECK (member_id = auth.uid());
CREATE POLICY syn_members_delete ON public.syndication_room_members FOR DELETE TO authenticated
  USING (member_id = auth.uid() OR public.is_syndication_room_creator(room_id));

DROP POLICY IF EXISTS syn_interests_access ON public.syndication_interests;
CREATE POLICY syn_interests_access ON public.syndication_interests FOR ALL TO authenticated
  USING (member_id = auth.uid() OR public.is_syndication_room_creator(room_id))
  WITH CHECK (member_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.syndication_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.syndication_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS syndication_messages_room_idx ON public.syndication_messages (room_id, created_at);
GRANT SELECT, INSERT, DELETE ON public.syndication_messages TO authenticated;
GRANT ALL ON public.syndication_messages TO service_role;
ALTER TABLE public.syndication_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY syn_messages_read ON public.syndication_messages FOR SELECT TO authenticated
  USING (public.is_syndication_room_creator(room_id) OR public.is_syndication_room_member(room_id));
CREATE POLICY syn_messages_insert ON public.syndication_messages FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (public.is_syndication_room_creator(room_id) OR public.is_syndication_room_member(room_id)));
CREATE POLICY syn_messages_delete_own ON public.syndication_messages FOR DELETE TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.syndication_rooms, public.syndication_room_members, public.syndication_interests TO authenticated;
GRANT ALL ON public.syndication_rooms, public.syndication_room_members, public.syndication_interests TO service_role;