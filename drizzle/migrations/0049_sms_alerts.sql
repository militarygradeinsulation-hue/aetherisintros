-- Text alerts, staged: a member adds and confirms a mobile number, picks which alerts they
-- want by text (introductions, meetings, concierge, messages), and the app sends those
-- notifications as SMS through Twilio. Off until the site's Twilio keys are added.
CREATE TABLE public.member_phones (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_e164 text NOT NULL CHECK (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  verified_at timestamptz,
  code_hash text,
  code_expires_at timestamptz,
  code_attempts integer NOT NULL DEFAULT 0,
  codes_sent_today integer NOT NULL DEFAULT 0,
  codes_day date,
  sms_kinds text[] NOT NULL DEFAULT '{intros,meetings,concierge}'
    CHECK (sms_kinds <@ ARRAY['intros', 'meetings', 'concierge', 'messages']::text[]),
  sent_today integer NOT NULL DEFAULT 0,
  sent_day date,
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.member_phones FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.member_phones TO service_role;
-- Members see their number, whether it is confirmed and their choices; never the code.
GRANT SELECT (user_id, phone_e164, verified_at, sms_kinds, updated_at) ON public.member_phones TO authenticated;
GRANT UPDATE (sms_kinds) ON public.member_phones TO authenticated;
GRANT DELETE ON public.member_phones TO authenticated;
ALTER TABLE public.member_phones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own phone read" ON public.member_phones FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own phone choices" ON public.member_phones FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own phone remove" ON public.member_phones FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Which text-alert group a notification belongs to ('' = never sent by text).
CREATE OR REPLACE FUNCTION public.sms_group(p_kind text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_kind LIKE 'intro%' THEN 'intros'
    WHEN p_kind LIKE 'meeting%' THEN 'meetings'
    WHEN p_kind = 'concierge' THEN 'concierge'
    WHEN p_kind LIKE 'message%' THEN 'messages'
    ELSE '' END
$$;

-- Deliver new notifications by push and, when chosen, by text.
CREATE OR REPLACE FUNCTION public.push_new_notification() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_group text := public.sms_group(NEW.kind);
BEGIN
  IF EXISTS (SELECT 1 FROM public.push_subscriptions WHERE user_id = NEW.user_id)
     OR (v_group <> '' AND EXISTS (SELECT 1 FROM public.member_phones
           WHERE user_id = NEW.user_id AND verified_at IS NOT NULL AND v_group = ANY (sms_kinds))) THEN
    PERFORM public.call_app('/api/push/dispatch', jsonb_build_object('notification_id', NEW.id));
  END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.push_new_notification() FROM PUBLIC, anon, authenticated;
