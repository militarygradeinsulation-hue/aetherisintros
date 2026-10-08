-- Meetings: a Record button, and inviting people from inside a call.
--
-- Recording is a meeting-wide state everyone in the room can see ("Recording" banner). Turning
-- it on also turns the presser's own notes on. Everyone else is asked whether their voice
-- may be included and is only transcribed after they agree (consent stays per person, as in
-- 0031): each consenting browser records its own microphone and the server transcribes it.
-- Any participant may start recording; the person who started it or the host can stop it,
-- which also turns note taking off for everyone. Ending the meeting stops it.

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS recording_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS recording_started_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.set_meeting_recording(p_meeting uuid, p_on boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); m public.meetings;
BEGIN
  IF NOT public.is_meeting_participant(p_meeting) THEN RAISE EXCEPTION 'Meeting not found' USING errcode = '42501'; END IF;
  SELECT * INTO m FROM public.meetings WHERE id = p_meeting;
  IF m.ended_at IS NOT NULL THEN RAISE EXCEPTION 'This meeting has ended' USING errcode = '22023'; END IF;
  IF coalesce(p_on, false) THEN
    UPDATE public.meetings SET recording_started_at = coalesce(recording_started_at, now()),
                               recording_started_by = coalesce(recording_started_by, v_uid)
     WHERE id = p_meeting;
    UPDATE public.meeting_participants SET notes_consent = true, consented_at = now()
     WHERE meeting_id = p_meeting AND user_id = v_uid;
  ELSE
    IF m.recording_started_at IS NULL THEN RETURN; END IF;
    IF v_uid IS DISTINCT FROM m.host_id AND v_uid IS DISTINCT FROM m.recording_started_by THEN
      RAISE EXCEPTION 'Only the host or the person who started recording can stop it' USING errcode = '42501';
    END IF;
    UPDATE public.meetings SET recording_started_at = NULL, recording_started_by = NULL WHERE id = p_meeting;
    UPDATE public.meeting_participants SET notes_consent = false WHERE meeting_id = p_meeting;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.set_meeting_recording(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_meeting_recording(uuid, boolean) TO authenticated;

-- Ending a meeting also stops recording.
CREATE OR REPLACE FUNCTION public.end_meeting(p_meeting uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.meetings WHERE id = p_meeting AND host_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only the host can end this meeting' USING errcode = '42501';
  END IF;
  UPDATE public.meetings SET ended_at = coalesce(ended_at, now()), recording_started_at = NULL, recording_started_by = NULL WHERE id = p_meeting;
  UPDATE public.meeting_participants SET notes_consent = false WHERE meeting_id = p_meeting;
END $$;
REVOKE ALL ON FUNCTION public.end_meeting(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.end_meeting(uuid) TO authenticated;

-- The host adds a member to an open meeting (up to four people in the room).
CREATE OR REPLACE FUNCTION public.invite_to_meeting(p_meeting uuid, p_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); m public.meetings; v_name text;
BEGIN
  SELECT * INTO m FROM public.meetings WHERE id = p_meeting AND host_id = v_uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Only the host can invite people' USING errcode = '42501'; END IF;
  IF m.ended_at IS NOT NULL THEN RAISE EXCEPTION 'This meeting has ended' USING errcode = '22023'; END IF;
  IF p_user IS NULL OR p_user = v_uid OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user) THEN
    RAISE EXCEPTION 'Member not found' USING errcode = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.meeting_participants WHERE meeting_id = p_meeting AND user_id = p_user) THEN RETURN; END IF;
  IF (SELECT count(*) FROM public.meeting_participants WHERE meeting_id = p_meeting) >= 4 THEN
    RAISE EXCEPTION 'A meeting holds up to four people' USING errcode = '22023';
  END IF;
  INSERT INTO public.meeting_participants (meeting_id, user_id) VALUES (p_meeting, p_user);
  SELECT coalesce(nullif(btrim(name), ''), 'A member') INTO v_name FROM public.profiles WHERE id = v_uid;
  INSERT INTO public.notifications (user_id, kind, text, actor_id, link)
  VALUES (p_user, 'meeting_invite',
          coalesce(v_name, 'A member') || CASE WHEN m.started_at IS NOT NULL THEN ' is in a meeting and invited you to join: ' ELSE ' invited you to a meeting: ' END || m.title,
          v_uid, '/app/meetings');
END $$;
REVOKE ALL ON FUNCTION public.invite_to_meeting(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.invite_to_meeting(uuid, uuid) TO authenticated;
