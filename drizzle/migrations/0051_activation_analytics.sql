-- New-member activation and admin growth analytics.
--
-- Activation: a "first week" checklist on the member's Home. Each step is computed from real
-- rows (profile, verification, goals, asks, introductions, push, calendar) by my_activation().
-- Members set up to three goals for the current quarter (member_goals, private to them) and
-- can dismiss the checklist (member_activation).
--
-- Analytics: the app records one row per member per day they open it (member_activity_days,
-- via touch_activity()); admin_growth_metrics() turns that into weekly active members, new
-- members, signup-cohort retention, the activation funnel and DAU/WAU. Members never read
-- activity rows, not even their own.

-- Quarterly goals: up to three per member per quarter (one per position).
CREATE TABLE public.member_goals (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quarter date NOT NULL DEFAULT (date_trunc('quarter', now() AT TIME ZONE 'utc'))::date,
  position smallint NOT NULL CHECK (position BETWEEN 1 AND 3),
  goal text NOT NULL CHECK (char_length(btrim(goal)) BETWEEN 1 AND 140),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, quarter, position)
);
REVOKE ALL ON public.member_goals FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.member_goals TO service_role;
GRANT SELECT, DELETE ON public.member_goals TO authenticated;
ALTER TABLE public.member_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own goals read" ON public.member_goals FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own goals delete" ON public.member_goals FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Replace this quarter's goals in one step. Blank entries are dropped; more than three is refused.
CREATE OR REPLACE FUNCTION public.set_my_goals(p_goals text[])
RETURNS integer LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_quarter date := (date_trunc('quarter', now() AT TIME ZONE 'utc'))::date;
  v_clean text[];
  v_count integer;
BEGIN
  IF v_uid IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_uid) THEN
    RAISE EXCEPTION 'Sign in first' USING errcode = '42501';
  END IF;
  SELECT coalesce(array_agg(btrim(g) ORDER BY o), '{}') INTO v_clean
    FROM unnest(coalesce(p_goals, '{}')) WITH ORDINALITY AS t(g, o)
   WHERE btrim(coalesce(g, '')) <> '';
  v_count := coalesce(array_length(v_clean, 1), 0);
  IF v_count > 3 THEN RAISE EXCEPTION 'Set at most three goals' USING errcode = '22023'; END IF;
  DELETE FROM public.member_goals WHERE user_id = v_uid AND quarter = v_quarter;
  INSERT INTO public.member_goals (user_id, quarter, position, goal)
    SELECT v_uid, v_quarter, o::smallint, g FROM unnest(v_clean) WITH ORDINALITY AS t(g, o);
  RETURN v_count;
END $$;
REVOKE ALL ON FUNCTION public.set_my_goals(text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_my_goals(text[]) TO authenticated;

-- Checklist dismissal, per member. Written only through dismiss_activation().
CREATE TABLE public.member_activation (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  dismissed_at timestamptz
);
REVOKE ALL ON public.member_activation FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.member_activation TO service_role;
ALTER TABLE public.member_activation ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.dismiss_activation()
RETURNS void LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.member_activation (user_id, dismissed_at)
  SELECT auth.uid(), now() WHERE auth.uid() IS NOT NULL
  ON CONFLICT (user_id) DO UPDATE SET dismissed_at = now()
$$;
REVOKE ALL ON FUNCTION public.dismiss_activation() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dismiss_activation() TO authenticated;

-- Which first-week steps one member has done, from real rows. Internal: used by
-- my_activation() for the member and admin_growth_metrics() for the funnel.
CREATE OR REPLACE FUNCTION public.activation_flags(p_user uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_photo boolean := false;
  v_headline boolean := false;
  v_verified_at timestamptz;
BEGIN
  SELECT coalesce(btrim(p.avatar_url), '') <> '', coalesce(btrim(p.title), '') <> '', p.verified_at
    INTO v_photo, v_headline, v_verified_at
    FROM public.profiles p WHERE p.id = p_user;
  RETURN jsonb_build_object(
    'photo', coalesce(v_photo, false),
    'headline', coalesce(v_headline, false),
    'verified', v_verified_at IS NOT NULL
      OR EXISTS (SELECT 1 FROM public.member_verifications v WHERE v.user_id = p_user AND v.status = 'verified'),
    'goals', (SELECT count(*) FROM public.member_goals g
               WHERE g.user_id = p_user AND g.quarter = (date_trunc('quarter', now() AT TIME ZONE 'utc'))::date),
    'ask', EXISTS (SELECT 1 FROM public.asks a WHERE a.author_id = p_user AND NOT a.is_demo),
    'intro', EXISTS (SELECT 1 FROM public.intro_requests r
                      WHERE (r.user_id = p_user AND r.target_user_id IS NOT NULL)
                         OR (r.target_user_id = p_user AND r.status IN ('accepted', 'connected'))),
    'push', EXISTS (SELECT 1 FROM public.push_subscriptions s WHERE s.user_id = p_user),
    'calendar', EXISTS (SELECT 1 FROM public.google_connections c WHERE c.user_id = p_user)
  );
END $$;
REVOKE ALL ON FUNCTION public.activation_flags(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activation_flags(uuid) TO service_role;

-- The signed-in member's checklist: steps in order, whether each is done, and dismissal.
CREATE OR REPLACE FUNCTION public.my_activation()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  f jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in first' USING errcode = '42501'; END IF;
  f := public.activation_flags(v_uid);
  RETURN jsonb_build_object(
    'steps', jsonb_build_array(
      jsonb_build_object('id', 'profile', 'done', (f->>'photo')::boolean AND (f->>'headline')::boolean,
                         'photo', (f->>'photo')::boolean, 'headline', (f->>'headline')::boolean),
      jsonb_build_object('id', 'verified', 'done', (f->>'verified')::boolean),
      jsonb_build_object('id', 'goals', 'done', (f->>'goals')::int > 0, 'count', (f->>'goals')::int),
      jsonb_build_object('id', 'ask', 'done', (f->>'ask')::boolean),
      jsonb_build_object('id', 'intro', 'done', (f->>'intro')::boolean),
      jsonb_build_object('id', 'push', 'done', (f->>'push')::boolean),
      jsonb_build_object('id', 'calendar', 'done', (f->>'calendar')::boolean, 'optional', true)
    ),
    'dismissed', EXISTS (SELECT 1 FROM public.member_activation m WHERE m.user_id = v_uid AND m.dismissed_at IS NOT NULL)
  );
END $$;
REVOKE ALL ON FUNCTION public.my_activation() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.my_activation() TO authenticated;

-- One row per member per (UTC) day they opened the app.
CREATE TABLE public.member_activity_days (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL,
  PRIMARY KEY (user_id, day)
);
CREATE INDEX member_activity_days_day_idx ON public.member_activity_days (day);
REVOKE ALL ON public.member_activity_days FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.member_activity_days TO service_role;
ALTER TABLE public.member_activity_days ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.touch_activity()
RETURNS void LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.member_activity_days (user_id, day)
  SELECT auth.uid(), (now() AT TIME ZONE 'utc')::date
   WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid())
  ON CONFLICT (user_id, day) DO NOTHING
$$;
REVOKE ALL ON FUNCTION public.touch_activity() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.touch_activity() TO authenticated;

-- Admin growth report. Weeks start Monday (UTC); a member's signup week is the week their
-- profile was created. Retention is the share of a signup cohort active in each of the four
-- following weeks (null for weeks that have not started yet).
CREATE OR REPLACE FUNCTION public.admin_growth_metrics(p_weeks integer DEFAULT 12)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_weeks integer := least(greatest(coalesce(p_weeks, 12), 1), 52);
  v_today date := (now() AT TIME ZONE 'utc')::date;
  v_start date;
  v_weekly jsonb;
  v_retention jsonb;
  v_funnel jsonb;
  v_wau integer;
  v_dau numeric;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorised' USING errcode = '42501'; END IF;
  v_start := (date_trunc('week', now() AT TIME ZONE 'utc'))::date - (v_weeks - 1) * 7;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'week', w.wk,
           'active', (SELECT count(DISTINCT d.user_id) FROM public.member_activity_days d WHERE d.day >= w.wk AND d.day < w.wk + 7),
           'new_members', (SELECT count(*) FROM public.profiles p
                            WHERE (p.created_at AT TIME ZONE 'utc')::date >= w.wk AND (p.created_at AT TIME ZONE 'utc')::date < w.wk + 7)
         ) ORDER BY w.wk), '[]'::jsonb)
    INTO v_weekly
    FROM (SELECT v_start + g * 7 AS wk FROM generate_series(0, v_weeks - 1) g) w;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'cohort', c.wk,
           'size', c.size,
           'weeks', (SELECT jsonb_agg(
                       CASE WHEN c.wk + k * 7 > v_today OR c.size = 0 THEN NULL
                            ELSE round(100.0 * (
                              SELECT count(DISTINCT d.user_id) FROM public.member_activity_days d
                                JOIN public.profiles p ON p.id = d.user_id
                               WHERE (p.created_at AT TIME ZONE 'utc')::date >= c.wk AND (p.created_at AT TIME ZONE 'utc')::date < c.wk + 7
                                 AND d.day >= c.wk + k * 7 AND d.day < c.wk + (k + 1) * 7) / c.size)
                       END ORDER BY k)
                       FROM generate_series(1, 4) k)
         ) ORDER BY c.wk), '[]'::jsonb)
    INTO v_retention
    FROM (SELECT w.wk, (SELECT count(*) FROM public.profiles p
                         WHERE (p.created_at AT TIME ZONE 'utc')::date >= w.wk AND (p.created_at AT TIME ZONE 'utc')::date < w.wk + 7)::integer AS size
            FROM (SELECT v_start + g * 7 AS wk FROM generate_series(0, v_weeks - 1) g) w) c;

  SELECT jsonb_build_object(
           'members', count(*),
           'profile', count(*) FILTER (WHERE (f->>'photo')::boolean AND (f->>'headline')::boolean),
           'verified', count(*) FILTER (WHERE (f->>'verified')::boolean),
           'goals', count(*) FILTER (WHERE (f->>'goals')::int > 0),
           'ask', count(*) FILTER (WHERE (f->>'ask')::boolean),
           'intro', count(*) FILTER (WHERE (f->>'intro')::boolean),
           'push', count(*) FILTER (WHERE (f->>'push')::boolean),
           'calendar', count(*) FILTER (WHERE (f->>'calendar')::boolean))
    INTO v_funnel
    FROM (SELECT public.activation_flags(p.id) AS f FROM public.profiles p) x;

  SELECT count(DISTINCT user_id), count(*)::numeric / 7 INTO v_wau, v_dau
    FROM public.member_activity_days WHERE day > v_today - 7 AND day <= v_today;

  RETURN jsonb_build_object(
    'weeks', v_weekly,
    'retention', v_retention,
    'funnel', v_funnel,
    'last_7_days', jsonb_build_object(
      'wau', v_wau,
      'avg_dau', round(v_dau, 1),
      'dau_wau', CASE WHEN v_wau = 0 THEN NULL ELSE round(v_dau / v_wau, 2) END),
    'generated_at', now()
  );
END $$;
REVOKE ALL ON FUNCTION public.admin_growth_metrics(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_growth_metrics(integer) TO authenticated;
