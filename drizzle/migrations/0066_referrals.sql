CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users,
  referred_id uuid NOT NULL REFERENCES auth.users,
  referred_to_id uuid NOT NULL REFERENCES auth.users,
  source_deal_room_id uuid,
  personal_note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','connected','closed')),
  created_at timestamptz DEFAULT now(),
  connected_at timestamptz
);
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "referrer_sees_own" ON referrals FOR ALL USING (referrer_id = auth.uid());
CREATE POLICY "parties_see_referral" ON referrals FOR SELECT USING (referred_id = auth.uid() OR referred_to_id = auth.uid());

CREATE OR REPLACE FUNCTION create_referral(
  p_referred_id uuid, p_referred_to_id uuid, p_personal_note text, p_source_deal_room_id uuid DEFAULT NULL
) RETURNS referrals LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result referrals;
BEGIN
  INSERT INTO referrals (referrer_id, referred_id, referred_to_id, personal_note, source_deal_room_id)
  VALUES (auth.uid(), p_referred_id, p_referred_to_id, p_personal_note, p_source_deal_room_id)
  RETURNING * INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION get_my_referrals()
RETURNS TABLE(id uuid, referred_name text, referred_to_name text, personal_note text, status text, created_at timestamptz, connected_at timestamptz)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT r.id, p1.name as referred_name, p2.name as referred_to_name, r.personal_note, r.status, r.created_at, r.connected_at
  FROM referrals r JOIN profiles p1 ON p1.id = r.referred_id JOIN profiles p2 ON p2.id = r.referred_to_id
  WHERE r.referrer_id = auth.uid() ORDER BY r.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION mark_referral_connected(p_referral_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE referrals SET status = 'connected', connected_at = now()
  WHERE id = p_referral_id AND (referred_id = auth.uid() OR referred_to_id = auth.uid());
END;
$$;
