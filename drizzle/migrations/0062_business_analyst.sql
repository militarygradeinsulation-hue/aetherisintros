CREATE TABLE IF NOT EXISTS business_diagnostics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  generated_at timestamptz DEFAULT now(),
  model_used text,
  lead_leaks jsonb DEFAULT '[]',
  cold_relationships jsonb DEFAULT '[]',
  partner_needs jsonb DEFAULT '[]',
  top_opportunities jsonb DEFAULT '[]',
  health_score int DEFAULT 50,
  summary text
);
ALTER TABLE business_diagnostics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_see_own_diagnostics" ON business_diagnostics FOR ALL USING (user_id = auth.uid());
