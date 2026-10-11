CREATE TABLE IF NOT EXISTS track_record_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('deal_closed','milestone_delivered','intro_led_to_deal','service_delivered')),
  title text NOT NULL,
  counterparty_name text,
  counterparty_user_id uuid REFERENCES auth.users,
  deal_room_id uuid,
  value_low int,
  value_high int,
  currency text DEFAULT 'USD',
  description text,
  verified boolean DEFAULT false,
  public boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE track_record_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners_see_own" ON track_record_entries FOR ALL USING (user_id = auth.uid());
CREATE POLICY "public_entries_visible" ON track_record_entries FOR SELECT USING (
  public = true AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND onboarded = true)
);
CREATE OR REPLACE FUNCTION get_track_record(target_user_id uuid)
RETURNS SETOF track_record_entries LANGUAGE sql SECURITY DEFINER AS $$
  SELECT * FROM track_record_entries WHERE user_id = target_user_id AND public = true ORDER BY created_at DESC;
$$;
CREATE OR REPLACE FUNCTION add_track_record_entry(
  p_kind text, p_title text, p_counterparty_name text, p_description text, p_public boolean DEFAULT true
) RETURNS track_record_entries LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result track_record_entries;
BEGIN
  INSERT INTO track_record_entries (user_id, kind, title, counterparty_name, description, public)
  VALUES (auth.uid(), p_kind, p_title, p_counterparty_name, p_description, p_public)
  RETURNING * INTO result;
  RETURN result;
END;
$$;
