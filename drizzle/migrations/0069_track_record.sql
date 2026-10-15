-- Member track record: self-stated evidence is allowed, but verification is server-owned.
CREATE TABLE public.track_record_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('deal_closed','milestone_delivered','intro_led_to_deal','service_delivered')),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 3 AND 180),
  counterparty_name text CHECK (counterparty_name IS NULL OR char_length(counterparty_name) <= 200),
  counterparty_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  deal_room_id uuid REFERENCES public.deal_rooms(id) ON DELETE SET NULL,
  value_low bigint CHECK (value_low IS NULL OR value_low BETWEEN 0 AND 1000000000000),
  value_high bigint CHECK (value_high IS NULL OR value_high BETWEEN 0 AND 1000000000000),
  currency text NOT NULL DEFAULT 'USD' CHECK (currency ~ '^[A-Z]{3}$'),
  description text CHECK (description IS NULL OR char_length(description) <= 4000),
  verified boolean NOT NULL DEFAULT false,
  public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (value_low IS NULL OR value_high IS NULL OR value_high >= value_low)
);
CREATE INDEX track_record_entries_user_idx ON public.track_record_entries (user_id, created_at DESC);
CREATE INDEX track_record_entries_deal_idx ON public.track_record_entries (deal_room_id) WHERE deal_room_id IS NOT NULL;

REVOKE ALL ON public.track_record_entries FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.track_record_entries TO service_role;
GRANT SELECT, INSERT, DELETE ON public.track_record_entries TO authenticated;
GRANT UPDATE (kind, title, counterparty_name, counterparty_user_id, deal_room_id, value_low, value_high, currency, description, public)
  ON public.track_record_entries TO authenticated;
ALTER TABLE public.track_record_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners read track record" ON public.track_record_entries FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "members read public track record" ON public.track_record_entries FOR SELECT TO authenticated
  USING (public AND public.is_live_member());
CREATE POLICY "owners add track record" ON public.track_record_entries FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND verified = false);
CREATE POLICY "owners edit unverified track record" ON public.track_record_entries FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND verified = false)
  WITH CHECK (user_id = auth.uid() AND verified = false);
CREATE POLICY "owners delete track record" ON public.track_record_entries FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.track_record_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.user_id := auth.uid();
    NEW.verified := false;
  ELSIF auth.uid() IS NOT NULL AND (NEW.user_id, NEW.verified) IS DISTINCT FROM (OLD.user_id, OLD.verified) THEN
    RAISE EXCEPTION 'Track record ownership and verification are server-managed' USING errcode = '42501';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.track_record_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER track_record_guard BEFORE INSERT OR UPDATE ON public.track_record_entries FOR EACH ROW EXECUTE FUNCTION public.track_record_guard();
