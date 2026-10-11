CREATE TABLE IF NOT EXISTS storefronts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE UNIQUE,
  headline text NOT NULL,
  bio text,
  tagline text,
  published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS storefront_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storefront_id uuid NOT NULL REFERENCES storefronts(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  deliverables text,
  price_low int,
  price_high int,
  currency text DEFAULT 'USD',
  duration_label text,
  category text,
  active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE storefronts ENABLE ROW LEVEL SECURITY;
ALTER TABLE storefront_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners_manage_storefront" ON storefronts FOR ALL USING (user_id = auth.uid());
CREATE POLICY "members_see_published" ON storefronts FOR SELECT USING (
  published = true AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND onboarded = true)
);
CREATE POLICY "owners_manage_services" ON storefront_services FOR ALL USING (
  EXISTS (SELECT 1 FROM storefronts WHERE id = storefront_id AND user_id = auth.uid())
);
CREATE POLICY "members_see_active_services" ON storefront_services FOR SELECT USING (
  active = true AND EXISTS (SELECT 1 FROM storefronts WHERE id = storefront_id AND published = true)
);
CREATE OR REPLACE FUNCTION upsert_storefront(p_headline text, p_bio text, p_tagline text, p_published boolean DEFAULT false)
RETURNS storefronts LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result storefronts;
BEGIN
  INSERT INTO storefronts (user_id, headline, bio, tagline, published)
  VALUES (auth.uid(), p_headline, p_bio, p_tagline, p_published)
  ON CONFLICT (user_id) DO UPDATE SET headline=EXCLUDED.headline, bio=EXCLUDED.bio, tagline=EXCLUDED.tagline, published=EXCLUDED.published, updated_at=now()
  RETURNING * INTO result;
  RETURN result;
END;
$$;
CREATE OR REPLACE FUNCTION list_published_storefronts(p_category text DEFAULT NULL)
RETURNS TABLE(storefront_id uuid, user_id uuid, headline text, bio text, tagline text, name text, initials text, title text, service_count bigint)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT s.id, s.user_id, s.headline, s.bio, s.tagline, p.name, p.initials, p.title,
    COUNT(ss.id) as service_count
  FROM storefronts s
  JOIN profiles p ON p.id = s.user_id
  LEFT JOIN storefront_services ss ON ss.storefront_id = s.id AND ss.active = true
  WHERE s.published = true
  GROUP BY s.id, p.name, p.initials, p.title
  ORDER BY s.updated_at DESC;
$$;
