-- Messaging: read markers, unread counts and "Seen" receipts for direct messages.
-- Directory: one structured member search (industry, location, expertise, looking for,
-- verified only) plus filter facets that never reveal a value fewer than three members share.

-- =========================================================================================
-- Messaging settings: one row per member, created on first change. No row means defaults.
-- =========================================================================================
CREATE TABLE public.messaging_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  show_read_receipts boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.messaging_settings FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.messaging_settings TO service_role;
GRANT SELECT ON public.messaging_settings TO authenticated;
ALTER TABLE public.messaging_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own messaging settings" ON public.messaging_settings FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Internal: is a member sharing read receipts? (default on)
CREATE OR REPLACE FUNCTION public.dm_receipts_enabled(p_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce((SELECT s.show_read_receipts FROM public.messaging_settings s WHERE s.user_id = p_user), true)
$$;
REVOKE ALL ON FUNCTION public.dm_receipts_enabled(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dm_receipts_enabled(uuid) TO service_role;

-- Receipts are reciprocal: both people in the thread must have them on, and the caller must
-- be one of them.
CREATE OR REPLACE FUNCTION public.dm_thread_receipts_visible(p_thread_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dm_threads t
    WHERE t.id = p_thread_id AND auth.uid() IN (t.member_a, t.member_b)
      AND public.dm_receipts_enabled(t.member_a) AND public.dm_receipts_enabled(t.member_b)
  )
$$;
REVOKE ALL ON FUNCTION public.dm_thread_receipts_visible(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dm_thread_receipts_visible(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.set_read_receipts(p_on boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in first' USING ERRCODE = '42501'; END IF;
  IF p_on IS NULL THEN RAISE EXCEPTION 'Choose on or off' USING ERRCODE = '22023'; END IF;
  INSERT INTO public.messaging_settings (user_id, show_read_receipts, updated_at) VALUES (v_uid, p_on, now())
  ON CONFLICT (user_id) DO UPDATE SET show_read_receipts = excluded.show_read_receipts, updated_at = now();
  RETURN p_on;
END $$;
REVOKE ALL ON FUNCTION public.set_read_receipts(boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_read_receipts(boolean) TO authenticated, service_role;

-- =========================================================================================
-- Read markers: when each participant last read each thread. Written only by
-- mark_thread_read; your own marker is always readable, the other person's only while both
-- of you share receipts.
-- =========================================================================================
CREATE TABLE public.dm_thread_reads (
  thread_id uuid NOT NULL REFERENCES public.dm_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, user_id)
);
CREATE INDEX dm_thread_reads_user_idx ON public.dm_thread_reads (user_id);
REVOKE ALL ON public.dm_thread_reads FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.dm_thread_reads TO service_role;
GRANT SELECT ON public.dm_thread_reads TO authenticated;
ALTER TABLE public.dm_thread_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own read markers" ON public.dm_thread_reads FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.dm_threads t WHERE t.id = dm_thread_reads.thread_id AND auth.uid() IN (t.member_a, t.member_b)));
CREATE POLICY "peer read markers when receipts are shared" ON public.dm_thread_reads FOR SELECT TO authenticated
  USING (user_id <> auth.uid() AND public.dm_thread_receipts_visible(thread_id));

-- Existing conversations: treat everything up to your own last reply as read, so nobody
-- opens the app to a flood of old "unread" messages, and no read is claimed that the
-- conversation itself does not show.
INSERT INTO public.dm_thread_reads (thread_id, user_id, last_read_at)
SELECT m.thread_id, m.sender_id, max(m.created_at)
FROM public.dm_messages m
JOIN public.dm_threads t ON t.id = m.thread_id AND m.sender_id IN (t.member_a, t.member_b)
GROUP BY m.thread_id, m.sender_id
ON CONFLICT (thread_id, user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.mark_thread_read(p_thread_id uuid)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_peer uuid; v_at timestamptz;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in first' USING ERRCODE = '42501'; END IF;
  SELECT CASE WHEN t.member_a = v_uid THEN t.member_b ELSE t.member_a END INTO v_peer
  FROM public.dm_threads t WHERE t.id = p_thread_id AND v_uid IN (t.member_a, t.member_b);
  IF v_peer IS NULL THEN RAISE EXCEPTION 'Not your conversation' USING ERRCODE = '42501'; END IF;
  SELECT greatest(now(), coalesce(max(m.created_at), now())) INTO v_at FROM public.dm_messages m WHERE m.thread_id = p_thread_id;
  INSERT INTO public.dm_thread_reads AS r (thread_id, user_id, last_read_at) VALUES (p_thread_id, v_uid, v_at)
  ON CONFLICT (thread_id, user_id) DO UPDATE SET last_read_at = greatest(r.last_read_at, excluded.last_read_at);
  -- The "sent you a message" notifications from this person are now read too.
  UPDATE public.notifications SET read = true
  WHERE user_id = v_uid AND actor_id = v_peer AND kind = 'message' AND NOT read;
  RETURN v_at;
END $$;
REVOKE ALL ON FUNCTION public.mark_thread_read(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_thread_read(uuid) TO authenticated, service_role;

-- Per thread: messages from the other person since you last read it, and (only while both
-- of you share receipts) when they last read it and the latest of your messages that covers.
CREATE OR REPLACE FUNCTION public.my_unread_counts()
RETURNS TABLE (thread_id uuid, unread integer, peer_read_at timestamptz, seen_message_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (SELECT auth.uid() AS uid),
  threads AS (
    SELECT t.id, CASE WHEN t.member_a = me.uid THEN t.member_b ELSE t.member_a END AS peer, me.uid
    FROM public.dm_threads t, me
    WHERE me.uid IS NOT NULL AND me.uid IN (t.member_a, t.member_b)
  ),
  marked AS (
    SELECT th.id, th.peer, th.uid, mine.last_read_at AS my_read,
      CASE WHEN public.dm_receipts_enabled(th.uid) AND public.dm_receipts_enabled(th.peer) THEN theirs.last_read_at END AS peer_read
    FROM threads th
    LEFT JOIN public.dm_thread_reads mine ON mine.thread_id = th.id AND mine.user_id = th.uid
    LEFT JOIN public.dm_thread_reads theirs ON theirs.thread_id = th.id AND theirs.user_id = th.peer
  )
  SELECT k.id,
    (SELECT count(*)::int FROM public.dm_messages m
      WHERE m.thread_id = k.id AND m.sender_id <> k.uid AND m.created_at > coalesce(k.my_read, '-infinity'::timestamptz)),
    k.peer_read,
    (SELECT m.id FROM public.dm_messages m
      WHERE k.peer_read IS NOT NULL AND m.thread_id = k.id AND m.sender_id = k.uid AND m.created_at <= k.peer_read
      ORDER BY m.created_at DESC LIMIT 1)
  FROM marked k
$$;
REVOKE ALL ON FUNCTION public.my_unread_counts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.my_unread_counts() TO authenticated, service_role;

-- Live marker updates for the open conversation (Realtime applies the policies above).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'dm_thread_reads') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_thread_reads;
  END IF;
END $$;

-- =========================================================================================
-- Member directory search. Returns only fields members can already read on a profile
-- (never email or phone), only approved members who finished onboarding, and never anyone
-- whose profile visibility is 'private'.
-- =========================================================================================
CREATE OR REPLACE FUNCTION public.search_members(
  p_query text DEFAULT NULL,
  p_industries text[] DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_expertise text[] DEFAULT NULL,
  p_verified_only boolean DEFAULT false,
  p_limit int DEFAULT 30,
  p_offset int DEFAULT 0,
  p_looking_for text DEFAULT NULL
)
RETURNS TABLE (
  id uuid, name text, initials text, title text, company text, location text,
  industries text[], expertise text[], can_help_with text, looking_for text,
  avatar_url text, verified boolean, total_count bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
DECLARE
  v_q text; v_loc text; v_lf text; v_ind text[]; v_exp text[]; v_lim int; v_off int;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_live_member() THEN
    RAISE EXCEPTION 'The directory is for verified members' USING ERRCODE = '42501';
  END IF;
  IF length(coalesce(p_query, '')) > 200 OR length(coalesce(p_location, '')) > 120 OR length(coalesce(p_looking_for, '')) > 200
     OR coalesce(cardinality(p_industries), 0) > 20 OR coalesce(cardinality(p_expertise), 0) > 20 THEN
    RAISE EXCEPTION 'Search is too long' USING ERRCODE = '22023';
  END IF;
  v_q := nullif(lower(btrim(coalesce(p_query, ''))), '');
  v_loc := nullif(lower(btrim(coalesce(p_location, ''))), '');
  v_lf := nullif(lower(btrim(coalesce(p_looking_for, ''))), '');
  SELECT array_agg(DISTINCT lower(btrim(x))) INTO v_ind FROM unnest(coalesce(p_industries, '{}'::text[])) x WHERE btrim(x) <> '' AND length(x) <= 80;
  SELECT array_agg(DISTINCT lower(btrim(x))) INTO v_exp FROM unnest(coalesce(p_expertise, '{}'::text[])) x WHERE btrim(x) <> '' AND length(x) <= 80;
  v_lim := least(greatest(coalesce(p_limit, 30), 1), 100);
  v_off := least(greatest(coalesce(p_offset, 0), 0), 10000);

  RETURN QUERY
  SELECT p.id, p.name, coalesce(p.initials, ''), coalesce(p.title, ''), coalesce(p.company, ''), coalesce(p.location, ''),
    coalesce(p.industries, '{}'::text[]), coalesce(p.expertise, '{}'::text[]), coalesce(p.can_help_with, ''), coalesce(p.looking_for, ''),
    p.avatar_url, p.verified_at IS NOT NULL, count(*) OVER ()
  FROM public.profiles p
  WHERE public.is_approved_member(p.id)
    AND p.onboarded
    AND coalesce(p.visibility, 'network') <> 'private'
    AND (v_q IS NULL OR strpos(lower(concat_ws(' ', p.name, p.title, p.company, p.location, p.can_help_with, p.looking_for,
          array_to_string(coalesce(p.industries, '{}'::text[]), ' '), array_to_string(coalesce(p.expertise, '{}'::text[]), ' '))), v_q) > 0)
    AND (v_ind IS NULL OR EXISTS (SELECT 1 FROM unnest(coalesce(p.industries, '{}'::text[])) i WHERE lower(btrim(i)) = ANY (v_ind)))
    AND (v_loc IS NULL OR strpos(lower(coalesce(p.location, '')), v_loc) > 0)
    AND (v_exp IS NULL
         OR EXISTS (SELECT 1 FROM unnest(coalesce(p.expertise, '{}'::text[])) e WHERE lower(btrim(e)) = ANY (v_exp))
         OR EXISTS (SELECT 1 FROM unnest(v_exp) x WHERE strpos(lower(coalesce(p.can_help_with, '')), x) > 0))
    AND (v_lf IS NULL OR strpos(lower(coalesce(p.looking_for, '')), v_lf) > 0)
    AND (NOT coalesce(p_verified_only, false) OR p.verified_at IS NOT NULL)
  ORDER BY (p.verified_at IS NOT NULL) DESC, lower(p.name), p.id
  LIMIT v_lim OFFSET v_off;
END $$;
REVOKE ALL ON FUNCTION public.search_members(text, text[], text, text[], boolean, int, int, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_members(text, text[], text, text[], boolean, int, int, text) TO authenticated, service_role;

-- Filter choices: the most common industries, locations and areas of expertise among the
-- members search can show, each with how many members share it. Values shared by fewer than
-- three members are left out, so a filter can never single someone out.
CREATE OR REPLACE FUNCTION public.member_directory_facets()
RETURNS TABLE (kind text, value text, members integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH visible AS (
    SELECT p.id, p.location, coalesce(p.industries, '{}'::text[]) AS industries, coalesce(p.expertise, '{}'::text[]) AS expertise
    FROM public.profiles p
    WHERE auth.uid() IS NOT NULL AND public.is_live_member()
      AND public.is_approved_member(p.id) AND p.onboarded AND coalesce(p.visibility, 'network') <> 'private'
  ),
  vals AS (
    SELECT 'industry'::text AS kind, btrim(i) AS v, vis.id FROM visible vis, unnest(vis.industries) i
    UNION ALL SELECT 'location', btrim(coalesce(vis.location, '')), vis.id FROM visible vis
    UNION ALL SELECT 'expertise', btrim(e), vis.id FROM visible vis, unnest(vis.expertise) e
  ),
  counted AS (
    SELECT vals.kind, min(vals.v) AS value, count(DISTINCT vals.id)::int AS members
    FROM vals WHERE vals.v <> '' AND length(vals.v) <= 80
    GROUP BY vals.kind, lower(vals.v)
    HAVING count(DISTINCT vals.id) >= 3
  ),
  ranked AS (
    SELECT c.*, row_number() OVER (PARTITION BY c.kind ORDER BY c.members DESC, c.value) AS rn FROM counted c
  )
  SELECT r.kind, r.value, r.members FROM ranked r WHERE r.rn <= 30 ORDER BY r.kind, r.members DESC, r.value
$$;
REVOKE ALL ON FUNCTION public.member_directory_facets() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.member_directory_facets() TO authenticated, service_role;
