-- reputation_scores: computed scores cached per member
CREATE TABLE IF NOT EXISTS reputation_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE UNIQUE,
  score integer NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  response_rate numeric(5,2) DEFAULT 0,
  intro_success_rate numeric(5,2) DEFAULT 0,
  follow_through_rate numeric(5,2) DEFAULT 0,
  total_intros integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE reputation_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_scores" ON reputation_scores FOR SELECT USING (true);
CREATE POLICY "users_update_own_score" ON reputation_scores FOR ALL USING (user_id = auth.uid());

-- outcome_reactions: peers can vouch for outcomes
CREATE TABLE IF NOT EXISTS outcome_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outcome_id uuid NOT NULL REFERENCES intro_outcomes ON DELETE CASCADE,
  reactor_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  reaction text NOT NULL CHECK (reaction IN ('verified','skeptical','amazing')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(outcome_id, reactor_id)
);
ALTER TABLE outcome_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_reactions" ON outcome_reactions FOR SELECT USING (true);
CREATE POLICY "auth_react" ON outcome_reactions FOR ALL USING (reactor_id = auth.uid());
