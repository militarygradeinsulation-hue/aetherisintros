-- Explicit member-to-member referrals. Separate from automatic warm-path suggestions.
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_to_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_deal_room_id uuid REFERENCES public.deal_rooms(id) ON DELETE SET NULL,
  personal_note text NOT NULL DEFAULT '' CHECK (char_length(personal_note) <= 1500),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','connected','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  connected_at timestamptz,
  CHECK (referrer_id <> referred_id AND referrer_id <> referred_to_id AND referred_id <> referred_to_id)
);
CREATE INDEX referrals_referrer_idx ON public.referrals (referrer_id, created_at DESC);
CREATE INDEX referrals_party_idx ON public.referrals (referred_id, referred_to_id);

REVOKE ALL ON public.referrals FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.referrals TO service_role;
GRANT SELECT ON public.referrals TO authenticated;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "referral parties read" ON public.referrals FOR SELECT TO authenticated
  USING (auth.uid() IN (referrer_id, referred_id, referred_to_id));

CREATE OR REPLACE FUNCTION public.create_referral(
  p_referred_id uuid, p_referred_to_id uuid, p_personal_note text, p_source_deal_room_id uuid DEFAULT NULL
) RETURNS public.referrals LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result public.referrals;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING errcode = '42501'; END IF;
  IF p_referred_id = auth.uid() OR p_referred_to_id = auth.uid() OR p_referred_id = p_referred_to_id THEN
    RAISE EXCEPTION 'Referral parties must be distinct' USING errcode = '22023';
  END IF;
  IF NOT public.is_approved_member(p_referred_id) OR NOT public.is_approved_member(p_referred_to_id) THEN
    RAISE EXCEPTION 'Referral target is not an active member' USING errcode = '22023';
  END IF;
  INSERT INTO public.referrals (referrer_id, referred_id, referred_to_id, personal_note, source_deal_room_id)
  VALUES (auth.uid(), p_referred_id, p_referred_to_id, left(coalesce(p_personal_note,''),1500), p_source_deal_room_id)
  RETURNING * INTO result;
  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.get_my_referrals()
RETURNS TABLE(id uuid, referred_name text, referred_to_name text, personal_note text, status text, created_at timestamptz, connected_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, p1.name, p2.name, r.personal_note, r.status, r.created_at, r.connected_at
  FROM public.referrals r
  JOIN public.profiles p1 ON p1.id = r.referred_id
  JOIN public.profiles p2 ON p2.id = r.referred_to_id
  WHERE r.referrer_id = auth.uid()
  ORDER BY r.created_at DESC
$$;

CREATE OR REPLACE FUNCTION public.mark_referral_connected(p_referral_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.referrals
     SET status = 'connected', connected_at = coalesce(connected_at, now())
   WHERE id = p_referral_id AND auth.uid() IN (referred_id, referred_to_id);
  IF NOT FOUND THEN RAISE EXCEPTION 'Referral not found or not yours' USING errcode = '42501'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.create_referral(uuid,uuid,text,uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_referrals() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_referral_connected(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_referral(uuid,uuid,text,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_referrals() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_referral_connected(uuid) TO authenticated;
