-- Give-first reciprocity ledger and relationship decay nudges.
--
-- A) Gives and gets are derived from real records, never entered by hand:
--    answering someone's ask, accepting their introduction request (weighted far higher when the
--    OTHER person later confirms a meeting, an outcome or a won deal), and following up on a
--    concierge suggestion with a message. Self-reported outcomes count as plain activity, and
--    back-and-forth activity between the same two members within 30 days counts once. Members
--    see their own ledger and a coarse giver band (Emerging / Contributor / Pillar); there is no
--    leaderboard and no raw score. Others see the band only when its owner opts in.
-- B) Cooling relationships are computed from the member's own records only (messages, meetings,
--    introductions, ask replies, their own calendar signals, their own CRM activities). A weekly
--    in-app nudge goes out at most once a week, only when something is cooling, and can be
--    switched off. Snoozes and "not important" are stored per member.

-- ── Settings ───────────────────────────────────────────────────────────────────────────
CREATE TABLE public.reciprocity_settings (
  user_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  show_band boolean NOT NULL DEFAULT false,
  cooling_nudges boolean NOT NULL DEFAULT true,
  last_nudge_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER reciprocity_settings_touch BEFORE UPDATE ON public.reciprocity_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
REVOKE ALL ON public.reciprocity_settings FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.reciprocity_settings TO service_role;
-- Members read their own row; changes go through set_reciprocity_settings so last_nudge_at
-- stays server-owned.
GRANT SELECT ON public.reciprocity_settings TO authenticated;
ALTER TABLE public.reciprocity_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reciprocity settings" ON public.reciprocity_settings FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.set_reciprocity_settings(p_show_band boolean DEFAULT NULL, p_cooling_nudges boolean DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_row public.reciprocity_settings;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING errcode = '42501'; END IF;
  INSERT INTO public.reciprocity_settings (user_id, show_band, cooling_nudges)
  VALUES (v_uid, coalesce(p_show_band, false), coalesce(p_cooling_nudges, true))
  ON CONFLICT (user_id) DO UPDATE
    SET show_band = coalesce(p_show_band, public.reciprocity_settings.show_band),
        cooling_nudges = coalesce(p_cooling_nudges, public.reciprocity_settings.cooling_nudges)
  RETURNING * INTO v_row;
  RETURN jsonb_build_object('show_band', v_row.show_band, 'cooling_nudges', v_row.cooling_nudges);
END $$;
REVOKE ALL ON FUNCTION public.set_reciprocity_settings(boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_reciprocity_settings(boolean, boolean) TO authenticated;

-- ── Snoozes / "not important" ──────────────────────────────────────────────────────────
CREATE TABLE public.relationship_snoozes (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_kind text NOT NULL CHECK (subject_kind IN ('member', 'person')),
  subject_id uuid NOT NULL,
  mode text NOT NULL CHECK (mode IN ('snooze', 'dismiss')),
  until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, subject_kind, subject_id),
  CHECK ((mode = 'snooze') = (until IS NOT NULL))
);
REVOKE ALL ON public.relationship_snoozes FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.relationship_snoozes TO service_role;
GRANT SELECT, DELETE ON public.relationship_snoozes TO authenticated;
ALTER TABLE public.relationship_snoozes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own relationship snoozes read" ON public.relationship_snoozes FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own relationship snoozes clear" ON public.relationship_snoozes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- p_mode: 'snooze' (30 days), 'dismiss' (not important, until cleared) or 'clear'.
CREATE OR REPLACE FUNCTION public.set_relationship_snooze(p_kind text, p_id uuid, p_mode text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_ok boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING errcode = '42501'; END IF;
  IF p_kind NOT IN ('member', 'person') OR p_mode NOT IN ('snooze', 'dismiss', 'clear') THEN
    RAISE EXCEPTION 'Unknown option' USING errcode = '22023';
  END IF;
  IF p_mode = 'clear' THEN
    DELETE FROM public.relationship_snoozes WHERE user_id = v_uid AND subject_kind = p_kind AND subject_id = p_id;
    RETURN;
  END IF;
  IF p_kind = 'member' THEN
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_id) AND p_id <> v_uid INTO v_ok;
  ELSE
    SELECT EXISTS (SELECT 1 FROM public.crm_people WHERE id = p_id AND owner_id = v_uid) INTO v_ok;
  END IF;
  IF NOT v_ok THEN RAISE EXCEPTION 'Not found' USING errcode = '22023'; END IF;
  INSERT INTO public.relationship_snoozes (user_id, subject_kind, subject_id, mode, until)
  VALUES (v_uid, p_kind, p_id, p_mode, CASE WHEN p_mode = 'snooze' THEN now() + interval '30 days' END)
  ON CONFLICT (user_id, subject_kind, subject_id) DO UPDATE SET mode = excluded.mode, until = excluded.until, created_at = now();
END $$;
REVOKE ALL ON FUNCTION public.set_relationship_snooze(text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_relationship_snooze(text, uuid, text) TO authenticated;

-- ── Reciprocity ledger ─────────────────────────────────────────────────────────────────
-- Every give/get involving p_user in the last 12 months, after anti-gaming dedupe.
--   answered_ask    activity (1)  answering someone's network ask
--   intro_accepted  activity (1)  accepting their introduction request
--   intro_met       confirmed (3) …and they (not you) reported, shareably, that you met
--   intro_outcome   confirmed (6) …and they reported an outcome or recorded an undisputed won deal
--   concierge_help  activity (1)  messaging the member the team suggested you help, within 30 days
-- An introduction counts once, at its highest level. Activity between the same two members
-- (either direction) within 30 days of the last counted activity collapses into one event.
-- Internal: no member may call it for someone else.
CREATE OR REPLACE FUNCTION public.reciprocity_events(p_user uuid)
RETURNS TABLE (ev_direction text, ev_kind text, ev_counterpart uuid, ev_at timestamptz, ev_weight integer, ev_confirmed boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record;
  v_prev uuid := NULL;
  v_window timestamptz := NULL;
BEGIN
  FOR r IN
    WITH raw AS (
      SELECT CASE WHEN x.user_id = p_user THEN 'give' ELSE 'get' END AS dir, 'answered_ask'::text AS kind,
             CASE WHEN x.user_id = p_user THEN a.author_id ELSE x.user_id END AS cp, x.created_at AS at, 1 AS w, false AS conf
        FROM public.ask_responses x JOIN public.asks a ON a.id = x.ask_id
       WHERE NOT a.is_demo AND a.author_id IS NOT NULL AND a.author_id <> x.user_id
         AND (x.user_id = p_user OR a.author_id = p_user)
      UNION ALL
      SELECT CASE WHEN i.target_user_id = p_user THEN 'give' ELSE 'get' END,
             CASE WHEN i.outcome THEN 'intro_outcome' WHEN i.met THEN 'intro_met' ELSE 'intro_accepted' END,
             CASE WHEN i.target_user_id = p_user THEN i.user_id ELSE i.target_user_id END,
             i.accepted_at,
             CASE WHEN i.outcome THEN 6 WHEN i.met THEN 3 ELSE 1 END,
             i.outcome OR i.met
        FROM (
          SELECT r2.user_id, r2.target_user_id, r2.accepted_at,
                 EXISTS (SELECT 1 FROM public.intro_outcomes o WHERE o.intro_request_id = r2.id AND o.author_id = r2.user_id
                           AND o.shareable AND o.stage = 'outcome')
                 OR EXISTS (SELECT 1 FROM public.intro_deals d WHERE d.intro_request_id = r2.id AND d.recorded_by = r2.user_id
                           AND NOT d.disputed AND d.status = 'won') AS outcome,
                 EXISTS (SELECT 1 FROM public.intro_outcomes o WHERE o.intro_request_id = r2.id AND o.author_id = r2.user_id
                           AND o.shareable AND o.stage IN ('met', 'next_step')) AS met
            FROM public.intro_requests r2
           WHERE r2.accepted_at IS NOT NULL AND r2.target_user_id IS NOT NULL AND r2.user_id <> r2.target_user_id
             AND (r2.user_id = p_user OR r2.target_user_id = p_user)
        ) i
      UNION ALL
      SELECT CASE WHEN s.suggested_user_id = p_user THEN 'give' ELSE 'get' END, 'concierge_help',
             CASE WHEN s.suggested_user_id = p_user THEN s.for_user_id ELSE s.suggested_user_id END,
             (SELECT min(m.created_at) FROM public.dm_messages m JOIN public.dm_threads t ON t.id = m.thread_id
               WHERE m.sender_id = s.suggested_user_id AND s.for_user_id IN (t.member_a, t.member_b) AND s.suggested_user_id IN (t.member_a, t.member_b)
                 AND m.created_at >= s.created_at AND m.created_at < s.created_at + interval '30 days'),
             1, false
        FROM public.concierge_suggestions s
       WHERE s.suggested_user_id = p_user OR s.for_user_id = p_user
    )
    SELECT * FROM raw
     WHERE at IS NOT NULL AND cp IS NOT NULL AND cp <> p_user AND at > now() - interval '365 days'
     ORDER BY cp, at, conf DESC
  LOOP
    IF r.conf THEN
      ev_direction := r.dir; ev_kind := r.kind; ev_counterpart := r.cp; ev_at := r.at; ev_weight := r.w; ev_confirmed := true;
      RETURN NEXT;
      CONTINUE;
    END IF;
    IF v_prev IS DISTINCT FROM r.cp OR v_window IS NULL OR r.at >= v_window + interval '30 days' THEN
      v_prev := r.cp; v_window := r.at;
      ev_direction := r.dir; ev_kind := r.kind; ev_counterpart := r.cp; ev_at := r.at; ev_weight := r.w; ev_confirmed := false;
      RETURN NEXT;
    END IF;
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.reciprocity_events(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reciprocity_events(uuid) TO service_role;

-- Bands, never ranks. Mirrored in src/aetheris/reciprocity-core.ts.
CREATE OR REPLACE FUNCTION public.giver_band(p_score integer, p_people integer, p_confirmed integer)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN coalesce(p_score, 0) >= 15 AND coalesce(p_people, 0) >= 5 AND coalesce(p_confirmed, 0) >= 1 THEN 'Pillar'
    WHEN coalesce(p_score, 0) >= 5 AND coalesce(p_people, 0) >= 2 THEN 'Contributor'
    ELSE 'Emerging'
  END
$$;

CREATE OR REPLACE FUNCTION public.giver_band_of(p_user uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.giver_band(coalesce(sum(e.ev_weight), 0)::int, count(DISTINCT e.ev_counterpart)::int, (count(*) FILTER (WHERE e.ev_confirmed))::int)
    FROM public.reciprocity_events(p_user) e WHERE e.ev_direction = 'give'
$$;
REVOKE ALL ON FUNCTION public.giver_band_of(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.giver_band_of(uuid) TO service_role;

-- A member's band, only if they chose to show it (or it is the caller's own).
CREATE OR REPLACE FUNCTION public.member_giver_band(p_member uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_shown boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING errcode = '42501'; END IF;
  SELECT coalesce(bool_or(s.show_band), false) INTO v_shown FROM public.reciprocity_settings s WHERE s.user_id = p_member;
  IF p_member <> v_uid AND NOT v_shown THEN RETURN NULL; END IF;
  RETURN public.giver_band_of(p_member);
END $$;
REVOKE ALL ON FUNCTION public.member_giver_band(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.member_giver_band(uuid) TO authenticated;

-- Bands of opted-in members, for the small matching boost on the client (max 100 ids).
CREATE OR REPLACE FUNCTION public.giver_bands(p_members uuid[])
RETURNS TABLE (member_id uuid, band text) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING errcode = '42501'; END IF;
  RETURN QUERY
    SELECT s.user_id, public.giver_band_of(s.user_id)
      FROM public.reciprocity_settings s
     WHERE s.show_band AND s.user_id = ANY (p_members[1:100]);
END $$;
REVOKE ALL ON FUNCTION public.giver_bands(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.giver_bands(uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.my_reciprocity()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_out jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING errcode = '42501'; END IF;
  WITH ev AS (SELECT * FROM public.reciprocity_events(v_uid)),
  people AS (
    SELECT e.ev_direction AS dir, e.ev_counterpart AS cp, count(*)::int AS n, sum(e.ev_weight)::int AS w, max(e.ev_at) AS last_at
      FROM ev e GROUP BY 1, 2
  )
  SELECT jsonb_build_object(
    'gives', coalesce((SELECT jsonb_object_agg(k, n) FROM (SELECT ev_kind k, count(*)::int n FROM ev WHERE ev_direction = 'give' GROUP BY 1) q), '{}'::jsonb),
    'gets', coalesce((SELECT jsonb_object_agg(k, n) FROM (SELECT ev_kind k, count(*)::int n FROM ev WHERE ev_direction = 'get' GROUP BY 1) q), '{}'::jsonb),
    'gives_total', (SELECT count(*)::int FROM ev WHERE ev_direction = 'give'),
    'gets_total', (SELECT count(*)::int FROM ev WHERE ev_direction = 'get'),
    'confirmed_gives', (SELECT count(*)::int FROM ev WHERE ev_direction = 'give' AND ev_confirmed),
    'people_helped', (SELECT count(DISTINCT ev_counterpart)::int FROM ev WHERE ev_direction = 'give'),
    'helped', coalesce((SELECT jsonb_agg(jsonb_build_object('id', p.cp, 'name', coalesce(nullif(btrim(pr.name), ''), 'A member'), 'times', p.n) ORDER BY p.w DESC, p.last_at DESC)
        FROM (SELECT * FROM people WHERE dir = 'give' ORDER BY w DESC, last_at DESC LIMIT 5) p LEFT JOIN public.profiles pr ON pr.id = p.cp), '[]'::jsonb),
    'helped_you', coalesce((SELECT jsonb_agg(jsonb_build_object('id', p.cp, 'name', coalesce(nullif(btrim(pr.name), ''), 'A member'), 'times', p.n) ORDER BY p.w DESC, p.last_at DESC)
        FROM (SELECT * FROM people WHERE dir = 'get' ORDER BY w DESC, last_at DESC LIMIT 5) p LEFT JOIN public.profiles pr ON pr.id = p.cp), '[]'::jsonb),
    'band', public.giver_band(
        coalesce((SELECT sum(ev_weight) FROM ev WHERE ev_direction = 'give'), 0)::int,
        (SELECT count(DISTINCT ev_counterpart) FROM ev WHERE ev_direction = 'give')::int,
        (SELECT count(*) FROM ev WHERE ev_direction = 'give' AND ev_confirmed)::int),
    'show_band', coalesce((SELECT s.show_band FROM public.reciprocity_settings s WHERE s.user_id = v_uid), false),
    'cooling_nudges', coalesce((SELECT s.cooling_nudges FROM public.reciprocity_settings s WHERE s.user_id = v_uid), true)
  ) INTO v_out;
  RETURN v_out;
END $$;
REVOKE ALL ON FUNCTION public.my_reciprocity() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_reciprocity() TO authenticated;

-- Words of at least three letters, minus the stoplist used by the client matcher
-- (src/aetheris/opportunity-graph.ts tokens()).
CREATE OR REPLACE FUNCTION public.help_tokens(p_text text)
RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT coalesce(array_agg(DISTINCT w), '{}')
    FROM regexp_split_to_table(lower(coalesce(p_text, '')), '[^a-z0-9]+') w
   WHERE length(w) > 2 AND w <> ALL (ARRAY['the','and','for','with','who','our','your','you','that','this','are','from','into','about','help','need','looking','someone','people','can','want','have','will','more','than','their','them'])
$$;

-- Up to five open network asks from the last 30 days with no replies yet that share at least
-- two words with what the caller says they can help with. Opted-in Contributor/Pillar authors
-- get a half-word / one-word tiebreak boost (small by design).
CREATE OR REPLACE FUNCTION public.ways_to_give()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_vocab text[]; v_out jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING errcode = '42501'; END IF;
  SELECT public.help_tokens(concat_ws(' ', p.can_help_with, array_to_string(coalesce(p.expertise, '{}'), ' '), p.what_i_do))
    INTO v_vocab FROM public.profiles p WHERE p.id = v_uid;
  IF coalesce(cardinality(v_vocab), 0) = 0 THEN RETURN '[]'::jsonb; END IF;
  WITH cand AS (
    SELECT a.id, a.ask, a.author_id, a.created_at,
           ARRAY(SELECT t FROM unnest(public.help_tokens(a.ask)) t WHERE t = ANY (v_vocab) ORDER BY t LIMIT 3) AS matched,
           cardinality(ARRAY(SELECT t FROM unnest(public.help_tokens(a.ask)) t WHERE t = ANY (v_vocab))) AS hits
      FROM public.asks a
     WHERE NOT a.is_demo AND a.visibility = 'network' AND a.status <> 'closed'
       AND a.author_id IS NOT NULL AND a.author_id <> v_uid
       AND a.created_at > now() - interval '30 days'
       AND NOT EXISTS (SELECT 1 FROM public.ask_responses r WHERE r.ask_id = a.id)
  ), fit AS (
    SELECT c.*, CASE WHEN s.show_band THEN public.giver_band_of(c.author_id) END AS band
      FROM (SELECT * FROM cand WHERE hits >= 2 ORDER BY hits DESC, created_at DESC LIMIT 30) c
      LEFT JOIN public.reciprocity_settings s ON s.user_id = c.author_id
  )
  SELECT coalesce(jsonb_agg(x ORDER BY rnk DESC, at DESC), '[]'::jsonb) INTO v_out FROM (
    SELECT jsonb_build_object('id', f.id, 'ask', f.ask, 'author_id', f.author_id,
             'author', coalesce(nullif(btrim(p.name), ''), 'A member'), 'matched', to_jsonb(f.matched),
             'author_band', f.band, 'created_at', f.created_at) AS x,
           f.hits + CASE f.band WHEN 'Pillar' THEN 1 WHEN 'Contributor' THEN 0.5 ELSE 0 END AS rnk, f.created_at AS at
      FROM fit f LEFT JOIN public.profiles p ON p.id = f.author_id
     ORDER BY 2 DESC, 3 DESC LIMIT 5) q;
  RETURN v_out;
END $$;
REVOKE ALL ON FUNCTION public.ways_to_give() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ways_to_give() TO authenticated;

-- ── Cooling relationships ──────────────────────────────────────────────────────────────
-- From p_user's own records only. A relationship is "cooling" when it had at least three
-- touch-days in the last year at a cadence of 45 days or tighter, and has now been quiet for
-- 60+ days (cadence ≤ 21 days) or 90+ days (cadence 22–45 days). Anything with a meeting
-- already scheduled is left out. Mirrored in src/aetheris/reciprocity-core.ts coolingStatus().
-- Internal: callers go through my_cooling_relationships / send_cooling_nudges.
CREATE OR REPLACE FUNCTION public.cooling_candidates(p_user uuid)
RETURNS TABLE (c_kind text, c_id uuid, c_name text, c_last timestamptz, c_cadence integer, c_quiet integer, c_touches integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH t AS (
    SELECT 'member'::text AS kind, CASE WHEN th.member_a = p_user THEN th.member_b ELSE th.member_a END AS sid, m.created_at AS at
      FROM public.dm_messages m JOIN public.dm_threads th ON th.id = m.thread_id
     WHERE p_user IN (th.member_a, th.member_b)
    UNION ALL
    SELECT 'member', p2.user_id, coalesce(mt.started_at, mt.scheduled_for)
      FROM public.meeting_participants p1
      JOIN public.meetings mt ON mt.id = p1.meeting_id
      JOIN public.meeting_participants p2 ON p2.meeting_id = p1.meeting_id AND p2.user_id <> p_user
     WHERE p1.user_id = p_user
    UNION ALL
    SELECT 'member', CASE WHEN r.user_id = p_user THEN r.target_user_id ELSE r.user_id END, r.created_at
      FROM public.intro_requests r WHERE r.target_user_id IS NOT NULL AND p_user IN (r.user_id, r.target_user_id)
    UNION ALL
    SELECT 'member', CASE WHEN r.user_id = p_user THEN r.target_user_id ELSE r.user_id END, r.accepted_at
      FROM public.intro_requests r WHERE r.target_user_id IS NOT NULL AND r.accepted_at IS NOT NULL AND p_user IN (r.user_id, r.target_user_id)
    UNION ALL
    SELECT 'member', a.author_id, x.created_at FROM public.ask_responses x JOIN public.asks a ON a.id = x.ask_id
     WHERE x.user_id = p_user AND a.author_id IS NOT NULL
    UNION ALL
    SELECT 'member', x.user_id, x.created_at FROM public.ask_responses x JOIN public.asks a ON a.id = x.ask_id
     WHERE a.author_id = p_user
    UNION ALL
    SELECT 'member', s.member_id, s.last_at FROM public.relationship_signals s WHERE s.user_id = p_user AND s.last_at IS NOT NULL
    UNION ALL
    SELECT 'person', c.id, a.occurred_at FROM public.crm_activities a JOIN public.crm_people c ON c.id = a.person_id
     WHERE a.owner_id = p_user AND c.owner_id = p_user AND NOT c.archived AND c.profile_id IS NULL
    UNION ALL
    SELECT 'person', c.id, c.last_activity_at FROM public.crm_people c
     WHERE c.owner_id = p_user AND NOT c.archived AND c.profile_id IS NULL AND c.last_activity_at IS NOT NULL
  ), days AS (
    SELECT DISTINCT kind, sid, date_trunc('day', at) AS d FROM t
     WHERE sid IS NOT NULL AND sid <> p_user AND at IS NOT NULL AND at <= now() AND at > now() - interval '365 days'
  ), agg AS (
    SELECT kind, sid, count(*)::int AS n, min(d) AS first_d, max(d) AS last_d FROM days GROUP BY kind, sid HAVING count(*) >= 3
  ), scored AS (
    SELECT g.*, round(extract(epoch FROM (g.last_d - g.first_d)) / 86400 / (g.n - 1))::int AS cadence,
           floor(extract(epoch FROM (now() - g.last_d)) / 86400)::int AS quiet
      FROM agg g
  )
  SELECT s.kind, s.sid,
         CASE WHEN s.kind = 'member' THEN coalesce(nullif(btrim(p.name), ''), 'A member') ELSE coalesce(nullif(btrim(c.full_name), ''), 'A contact') END,
         s.last_d, s.cadence, s.quiet, s.n
    FROM scored s
    LEFT JOIN public.profiles p ON s.kind = 'member' AND p.id = s.sid
    LEFT JOIN public.crm_people c ON s.kind = 'person' AND c.id = s.sid
   WHERE s.cadence <= 45
     AND s.quiet >= CASE WHEN s.cadence <= 21 THEN 60 ELSE 90 END
     AND (s.kind = 'person' OR p.id IS NOT NULL)
     AND NOT EXISTS (SELECT 1 FROM public.relationship_signals rs WHERE s.kind = 'member' AND rs.user_id = p_user AND rs.member_id = s.sid AND rs.next_at > now())
     AND NOT EXISTS (SELECT 1 FROM public.meeting_participants p1 JOIN public.meetings mt ON mt.id = p1.meeting_id
                       JOIN public.meeting_participants p2 ON p2.meeting_id = p1.meeting_id
                      WHERE s.kind = 'member' AND p1.user_id = p_user AND p2.user_id = s.sid AND mt.scheduled_for > now() AND mt.ended_at IS NULL)
     AND NOT EXISTS (SELECT 1 FROM public.relationship_snoozes z WHERE z.user_id = p_user AND z.subject_kind = s.kind AND z.subject_id = s.sid
                       AND (z.mode = 'dismiss' OR z.until > now()))
   ORDER BY s.n DESC, s.quiet ASC
$$;
REVOKE ALL ON FUNCTION public.cooling_candidates(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cooling_candidates(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.my_cooling_relationships(p_limit integer DEFAULT 5)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  c record;
  v_text text;
  v_kind text;
  v_out jsonb := '[]'::jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING errcode = '42501'; END IF;
  FOR c IN SELECT * FROM public.cooling_candidates(v_uid) LIMIT least(greatest(coalesce(p_limit, 5), 1), 20) LOOP
    v_text := NULL; v_kind := 'cadence';
    IF c.c_kind = 'member' THEN
      -- Only facts the caller can already see: their open network ask, their post, a shared circle.
      SELECT 'They asked the network: “' || left(a.ask, 120) || '”' INTO v_text FROM public.asks a
       WHERE a.author_id = c.c_id AND NOT a.is_demo AND a.visibility = 'network' AND a.status <> 'closed' AND a.created_at > now() - interval '45 days'
       ORDER BY a.created_at DESC LIMIT 1;
      IF v_text IS NOT NULL THEN v_kind := 'ask'; END IF;
      IF v_text IS NULL THEN
        SELECT 'They posted: “' || left(po.text, 120) || '”' INTO v_text FROM public.posts po
         WHERE po.author_id = c.c_id AND NOT po.is_demo AND po.created_at > now() - interval '45 days'
         ORDER BY po.created_at DESC LIMIT 1;
        IF v_text IS NOT NULL THEN v_kind := 'post'; END IF;
      END IF;
      IF v_text IS NULL THEN
        SELECT 'You are both in the ' || c1.circle_id || ' circle.' INTO v_text
          FROM public.circle_memberships c1 JOIN public.circle_memberships c2 ON c2.circle_id = c1.circle_id
         WHERE c1.user_id = v_uid AND c2.user_id = c.c_id ORDER BY c1.circle_id LIMIT 1;
        IF v_text IS NOT NULL THEN v_kind := 'circle'; END IF;
      END IF;
    ELSE
      SELECT 'Last logged: “' || left(a.subject, 120) || '”' INTO v_text FROM public.crm_activities a
       WHERE a.owner_id = v_uid AND a.person_id = c.c_id ORDER BY a.occurred_at DESC LIMIT 1;
      IF v_text IS NOT NULL THEN v_kind := 'crm'; END IF;
    END IF;
    IF v_text IS NULL THEN
      v_text := 'You were in touch about every ' || c.c_cadence || ' days; it has been ' || c.c_quiet || '.';
    END IF;
    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'kind', c.c_kind, 'id', c.c_id, 'name', c.c_name, 'last_touch', c.c_last,
      'cadence_days', c.c_cadence, 'quiet_days', c.c_quiet, 'touches', c.c_touches,
      'reason', v_text, 'reason_kind', v_kind));
  END LOOP;
  RETURN v_out;
END $$;
REVOKE ALL ON FUNCTION public.my_cooling_relationships(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_cooling_relationships(integer) TO authenticated;

-- Weekly in-app nudge: at most one per member per week, only when something is cooling, and
-- never for members who switched it off. Returns how many members were nudged.
CREATE OR REPLACE FUNCTION public.send_cooling_nudges()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  u record;
  v_n integer;
  v_first text;
  v_sent integer := 0;
BEGIN
  FOR u IN
    SELECT p.id FROM public.profiles p LEFT JOIN public.reciprocity_settings s ON s.user_id = p.id
     WHERE coalesce(s.cooling_nudges, true)
       AND (s.last_nudge_at IS NULL OR s.last_nudge_at < now() - interval '6 days')
  LOOP
    SELECT count(*)::int, (array_agg(c.c_name ORDER BY c.c_touches DESC, c.c_quiet ASC))[1] INTO v_n, v_first FROM public.cooling_candidates(u.id) c;
    IF v_n > 0 THEN
      INSERT INTO public.notifications (user_id, kind, text, link)
      VALUES (u.id, 'cooling',
              v_first || CASE WHEN v_n = 1 THEN ' has gone quiet.' WHEN v_n = 2 THEN ' and 1 other have gone quiet.'
                ELSE ' and ' || (v_n - 1) || ' others have gone quiet.' END || ' A short note keeps the relationship warm.',
              '/app');
      INSERT INTO public.reciprocity_settings (user_id, last_nudge_at) VALUES (u.id, now())
      ON CONFLICT (user_id) DO UPDATE SET last_nudge_at = now();
      v_sent := v_sent + 1;
    END IF;
  END LOOP;
  RETURN v_sent;
END $$;
REVOKE ALL ON FUNCTION public.send_cooling_nudges() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.send_cooling_nudges() TO service_role;

DO $$
BEGIN
  IF to_regnamespace('cron') IS NOT NULL THEN
    PERFORM cron.schedule('ask-intros-cooling-nudges', '41 13 * * 2', $job$SELECT public.send_cooling_nudges()$job$);
  END IF;
END $$;
