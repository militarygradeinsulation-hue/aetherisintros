CREATE TABLE IF NOT EXISTS meeting_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  other_user_id uuid NOT NULL REFERENCES auth.users,
  generated_at timestamptz DEFAULT now(),
  their_background text,
  their_current_focus text,
  open_needs jsonb DEFAULT '[]',
  talking_points jsonb DEFAULT '[]',
  summary text
);
ALTER TABLE meeting_briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_see_own_briefs" ON meeting_briefs FOR ALL USING (user_id = auth.uid());
