-- Growth: phone push notifications, scheduled jobs run by the database, and referrals.
--
-- Push: members who turn notifications on store their browser's push subscription. When a
-- notification is created, the database asks the app (POST /api/push/dispatch, pg_net) to
-- deliver it as a phone/desktop push. The app's push keys and the shared secret it checks
-- live in app_settings, readable by the server (service role) only.
--
-- Scheduled jobs: with pg_cron, the database calls the app's own job endpoints (weekly digest,
-- membership card emails), so no outside scheduler or extra secrets are needed. Both need
-- app_settings.app_url (the site's address); until it is set they do nothing.
--
-- pg_net and pg_cron are switched on here when the database offers them; where it does not
-- (local test databases), everything else still applies and push/jobs simply stay off.

CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.app_settings FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO public.app_settings (key, value) VALUES
  ('app_url', ''),
  ('dispatch_secret', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
ON CONFLICT (key) DO NOTHING;

CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE CHECK (endpoint ~ '^https://' AND char_length(endpoint) <= 1000),
  p256dh text NOT NULL CHECK (char_length(p256dh) BETWEEN 40 AND 200),
  auth text NOT NULL CHECK (char_length(auth) BETWEEN 10 AND 100),
  user_agent text NOT NULL DEFAULT '' CHECK (char_length(user_agent) <= 300),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_sent_at timestamptz
);
CREATE INDEX push_subscriptions_user_idx ON public.push_subscriptions (user_id);
REVOKE ALL ON public.push_subscriptions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
GRANT SELECT, DELETE ON public.push_subscriptions TO authenticated;
GRANT INSERT (endpoint, p256dh, auth, user_agent) ON public.push_subscriptions TO authenticated;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own push subscriptions read" ON public.push_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own push subscriptions add" ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own push subscriptions remove" ON public.push_subscriptions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Turn on outbound requests and schedules where the database supports them.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_net') THEN
    CREATE EXTENSION IF NOT EXISTS pg_net;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  END IF;
END $$;

-- Ask the app to run something (deliver a push, run a job). Does nothing until app_url is set
-- or where outbound requests are unavailable. Never raises: a failed call must not undo the
-- change that triggered it.
CREATE OR REPLACE FUNCTION public.call_app(p_path text, p_body jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_url text; v_secret text;
BEGIN
  SELECT value INTO v_url FROM public.app_settings WHERE key = 'app_url';
  SELECT value INTO v_secret FROM public.app_settings WHERE key = 'dispatch_secret';
  IF coalesce(v_url, '') = '' OR to_regnamespace('net') IS NULL THEN RETURN; END IF;
  EXECUTE 'SELECT net.http_post(url := $1, body := $2, headers := $3, timeout_milliseconds := 5000)'
    USING rtrim(v_url, '/') || p_path, p_body,
          jsonb_build_object('content-type', 'application/json', 'x-dispatch-secret', v_secret);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'call_app(%) failed: %', p_path, SQLERRM;
END $$;
REVOKE ALL ON FUNCTION public.call_app(text, jsonb) FROM PUBLIC, anon, authenticated;

-- A new notification for someone with push turned on is delivered to their devices.
CREATE OR REPLACE FUNCTION public.push_new_notification() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.push_subscriptions WHERE user_id = NEW.user_id) THEN
    PERFORM public.call_app('/api/push/dispatch', jsonb_build_object('notification_id', NEW.id));
  END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.push_new_notification() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS notifications_push ON public.notifications;
CREATE TRIGGER notifications_push AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.push_new_notification();

-- Schedules (when pg_cron is available): membership card emails every 15 minutes, the weekly
-- digest on Mondays at 12:07 UTC.
DO $$
BEGIN
  IF to_regnamespace('cron') IS NOT NULL THEN
    PERFORM cron.schedule('ask-intros-membership-cards', '*/15 * * * *', $job$SELECT public.call_app('/api/cron/membership-cards')$job$);
    PERFORM cron.schedule('ask-intros-weekly-digest', '7 12 * * 1', $job$SELECT public.call_app('/api/cron/weekly-digest')$job$);
  END IF;
END $$;

-- Referrals: who joined with my invite link, and how far they have got.
CREATE OR REPLACE FUNCTION public.my_referrals()
RETURNS TABLE (member_id uuid, name text, joined_at timestamptz, approved boolean, verified boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.user_id, coalesce(nullif(btrim(p.name), ''), 'New member'), coalesce(p.created_at, e.created_at),
         e.status = 'approved',
         EXISTS (SELECT 1 FROM public.member_verifications v WHERE v.user_id = e.user_id AND v.status = 'verified')
    FROM public.early_access_members e
    JOIN public.invitations i ON i.id = e.invite_id
    LEFT JOIN public.profiles p ON p.id = e.user_id
   WHERE i.created_by = auth.uid() AND e.user_id IS DISTINCT FROM auth.uid()
   ORDER BY coalesce(p.created_at, e.created_at) DESC
$$;
REVOKE ALL ON FUNCTION public.my_referrals() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_referrals() TO authenticated;
