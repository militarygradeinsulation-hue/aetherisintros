-- Revenue: paid membership (Stripe), the concierge desk, and deals that came from introductions.

-- ── Membership plans and memberships ───────────────────────────────────────────────────
-- Plans are edited by admins and only shown to members when active. Two suggested plans are
-- seeded switched off; prices are the owner's decision.
CREATE TABLE public.membership_plans (
  id text PRIMARY KEY CHECK (id ~ '^[a-z0-9-]{2,40}$'),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 600),
  amount_cents integer NOT NULL CHECK (amount_cents BETWEEN 100 AND 10000000),
  currency text NOT NULL DEFAULT 'usd' CHECK (currency ~ '^[a-z]{3}$'),
  billing_interval text NOT NULL DEFAULT 'year' CHECK (billing_interval IN ('month', 'year')),
  active boolean NOT NULL DEFAULT false,
  sort integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.membership_plans (id, name, description, amount_cents, billing_interval, sort) VALUES
  ('founding', 'Founding member', 'For the first members: verified profile and card, introductions with outcome tracking, meetings with AI notes, the concierge desk.', 250000, 'year', 1),
  ('member', 'Member', 'Everything in the network: verified profile and card, introductions with outcome tracking, meetings with AI notes, the concierge desk.', 500000, 'year', 2)
ON CONFLICT (id) DO NOTHING;
REVOKE ALL ON public.membership_plans FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.membership_plans TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.membership_plans TO authenticated;
ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members see active plans" ON public.membership_plans FOR SELECT TO authenticated USING (active OR public.is_admin());
CREATE POLICY "admins add plans" ON public.membership_plans FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "admins edit plans" ON public.membership_plans FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- One row per paying member, written only by the Stripe webhook (service role).
CREATE TABLE public.memberships (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id text REFERENCES public.membership_plans(id),
  status text NOT NULL CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused')),
  amount_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  billing_interval text NOT NULL DEFAULT 'year',
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  stripe_customer_id text,
  stripe_subscription_id text UNIQUE,
  started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.memberships FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.memberships TO service_role;
GRANT SELECT (user_id, plan_id, status, amount_cents, currency, billing_interval, current_period_end, cancel_at_period_end, started_at)
  ON public.memberships TO authenticated;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own membership, admins all" ON public.memberships FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

-- ── Concierge desk ─────────────────────────────────────────────────────────────────────
-- The team suggests a match for an ask nobody has answered, or for a member who needs one.
-- Both people are notified; the suggestion is kept so the team can see what came of it.
CREATE TABLE public.concierge_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ask_id text,
  for_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  suggested_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note text NOT NULL CHECK (char_length(btrim(note)) BETWEEN 10 AND 600),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (for_user_id <> suggested_user_id)
);
REVOKE ALL ON public.concierge_suggestions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.concierge_suggestions TO service_role;
GRANT SELECT ON public.concierge_suggestions TO authenticated;
ALTER TABLE public.concierge_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins and the two members read suggestions" ON public.concierge_suggestions FOR SELECT TO authenticated
  USING (public.is_admin() OR for_user_id = auth.uid() OR suggested_user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.concierge_suggest(p_for uuid, p_suggested uuid, p_note text, p_ask text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_for text; v_sug text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorised' USING errcode = '42501'; END IF;
  IF p_for = p_suggested THEN RAISE EXCEPTION 'Pick two different members' USING errcode = '22023'; END IF;
  SELECT coalesce(nullif(btrim(name), ''), 'A member') INTO v_for FROM public.profiles WHERE id = p_for;
  SELECT coalesce(nullif(btrim(name), ''), 'A member') INTO v_sug FROM public.profiles WHERE id = p_suggested;
  IF v_for IS NULL OR v_sug IS NULL THEN RAISE EXCEPTION 'Member not found' USING errcode = '22023'; END IF;
  INSERT INTO public.concierge_suggestions (ask_id, for_user_id, suggested_user_id, note, created_by)
  VALUES (p_ask, p_for, p_suggested, btrim(p_note), auth.uid()) RETURNING id INTO v_id;
  INSERT INTO public.notifications (user_id, kind, text, actor_id, link) VALUES
    (p_for, 'concierge', 'The Ask Intros team suggests you meet ' || v_sug || ': ' || left(btrim(p_note), 300), p_suggested, '/app'),
    (p_suggested, 'concierge', 'The Ask Intros team suggested ' || v_for || ' meet you: ' || left(btrim(p_note), 300), p_for, '/app');
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.concierge_suggest(uuid, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.concierge_suggest(uuid, uuid, text, text) TO authenticated;

-- What needs a human: network asks over a day old with no replies, and introduction requests
-- waiting more than five days. Admins only.
CREATE OR REPLACE FUNCTION public.admin_concierge_queue()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorised' USING errcode = '42501'; END IF;
  RETURN jsonb_build_object(
    'unanswered_asks', coalesce((SELECT jsonb_agg(x ORDER BY x->>'created_at') FROM (
      SELECT jsonb_build_object('id', a.id, 'ask', a.ask, 'author_id', a.author_id,
               'author', coalesce(nullif(btrim(p.name), ''), 'A member'), 'created_at', a.created_at,
               'suggested', (SELECT count(*) FROM public.concierge_suggestions s WHERE s.ask_id = a.id)) AS x
        FROM public.asks a LEFT JOIN public.profiles p ON p.id = a.author_id
       WHERE NOT a.is_demo AND a.author_id IS NOT NULL AND a.visibility = 'network' AND a.status <> 'closed'
         AND a.created_at < now() - interval '1 day' AND a.created_at > now() - interval '60 days'
         AND NOT EXISTS (SELECT 1 FROM public.ask_responses r WHERE r.ask_id = a.id)
       LIMIT 50) q), '[]'::jsonb),
    'stalled_intros', coalesce((SELECT jsonb_agg(x ORDER BY x->>'created_at') FROM (
      SELECT jsonb_build_object('id', r.id, 'requester', coalesce(nullif(btrim(a.name), ''), 'A member'),
               'target', coalesce(nullif(btrim(b.name), ''), 'A member'), 'reason', r.reason, 'created_at', r.created_at) AS x
        FROM public.intro_requests r
        LEFT JOIN public.profiles a ON a.id = r.user_id
        LEFT JOIN public.profiles b ON b.id = r.target_user_id
       WHERE r.target_user_id IS NOT NULL AND NOT r.member_opt_in AND r.status NOT IN ('declined', 'closed')
         AND r.created_at < now() - interval '5 days' AND r.created_at > now() - interval '60 days'
       LIMIT 50) q), '[]'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.admin_concierge_queue() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_concierge_queue() TO authenticated;

-- ── Deals from introductions ───────────────────────────────────────────────────────────
-- Either person in an accepted introduction records paid work that came from it. The value is
-- what the member reports; the other person can see and dispute it. This is the "business
-- created by introductions" figure, and the basis for success fees if those are switched on.
CREATE TABLE public.intro_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intro_request_id uuid NOT NULL REFERENCES public.intro_requests(id) ON DELETE CASCADE,
  recorded_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 3 AND 160),
  value_cents bigint NOT NULL CHECK (value_cents BETWEEN 0 AND 100000000000),
  currency text NOT NULL DEFAULT 'usd' CHECK (currency ~ '^[a-z]{3}$'),
  status text NOT NULL DEFAULT 'won' CHECK (status IN ('in_progress', 'won', 'lost')),
  disputed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX intro_deals_intro_idx ON public.intro_deals (intro_request_id);
REVOKE ALL ON public.intro_deals FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.intro_deals TO service_role;
GRANT SELECT, DELETE ON public.intro_deals TO authenticated;
GRANT INSERT (intro_request_id, title, value_cents, currency, status) ON public.intro_deals TO authenticated;
GRANT UPDATE (title, value_cents, status, disputed) ON public.intro_deals TO authenticated;
ALTER TABLE public.intro_deals ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_intro_party(p_intro uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.intro_requests r WHERE r.id = p_intro
                   AND r.requester_opt_in AND r.member_opt_in
                   AND auth.uid() IN (r.user_id, r.target_user_id))
$$;
REVOKE ALL ON FUNCTION public.is_intro_party(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_intro_party(uuid) TO authenticated;

CREATE POLICY "parties and admins read deals" ON public.intro_deals FOR SELECT TO authenticated
  USING (public.is_intro_party(intro_request_id) OR public.is_admin());
CREATE POLICY "parties record deals" ON public.intro_deals FOR INSERT TO authenticated
  WITH CHECK (recorded_by = auth.uid() AND public.is_intro_party(intro_request_id));
-- The recorder edits their deal; the other person may only flag it as disputed (column grants
-- allow both; the trigger below keeps the other person to the disputed flag).
CREATE POLICY "parties update deals" ON public.intro_deals FOR UPDATE TO authenticated
  USING (public.is_intro_party(intro_request_id)) WITH CHECK (public.is_intro_party(intro_request_id));
CREATE POLICY "recorder deletes deals" ON public.intro_deals FOR DELETE TO authenticated USING (recorded_by = auth.uid());

CREATE OR REPLACE FUNCTION public.intro_deals_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> OLD.recorded_by
     AND (NEW.title, NEW.value_cents, NEW.status) IS DISTINCT FROM (OLD.title, OLD.value_cents, OLD.status) THEN
    RAISE EXCEPTION 'Only the person who recorded this deal can change it' USING errcode = '42501';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS intro_deals_guard ON public.intro_deals;
CREATE TRIGGER intro_deals_guard BEFORE UPDATE ON public.intro_deals FOR EACH ROW EXECUTE FUNCTION public.intro_deals_guard();

-- Revenue overview for admins: paying members, recurring revenue, and deals from introductions.
CREATE OR REPLACE FUNCTION public.admin_revenue_summary()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorised' USING errcode = '42501'; END IF;
  RETURN jsonb_build_object(
    'paying', (SELECT count(*) FROM public.memberships WHERE status IN ('active', 'trialing')),
    'past_due', (SELECT count(*) FROM public.memberships WHERE status IN ('past_due', 'unpaid')),
    'canceling', (SELECT count(*) FROM public.memberships WHERE status IN ('active', 'trialing') AND cancel_at_period_end),
    'arr_cents', (SELECT coalesce(sum(CASE billing_interval WHEN 'month' THEN amount_cents * 12 ELSE amount_cents END), 0)
                    FROM public.memberships WHERE status IN ('active', 'trialing')),
    'by_plan', coalesce((SELECT jsonb_object_agg(coalesce(plan_id, 'none'), n) FROM (
                 SELECT plan_id, count(*) n FROM public.memberships WHERE status IN ('active', 'trialing') GROUP BY plan_id) q), '{}'::jsonb),
    'deals_won', (SELECT count(*) FROM public.intro_deals WHERE status = 'won' AND NOT disputed),
    'deals_value_cents', (SELECT coalesce(sum(value_cents), 0) FROM public.intro_deals WHERE status = 'won' AND NOT disputed AND currency = 'usd'),
    'deals_in_progress', (SELECT count(*) FROM public.intro_deals WHERE status = 'in_progress'));
END $$;
REVOKE ALL ON FUNCTION public.admin_revenue_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_revenue_summary() TO authenticated;
