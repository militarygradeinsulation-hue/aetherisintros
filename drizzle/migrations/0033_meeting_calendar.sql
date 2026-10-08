-- Scheduled meetings appear in each participant's own calendar.
--
-- When someone is added to a meeting that has a scheduled time, a calendar entry is created
-- in their calendar (owned by them, so they can move or delete it like any other entry) and
-- linked to the meeting so the Calendar page can offer "Join". One entry per person per meeting.

ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS meeting_id uuid REFERENCES public.meetings(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS calendar_events_meeting_user_idx ON public.calendar_events (meeting_id, user_id) WHERE meeting_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.meeting_participant_calendar()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m public.meetings;
BEGIN
  SELECT * INTO m FROM public.meetings WHERE id = NEW.meeting_id;
  IF m.scheduled_for IS NULL OR m.ended_at IS NOT NULL THEN RETURN NEW; END IF;
  PERFORM set_config('app.meeting_calendar', 'on', true);
  INSERT INTO public.calendar_events (user_id, title, notes, location, kind, starts_at, ends_at, all_day, meeting_id)
  VALUES (
    NEW.user_id, m.title,
    left(concat_ws(E'\n\n', 'Video meeting on Ask Intros. Open Meetings to join.', nullif(m.agenda, '')), 4000),
    'Ask Intros video', 'meeting', m.scheduled_for, m.scheduled_for + interval '45 minutes', false, m.id)
  ON CONFLICT DO NOTHING;
  PERFORM set_config('app.meeting_calendar', 'off', true);
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.meeting_participant_calendar() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS meeting_participants_calendar ON public.meeting_participants;
CREATE TRIGGER meeting_participants_calendar AFTER INSERT ON public.meeting_participants
  FOR EACH ROW EXECUTE FUNCTION public.meeting_participant_calendar();

-- The link to a meeting is set by the database only.
CREATE OR REPLACE FUNCTION public.calendar_events_meeting_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND coalesce(current_setting('app.meeting_calendar', true), '') <> 'on' THEN
    IF TG_OP = 'INSERT' THEN NEW.meeting_id := NULL;
    ELSE NEW.meeting_id := OLD.meeting_id; END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.calendar_events_meeting_guard() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS calendar_events_meeting_guard ON public.calendar_events;
CREATE TRIGGER calendar_events_meeting_guard BEFORE INSERT OR UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.calendar_events_meeting_guard();
