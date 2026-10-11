CREATE TABLE IF NOT EXISTS referral_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  for_user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  connector_user_id uuid REFERENCES auth.users ON DELETE SET NULL,
  path_explanation text NOT NULL,
  shared_context text,
  strength_score integer DEFAULT 50 CHECK (strength_score >= 0 AND strength_score <= 100),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','acted_on','dismissed','snoozed')),
  snoozed_until timestamptz,
  generated_at timestamptz DEFAULT now(),
  acted_at timestamptz
);
ALTER TABLE referral_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_suggestions" ON referral_suggestions FOR ALL USING (for_user_id = auth.uid());

CREATE TABLE IF NOT EXISTS referral_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id uuid REFERENCES referral_suggestions ON DELETE SET NULL,
  requester_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  connector_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','completed')),
  created_at timestamptz DEFAULT now(),
  responded_at timestamptz
);
ALTER TABLE referral_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "referral_parties_access" ON referral_requests FOR ALL USING (requester_id = auth.uid() OR connector_id = auth.uid());
