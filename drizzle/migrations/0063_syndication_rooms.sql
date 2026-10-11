CREATE TABLE IF NOT EXISTS syndication_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title text NOT NULL,
  room_type text NOT NULL DEFAULT 'co-invest' CHECK (room_type IN ('co-invest','co-sponsor','co-refer','other')),
  description text,
  opportunity_size text,
  deadline date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','decided','closed')),
  decision text,
  created_at timestamptz DEFAULT now(),
  closed_at timestamptz
);
ALTER TABLE syndication_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "room_members_access" ON syndication_rooms FOR ALL USING (
  created_by = auth.uid() OR
  EXISTS (SELECT 1 FROM syndication_members WHERE room_id = syndication_rooms.id AND user_id = auth.uid())
);

CREATE TABLE IF NOT EXISTS syndication_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES syndication_rooms ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  vote text CHECK (vote IN ('in','out','need_more_info')),
  vote_note text,
  voted_at timestamptz,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(room_id, user_id)
);
ALTER TABLE syndication_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_see_room_members" ON syndication_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM syndication_rooms WHERE id = room_id AND (created_by = auth.uid() OR EXISTS (SELECT 1 FROM syndication_members sm2 WHERE sm2.room_id = room_id AND sm2.user_id = auth.uid())))
);
CREATE POLICY "own_membership" ON syndication_members FOR ALL USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS syndication_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES syndication_rooms ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE syndication_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "room_members_read_messages" ON syndication_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM syndication_members WHERE room_id = syndication_messages.room_id AND user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM syndication_rooms WHERE id = room_id AND created_by = auth.uid())
);
CREATE POLICY "room_members_post" ON syndication_messages FOR INSERT WITH CHECK (
  user_id = auth.uid() AND (
    EXISTS (SELECT 1 FROM syndication_members WHERE room_id = syndication_messages.room_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM syndication_rooms WHERE id = room_id AND created_by = auth.uid())
  )
);
