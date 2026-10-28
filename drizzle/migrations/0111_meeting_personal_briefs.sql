-- Personal attendee prep must not reuse the live shared public.meeting_briefs schema.
CREATE TABLE IF NOT EXISTS public.meeting_personal_briefs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
 other_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 their_background text NOT NULL DEFAULT '' CHECK (char_length(their_background)<=4000),
 their_current_focus text NOT NULL DEFAULT '' CHECK (char_length(their_current_focus)<=2000),
 open_needs jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(open_needs)='array' AND octet_length(open_needs::text)<=20000),
 talking_points jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(talking_points)='array' AND octet_length(talking_points::text)<=20000),
 summary text NOT NULL DEFAULT '' CHECK (char_length(summary)<=6000),
 generated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,meeting_id,other_user_id),
 CHECK(user_id<>other_user_id)
);
CREATE INDEX IF NOT EXISTS meeting_personal_briefs_owner_idx ON public.meeting_personal_briefs(user_id,meeting_id,generated_at DESC);
ALTER TABLE public.meeting_personal_briefs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.meeting_personal_briefs FROM PUBLIC, anon, authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.meeting_personal_briefs TO authenticated;
DROP POLICY IF EXISTS meeting_personal_briefs_select ON public.meeting_personal_briefs;
CREATE POLICY meeting_personal_briefs_select ON public.meeting_personal_briefs FOR SELECT TO authenticated
 USING (user_id=(select auth.uid()) AND public.is_meeting_participant(meeting_id));
DROP POLICY IF EXISTS meeting_personal_briefs_insert ON public.meeting_personal_briefs;
CREATE POLICY meeting_personal_briefs_insert ON public.meeting_personal_briefs FOR INSERT TO authenticated
 WITH CHECK (user_id=(select auth.uid()) AND public.is_meeting_participant(meeting_id)
 AND EXISTS(SELECT 1 FROM public.meeting_participants p WHERE p.meeting_id=meeting_personal_briefs.meeting_id AND p.user_id=meeting_personal_briefs.other_user_id));
DROP POLICY IF EXISTS meeting_personal_briefs_update ON public.meeting_personal_briefs;
CREATE POLICY meeting_personal_briefs_update ON public.meeting_personal_briefs FOR UPDATE TO authenticated
 USING (user_id=(select auth.uid()) AND public.is_meeting_participant(meeting_id))
 WITH CHECK (user_id=(select auth.uid()) AND public.is_meeting_participant(meeting_id)
 AND EXISTS(SELECT 1 FROM public.meeting_participants p WHERE p.meeting_id=meeting_personal_briefs.meeting_id AND p.user_id=meeting_personal_briefs.other_user_id));
DROP POLICY IF EXISTS meeting_personal_briefs_delete ON public.meeting_personal_briefs;
CREATE POLICY meeting_personal_briefs_delete ON public.meeting_personal_briefs FOR DELETE TO authenticated
 USING (user_id=(select auth.uid()) AND public.is_meeting_participant(meeting_id));
