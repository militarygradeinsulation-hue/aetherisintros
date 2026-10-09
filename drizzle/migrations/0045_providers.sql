-- Trusted providers: service firms members recommend (accountants, M&A advisors, lawyers,
-- agencies, fractional executives…), member endorsements, and referral requests the concierge
-- routes to 1–3 approved providers, with success-fee tracking for admins.
-- Any firm, including the owner's own, is listed the same way: nominated, then approved.

-- ── Providers ──────────────────────────────────────────────────────────────────────────
CREATE TABLE public.service_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 120),
  category text NOT NULL CHECK (category IN (
    'accounting', 'legal', 'm_and_a', 'finance', 'wealth', 'insurance', 'marketing', 'sales',
    'technology', 'ai_automation', 'operations', 'hr_recruiting', 'fractional_exec', 'consulting', 'other')),
  description text NOT NULL CHECK (char_length(btrim(description)) BETWEEN 20 AND 1200),
  website text CHECK (website IS NULL OR (website ~* '^https?://[^[:space:]]+$' AND char_length(website) <= 300)),
  regions text[] NOT NULL DEFAULT '{}' CHECK (cardinality(regions) <= 12 AND char_length(array_to_string(regions, ',')) <= 400),
  client_size text NOT NULL DEFAULT 'any' CHECK (client_size IN ('any', 'under_5m', '5m_50m', '50m_250m', '250m_plus')),
  contact_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended')),
  nominated_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  nomination_note text NOT NULL DEFAULT '' CHECK (char_length(nomination_note) <= 600),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX service_providers_status_idx ON public.service_providers (status, category);
REVOKE ALL ON public.service_providers FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.service_providers TO service_role;
GRANT SELECT ON public.service_providers TO authenticated;
-- Members nominate (status always starts 'pending'); only admins edit, approve or suspend.
GRANT INSERT (name, category, description, website, regions, client_size, contact_user_id, nomination_note) ON public.service_providers TO authenticated;
GRANT UPDATE (name, category, description, website, regions, client_size, contact_user_id, status) ON public.service_providers TO authenticated;
GRANT DELETE ON public.service_providers TO authenticated;
ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved providers, own nominations, admins all" ON public.service_providers FOR SELECT TO authenticated
  USING (status = 'approved' OR public.is_admin() OR nominated_by = auth.uid() OR contact_user_id = auth.uid());
CREATE POLICY "members nominate providers" ON public.service_providers FOR INSERT TO authenticated
  WITH CHECK (nominated_by = auth.uid() AND status = 'pending');
CREATE POLICY "admins edit providers" ON public.service_providers FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admins remove providers" ON public.service_providers FOR DELETE TO authenticated USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.service_providers_touch() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.reviewed_by := auth.uid();
    NEW.reviewed_at := now();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS service_providers_touch ON public.service_providers;
CREATE TRIGGER service_providers_touch BEFORE UPDATE ON public.service_providers FOR EACH ROW EXECUTE FUNCTION public.service_providers_touch();

-- Success fee per provider, admins only. No row means no fee.
CREATE TABLE public.provider_fees (
  provider_id uuid PRIMARY KEY REFERENCES public.service_providers(id) ON DELETE CASCADE,
  fee_pct numeric(5,2) NOT NULL CHECK (fee_pct > 0 AND fee_pct <= 50),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.provider_fees FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.provider_fees TO service_role;
GRANT SELECT ON public.provider_fees TO authenticated;
ALTER TABLE public.provider_fees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read fees" ON public.provider_fees FOR SELECT TO authenticated USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.admin_set_provider_fee(p_provider uuid, p_pct numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorised' USING errcode = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.service_providers WHERE id = p_provider) THEN
    RAISE EXCEPTION 'Provider not found' USING errcode = '22023';
  END IF;
  IF p_pct IS NULL OR p_pct = 0 THEN
    DELETE FROM public.provider_fees WHERE provider_id = p_provider;
    RETURN;
  END IF;
  IF p_pct < 0 OR p_pct > 50 THEN RAISE EXCEPTION 'Fee must be between 0 and 50 percent' USING errcode = '22023'; END IF;
  INSERT INTO public.provider_fees (provider_id, fee_pct, updated_by, updated_at) VALUES (p_provider, p_pct, auth.uid(), now())
  ON CONFLICT (provider_id) DO UPDATE SET fee_pct = EXCLUDED.fee_pct, updated_by = EXCLUDED.updated_by, updated_at = now();
END $$;
REVOKE ALL ON FUNCTION public.admin_set_provider_fee(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_provider_fee(uuid, numeric) TO authenticated;

-- ── Endorsements ───────────────────────────────────────────────────────────────────────
-- A member who has worked with the provider vouches for them. One per member per provider;
-- the author edits or removes it. The provider's own contact member cannot endorse it.
CREATE TABLE public.provider_endorsements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  note text NOT NULL CHECK (char_length(btrim(note)) BETWEEN 10 AND 400),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id, user_id)
);
REVOKE ALL ON public.provider_endorsements FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.provider_endorsements TO service_role;
GRANT SELECT, DELETE ON public.provider_endorsements TO authenticated;
GRANT INSERT (provider_id, note) ON public.provider_endorsements TO authenticated;
GRANT UPDATE (note) ON public.provider_endorsements TO authenticated;
ALTER TABLE public.provider_endorsements ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.provider_is_approved(p_provider uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.service_providers WHERE id = p_provider AND status = 'approved')
$$;
REVOKE ALL ON FUNCTION public.provider_is_approved(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provider_is_approved(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.provider_contact_is_me(p_provider uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.service_providers WHERE id = p_provider AND contact_user_id = auth.uid())
$$;
REVOKE ALL ON FUNCTION public.provider_contact_is_me(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provider_contact_is_me(uuid) TO authenticated;

CREATE POLICY "endorsements on approved providers" ON public.provider_endorsements FOR SELECT TO authenticated
  USING (public.provider_is_approved(provider_id) OR public.is_admin() OR user_id = auth.uid());
CREATE POLICY "members endorse approved providers" ON public.provider_endorsements FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.provider_is_approved(provider_id) AND NOT public.provider_contact_is_me(provider_id));
CREATE POLICY "authors edit endorsements" ON public.provider_endorsements FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "authors and admins remove endorsements" ON public.provider_endorsements FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
DROP TRIGGER IF EXISTS provider_endorsements_touch ON public.provider_endorsements;
CREATE TRIGGER provider_endorsements_touch BEFORE UPDATE ON public.provider_endorsements FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Directory for the page: providers the caller may see, with endorsement count and the
-- endorsing members' names (the trust signal). Members get approved providers only.
CREATE OR REPLACE FUNCTION public.provider_directory()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin boolean := public.is_admin();
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authorised' USING errcode = '42501'; END IF;
  RETURN coalesce((SELECT jsonb_agg(x ORDER BY (x->>'endorsement_count')::int DESC, x->>'name') FROM (
    SELECT jsonb_build_object(
      'id', p.id, 'name', p.name, 'category', p.category, 'description', p.description, 'website', p.website,
      'regions', to_jsonb(p.regions), 'client_size', p.client_size, 'status', p.status,
      'contact_user_id', p.contact_user_id,
      'contact_name', (SELECT coalesce(nullif(btrim(c.name), ''), 'A member') FROM public.profiles c WHERE c.id = p.contact_user_id),
      'mine_contact', p.contact_user_id = auth.uid(),
      'endorsement_count', (SELECT count(*) FROM public.provider_endorsements e WHERE e.provider_id = p.id),
      'endorsements', coalesce((SELECT jsonb_agg(jsonb_build_object(
          'id', e.id, 'user_id', e.user_id, 'note', e.note, 'updated_at', e.updated_at, 'mine', e.user_id = auth.uid(),
          'name', coalesce(nullif(btrim(m.name), ''), 'A member'), 'company', coalesce(m.company, ''))
          ORDER BY e.created_at)
        FROM public.provider_endorsements e LEFT JOIN public.profiles m ON m.id = e.user_id
        WHERE e.provider_id = p.id), '[]'::jsonb),
      'fee_pct', CASE WHEN v_admin THEN (SELECT f.fee_pct FROM public.provider_fees f WHERE f.provider_id = p.id) END,
      'nominated_by_name', CASE WHEN v_admin THEN (SELECT coalesce(nullif(btrim(n.name), ''), 'A member') FROM public.profiles n WHERE n.id = p.nominated_by) END,
      'nomination_note', CASE WHEN v_admin THEN p.nomination_note END) AS x
    FROM public.service_providers p
    WHERE p.status = 'approved' OR v_admin) q), '[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.provider_directory() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provider_directory() TO authenticated;

-- ── Referral requests ──────────────────────────────────────────────────────────────────
-- A member asks for help in a category. The concierge routes it to 1–3 approved providers;
-- the member marks one engaged and later reports how it went.
CREATE TABLE public.provider_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN (
    'accounting', 'legal', 'm_and_a', 'finance', 'wealth', 'insurance', 'marketing', 'sales',
    'technology', 'ai_automation', 'operations', 'hr_recruiting', 'fractional_exec', 'consulting', 'other')),
  need text NOT NULL CHECK (char_length(btrim(need)) BETWEEN 20 AND 1500),
  budget_range text CHECK (budget_range IS NULL OR budget_range IN ('under_10k', '10k_50k', '50k_250k', '250k_plus')),
  urgency text NOT NULL DEFAULT 'this_month' CHECK (urgency IN ('this_week', 'this_month', 'this_quarter', 'exploring')),
  private_notes text NOT NULL DEFAULT '' CHECK (char_length(private_notes) <= 1000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'matched', 'engaged', 'completed', 'closed')),
  engaged_provider_id uuid REFERENCES public.service_providers(id) ON DELETE SET NULL,
  deal_value_cents bigint CHECK (deal_value_cents IS NULL OR deal_value_cents BETWEEN 0 AND 100000000000),
  matched_at timestamptz,
  engaged_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX provider_requests_user_idx ON public.provider_requests (user_id, created_at DESC);
CREATE INDEX provider_requests_status_idx ON public.provider_requests (status);
REVOKE ALL ON public.provider_requests FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.provider_requests TO service_role;
GRANT SELECT ON public.provider_requests TO authenticated;
GRANT INSERT (category, need, budget_range, urgency, private_notes) ON public.provider_requests TO authenticated;
GRANT UPDATE (private_notes) ON public.provider_requests TO authenticated;
ALTER TABLE public.provider_requests ENABLE ROW LEVEL SECURITY;
-- Provider contacts never read this table directly (it holds private notes); they use provider_inbox().
CREATE POLICY "own requests, admins all" ON public.provider_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "members ask for help" ON public.provider_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'open');
CREATE POLICY "members edit their notes" ON public.provider_requests FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP TRIGGER IF EXISTS provider_requests_touch ON public.provider_requests;
CREATE TRIGGER provider_requests_touch BEFORE UPDATE ON public.provider_requests FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.provider_request_matches (
  request_id uuid NOT NULL REFERENCES public.provider_requests(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 600),
  routed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (request_id, provider_id)
);
CREATE INDEX provider_request_matches_provider_idx ON public.provider_request_matches (provider_id);
REVOKE ALL ON public.provider_request_matches FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.provider_request_matches TO service_role;
GRANT SELECT ON public.provider_request_matches TO authenticated;
ALTER TABLE public.provider_request_matches ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.owns_provider_request(p_request uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.provider_requests WHERE id = p_request AND user_id = auth.uid())
$$;
REVOKE ALL ON FUNCTION public.owns_provider_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owns_provider_request(uuid) TO authenticated;

CREATE POLICY "requester, provider contact and admins read matches" ON public.provider_request_matches FOR SELECT TO authenticated
  USING (public.is_admin() OR public.owns_provider_request(request_id) OR public.provider_contact_is_me(provider_id));

-- Concierge routes a request to 1–3 approved providers (adds to earlier matches, 3 at most).
-- The member is told once; each newly matched provider's contact member is told too.
CREATE OR REPLACE FUNCTION public.provider_request_route(p_request uuid, p_providers uuid[], p_note text DEFAULT '')
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_req public.provider_requests; v_new uuid[]; v_total int; v_names text; v_pid uuid; v_contact uuid; v_pname text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorised' USING errcode = '42501'; END IF;
  SELECT * INTO v_req FROM public.provider_requests WHERE id = p_request FOR UPDATE;
  IF v_req.id IS NULL THEN RAISE EXCEPTION 'Request not found' USING errcode = '22023'; END IF;
  IF v_req.status NOT IN ('open', 'matched') THEN RAISE EXCEPTION 'This request is already %', v_req.status USING errcode = '22023'; END IF;
  IF char_length(coalesce(p_note, '')) > 600 THEN RAISE EXCEPTION 'Note is too long' USING errcode = '22023'; END IF;
  SELECT array_agg(DISTINCT x) INTO v_new FROM unnest(coalesce(p_providers, '{}'::uuid[])) x
   WHERE NOT EXISTS (SELECT 1 FROM public.provider_request_matches m WHERE m.request_id = p_request AND m.provider_id = x);
  IF v_new IS NULL OR cardinality(v_new) = 0 THEN RAISE EXCEPTION 'Pick at least one new provider' USING errcode = '22023'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(v_new) x WHERE NOT EXISTS (SELECT 1 FROM public.service_providers p WHERE p.id = x AND p.status = 'approved')) THEN
    RAISE EXCEPTION 'Only approved providers can be matched' USING errcode = '22023';
  END IF;
  SELECT count(*) + cardinality(v_new) INTO v_total FROM public.provider_request_matches WHERE request_id = p_request;
  IF v_total > 3 THEN RAISE EXCEPTION 'A request can be matched with at most 3 providers' USING errcode = '22023'; END IF;

  INSERT INTO public.provider_request_matches (request_id, provider_id, note, routed_by)
  SELECT p_request, x, coalesce(btrim(p_note), ''), auth.uid() FROM unnest(v_new) x;
  UPDATE public.provider_requests SET status = 'matched', matched_at = coalesce(matched_at, now()) WHERE id = p_request;

  SELECT string_agg(p.name, ', ' ORDER BY p.name) INTO v_names FROM public.service_providers p WHERE p.id = ANY (v_new);
  INSERT INTO public.notifications (user_id, kind, text, actor_id, link)
  VALUES (v_req.user_id, 'provider_matched', 'The Ask Intros team matched your request with ' || v_names || '.', NULL, '/app');
  FOREACH v_pid IN ARRAY v_new LOOP
    SELECT contact_user_id, name INTO v_contact, v_pname FROM public.service_providers WHERE id = v_pid;
    IF v_contact IS NOT NULL AND v_contact <> v_req.user_id THEN
      INSERT INTO public.notifications (user_id, kind, text, actor_id, link)
      VALUES (v_contact, 'provider_request', 'A member asked for help and was matched with ' || v_pname || ': ' || left(btrim(v_req.need), 200), NULL, '/app');
    END IF;
  END LOOP;
  RETURN cardinality(v_new);
END $$;
REVOKE ALL ON FUNCTION public.provider_request_route(uuid, uuid[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provider_request_route(uuid, uuid[], text) TO authenticated;

-- The member picks one of their matches to work with.
CREATE OR REPLACE FUNCTION public.provider_request_engage(p_request uuid, p_provider uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_req public.provider_requests;
BEGIN
  SELECT * INTO v_req FROM public.provider_requests WHERE id = p_request FOR UPDATE;
  IF v_req.id IS NULL OR v_req.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Not authorised' USING errcode = '42501'; END IF;
  IF v_req.status <> 'matched' THEN RAISE EXCEPTION 'Only a matched request can be marked engaged' USING errcode = '22023'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.provider_request_matches WHERE request_id = p_request AND provider_id = p_provider) THEN
    RAISE EXCEPTION 'Pick one of your matches' USING errcode = '22023';
  END IF;
  UPDATE public.provider_requests SET status = 'engaged', engaged_provider_id = p_provider, engaged_at = now() WHERE id = p_request;
END $$;
REVOKE ALL ON FUNCTION public.provider_request_engage(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provider_request_engage(uuid, uuid) TO authenticated;

-- The member (or an admin) completes or closes a request and may report the deal value.
-- completed: only from engaged. closed: from open, matched or engaged. Passing the current
-- status (engaged/completed) just updates the reported value.
CREATE OR REPLACE FUNCTION public.provider_request_update(p_request uuid, p_status text, p_deal_value_cents bigint DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_req public.provider_requests; v_ok boolean := false;
BEGIN
  SELECT * INTO v_req FROM public.provider_requests WHERE id = p_request FOR UPDATE;
  IF v_req.id IS NULL OR NOT (v_req.user_id = auth.uid() OR public.is_admin()) THEN RAISE EXCEPTION 'Not authorised' USING errcode = '42501'; END IF;
  IF p_deal_value_cents IS NOT NULL AND (p_deal_value_cents < 0 OR p_deal_value_cents > 100000000000) THEN
    RAISE EXCEPTION 'Deal value is out of range' USING errcode = '22023';
  END IF;
  IF p_status = 'completed' AND v_req.status IN ('engaged', 'completed') THEN v_ok := true; END IF;
  IF p_status = 'engaged' AND v_req.status = 'engaged' THEN v_ok := true; END IF;
  IF p_status = 'closed' AND v_req.status IN ('open', 'matched', 'engaged', 'closed') THEN v_ok := true; END IF;
  IF NOT v_ok THEN RAISE EXCEPTION 'A % request cannot move to %', v_req.status, p_status USING errcode = '22023'; END IF;
  IF p_deal_value_cents IS NOT NULL AND v_req.engaged_provider_id IS NULL THEN
    RAISE EXCEPTION 'A deal value needs an engaged provider' USING errcode = '22023';
  END IF;
  UPDATE public.provider_requests
     SET status = p_status,
         deal_value_cents = coalesce(p_deal_value_cents, deal_value_cents),
         finished_at = CASE WHEN p_status IN ('completed', 'closed') THEN coalesce(finished_at, now()) ELSE finished_at END
   WHERE id = p_request;
END $$;
REVOKE ALL ON FUNCTION public.provider_request_update(uuid, text, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provider_request_update(uuid, text, bigint) TO authenticated;

-- The member's own requests with their matches (provider names stay readable even if a
-- provider is later suspended).
CREATE OR REPLACE FUNCTION public.my_provider_requests()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authorised' USING errcode = '42501'; END IF;
  RETURN coalesce((SELECT jsonb_agg(x ORDER BY x->>'created_at' DESC) FROM (
    SELECT jsonb_build_object('id', r.id, 'category', r.category, 'need', r.need, 'budget_range', r.budget_range,
      'urgency', r.urgency, 'private_notes', r.private_notes, 'status', r.status, 'engaged_provider_id', r.engaged_provider_id,
      'deal_value_cents', r.deal_value_cents, 'created_at', r.created_at,
      'matches', coalesce((SELECT jsonb_agg(jsonb_build_object('provider_id', p.id, 'name', p.name, 'website', p.website,
          'category', p.category, 'note', m.note, 'contact_user_id', p.contact_user_id) ORDER BY p.name)
        FROM public.provider_request_matches m JOIN public.service_providers p ON p.id = m.provider_id
        WHERE m.request_id = r.id), '[]'::jsonb)) AS x
    FROM public.provider_requests r WHERE r.user_id = auth.uid()) q), '[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.my_provider_requests() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_provider_requests() TO authenticated;

-- A provider's contact member sees requests routed to their provider: category, need, budget,
-- urgency and status — never the member's private notes. The member's name is shown only
-- once they have engaged this provider.
CREATE OR REPLACE FUNCTION public.provider_inbox()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authorised' USING errcode = '42501'; END IF;
  RETURN coalesce((SELECT jsonb_agg(x ORDER BY x->>'routed_at' DESC) FROM (
    SELECT jsonb_build_object('request_id', r.id, 'provider_id', p.id, 'provider', p.name, 'category', r.category,
      'need', r.need, 'budget_range', r.budget_range, 'urgency', r.urgency, 'routed_at', m.created_at,
      'status', CASE WHEN r.engaged_provider_id IS NULL THEN r.status WHEN r.engaged_provider_id = p.id THEN r.status ELSE 'chose_another' END,
      'member', CASE WHEN r.engaged_provider_id = p.id THEN (SELECT coalesce(nullif(btrim(u.name), ''), 'A member') FROM public.profiles u WHERE u.id = r.user_id) END,
      'member_id', CASE WHEN r.engaged_provider_id = p.id THEN r.user_id END) AS x
    FROM public.provider_request_matches m
    JOIN public.service_providers p ON p.id = m.provider_id
    JOIN public.provider_requests r ON r.id = m.request_id
    WHERE p.contact_user_id = auth.uid()) q), '[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.provider_inbox() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provider_inbox() TO authenticated;

-- Admin: every request with the requester's name and matches.
CREATE OR REPLACE FUNCTION public.admin_provider_requests()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorised' USING errcode = '42501'; END IF;
  RETURN coalesce((SELECT jsonb_agg(x ORDER BY x->>'created_at' DESC) FROM (
    SELECT jsonb_build_object('id', r.id, 'user_id', r.user_id,
      'member', (SELECT coalesce(nullif(btrim(u.name), ''), 'A member') FROM public.profiles u WHERE u.id = r.user_id),
      'category', r.category, 'need', r.need, 'budget_range', r.budget_range, 'urgency', r.urgency,
      'private_notes', r.private_notes, 'status', r.status, 'engaged_provider_id', r.engaged_provider_id,
      'deal_value_cents', r.deal_value_cents, 'created_at', r.created_at,
      'matches', coalesce((SELECT jsonb_agg(jsonb_build_object('provider_id', p.id, 'name', p.name) ORDER BY p.name)
        FROM public.provider_request_matches m JOIN public.service_providers p ON p.id = m.provider_id
        WHERE m.request_id = r.id), '[]'::jsonb)) AS x
    FROM public.provider_requests r ORDER BY r.created_at DESC LIMIT 200) q), '[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.admin_provider_requests() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_provider_requests() TO authenticated;

-- Admin revenue view: requests by status, value of engaged and completed work, and expected
-- success fees (deal value × the provider's current fee; providers with no fee add nothing).
CREATE OR REPLACE FUNCTION public.admin_provider_summary()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorised' USING errcode = '42501'; END IF;
  RETURN jsonb_build_object(
    'by_status', (SELECT jsonb_build_object(
        'open', count(*) FILTER (WHERE status = 'open'), 'matched', count(*) FILTER (WHERE status = 'matched'),
        'engaged', count(*) FILTER (WHERE status = 'engaged'), 'completed', count(*) FILTER (WHERE status = 'completed'),
        'closed', count(*) FILTER (WHERE status = 'closed')) FROM public.provider_requests),
    'pending_nominations', (SELECT count(*) FROM public.service_providers WHERE status = 'pending'),
    'approved_providers', (SELECT count(*) FROM public.service_providers WHERE status = 'approved'),
    'engaged_value_cents', (SELECT coalesce(sum(deal_value_cents), 0) FROM public.provider_requests WHERE status IN ('engaged', 'completed')),
    'expected_fee_cents', (SELECT coalesce(round(sum(r.deal_value_cents * f.fee_pct / 100)), 0)
        FROM public.provider_requests r JOIN public.provider_fees f ON f.provider_id = r.engaged_provider_id
        WHERE r.status IN ('engaged', 'completed') AND r.deal_value_cents IS NOT NULL),
    'by_provider', coalesce((SELECT jsonb_agg(x ORDER BY (x->>'value_cents')::bigint DESC) FROM (
        SELECT jsonb_build_object('provider_id', p.id, 'name', p.name, 'fee_pct', f.fee_pct,
          'engaged', count(r.id), 'value_cents', coalesce(sum(r.deal_value_cents), 0),
          'expected_fee_cents', coalesce(round(sum(r.deal_value_cents * f.fee_pct / 100)), 0)) AS x
        FROM public.service_providers p
        JOIN public.provider_requests r ON r.engaged_provider_id = p.id AND r.status IN ('engaged', 'completed')
        LEFT JOIN public.provider_fees f ON f.provider_id = p.id
        GROUP BY p.id, p.name, f.fee_pct) q), '[]'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.admin_provider_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_provider_summary() TO authenticated;
