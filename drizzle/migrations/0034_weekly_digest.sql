-- Weekly email digest: opt-in per member.
--
-- Members choose whether to receive "This week" by email every Monday. Off by default. Each
-- member has a private unsubscribe token so the link in every email turns it off without
-- signing in. The sender records when it last emailed someone so a retried run never sends
-- twice in a week. Only the service role (the digest sender) reads other members' settings.

CREATE TABLE public.email_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  weekly_digest boolean NOT NULL DEFAULT false,
  unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  last_digest_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER email_preferences_touch BEFORE UPDATE ON public.email_preferences FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

REVOKE ALL ON public.email_preferences FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.email_preferences TO service_role;
-- Members read their own row and switch the digest on or off; the token and the send log
-- stay server-owned.
GRANT SELECT (user_id, weekly_digest, last_digest_at) ON public.email_preferences TO authenticated;
GRANT INSERT (user_id, weekly_digest), UPDATE (weekly_digest) ON public.email_preferences TO authenticated;
ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own email preferences read" ON public.email_preferences FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own email preferences create" ON public.email_preferences FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own email preferences update" ON public.email_preferences FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
