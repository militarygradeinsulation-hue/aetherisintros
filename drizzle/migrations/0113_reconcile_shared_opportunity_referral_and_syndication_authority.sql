-- Forward-only reconciliation, based on the read-only live catalog on 2026-11-24.
-- Retain all tables and rows. Never replay 0072, 0075 or 0100 against production.
-- Production release requires backup, actual catalog preflight, and integration verification.

-- The generic domain migration re-granted raw access in historical replay.
-- The observed production ACL already denies these privileges. Keep the
-- canonical exchange RPCs as the only member interface.
REVOKE ALL ON public.professional_opportunities, public.professional_opportunity_saves,
  public.professional_opportunity_interests FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.professional_opportunities, public.professional_opportunity_saves,
  public.professional_opportunity_interests TO service_role;

-- Referral suggestions and requests are server-owned. Clients retain their
-- existing owner/participant read access, but cannot forge a path or consent.
ALTER TABLE public.referral_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.referral_suggestions, public.referral_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.referral_suggestions, public.referral_requests TO authenticated;
GRANT ALL ON public.referral_suggestions, public.referral_requests TO service_role;
DROP POLICY IF EXISTS ref_suggestions_own ON public.referral_suggestions;
DROP POLICY IF EXISTS "members read own referral suggestions" ON public.referral_suggestions;
CREATE POLICY ref_suggestions_own_read ON public.referral_suggestions FOR SELECT TO authenticated
  USING (for_member_id=auth.uid() AND (for_user_id IS NULL OR for_user_id=auth.uid()));
DROP POLICY IF EXISTS ref_requests_parties ON public.referral_requests;
DROP POLICY IF EXISTS "referral request parties read" ON public.referral_requests;
CREATE POLICY ref_requests_parties_read ON public.referral_requests FOR SELECT TO authenticated
  USING (auth.uid() IN (requester_id, target_member_id, connector_id) AND
    (target_id IS NULL OR target_id=target_member_id));

-- Private service-only, invoker-rights RPCs. The authenticated server handler
-- checks live membership and supplies its verified user ID, never a client owner.
CREATE OR REPLACE FUNCTION public.replace_warm_referral_suggestions(p_owner uuid, p_rows jsonb)
RETURNS SETOF public.referral_suggestions LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE item jsonb; ids uuid[] := ARRAY[]::uuid[]; saved_id uuid; target uuid; connector uuid; score numeric;
BEGIN
  IF p_owner IS NULL OR NOT public.is_approved_member(p_owner) THEN
    RAISE EXCEPTION 'Membership required' USING ERRCODE='42501';
  END IF;
  IF jsonb_typeof(p_rows) IS DISTINCT FROM 'array' OR jsonb_array_length(p_rows) NOT BETWEEN 1 AND 5
     OR pg_column_size(p_rows)>25000 THEN RAISE EXCEPTION 'Invalid referral candidates'; END IF;
  -- Serialize replacement for one owner so parallel requests cannot discard each other's rows.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_owner::text, 0));
  FOR item IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
    target := (item->>'target_user_id')::uuid;
    connector := (item->>'connector_user_id')::uuid;
    score := (item->>'strength_score')::numeric;
    IF target IS NULL OR connector IS NULL OR p_owner IN (target,connector) OR target=connector
      OR NOT public.is_approved_member(target) OR NOT public.is_approved_member(connector)
      OR score IS NULL OR NOT (score BETWEEN 0 AND 100)
      OR char_length(btrim(coalesce(item->>'path_explanation',''))) NOT BETWEEN 3 AND 2000
      OR char_length(coalesce(item->>'shared_context',''))>2000
      THEN RAISE EXCEPTION 'Invalid referral candidate'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.relationships r WHERE r.user_id=p_owner AND r.member_id=connector::text AND r.kind='connection') THEN
      RAISE EXCEPTION 'A recorded connection is required';
    END IF;
    INSERT INTO public.referral_suggestions
      (for_user_id,for_member_id,suggested_member_id,target_user_id,connector_user_id,path_explanation,shared_context,strength_score,status)
      VALUES(p_owner,p_owner,target,target,connector,btrim(item->>'path_explanation'),nullif(item->>'shared_context',''),score,'active')
      RETURNING id INTO saved_id;
    ids := array_append(ids,saved_id);
  END LOOP;
  UPDATE public.referral_suggestions SET status='dismissed'
    WHERE for_member_id=p_owner AND (for_user_id IS NULL OR for_user_id=p_owner)
      AND status='active' AND NOT (id=ANY(ids));
  RETURN QUERY SELECT * FROM public.referral_suggestions WHERE id=ANY(ids) AND for_member_id=p_owner;
END $$;
REVOKE ALL ON FUNCTION public.replace_warm_referral_suggestions(uuid,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_warm_referral_suggestions(uuid,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.submit_warm_referral_request(p_owner uuid,p_suggestion uuid,p_connector uuid,p_target uuid,p_message text)
RETURNS public.referral_requests LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE suggestion public.referral_suggestions; receipt public.referral_requests;
BEGIN
  IF p_owner IS NULL OR p_connector IS NULL OR p_target IS NULL OR p_owner IN (p_connector,p_target) OR p_connector=p_target
    OR NOT public.is_approved_member(p_owner) OR NOT public.is_approved_member(p_connector)
    OR NOT public.is_approved_member(p_target)
    THEN RAISE EXCEPTION 'Referral participants unavailable' USING ERRCODE='42501'; END IF;
  IF char_length(btrim(coalesce(p_message,''))) NOT BETWEEN 3 AND 2000 THEN RAISE EXCEPTION 'Invalid referral message'; END IF;
  SELECT * INTO suggestion FROM public.referral_suggestions WHERE id=p_suggestion AND for_member_id=p_owner AND for_user_id=p_owner FOR UPDATE;
  IF NOT FOUND OR suggestion.connector_user_id IS DISTINCT FROM p_connector OR suggestion.target_user_id IS DISTINCT FROM p_target THEN
    RAISE EXCEPTION 'Referral suggestion unavailable' USING ERRCODE='42501';
  END IF;
  SELECT * INTO receipt FROM public.referral_requests WHERE suggestion_id=p_suggestion AND requester_id=p_owner
    AND connector_id=p_connector AND target_id=p_target ORDER BY created_at LIMIT 1;
  IF FOUND THEN RETURN receipt; END IF;
  IF suggestion.status NOT IN ('active','snoozed') THEN RAISE EXCEPTION 'Referral suggestion is no longer active'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.relationships r WHERE r.user_id=p_owner AND r.member_id=p_connector::text AND r.kind='connection') THEN
    RAISE EXCEPTION 'The recorded connector relationship is no longer available';
  END IF;
  INSERT INTO public.referral_requests(suggestion_id,requester_id,connector_id,target_id,target_member_id,message,status)
    VALUES(p_suggestion,p_owner,p_connector,p_target,p_target,btrim(p_message),'pending') RETURNING * INTO receipt;
  UPDATE public.referral_suggestions SET status='acted_on',acted_at=now() WHERE id=p_suggestion AND for_member_id=p_owner;
  RETURN receipt;
END $$;
REVOKE ALL ON FUNCTION public.submit_warm_referral_request(uuid,uuid,uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_warm_referral_request(uuid,uuid,uuid,uuid,text) TO service_role;

-- The real live roster is syndication_room_members, not syndication_members.
-- Historical source replays can contain both. Copy any missing old members
-- without replacing newer votes or deleting the original data.
DO $$ BEGIN
  IF to_regclass('public.syndication_members') IS NOT NULL THEN
    INSERT INTO public.syndication_room_members(room_id,member_id,user_id,vote,vote_note,voted_at,joined_at,status)
      SELECT room_id,user_id,user_id,vote,vote_note,voted_at,joined_at,'active' FROM public.syndication_members
      ON CONFLICT(room_id,member_id) DO NOTHING;
    REVOKE ALL ON public.syndication_members FROM PUBLIC, anon, authenticated;
  END IF;
END $$;

-- Only the guarded creation/invitation RPCs may create rooms or roster entries.
ALTER TABLE public.syndication_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syndication_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syndication_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.syndication_rooms, public.syndication_room_members, public.syndication_messages FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON public.syndication_rooms, public.syndication_room_members TO authenticated;
GRANT UPDATE(title,room_type,description,opportunity_size,deadline,status,decision,closed_at) ON public.syndication_rooms TO authenticated;
GRANT UPDATE(vote,vote_note,voted_at) ON public.syndication_room_members TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.syndication_messages TO authenticated;
GRANT ALL ON public.syndication_rooms, public.syndication_room_members, public.syndication_messages TO service_role;

DROP POLICY IF EXISTS "room participants read syndication rooms" ON public.syndication_rooms;
DROP POLICY IF EXISTS "creator edits syndication room" ON public.syndication_rooms;
DROP POLICY IF EXISTS "creator deletes syndication room" ON public.syndication_rooms;
DROP POLICY IF EXISTS syn_rooms_insert ON public.syndication_rooms;
DROP POLICY IF EXISTS syn_rooms_read ON public.syndication_rooms;
DROP POLICY IF EXISTS syn_rooms_update ON public.syndication_rooms;
DROP POLICY IF EXISTS syn_rooms_delete ON public.syndication_rooms;
CREATE POLICY syn_rooms_read ON public.syndication_rooms FOR SELECT TO authenticated
  USING (public.is_live_member() AND (created_by=auth.uid() OR visibility='public' OR public.is_syndication_room_member(id)));
CREATE POLICY syn_rooms_update ON public.syndication_rooms FOR UPDATE TO authenticated
  USING (public.is_live_member() AND created_by=auth.uid()) WITH CHECK (created_by=auth.uid());
CREATE POLICY syn_rooms_delete ON public.syndication_rooms FOR DELETE TO authenticated
  USING (public.is_live_member() AND created_by=auth.uid());
DROP POLICY IF EXISTS syn_members_insert ON public.syndication_room_members;
DROP POLICY IF EXISTS syn_members_read ON public.syndication_room_members;
DROP POLICY IF EXISTS syn_members_update_own ON public.syndication_room_members;
DROP POLICY IF EXISTS syn_members_delete ON public.syndication_room_members;
CREATE POLICY syn_members_read ON public.syndication_room_members FOR SELECT TO authenticated
  USING (public.is_live_member() AND (member_id=auth.uid() OR public.is_syndication_room_creator(room_id) OR public.is_syndication_room_member(room_id)));
CREATE POLICY syn_members_update_own ON public.syndication_room_members FOR UPDATE TO authenticated
  USING (public.is_live_member() AND member_id=auth.uid()) WITH CHECK (member_id=auth.uid());
CREATE POLICY syn_members_delete ON public.syndication_room_members FOR DELETE TO authenticated
  USING (public.is_live_member() AND (member_id=auth.uid() OR public.is_syndication_room_creator(room_id)));
DROP POLICY IF EXISTS "participants read syndication messages" ON public.syndication_messages;
DROP POLICY IF EXISTS "participants post syndication messages" ON public.syndication_messages;
DROP POLICY IF EXISTS syn_messages_read ON public.syndication_messages;
DROP POLICY IF EXISTS syn_messages_insert ON public.syndication_messages;
DROP POLICY IF EXISTS syn_messages_delete_own ON public.syndication_messages;
CREATE POLICY syn_messages_read ON public.syndication_messages FOR SELECT TO authenticated
  USING (public.is_live_member() AND (public.is_syndication_room_creator(room_id) OR public.is_syndication_room_member(room_id)));
CREATE POLICY syn_messages_insert ON public.syndication_messages FOR INSERT TO authenticated
  WITH CHECK (public.is_live_member() AND user_id=auth.uid() AND (public.is_syndication_room_creator(room_id) OR public.is_syndication_room_member(room_id)));
CREATE POLICY syn_messages_delete_own ON public.syndication_messages FOR DELETE TO authenticated USING (user_id=auth.uid());

-- Authenticated SECURITY DEFINER entry points are narrowly scoped because
-- creating multiple related rows and recording a final vote must be atomic.
CREATE OR REPLACE FUNCTION public.create_syndication_room(
  p_title text,p_room_type text DEFAULT 'co-invest',p_description text DEFAULT NULL,
  p_opportunity_size text DEFAULT NULL,p_deadline date DEFAULT NULL,p_invite_user_ids uuid[] DEFAULT '{}'::uuid[]
) RETURNS public.syndication_rooms LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE room public.syndication_rooms; invitee uuid; caller uuid := auth.uid();
BEGIN
  IF caller IS NULL OR NOT public.is_live_member() THEN RAISE EXCEPTION 'Not authorised' USING ERRCODE='42501'; END IF;
  IF char_length(btrim(coalesce(p_title,''))) NOT BETWEEN 3 AND 200 OR p_room_type IS NULL
    OR p_room_type NOT IN ('co-invest','co-sponsor','co-refer','other')
    OR char_length(coalesce(p_description,''))>6000 OR char_length(coalesce(p_opportunity_size,''))>240
    OR coalesce(cardinality(p_invite_user_ids),0)>50 THEN RAISE EXCEPTION 'Invalid room details'; END IF;
  FOREACH invitee IN ARRAY coalesce(p_invite_user_ids,'{}'::uuid[]) LOOP
    IF invitee IS NULL OR (invitee<>caller AND NOT public.is_approved_member(invitee)) THEN
      RAISE EXCEPTION 'Invitee is not an active member';
    END IF;
  END LOOP;
  INSERT INTO public.syndication_rooms(created_by,title,room_type,description,opportunity_size,deadline,status,visibility)
    VALUES(caller,btrim(p_title),p_room_type,p_description,p_opportunity_size,p_deadline,'open','private') RETURNING * INTO room;
  INSERT INTO public.syndication_room_members(room_id,member_id,user_id,status,role)
    VALUES(room.id,caller,caller,'active','lead');
  FOREACH invitee IN ARRAY coalesce(p_invite_user_ids,'{}'::uuid[]) LOOP
    IF invitee<>caller THEN
      INSERT INTO public.syndication_room_members(room_id,member_id,user_id,invited_by)
        VALUES(room.id,invitee,invitee,caller) ON CONFLICT(room_id,member_id) DO NOTHING;
    END IF;
  END LOOP;
  RETURN room;
END $$;
CREATE OR REPLACE FUNCTION public.invite_syndication_member(p_room_id uuid,p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_live_member() OR NOT public.is_syndication_room_creator(p_room_id) THEN
    RAISE EXCEPTION 'Not authorised' USING ERRCODE='42501';
  END IF;
  IF p_user_id IS NULL OR p_user_id=auth.uid() OR NOT public.is_approved_member(p_user_id) THEN RAISE EXCEPTION 'Invitee is not an active member'; END IF;
  INSERT INTO public.syndication_room_members(room_id,member_id,user_id,invited_by) VALUES(p_room_id,p_user_id,p_user_id,auth.uid())
    ON CONFLICT(room_id,member_id) DO NOTHING;
END $$;
CREATE OR REPLACE FUNCTION public.cast_syndication_vote(p_room_id uuid,p_vote text,p_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE room public.syndication_rooms; tally text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_live_member() OR NOT public.is_syndication_room_member(p_room_id) THEN
    RAISE EXCEPTION 'Not authorised' USING ERRCODE='42501';
  END IF;
  IF p_vote IS NULL OR p_vote NOT IN ('in','out','need_more_info') OR char_length(coalesce(p_note,''))>2000 THEN RAISE EXCEPTION 'Invalid vote'; END IF;
  SELECT * INTO room FROM public.syndication_rooms WHERE id=p_room_id FOR UPDATE;
  IF NOT FOUND OR room.status='closed' THEN RAISE EXCEPTION 'Room unavailable'; END IF;
  UPDATE public.syndication_room_members SET vote=p_vote,vote_note=p_note,voted_at=now() WHERE room_id=p_room_id AND member_id=auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Member not found'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.syndication_room_members WHERE room_id=p_room_id AND vote IS NULL) THEN
    SELECT format('%s In / %s Out / %s Need More Info',count(*) FILTER (WHERE vote='in'),count(*) FILTER (WHERE vote='out'),count(*) FILTER (WHERE vote='need_more_info'))
      INTO tally FROM public.syndication_room_members WHERE room_id=p_room_id;
    UPDATE public.syndication_rooms SET status='decided',decision=tally,closed_at=now() WHERE id=p_room_id;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.create_syndication_room(text,text,text,text,date,uuid[]),public.invite_syndication_member(uuid,uuid),public.cast_syndication_vote(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_syndication_room(text,text,text,text,date,uuid[]),public.invite_syndication_member(uuid,uuid),public.cast_syndication_vote(uuid,text,text) TO authenticated;

-- Enforce new room values without rewriting legacy status values.
CREATE OR REPLACE FUNCTION public.syndication_room_values_guard() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF (TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status) AND NEW.status NOT IN ('draft','open','decided','closed') THEN RAISE EXCEPTION 'Invalid room status'; END IF;
  IF (TG_OP='INSERT' OR NEW.room_type IS DISTINCT FROM OLD.room_type) AND NEW.room_type NOT IN ('co-invest','co-sponsor','co-refer','other') THEN RAISE EXCEPTION 'Invalid room type'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS syndication_room_values_guard ON public.syndication_rooms;
CREATE TRIGGER syndication_room_values_guard BEFORE INSERT OR UPDATE ON public.syndication_rooms FOR EACH ROW EXECUTE FUNCTION public.syndication_room_values_guard();
CREATE OR REPLACE FUNCTION public.syndication_messages_guard() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN NEW.user_id:=auth.uid(); NEW.created_at:=now(); END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS syndication_messages_guard ON public.syndication_messages;
CREATE TRIGGER syndication_messages_guard BEFORE INSERT ON public.syndication_messages FOR EACH ROW EXECUTE FUNCTION public.syndication_messages_guard();
REVOKE ALL ON FUNCTION public.syndication_room_values_guard(),public.syndication_messages_guard() FROM PUBLIC, anon, authenticated;
