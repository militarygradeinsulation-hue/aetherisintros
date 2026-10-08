-- Video meetings with an opt-in AI note taker.
--
-- Calls run browser-to-browser (WebRTC); this schema holds who may join, the consented
-- transcript and each attendee's own notes. Connection signals travel over a private Supabase
-- Realtime channel named meeting:<id>, which only that meeting's participants may join.
--
-- Consent is per person: a participant's speech is transcribed by their own browser, and
-- only after they turn notes on. The database refuses transcript lines from anyone who has
-- not consented, so nobody is recorded without agreeing. Notes are private to their owner.

CREATE TABLE public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 140),
  scheduled_for timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX meetings_host_idx ON public.meetings (host_id, created_at DESC);

CREATE TABLE public.meeting_participants (
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'guest' CHECK (role IN ('host', 'guest')),
  notes_consent boolean NOT NULL DEFAULT false,
  consented_at timestamptz,
  joined_at timestamptz,
  PRIMARY KEY (meeting_id, user_id)
);
CREATE INDEX meeting_participants_user_idx ON public.meeting_participants (user_id);

CREATE TABLE public.meeting_transcript_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  speaker_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  text text NOT NULL CHECK (char_length(btrim(text)) BETWEEN 1 AND 2000),
  spoken_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX meeting_transcript_meeting_idx ON public.meeting_transcript_lines (meeting_id, spoken_at);

CREATE TABLE public.meeting_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  summary text NOT NULL DEFAULT '' CHECK (char_length(summary) <= 6000),
  decisions jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(decisions) = 'array'),
  action_items jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(action_items) = 'array'),
  private_note text NOT NULL DEFAULT '' CHECK (char_length(private_note) <= 4000),
  generated_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (meeting_id, owner_id)
);
CREATE TRIGGER meeting_notes_touch BEFORE UPDATE ON public.meeting_notes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER meeting_notes_freeze BEFORE UPDATE ON public.meeting_notes FOR EACH ROW EXECUTE FUNCTION public.freeze_columns('owner_id', 'meeting_id');

-- ── Access ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_meeting_participant(p_meeting uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.meeting_participants p WHERE p.meeting_id = p_meeting AND p.user_id = auth.uid())
$$;
REVOKE ALL ON FUNCTION public.is_meeting_participant(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_meeting_participant(uuid) TO authenticated;

REVOKE ALL ON public.meetings, public.meeting_participants, public.meeting_transcript_lines, public.meeting_notes FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.meetings, public.meeting_participants, public.meeting_transcript_lines, public.meeting_notes TO service_role;

GRANT SELECT ON public.meetings TO authenticated;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants read meetings" ON public.meetings FOR SELECT TO authenticated
  USING (public.is_meeting_participant(id));

GRANT SELECT ON public.meeting_participants TO authenticated;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants read the roster" ON public.meeting_participants FOR SELECT TO authenticated
  USING (public.is_meeting_participant(meeting_id));

-- Lines can only be written as yourself, with notes on, while the meeting is open. The
-- speaker and timestamp are not client-writable (column grant), so lines cannot be forged
-- for someone else or backdated. People may delete their own lines.
GRANT SELECT, DELETE ON public.meeting_transcript_lines TO authenticated;
GRANT INSERT (meeting_id, text) ON public.meeting_transcript_lines TO authenticated;
ALTER TABLE public.meeting_transcript_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants read the transcript" ON public.meeting_transcript_lines FOR SELECT TO authenticated
  USING (public.is_meeting_participant(meeting_id));
CREATE POLICY "consenting speakers add lines" ON public.meeting_transcript_lines FOR INSERT TO authenticated
  WITH CHECK (
    speaker_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.meeting_participants p
                 WHERE p.meeting_id = meeting_transcript_lines.meeting_id AND p.user_id = auth.uid() AND p.notes_consent)
    AND EXISTS (SELECT 1 FROM public.meetings m WHERE m.id = meeting_transcript_lines.meeting_id AND m.ended_at IS NULL)
  );
CREATE POLICY "speakers delete their own lines" ON public.meeting_transcript_lines FOR DELETE TO authenticated
  USING (speaker_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_notes TO authenticated;
ALTER TABLE public.meeting_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners read their notes" ON public.meeting_notes FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "participants write their own notes" ON public.meeting_notes FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND public.is_meeting_participant(meeting_id));
CREATE POLICY "owners edit their notes" ON public.meeting_notes FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owners delete their notes" ON public.meeting_notes FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- ── Actions ────────────────────────────────────────────────────────────────────────────
-- Create a meeting with up to three invited members (four people in the room).
CREATE OR REPLACE FUNCTION public.create_meeting(p_title text, p_invitees uuid[], p_scheduled_for timestamptz DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_id uuid; v_guests uuid[]; v_name text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in to start a meeting' USING errcode = '42501'; END IF;
  SELECT coalesce(array_agg(DISTINCT g), '{}') INTO v_guests
    FROM unnest(coalesce(p_invitees, '{}')) g
   WHERE g IS DISTINCT FROM v_uid AND EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = g);
  IF cardinality(v_guests) > 3 THEN RAISE EXCEPTION 'A meeting holds up to four people' USING errcode = '22023'; END IF;

  INSERT INTO public.meetings (host_id, title, scheduled_for) VALUES (v_uid, btrim(p_title), p_scheduled_for) RETURNING id INTO v_id;
  INSERT INTO public.meeting_participants (meeting_id, user_id, role) VALUES (v_id, v_uid, 'host');
  INSERT INTO public.meeting_participants (meeting_id, user_id) SELECT v_id, g FROM unnest(v_guests) g;

  SELECT coalesce(nullif(btrim(name), ''), 'A member') INTO v_name FROM public.profiles WHERE id = v_uid;
  INSERT INTO public.notifications (user_id, kind, text, actor_id, link)
  SELECT g, 'meeting_invite', coalesce(v_name, 'A member') || ' invited you to a meeting: ' || btrim(p_title), v_uid, '/app/meetings'
    FROM unnest(v_guests) g;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.create_meeting(text, uuid[], timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_meeting(text, uuid[], timestamptz) TO authenticated;

-- Turn your own note taking on or off. Only for yourself, only while the meeting is open.
CREATE OR REPLACE FUNCTION public.set_meeting_notes_consent(p_meeting uuid, p_on boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_meeting_participant(p_meeting) THEN RAISE EXCEPTION 'Meeting not found' USING errcode = '42501'; END IF;
  IF EXISTS (SELECT 1 FROM public.meetings WHERE id = p_meeting AND ended_at IS NOT NULL) THEN
    RAISE EXCEPTION 'This meeting has ended' USING errcode = '22023';
  END IF;
  UPDATE public.meeting_participants
     SET notes_consent = coalesce(p_on, false),
         consented_at = CASE WHEN coalesce(p_on, false) THEN now() ELSE consented_at END
   WHERE meeting_id = p_meeting AND user_id = auth.uid();
END $$;
REVOKE ALL ON FUNCTION public.set_meeting_notes_consent(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_meeting_notes_consent(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_meeting_joined(p_meeting uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_meeting_participant(p_meeting) THEN RAISE EXCEPTION 'Meeting not found' USING errcode = '42501'; END IF;
  UPDATE public.meeting_participants SET joined_at = coalesce(joined_at, now()) WHERE meeting_id = p_meeting AND user_id = auth.uid();
  UPDATE public.meetings SET started_at = coalesce(started_at, now()) WHERE id = p_meeting AND ended_at IS NULL;
END $$;
REVOKE ALL ON FUNCTION public.mark_meeting_joined(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_meeting_joined(uuid) TO authenticated;

-- Only the host ends a meeting. Ending stops all note taking for everyone.
CREATE OR REPLACE FUNCTION public.end_meeting(p_meeting uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.meetings WHERE id = p_meeting AND host_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only the host can end this meeting' USING errcode = '42501';
  END IF;
  UPDATE public.meetings SET ended_at = coalesce(ended_at, now()) WHERE id = p_meeting;
  UPDATE public.meeting_participants SET notes_consent = false WHERE meeting_id = p_meeting;
END $$;
REVOKE ALL ON FUNCTION public.end_meeting(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.end_meeting(uuid) TO authenticated;

-- ── Private call channel ───────────────────────────────────────────────────────────────
-- Realtime channel "meeting:<uuid>" (private): only that meeting's participants may
-- receive or send its connection signals and live captions.
CREATE OR REPLACE FUNCTION public.meeting_topic_id(p_topic text)
RETURNS uuid LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN p_topic ~* '^meeting:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              THEN substr(p_topic, 9)::uuid END
$$;
REVOKE ALL ON FUNCTION public.meeting_topic_id(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.meeting_topic_id(text) TO authenticated;

DROP POLICY IF EXISTS "meeting participants receive" ON realtime.messages;
CREATE POLICY "meeting participants receive" ON realtime.messages FOR SELECT TO authenticated
  USING (realtime.messages.extension IN ('broadcast', 'presence')
         AND public.is_meeting_participant(public.meeting_topic_id(realtime.topic())));
DROP POLICY IF EXISTS "meeting participants send" ON realtime.messages;
CREATE POLICY "meeting participants send" ON realtime.messages FOR INSERT TO authenticated
  WITH CHECK (realtime.messages.extension IN ('broadcast', 'presence')
              AND public.is_meeting_participant(public.meeting_topic_id(realtime.topic())));
