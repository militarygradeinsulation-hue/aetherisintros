-- Introduction outcome spine.
-- An accepted introduction is the start of the record, not the end. Participants append
-- what happened afterwards (met → next step → outcome / no outcome) so the network
-- accumulates evidence about which introductions actually change results.
-- Append-only, participant-scoped, private by default. No amounts: value is a
-- self-reported band so nothing is fabricated or over-precise.

-- 1) Consent integrity + server-owned acceptance time on intro_requests.
-- Outcome evidence is only meaningful if acceptance is genuine, so each side may only
-- move its own opt-in: the requester can never mark the target as opted in (previously
-- possible through the requester's FOR ALL policy), and the target can only accept or
-- decline, never rewrite who or what the request is about. Disallowed changes are
-- coerced back rather than raised so existing fire-and-forget upserts keep working.
ALTER TABLE public.intro_requests ADD COLUMN IF NOT EXISTS accepted_at timestamptz;

UPDATE public.intro_requests
   SET accepted_at = updated_at
 WHERE accepted_at IS NULL AND member_opt_in AND requester_opt_in;

CREATE OR REPLACE FUNCTION public.intro_member_uuid(p_member_id text)
RETURNS uuid LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN p_member_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN p_member_id::uuid END
$$;

-- Backfill targets for live-member requests created without one.
UPDATE public.intro_requests
   SET target_user_id = public.intro_member_uuid(member_id)
 WHERE target_user_id IS NULL AND public.intro_member_uuid(member_id) IS NOT NULL;

CREATE OR REPLACE FUNCTION public.intro_requests_consent_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NOT NULL THEN
    IF TG_OP = 'INSERT' THEN
      -- A request is created by its requester; the target has not consented yet.
      -- The target is always the member the request names (covers MCP-created requests
      -- that never set target_user_id, which left the target unable to see them).
      NEW.member_opt_in := false;
      NEW.target_user_id := public.intro_member_uuid(NEW.member_id);
    ELSE
      NEW.user_id := OLD.user_id;
      NEW.member_id := OLD.member_id;
      NEW.target_user_id := coalesce(OLD.target_user_id, public.intro_member_uuid(OLD.member_id));
      IF v_uid IS DISTINCT FROM OLD.target_user_id THEN
        NEW.member_opt_in := OLD.member_opt_in;
      END IF;
      IF v_uid IS DISTINCT FROM OLD.user_id THEN
        NEW.requester_opt_in := OLD.requester_opt_in;
        NEW.reason := OLD.reason;
        NEW.mutual_value := OLD.mutual_value;
      END IF;
    END IF;
  END IF;

  -- accepted_at is never client-writable: stamped once, when both sides are in.
  IF TG_OP = 'UPDATE' AND OLD.accepted_at IS NOT NULL THEN
    NEW.accepted_at := OLD.accepted_at;
  ELSIF NEW.member_opt_in AND NEW.requester_opt_in THEN
    NEW.accepted_at := now();
  ELSE
    NEW.accepted_at := NULL;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.intro_requests_consent_guard() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS intro_requests_consent_guard ON public.intro_requests;
CREATE TRIGGER intro_requests_consent_guard BEFORE INSERT OR UPDATE ON public.intro_requests
  FOR EACH ROW EXECUTE FUNCTION public.intro_requests_consent_guard();

-- 2) Append-only outcome events.
CREATE TABLE public.intro_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intro_request_id uuid NOT NULL REFERENCES public.intro_requests(id) ON DELETE CASCADE,
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  stage text NOT NULL CHECK (stage IN ('too_early','met','next_step','outcome','no_outcome')),
  outcome_category text CHECK (outcome_category IN ('customer','partnership','hire','investor','advisor','board','vendor','acquisition','knowledge','other')),
  attribution text NOT NULL DEFAULT 'direct' CHECK (attribution IN ('direct','influenced','contextual')),
  value_band text NOT NULL DEFAULT 'undisclosed' CHECK (value_band IN ('undisclosed','under_10k','10k_100k','100k_1m','over_1m')),
  private_note text NOT NULL DEFAULT '' CHECK (char_length(private_note) <= 1000),
  shareable boolean NOT NULL DEFAULT false,
  occurred_on date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT intro_outcomes_category_chk CHECK ((stage = 'outcome') = (outcome_category IS NOT NULL)),
  CONSTRAINT intro_outcomes_value_chk CHECK (stage = 'outcome' OR value_band = 'undisclosed')
);
CREATE INDEX intro_outcomes_intro_idx ON public.intro_outcomes (intro_request_id, created_at DESC);
CREATE INDEX intro_outcomes_author_idx ON public.intro_outcomes (author_id, created_at DESC);

REVOKE ALL ON public.intro_outcomes FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.intro_outcomes TO authenticated;
GRANT ALL ON public.intro_outcomes TO service_role;
ALTER TABLE public.intro_outcomes ENABLE ROW LEVEL SECURITY;

-- Only a participant of an introduction both sides accepted may record its outcome.
CREATE POLICY "participant records outcome" ON public.intro_outcomes FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.intro_requests r
       WHERE r.id = intro_request_id
         AND r.requester_opt_in AND r.member_opt_in
         AND (r.user_id = auth.uid() OR r.target_user_id = auth.uid())
    )
  );
CREATE POLICY "author reads own outcomes" ON public.intro_outcomes FOR SELECT TO authenticated
  USING (author_id = auth.uid());
-- The other participant sees an outcome only when its author marked it shareable.
-- The private note column stays readable only to its author via the view below.
CREATE POLICY "participant reads shared outcomes" ON public.intro_outcomes FOR SELECT TO authenticated
  USING (
    shareable AND EXISTS (
      SELECT 1 FROM public.intro_requests r
       WHERE r.id = intro_request_id
         AND (r.user_id = auth.uid() OR r.target_user_id = auth.uid())
    )
  );
CREATE POLICY "author retracts own outcome" ON public.intro_outcomes FOR DELETE TO authenticated
  USING (author_id = auth.uid());

-- Column-level privacy: the other participant must never read private_note.
REVOKE SELECT ON public.intro_outcomes FROM authenticated;
GRANT SELECT (id, intro_request_id, author_id, stage, outcome_category, attribution, value_band, shareable, occurred_on, created_at)
  ON public.intro_outcomes TO authenticated;

CREATE OR REPLACE FUNCTION public.my_intro_outcome_notes()
RETURNS TABLE(id uuid, private_note text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.id, o.private_note FROM public.intro_outcomes o WHERE o.author_id = auth.uid() AND o.private_note <> ''
$$;
REVOKE ALL ON FUNCTION public.my_intro_outcome_notes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_intro_outcome_notes() TO authenticated;

-- 3) Which accepted introductions are due for a follow-up from me.
-- Checkpoints at 7, 30 and 90 days after acceptance. A checkpoint is satisfied by any
-- outcome event I recorded at or after it; a terminal stage closes the loop.
CREATE OR REPLACE FUNCTION public.my_due_outcome_checkins()
RETURNS TABLE(intro_request_id uuid, counterpart_id uuid, accepted_at timestamptz, days_since integer, checkpoint integer, last_stage text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH mine AS (
    SELECT r.id,
           CASE WHEN r.user_id = auth.uid() THEN r.target_user_id ELSE r.user_id END AS counterpart_id,
           r.accepted_at,
           (current_date - r.accepted_at::date) AS days_since
      FROM public.intro_requests r
     WHERE r.accepted_at IS NOT NULL
       AND r.requester_opt_in AND r.member_opt_in
       AND (r.user_id = auth.uid() OR r.target_user_id = auth.uid())
  ), staged AS (
    SELECT m.*,
           CASE WHEN m.days_since >= 90 THEN 90 WHEN m.days_since >= 30 THEN 30 WHEN m.days_since >= 7 THEN 7 END AS checkpoint,
           (SELECT o.stage FROM public.intro_outcomes o
             WHERE o.intro_request_id = m.id AND o.author_id = auth.uid()
             ORDER BY o.created_at DESC LIMIT 1) AS last_stage,
           (SELECT max(o.created_at) FROM public.intro_outcomes o
             WHERE o.intro_request_id = m.id AND o.author_id = auth.uid()) AS last_recorded
      FROM mine m
  )
  SELECT s.id, s.counterpart_id, s.accepted_at, s.days_since, s.checkpoint, s.last_stage
    FROM staged s
   WHERE s.checkpoint IS NOT NULL
     AND s.days_since <= 180
     AND coalesce(s.last_stage, '') NOT IN ('outcome','no_outcome')
     AND (s.last_recorded IS NULL OR s.last_recorded < s.accepted_at + make_interval(days => s.checkpoint))
   ORDER BY s.accepted_at
$$;
REVOKE ALL ON FUNCTION public.my_due_outcome_checkins() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_due_outcome_checkins() TO authenticated;

-- 4) Network proof metrics (admin only, counts only — never content or identities).
-- These are the numbers that decide whether the network is indispensable.
CREATE OR REPLACE FUNCTION public.network_proof_metrics(p_days integer DEFAULT 90)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_since timestamptz;
  v jsonb;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorised' USING errcode = '42501'; END IF;
  v_since := now() - make_interval(days => greatest(1, least(coalesce(p_days, 90), 730)));

  WITH intros AS (
    SELECT r.id, r.accepted_at FROM public.intro_requests r WHERE r.created_at >= v_since
  ), reached AS (
    SELECT o.intro_request_id,
           bool_or(o.stage IN ('met','next_step','outcome')) AS met,
           bool_or(o.stage IN ('next_step','outcome')) AS next_step,
           bool_or(o.stage = 'outcome') AS outcome,
           bool_or(o.stage = 'no_outcome') AS no_outcome,
           min(o.created_at) FILTER (WHERE o.stage = 'outcome') AS first_outcome_at
      FROM public.intro_outcomes o
     WHERE o.intro_request_id IN (SELECT id FROM intros)
     GROUP BY o.intro_request_id
  )
  SELECT jsonb_build_object(
    'window_days', extract(day FROM now() - v_since)::int,
    'members', (SELECT count(*) FROM public.profiles),
    'members_asking', (SELECT count(DISTINCT a.author_id) FROM public.asks a WHERE a.created_at >= v_since AND a.author_id IS NOT NULL),
    'weekly_askers', (SELECT count(DISTINCT a.author_id) FROM public.asks a WHERE a.created_at >= now() - interval '7 days' AND a.author_id IS NOT NULL),
    'asks', (SELECT count(*) FROM public.asks a WHERE a.created_at >= v_since AND a.author_id IS NOT NULL),
    'intros_requested', (SELECT count(*) FROM intros),
    'intros_accepted', (SELECT count(*) FROM intros WHERE accepted_at IS NOT NULL),
    'intros_met', (SELECT count(*) FROM reached WHERE met),
    'intros_next_step', (SELECT count(*) FROM reached WHERE next_step),
    'intros_outcome', (SELECT count(*) FROM reached WHERE outcome),
    'intros_no_outcome', (SELECT count(*) FROM reached WHERE no_outcome AND NOT outcome),
    'outcomes_by_category', coalesce((
      SELECT jsonb_object_agg(c.outcome_category, c.n) FROM (
        SELECT o.outcome_category, count(DISTINCT o.intro_request_id) AS n
          FROM public.intro_outcomes o
         WHERE o.stage = 'outcome' AND o.intro_request_id IN (SELECT id FROM intros)
         GROUP BY o.outcome_category) c), '{}'::jsonb),
    'median_days_to_outcome', (
      SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM (x.first_outcome_at - i.accepted_at)) / 86400)
        FROM reached x JOIN intros i ON i.id = x.intro_request_id
       WHERE x.first_outcome_at IS NOT NULL AND i.accepted_at IS NOT NULL)
  ) INTO v;
  RETURN v;
END $$;
REVOKE ALL ON FUNCTION public.network_proof_metrics(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.network_proof_metrics(integer) TO authenticated;
