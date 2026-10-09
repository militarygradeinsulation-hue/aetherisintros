-- Network Impact Report: what the network produced in a period, counted only from records
-- members made themselves (accepted introductions, meetings both people joined, outcomes
-- participants reported, deals the other person did not dispute).
--
-- admin_impact_report(from, to) gives admins the live numbers for any period. An admin can
-- freeze a period into an impact_reports snapshot and publish it at /impact/<slug>, where
-- anyone (signed in or not) can read it. Snapshots hold aggregate counts only, never names
-- or ids, and every count below 3 is stored as 'fewer than 3' when it is frozen, so no single
-- member's activity can be picked out of a published report. my_impact_card() gives each
-- member their own numbers and nobody else's.

-- ── Live metrics ──────────────────────────────────────────────────────────────────────────
-- Internal: callable only from the SECURITY DEFINER functions below.
CREATE OR REPLACE FUNCTION public.impact_metrics(p_from date, p_to date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_start timestamptz;
  v_end timestamptz;
  v jsonb;
BEGIN
  IF p_from IS NULL OR p_to IS NULL OR p_to < p_from THEN
    RAISE EXCEPTION 'Pick a start date on or before the end date' USING errcode = '22023';
  END IF;
  IF p_to - p_from > 400 THEN RAISE EXCEPTION 'A report covers at most 400 days' USING errcode = '22023'; END IF;
  v_start := p_from::timestamptz;
  v_end := (p_to + 1)::timestamptz;

  WITH real_asks AS (
    SELECT a.id, a.author_id FROM public.asks a
     WHERE NOT a.is_demo AND a.author_id IS NOT NULL AND a.created_at >= v_start AND a.created_at < v_end
  ), intro_meetings AS (
    -- Meetings both people from an accepted introduction actually joined.
    SELECT m.intro_request_id, m.started_at
      FROM public.meetings m JOIN public.intro_requests r ON r.id = m.intro_request_id
     WHERE m.started_at IS NOT NULL AND r.accepted_at IS NOT NULL
       AND (SELECT count(*) FROM public.meeting_participants p
             WHERE p.meeting_id = m.id AND p.joined_at IS NOT NULL AND p.user_id IN (r.user_id, r.target_user_id)) = 2
  ), first_met AS (
    SELECT r.id, r.accepted_at::date AS accepted_on, min(x.met_on) AS met_on
      FROM public.intro_requests r
      JOIN (
        SELECT intro_request_id, started_at::date AS met_on FROM intro_meetings
        UNION ALL
        SELECT o.intro_request_id, o.occurred_on FROM public.intro_outcomes o WHERE o.stage IN ('met', 'next_step', 'outcome')
      ) x ON x.intro_request_id = r.id
     WHERE r.accepted_at IS NOT NULL AND r.target_user_id IS NOT NULL
     GROUP BY r.id, r.accepted_at
  ), met_in_period AS (
    SELECT greatest(0, met_on - accepted_on) AS days FROM first_met
     WHERE met_on >= p_from AND met_on <= p_to
  ), held AS (
    SELECT m.id, m.intro_request_id FROM public.meetings m
     WHERE m.started_at >= v_start AND m.started_at < v_end
       AND (SELECT count(*) FROM public.meeting_participants p WHERE p.meeting_id = m.id AND p.joined_at IS NOT NULL) >= 2
  ), outcomes AS (
    SELECT DISTINCT o.intro_request_id, o.outcome_category FROM public.intro_outcomes o
     WHERE o.stage = 'outcome' AND o.occurred_on >= p_from AND o.occurred_on <= p_to
  ), deals AS (
    SELECT d.value_cents, d.currency FROM public.intro_deals d
     WHERE d.status = 'won' AND NOT d.disputed AND d.created_at >= v_start AND d.created_at < v_end
  ), active AS (
    SELECT author_id AS uid FROM real_asks
    UNION SELECT r.user_id FROM public.ask_responses r WHERE r.created_at >= v_start AND r.created_at < v_end
    UNION SELECT i.user_id FROM public.intro_requests i WHERE i.target_user_id IS NOT NULL AND i.created_at >= v_start AND i.created_at < v_end
    UNION SELECT i.target_user_id FROM public.intro_requests i WHERE i.accepted_at >= v_start AND i.accepted_at < v_end
    UNION SELECT p.user_id FROM public.meeting_participants p WHERE p.joined_at >= v_start AND p.joined_at < v_end
    UNION SELECT o.author_id FROM public.intro_outcomes o WHERE o.created_at >= v_start AND o.created_at < v_end
  )
  SELECT jsonb_build_object(
    'from', p_from,
    'to', p_to,
    'members_verified', (SELECT count(*) FROM public.member_verifications mv
                          WHERE mv.status = 'verified' AND coalesce(mv.verified_at, mv.updated_at) < v_end),
    'members_new', (SELECT count(*) FROM public.profiles p WHERE p.created_at >= v_start AND p.created_at < v_end),
    'members_active', (SELECT count(*) FROM active a WHERE EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = a.uid)),
    'asks_posted', (SELECT count(*) FROM real_asks),
    'asks_answered', (SELECT count(*) FROM real_asks a WHERE EXISTS (
                       SELECT 1 FROM public.ask_responses r WHERE r.ask_id = a.id AND r.user_id <> a.author_id AND r.created_at < v_end)),
    'intros_requested', (SELECT count(*) FROM public.intro_requests r
                          WHERE r.target_user_id IS NOT NULL AND r.created_at >= v_start AND r.created_at < v_end),
    'intros_accepted', (SELECT count(*) FROM public.intro_requests r
                         WHERE r.target_user_id IS NOT NULL AND r.accepted_at >= v_start AND r.accepted_at < v_end),
    'meetings_held', (SELECT count(*) FROM held),
    'meetings_from_intros', (SELECT count(*) FROM held WHERE intro_request_id IS NOT NULL),
    'outcomes_reported', (SELECT count(DISTINCT intro_request_id) FROM outcomes),
    'outcomes_by_category', coalesce((SELECT jsonb_object_agg(c.outcome_category, c.n) FROM (
                               SELECT outcome_category, count(*) AS n FROM outcomes GROUP BY outcome_category) c), '{}'::jsonb),
    'deals_won', (SELECT count(*) FROM deals),
    'deals_won_usd', (SELECT count(*) FROM deals WHERE currency = 'usd'),
    'deals_value_usd_cents', (SELECT coalesce(sum(value_cents), 0) FROM deals WHERE currency = 'usd'),
    'concierge_suggestions', (SELECT count(*) FROM public.concierge_suggestions s WHERE s.created_at >= v_start AND s.created_at < v_end),
    'intros_met', (SELECT count(*) FROM met_in_period),
    'median_days_intro_to_meeting', (SELECT round((percentile_cont(0.5) WITHIN GROUP (ORDER BY days))::numeric, 1) FROM met_in_period)
  ) INTO v;
  RETURN v;
END $$;
REVOKE ALL ON FUNCTION public.impact_metrics(date, date) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_impact_report(p_from date, p_to date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorised' USING errcode = '42501'; END IF;
  RETURN public.impact_metrics(p_from, p_to);
END $$;
REVOKE ALL ON FUNCTION public.admin_impact_report(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_impact_report(date, date) TO authenticated;

-- ── Small-number suppression ──────────────────────────────────────────────────────────────
-- Every count below 3 (at any depth) becomes 'fewer than 3'. The deal total is withheld (null)
-- when it rests on fewer than 3 deals, and the median wait when fewer than 3 introductions met,
-- because with one or two records those figures are someone's private deal or calendar.
CREATE OR REPLACE FUNCTION public.impact_suppress_counts(p jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE k text; v jsonb; n numeric; out jsonb := '{}'::jsonb;
BEGIN
  FOR k, v IN SELECT e.key, e.value FROM jsonb_each(p) e LOOP
    IF jsonb_typeof(v) = 'object' THEN
      out := out || jsonb_build_object(k, public.impact_suppress_counts(v));
    ELSIF jsonb_typeof(v) = 'number' THEN
      n := (v #>> '{}')::numeric;
      IF n < 3 THEN out := out || jsonb_build_object(k, 'fewer than 3'); ELSE out := out || jsonb_build_object(k, v); END IF;
    ELSE
      out := out || jsonb_build_object(k, v);
    END IF;
  END LOOP;
  RETURN out;
END $$;
REVOKE ALL ON FUNCTION public.impact_suppress_counts(jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.impact_freeze(p jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE
  v_counts jsonb;
  v_usd numeric := coalesce((p #>> '{deals_won_usd}')::numeric, 0);
  v_met numeric := coalesce((p #>> '{intros_met}')::numeric, 0);
  v_value jsonb := 'null'::jsonb;
  v_median jsonb := 'null'::jsonb;
BEGIN
  v_counts := public.impact_suppress_counts(p - 'from' - 'to' - 'deals_value_usd_cents' - 'median_days_intro_to_meeting');
  IF v_usd >= 3 THEN v_value := coalesce(p -> 'deals_value_usd_cents', 'null'::jsonb); END IF;
  IF v_met >= 3 THEN v_median := coalesce(p -> 'median_days_intro_to_meeting', 'null'::jsonb); END IF;
  RETURN v_counts || jsonb_build_object('from', p -> 'from', 'to', p -> 'to',
    'deals_value_usd_cents', v_value, 'median_days_intro_to_meeting', v_median);
END $$;
REVOKE ALL ON FUNCTION public.impact_freeze(jsonb) FROM PUBLIC, anon, authenticated;

-- ── Published snapshots ───────────────────────────────────────────────────────────────────
CREATE TABLE public.impact_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) BETWEEN 3 AND 60),
  period_label text NOT NULL CHECK (char_length(btrim(period_label)) BETWEEN 2 AND 40),
  period_from date NOT NULL,
  period_to date NOT NULL,
  metrics jsonb NOT NULL CHECK (jsonb_typeof(metrics) = 'object'),
  headline text NOT NULL DEFAULT '' CHECK (char_length(headline) <= 280),
  published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  frozen_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (period_to >= period_from)
);
REVOKE ALL ON public.impact_reports FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.impact_reports TO service_role;
-- Written only through the admin functions below; read directly (RLS decides which rows).
GRANT SELECT (id, slug, period_label, period_from, period_to, metrics, headline, published, published_at, frozen_at)
  ON public.impact_reports TO anon, authenticated;
ALTER TABLE public.impact_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads published impact reports" ON public.impact_reports FOR SELECT TO anon USING (published);
CREATE POLICY "members read published, admins read all" ON public.impact_reports FOR SELECT TO authenticated
  USING (published OR public.is_admin());

-- Freeze a period into a snapshot (or re-freeze the snapshot with the same slug). Counts are
-- suppressed here, so the stored row never holds a figure below 3.
CREATE OR REPLACE FUNCTION public.admin_save_impact_report(p_from date, p_to date, p_label text, p_headline text DEFAULT '', p_slug text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_slug text; v_id uuid; v_metrics jsonb;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorised' USING errcode = '42501'; END IF;
  v_slug := btrim(regexp_replace(lower(coalesce(nullif(btrim(p_slug), ''), p_label, '')), '[^a-z0-9]+', '-', 'g'), '-');
  IF char_length(v_slug) < 3 THEN RAISE EXCEPTION 'Give the report a name, like Q3 2026' USING errcode = '22023'; END IF;
  v_metrics := public.impact_freeze(public.impact_metrics(p_from, p_to));
  INSERT INTO public.impact_reports (slug, period_label, period_from, period_to, metrics, headline, created_by)
  VALUES (left(v_slug, 60), btrim(p_label), p_from, p_to, v_metrics, btrim(coalesce(p_headline, '')), auth.uid())
  ON CONFLICT (slug) DO UPDATE SET period_label = EXCLUDED.period_label, period_from = EXCLUDED.period_from,
    period_to = EXCLUDED.period_to, metrics = EXCLUDED.metrics, headline = EXCLUDED.headline,
    frozen_at = now(), updated_at = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.admin_save_impact_report(date, date, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_impact_report(date, date, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_impact_report_published(p_id uuid, p_published boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorised' USING errcode = '42501'; END IF;
  UPDATE public.impact_reports
     SET published = coalesce(p_published, false),
         published_at = CASE WHEN coalesce(p_published, false) THEN coalesce(published_at, now()) END,
         updated_at = now()
   WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Report not found' USING errcode = '22023'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.admin_set_impact_report_published(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_impact_report_published(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_impact_report(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorised' USING errcode = '42501'; END IF;
  DELETE FROM public.impact_reports WHERE id = p_id;
END $$;
REVOKE ALL ON FUNCTION public.admin_delete_impact_report(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_impact_report(uuid) TO authenticated;

-- ── A member's own impact ─────────────────────────────────────────────────────────────────
-- All time, for the signed-in member only. No parameter: nobody can ask for someone else's.
CREATE OR REPLACE FUNCTION public.my_impact_card()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING errcode = '42501'; END IF;
  RETURN jsonb_build_object(
    'asks_posted', (SELECT count(*) FROM public.asks a WHERE a.author_id = v_uid AND NOT a.is_demo),
    'asks_answered', (SELECT count(DISTINCT r.ask_id) FROM public.ask_responses r JOIN public.asks a ON a.id = r.ask_id
                       WHERE r.user_id = v_uid AND a.author_id IS DISTINCT FROM v_uid),
    'intros_requested', (SELECT count(*) FROM public.intro_requests r WHERE r.user_id = v_uid AND r.target_user_id IS NOT NULL),
    'intros_received', (SELECT count(*) FROM public.intro_requests r WHERE r.target_user_id = v_uid),
    'intros_accepted', (SELECT count(*) FROM public.intro_requests r
                         WHERE r.accepted_at IS NOT NULL AND (r.user_id = v_uid OR r.target_user_id = v_uid)),
    'meetings_held', (SELECT count(*) FROM public.meeting_participants me
                       WHERE me.user_id = v_uid AND me.joined_at IS NOT NULL
                         AND (SELECT count(*) FROM public.meeting_participants o WHERE o.meeting_id = me.meeting_id AND o.joined_at IS NOT NULL) >= 2),
    'outcomes_reported', (SELECT count(DISTINCT o.intro_request_id) FROM public.intro_outcomes o WHERE o.author_id = v_uid AND o.stage = 'outcome'),
    'outcomes_by_category', coalesce((SELECT jsonb_object_agg(c.outcome_category, c.n) FROM (
                               SELECT o.outcome_category, count(DISTINCT o.intro_request_id) AS n FROM public.intro_outcomes o
                                WHERE o.author_id = v_uid AND o.stage = 'outcome' GROUP BY o.outcome_category) c), '{}'::jsonb),
    'deals_recorded', (SELECT count(*) FROM public.intro_deals d WHERE d.recorded_by = v_uid),
    'deals_won', (SELECT count(*) FROM public.intro_deals d WHERE d.recorded_by = v_uid AND d.status = 'won' AND NOT d.disputed),
    'deals_value_usd_cents', (SELECT coalesce(sum(d.value_cents), 0) FROM public.intro_deals d
                               WHERE d.recorded_by = v_uid AND d.status = 'won' AND NOT d.disputed AND d.currency = 'usd'));
END $$;
REVOKE ALL ON FUNCTION public.my_impact_card() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_impact_card() TO authenticated;
