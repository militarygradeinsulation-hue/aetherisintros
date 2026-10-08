-- Meetings feed the outcome record.
--
-- A meeting can be started from an accepted introduction: it carries the introduction's id
-- and an agenda (the context capsule's why and first goal). When both people from that
-- introduction have actually joined the call, the introduction is recorded as "met" for each
-- of them, so follow-through evidence builds itself instead of waiting for a manual check-in.
-- Evidence is only written for people who joined, never for invitees who did not show.

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS intro_request_id uuid REFERENCES public.intro_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS agenda text NOT NULL DEFAULT '' CHECK (char_length(agenda) <= 2000);
CREATE INDEX IF NOT EXISTS meetings_intro_idx ON public.meetings (intro_request_id) WHERE intro_request_id IS NOT NULL;

DROP FUNCTION IF EXISTS public.create_meeting(text, uuid[], timestamptz);

CREATE OR REPLACE FUNCTION public.create_meeting(
  p_title text, p_invitees uuid[], p_scheduled_for timestamptz DEFAULT NULL,
  p_agenda text DEFAULT '', p_intro uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_id uuid; v_guests uuid[]; v_name text; v_other uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in to start a meeting' USING errcode = '42501'; END IF;

  -- A meeting from an introduction: only its two people, only once both accepted.
  IF p_intro IS NOT NULL THEN
    SELECT CASE WHEN r.user_id = v_uid THEN r.target_user_id ELSE r.user_id END INTO v_other
      FROM public.intro_requests r
     WHERE r.id = p_intro AND r.requester_opt_in AND r.member_opt_in
       AND (r.user_id = v_uid OR r.target_user_id = v_uid);
    IF v_other IS NULL THEN RAISE EXCEPTION 'Meetings start from introductions both people accepted' USING errcode = '42501'; END IF;
    p_invitees := array_append(coalesce(p_invitees, '{}'), v_other);
  END IF;

  SELECT coalesce(array_agg(DISTINCT g), '{}') INTO v_guests
    FROM unnest(coalesce(p_invitees, '{}')) g
   WHERE g IS DISTINCT FROM v_uid AND EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = g);
  IF cardinality(v_guests) > 3 THEN RAISE EXCEPTION 'A meeting holds up to four people' USING errcode = '22023'; END IF;

  INSERT INTO public.meetings (host_id, title, scheduled_for, agenda, intro_request_id)
  VALUES (v_uid, btrim(p_title), p_scheduled_for, left(coalesce(p_agenda, ''), 2000), p_intro) RETURNING id INTO v_id;
  INSERT INTO public.meeting_participants (meeting_id, user_id, role) VALUES (v_id, v_uid, 'host');
  INSERT INTO public.meeting_participants (meeting_id, user_id) SELECT v_id, g FROM unnest(v_guests) g;

  SELECT coalesce(nullif(btrim(name), ''), 'A member') INTO v_name FROM public.profiles WHERE id = v_uid;
  INSERT INTO public.notifications (user_id, kind, text, actor_id, link)
  SELECT g, 'meeting_invite', coalesce(v_name, 'A member') || ' invited you to a meeting: ' || btrim(p_title), v_uid, '/app/meetings'
    FROM unnest(v_guests) g;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.create_meeting(text, uuid[], timestamptz, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_meeting(text, uuid[], timestamptz, text, uuid) TO authenticated;

-- Joining records attendance; once both people from the introduction have joined, each of
-- them gets a "met" outcome (unless they already recorded that stage or a later one).
CREATE OR REPLACE FUNCTION public.mark_meeting_joined(p_meeting uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_intro uuid; v_a uuid; v_b uuid;
BEGIN
  IF NOT public.is_meeting_participant(p_meeting) THEN RAISE EXCEPTION 'Meeting not found' USING errcode = '42501'; END IF;
  UPDATE public.meeting_participants SET joined_at = coalesce(joined_at, now()) WHERE meeting_id = p_meeting AND user_id = auth.uid();
  UPDATE public.meetings SET started_at = coalesce(started_at, now()) WHERE id = p_meeting AND ended_at IS NULL;

  SELECT m.intro_request_id, r.user_id, r.target_user_id INTO v_intro, v_a, v_b
    FROM public.meetings m JOIN public.intro_requests r ON r.id = m.intro_request_id
   WHERE m.id = p_meeting AND r.requester_opt_in AND r.member_opt_in;
  IF v_intro IS NULL THEN RETURN; END IF;
  IF (SELECT count(*) FROM public.meeting_participants p
       WHERE p.meeting_id = p_meeting AND p.user_id IN (v_a, v_b) AND p.joined_at IS NOT NULL) < 2 THEN
    RETURN;
  END IF;
  INSERT INTO public.intro_outcomes (intro_request_id, author_id, stage)
  SELECT v_intro, who, 'met' FROM unnest(ARRAY[v_a, v_b]) who
   WHERE NOT EXISTS (SELECT 1 FROM public.intro_outcomes o
                      WHERE o.intro_request_id = v_intro AND o.author_id = who
                        AND o.stage IN ('met', 'next_step', 'outcome', 'no_outcome'));
END $$;
REVOKE ALL ON FUNCTION public.mark_meeting_joined(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_meeting_joined(uuid) TO authenticated;
