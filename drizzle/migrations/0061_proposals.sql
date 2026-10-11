CREATE TABLE IF NOT EXISTS member_storefronts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE UNIQUE,
  headline text,
  services jsonb DEFAULT '[]',
  seeking jsonb DEFAULT '[]',
  ideal_client text,
  intake_questions jsonb DEFAULT '[]',
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE member_storefronts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_storefronts" ON member_storefronts FOR SELECT USING (is_public = true OR user_id = auth.uid());
CREATE POLICY "owners_manage_storefront" ON member_storefronts FOR ALL USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  storefront_id uuid REFERENCES member_storefronts ON DELETE SET NULL,
  subject text NOT NULL,
  message text NOT NULL,
  answers jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','viewed','accepted','declined','countered')),
  counter_message text,
  viewed_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "proposal_parties_access" ON proposals FOR ALL USING (from_user_id = auth.uid() OR to_user_id = auth.uid());
