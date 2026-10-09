-- Warm Path Finder: "who can get me to this person or company, and how warm is each path?"
--
-- find_warm_paths ranks paths of one or two hops: me → target, or me → connector → target.
-- The first hop (me → someone) may use the caller's own private facts: their own calendar
-- signals, meetings they attended, introductions they were part of. The second hop
-- (connector → target) uses only facts members can already see or that are shown as a coarse
-- band: the connection exists, the connector is verified, and how often they accept intro
-- requests (high / medium / low, never the counts). Another member's private signals are
-- never read. Suspended or rejected members, members who declined the caller, and members who
-- asked not to be suggested as a connector are left out.
--
-- The company-name normaliser is mirrored in src/aetheris/warm-paths.ts; keep them in step.

CREATE OR REPLACE FUNCTION public.normalize_company_name(p text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT btrim(regexp_replace(
           btrim(regexp_replace(regexp_replace(regexp_replace(lower(coalesce(p, '')),
             '[.,''’]', '', 'g'),
             '[&+/():;!"–—-]', ' ', 'g'),
             '\s+', ' ', 'g')),
           '(\s(inc|incorporated|llc|llp|lp|ltd|limited|corp|corporation|co|company|plc|gmbh|ag|sa))+$', ''))
$$;
GRANT EXECUTE ON FUNCTION public.normalize_company_name(text) TO authenticated, service_role;

-- Members who would rather not be suggested as a connector. Private to the member.
CREATE TABLE public.warm_path_optouts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.warm_path_optouts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.warm_path_optouts TO service_role;
GRANT SELECT, DELETE ON public.warm_path_optouts TO authenticated;
GRANT INSERT (user_id) ON public.warm_path_optouts TO authenticated;
ALTER TABLE public.warm_path_optouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own warm path opt-out read" ON public.warm_path_optouts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own warm path opt-out add" ON public.warm_path_optouts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own warm path opt-out remove" ON public.warm_path_optouts FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Two members are connected when either side recorded a connection.
CREATE OR REPLACE FUNCTION public.wp_connected(p_a uuid, p_b uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.follows f WHERE f.kind = 'connection'
                   AND ((f.follower_id = p_a AND f.followee_id = p_b) OR (f.follower_id = p_b AND f.followee_id = p_a)))
      OR EXISTS (SELECT 1 FROM public.relationships r WHERE r.kind = 'connection'
                   AND ((r.user_id = p_a AND r.member_id = p_b::text) OR (r.user_id = p_b AND r.member_id = p_a::text)))
$$;
REVOKE ALL ON FUNCTION public.wp_connected(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wp_connected(uuid, uuid) TO service_role;

-- How often someone accepts intro requests, as a band. Fewer than 3 decisions: unknown.
CREATE OR REPLACE FUNCTION public.wp_response_band(p_accepted int, p_decided int)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN coalesce(p_decided, 0) < 3 THEN 'unknown'
              WHEN p_accepted * 4 >= p_decided * 3 THEN 'high'
              WHEN p_accepted * 5 >= p_decided * 2 THEN 'medium'
              ELSE 'low' END
$$;
GRANT EXECUTE ON FUNCTION public.wp_response_band(int, int) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.wp_warmth(p_score int)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN p_score >= 60 THEN 'hot' WHEN p_score >= 35 THEN 'warm' ELSE 'cool' END
$$;
GRANT EXECUTE ON FUNCTION public.wp_warmth(int) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.find_warm_paths(p_target_member uuid DEFAULT NULL, p_company text DEFAULT NULL, p_limit int DEFAULT 10)
RETURNS TABLE (
  kind text, target_id uuid, target_name text, target_title text, target_company text,
  connector_id uuid, connector_name text, score int, band text, reasons text[], connector_reasons text[]
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me uuid := auth.uid();
  v_limit int := least(greatest(coalesce(p_limit, 10), 1), 25);
  v_company text := public.normalize_company_name(left(coalesce(p_company, ''), 200));
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Sign in to find warm paths' USING errcode = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_me) THEN
    RAISE EXCEPTION 'Members only' USING errcode = '42501';
  END IF;
  IF p_target_member IS NULL AND v_company = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH hidden AS (
    SELECT v.user_id FROM public.member_verifications v WHERE v.status IN ('rejected', 'suspended')
  ),
  declined_me AS (
    SELECT i.target_user_id AS id FROM public.intro_requests i
     WHERE i.user_id = v_me AND i.status = 'declined' AND i.target_user_id IS NOT NULL
  ),
  people AS (
    SELECT p.id, coalesce(nullif(btrim(p.name), ''), 'A member') AS name, coalesce(p.title, '') AS title, coalesce(p.company, '') AS company
      FROM public.profiles p
     WHERE p.id <> v_me
       AND p.id NOT IN (SELECT user_id FROM hidden)
       AND p.id NOT IN (SELECT id FROM declined_me)
  ),
  tg AS (
    SELECT pe.* FROM people pe
     WHERE (p_target_member IS NOT NULL AND pe.id = p_target_member)
        OR (p_target_member IS NULL AND (
              public.normalize_company_name(pe.company) = v_company
              OR EXISTS (SELECT 1 FROM public.directory_contacts dc
                          WHERE dc.user_id = pe.id AND public.normalize_company_name(dc.company_name) = v_company)))
     LIMIT 50
  ),
  cand AS (
    SELECT pe.* FROM people pe
     WHERE NOT EXISTS (SELECT 1 FROM public.warm_path_optouts o WHERE o.user_id = pe.id)
  ),
  -- First hop facts: the caller's own relationship with each person.
  mine AS (
    SELECT pe.id,
           public.wp_connected(v_me, pe.id) AS conn,
           EXISTS (SELECT 1 FROM public.intro_requests i
                    WHERE i.requester_opt_in AND i.member_opt_in
                      AND ((i.user_id = v_me AND i.target_user_id = pe.id) OR (i.user_id = pe.id AND i.target_user_id = v_me))) AS intro,
           (SELECT count(DISTINCT m.id) FROM public.meetings m
              JOIN public.meeting_participants a ON a.meeting_id = m.id AND a.user_id = v_me AND a.joined_at IS NOT NULL
              JOIN public.meeting_participants b ON b.meeting_id = m.id AND b.user_id = pe.id AND b.joined_at IS NOT NULL
             WHERE coalesce(m.started_at, m.scheduled_for, m.created_at) >= now() - interval '90 days')::int AS meets,
           s.last_at AS sig_last,
           coalesce(s.count_90d, 0) AS sig_n
      FROM (SELECT id FROM tg UNION SELECT id FROM cand) pe
      LEFT JOIN public.relationship_signals s ON s.user_id = v_me AND s.member_id = pe.id AND s.source = 'calendar'
  ),
  mine_scored AS (
    SELECT mi.id,
           least(100,
             (CASE WHEN mi.conn THEN 15 ELSE 0 END)
           + (CASE WHEN mi.intro THEN 30 ELSE 0 END)
           + least(mi.meets, 3) * 10
           + (CASE WHEN mi.sig_last >= now() - interval '30 days' THEN 20
                   WHEN mi.sig_last >= now() - interval '90 days' THEN 10 ELSE 0 END))::int AS pts,
           array_remove(ARRAY[
             CASE WHEN mi.intro THEN 'You were introduced on Ask Intros' END,
             CASE WHEN mi.meets = 1 THEN 'You met once in 90 days'
                  WHEN mi.meets > 1 THEN format('You met %s times in 90 days', mi.meets) END,
             CASE WHEN mi.sig_n = 1 THEN 'Your calendar: 1 meeting in 90 days'
                  WHEN mi.sig_n > 1 THEN format('Your calendar: %s meetings in 90 days', mi.sig_n)
                  WHEN mi.sig_last >= now() - interval '90 days' THEN 'On your calendar recently' END,
             CASE WHEN mi.conn THEN 'You''re connected' END
           ], NULL) AS why
      FROM mine mi
  ),
  -- Second hop facts: only what members can see, plus a coarse acceptance band.
  conn_facts AS (
    SELECT c.id,
           EXISTS (SELECT 1 FROM public.member_verifications v WHERE v.user_id = c.id AND v.status = 'verified') AS verified,
           public.wp_response_band(r.accepted, r.decided) AS resp
      FROM cand c
      LEFT JOIN LATERAL (
        SELECT (count(*) FILTER (WHERE i.member_opt_in OR i.status IN ('accepted', 'connected', 'declined')))::int AS decided,
               (count(*) FILTER (WHERE i.member_opt_in OR i.status IN ('accepted', 'connected')))::int AS accepted
          FROM public.intro_requests i WHERE i.target_user_id = c.id
      ) r ON true
  ),
  direct AS (
    SELECT 'direct'::text AS kind, t.id AS target_id, t.name AS target_name, t.title AS target_title, t.company AS target_company,
           NULL::uuid AS connector_id, NULL::text AS connector_name,
           least(100, ms.pts + 10)::int AS score, ms.why AS reasons, ARRAY[]::text[] AS connector_reasons
      FROM tg t JOIN mine_scored ms ON ms.id = t.id
     WHERE ms.pts > 0
  ),
  via AS (
    SELECT 'via'::text AS kind, t.id, t.name, t.title, t.company, c.id, c.name,
           round(0.6 * ms.pts + 0.3 * (40 + (CASE WHEN cf.verified THEN 25 ELSE 0 END)
                 + (CASE cf.resp WHEN 'high' THEN 35 WHEN 'medium' THEN 20 WHEN 'unknown' THEN 10 ELSE 0 END)))::int,
           ms.why,
           array_remove(ARRAY[
             format('Connected to %s', split_part(t.name, ' ', 1)),
             CASE WHEN cf.verified THEN 'Verified member' END,
             CASE cf.resp WHEN 'high' THEN 'Accepts most intro requests' WHEN 'medium' THEN 'Accepts some intro requests' END
           ], NULL)
      FROM tg t
      JOIN cand c ON c.id <> t.id
      JOIN mine_scored ms ON ms.id = c.id
      JOIN conn_facts cf ON cf.id = c.id
     WHERE ms.pts > 0 AND public.wp_connected(c.id, t.id)
  ),
  own AS (
    SELECT 'own_contact'::text, NULL::uuid, cp.full_name, cp.title, cp.company_name, NULL::uuid, NULL::text,
           (30 + (CASE WHEN cp.last_activity_at >= now() - interval '90 days' THEN 20 ELSE 0 END))::int,
           array_remove(ARRAY[
             'In your CRM',
             CASE WHEN cp.last_activity_at >= now() - interval '90 days'
                  THEN format('Last activity %s days ago', greatest(0, extract(day FROM now() - cp.last_activity_at)::int)) END
           ], NULL),
           ARRAY[]::text[]
      FROM public.crm_people cp
     WHERE p_target_member IS NULL AND cp.owner_id = v_me AND NOT cp.archived
       AND (cp.profile_id IS NULL OR cp.profile_id NOT IN (SELECT id FROM tg))
       AND (public.normalize_company_name(cp.company_name) = v_company
            OR EXISTS (SELECT 1 FROM public.crm_companies cc
                        WHERE cc.id = cp.company_id AND cc.owner_id = v_me AND public.normalize_company_name(cc.name) = v_company))
  ),
  allp AS (
    SELECT * FROM direct UNION ALL SELECT * FROM via UNION ALL SELECT * FROM own
  )
  SELECT a.kind, a.target_id, a.target_name, a.target_title, a.target_company, a.connector_id, a.connector_name,
         a.score, public.wp_warmth(a.score), a.reasons, a.connector_reasons
    FROM allp a
   ORDER BY a.score DESC, (a.kind = 'direct') DESC, a.target_name, a.connector_name
   LIMIT v_limit;
END $$;
REVOKE ALL ON FUNCTION public.find_warm_paths(uuid, text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_warm_paths(uuid, text, int) TO authenticated, service_role;
