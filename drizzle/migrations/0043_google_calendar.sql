-- Google Calendar connection: a member connects their own calendar so the app can see when
-- they met other members (attendee emails matched to member accounts) and show it privately
-- to them. Tokens are stored encrypted, readable by the server only. Gmail is not connected:
-- its read permission needs Google's restricted-scope security assessment first.

CREATE TABLE public.google_connections (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  google_email text NOT NULL DEFAULT '',
  scopes text[] NOT NULL DEFAULT '{}',
  refresh_token_enc text NOT NULL,
  connected_at timestamptz NOT NULL DEFAULT now(),
  last_sync_at timestamptz,
  last_error text NOT NULL DEFAULT ''
);
REVOKE ALL ON public.google_connections FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.google_connections TO service_role;
GRANT SELECT (user_id, google_email, scopes, connected_at, last_sync_at, last_error) ON public.google_connections TO authenticated;
GRANT DELETE ON public.google_connections TO authenticated;
ALTER TABLE public.google_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own google connection" ON public.google_connections FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own google disconnect" ON public.google_connections FOR DELETE TO authenticated USING (user_id = auth.uid());

-- What the member's own calendar says about each member they meet. Private to them.
CREATE TABLE public.relationship_signals (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('calendar')),
  last_at timestamptz,
  next_at timestamptz,
  count_90d integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, member_id, source)
);
REVOKE ALL ON public.relationship_signals FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.relationship_signals TO service_role;
GRANT SELECT, DELETE ON public.relationship_signals TO authenticated;
ALTER TABLE public.relationship_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own relationship signals" ON public.relationship_signals FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own relationship signals clear" ON public.relationship_signals FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Attendee emails to members, by the address each member confirmed when signing in
-- (never a self-entered profile field, so no one can claim someone else's meetings).
CREATE OR REPLACE FUNCTION public.member_ids_for_emails(p_emails text[])
RETURNS TABLE (email text, user_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT lower(u.email), u.id
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  WHERE u.email_confirmed_at IS NOT NULL
    AND lower(u.email) = ANY (SELECT lower(e) FROM unnest(p_emails[1:500]) e)
$$;
REVOKE ALL ON FUNCTION public.member_ids_for_emails(text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.member_ids_for_emails(text[]) TO service_role;

-- Daily calendar sync, run by the database's scheduler where available (0041).
DO $$
BEGIN
  IF to_regnamespace('cron') IS NOT NULL THEN
    PERFORM cron.schedule('ask-intros-google-sync', '23 5 * * *', $job$SELECT public.call_app('/api/cron/google-sync')$job$);
  END IF;
END $$;
