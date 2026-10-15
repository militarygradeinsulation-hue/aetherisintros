-- Private AI-generated pre-meeting briefs.
CREATE TABLE public.meeting_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  other_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  generated_at timestamptz NOT NULL DEFAULT now(),
  their_background text NOT NULL DEFAULT '' CHECK (char_length(their_background) <= 4000),
  their_current_focus text NOT NULL DEFAULT '' CHECK (char_length(their_current_focus) <= 2000),
  open_needs jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(open_needs) = 'array' AND octet_length(open_needs::text) <= 20000),
  talking_points jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(talking_points) = 'array' AND octet_length(talking_points::text) <= 20000),
  summary text NOT NULL DEFAULT '' CHECK (char_length(summary) <= 6000),
  CHECK (user_id <> other_user_id)
);
CREATE INDEX meeting_briefs_owner_pair_idx ON public.meeting_briefs (user_id, other_user_id, generated_at DESC);

REVOKE ALL ON public.meeting_briefs FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.meeting_briefs TO service_role;
GRANT SELECT, INSERT, DELETE ON public.meeting_briefs TO authenticated;
ALTER TABLE public.meeting_briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read own meeting briefs" ON public.meeting_briefs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "members create own meeting briefs" ON public.meeting_briefs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "members delete own meeting briefs" ON public.meeting_briefs FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.meeting_briefs_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.user_id := auth.uid();
  NEW.generated_at := now();
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.meeting_briefs_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER meeting_briefs_guard BEFORE INSERT ON public.meeting_briefs FOR EACH ROW EXECUTE FUNCTION public.meeting_briefs_guard();
