-- Agent Trust Gateway.
-- 1) Members issue API keys to their own AI assistant. Only a SHA-256 hash of each key is
--    stored; the server looks keys up, members see name, prefix, scopes and use, never the hash.
--    Every call an assistant makes is logged for the member who owns the key.
-- 2) Outside AI agents (no account) can ask to reach a member by the public handle the member
--    chose, screened against that member's Agent Policy. Members with the policy off are never
--    revealed and nothing is stored for them. Requester emails stay hidden until accepted.
-- 3) A fixed-window rate-limit counter for keys, IPs (hashed) and email domains.

-- ---------------------------------------------------------------- agent keys
CREATE TABLE public.agent_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 60),
  key_prefix text NOT NULL CHECK (key_prefix ~ '^ai_[A-Za-z0-9_-]{4,12}$'),
  key_hash text NOT NULL UNIQUE CHECK (key_hash ~ '^[0-9a-f]{64}$'),
  scopes text[] NOT NULL CHECK (cardinality(scopes) >= 1 AND scopes <@ ARRAY['read_profile_public','search_members','create_ask','request_intro']::text[]),
  rate_per_hour integer NOT NULL DEFAULT 60 CHECK (rate_per_hour BETWEEN 1 AND 600),
  intros_per_day integer NOT NULL DEFAULT 10 CHECK (intros_per_day BETWEEN 0 AND 50),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
CREATE INDEX agent_keys_user_idx ON public.agent_keys (user_id, created_at DESC);
REVOKE ALL ON public.agent_keys FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.agent_keys TO service_role;
-- Every column except key_hash.
GRANT SELECT (id, user_id, name, key_prefix, scopes, rate_per_hour, intros_per_day, created_at, last_used_at, revoked_at) ON public.agent_keys TO authenticated;
ALTER TABLE public.agent_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own agent keys" ON public.agent_keys FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Keys are minted by the server (which generates the secret and hashes it), for verified members.
CREATE OR REPLACE FUNCTION public.create_agent_key(p_user uuid, p_name text, p_scopes text[], p_key_hash text, p_key_prefix text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_active int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.member_verifications WHERE user_id = p_user AND status = 'verified') THEN
    RAISE EXCEPTION 'Only verified members can connect an AI assistant' USING errcode = '42501';
  END IF;
  SELECT count(*) INTO v_active FROM public.agent_keys WHERE user_id = p_user AND revoked_at IS NULL;
  IF v_active >= 10 THEN
    RAISE EXCEPTION 'You can have up to 10 active assistant keys. Revoke one first.' USING errcode = '54000';
  END IF;
  INSERT INTO public.agent_keys (user_id, name, scopes, key_hash, key_prefix)
  VALUES (p_user, btrim(p_name), (SELECT array_agg(DISTINCT s ORDER BY s) FROM unnest(p_scopes) s), p_key_hash, p_key_prefix)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.create_agent_key(uuid, text, text[], text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_agent_key(uuid, text, text[], text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.revoke_agent_key(p_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.agent_keys SET revoked_at = now() WHERE id = p_id AND user_id = auth.uid() AND revoked_at IS NULL;
  RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.revoke_agent_key(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_agent_key(uuid) TO authenticated;

-- Server-side lookup of a presented key. Revoked keys and unverified owners never authenticate.
CREATE OR REPLACE FUNCTION public.agent_key_lookup(p_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE k public.agent_keys;
BEGIN
  UPDATE public.agent_keys SET last_used_at = now() WHERE key_hash = p_hash AND revoked_at IS NULL RETURNING * INTO k;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('id', k.id, 'user_id', k.user_id, 'name', k.name, 'scopes', to_jsonb(k.scopes),
    'rate_per_hour', k.rate_per_hour, 'intros_per_day', k.intros_per_day,
    'verified', EXISTS (SELECT 1 FROM public.member_verifications WHERE user_id = k.user_id AND status = 'verified'));
END $$;
REVOKE ALL ON FUNCTION public.agent_key_lookup(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.agent_key_lookup(text) TO service_role;

-- ---------------------------------------------------------------- activity log
CREATE TABLE public.agent_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id uuid REFERENCES public.agent_keys(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('read_profile_public','search_members','create_ask','request_intro','inbound_request')),
  target text NOT NULL DEFAULT '' CHECK (char_length(target) <= 200),
  result text NOT NULL CHECK (result IN ('ok','denied','rate_limited','invalid','error')),
  detail text NOT NULL DEFAULT '' CHECK (char_length(detail) <= 300),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX agent_actions_user_idx ON public.agent_actions (user_id, created_at DESC);
REVOKE ALL ON public.agent_actions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.agent_actions TO service_role;
GRANT SELECT ON public.agent_actions TO authenticated;
ALTER TABLE public.agent_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own agent actions" ON public.agent_actions FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ---------------------------------------------------------------- rate limits
-- Fixed windows: the server computes the window start, the database counts atomically.
-- Buckets never hold raw IPs (they are HMAC-hashed with the server's dispatch secret first).
CREATE TABLE public.agent_rate_counters (
  bucket text NOT NULL CHECK (char_length(bucket) BETWEEN 1 AND 200),
  window_start timestamptz NOT NULL,
  hits integer NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, window_start)
);
REVOKE ALL ON public.agent_rate_counters FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.agent_rate_counters TO service_role;
ALTER TABLE public.agent_rate_counters ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.agent_rate_hit(p_bucket text, p_window_start timestamptz, p_limit integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_hits int;
BEGIN
  INSERT INTO public.agent_rate_counters (bucket, window_start, hits) VALUES (p_bucket, p_window_start, 1)
  ON CONFLICT (bucket, window_start) DO UPDATE SET hits = public.agent_rate_counters.hits + 1
  RETURNING hits INTO v_hits;
  IF random() < 0.02 THEN
    DELETE FROM public.agent_rate_counters WHERE window_start < now() - interval '2 days';
  END IF;
  RETURN v_hits <= p_limit;
END $$;
REVOKE ALL ON FUNCTION public.agent_rate_hit(text, timestamptz, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.agent_rate_hit(text, timestamptz, integer) TO service_role;

-- ---------------------------------------------------------------- agent policy
CREATE OR REPLACE FUNCTION public.agent_topics_ok(p text[]) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT cardinality(p) <= 20 AND coalesce((SELECT bool_and(char_length(btrim(t)) BETWEEN 1 AND 40) FROM unnest(p) t), true)
$$;

CREATE TABLE public.agent_policies (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  handle text UNIQUE CHECK (handle IS NULL OR handle ~ '^[a-z0-9][a-z0-9-]{2,39}$'),
  mode text NOT NULL DEFAULT 'off' CHECK (mode IN ('off','verified_only','everyone')),
  welcome_topics text[] NOT NULL DEFAULT '{}' CHECK (public.agent_topics_ok(welcome_topics)),
  refuse_topics text[] NOT NULL DEFAULT '{}' CHECK (public.agent_topics_ok(refuse_topics)),
  min_context integer NOT NULL DEFAULT 120 CHECK (min_context BETWEEN 40 AND 1000),
  daily_cap integer NOT NULL DEFAULT 5 CHECK (daily_cap BETWEEN 1 AND 50),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agent_policies_handle_when_on CHECK (mode = 'off' OR handle IS NOT NULL)
);
REVOKE ALL ON public.agent_policies FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.agent_policies TO service_role;
GRANT SELECT ON public.agent_policies TO authenticated;
GRANT INSERT (user_id, handle, mode, welcome_topics, refuse_topics, min_context, daily_cap) ON public.agent_policies TO authenticated;
GRANT UPDATE (handle, mode, welcome_topics, refuse_topics, min_context, daily_cap) ON public.agent_policies TO authenticated;
ALTER TABLE public.agent_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own agent policy read" ON public.agent_policies FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own agent policy create" ON public.agent_policies FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own agent policy update" ON public.agent_policies FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER agent_policies_touch BEFORE UPDATE ON public.agent_policies FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Sender domains a member has blocked. Added by deciding a request; removable by the member.
CREATE TABLE public.agent_blocked_domains (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain text NOT NULL CHECK (domain ~ '^[a-z0-9.-]{3,253}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, domain)
);
REVOKE ALL ON public.agent_blocked_domains FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.agent_blocked_domains TO service_role;
GRANT SELECT, DELETE ON public.agent_blocked_domains TO authenticated;
ALTER TABLE public.agent_blocked_domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own blocked domains" ON public.agent_blocked_domains FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own blocked domains remove" ON public.agent_blocked_domains FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ---------------------------------------------------------------- agent inbox
CREATE TABLE public.agent_inbound_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('held','delivered','accepted','declined','blocked')),
  score integer NOT NULL DEFAULT 0 CHECK (score BETWEEN -100 AND 100),
  reasons text[] NOT NULL DEFAULT '{}' CHECK (cardinality(reasons) <= 10),
  requester_name text NOT NULL CHECK (char_length(requester_name) BETWEEN 2 AND 120),
  requester_company text NOT NULL DEFAULT '' CHECK (char_length(requester_company) <= 120),
  requester_email text NOT NULL CHECK (char_length(requester_email) <= 254 AND requester_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  requester_domain text NOT NULL CHECK (requester_domain ~ '^[a-z0-9.-]{3,253}$'),
  requester_member uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  on_behalf_of text NOT NULL DEFAULT '' CHECK (char_length(on_behalf_of) <= 200),
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 2000),
  offer text NOT NULL DEFAULT '' CHECK (char_length(offer) <= 1000),
  links text[] NOT NULL DEFAULT '{}' CHECK (cardinality(links) <= 5),
  text_hash text NOT NULL CHECK (text_hash ~ '^[0-9a-f]{64}$'),
  crm_person_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);
CREATE INDEX agent_inbound_member_idx ON public.agent_inbound_requests (member_id, created_at DESC);
REVOKE ALL ON public.agent_inbound_requests FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.agent_inbound_requests TO service_role;
-- Every column except requester_email, which is revealed only by accepting.
GRANT SELECT (id, member_id, status, score, reasons, requester_name, requester_company, requester_domain, requester_member,
  on_behalf_of, reason, offer, links, crm_person_id, created_at, decided_at) ON public.agent_inbound_requests TO authenticated;
ALTER TABLE public.agent_inbound_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own agent inbox" ON public.agent_inbound_requests FOR SELECT TO authenticated USING (member_id = auth.uid());

-- Hashes of every submitted request text (any recipient), for 30-day duplicate detection.
CREATE TABLE public.agent_inbound_hashes (
  text_hash text NOT NULL CHECK (text_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX agent_inbound_hashes_idx ON public.agent_inbound_hashes (text_hash, created_at DESC);
REVOKE ALL ON public.agent_inbound_hashes FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.agent_inbound_hashes TO service_role;
ALTER TABLE public.agent_inbound_hashes ENABLE ROW LEVEL SECURITY;

-- Server: everything screening needs for one submission. Records the text hash. A handle that is
-- unknown, off, or belongs to an unverified member all return found = false.
CREATE OR REPLACE FUNCTION public.agent_inbound_prepare(p_handle text, p_domain text, p_text_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_dup int; p public.agent_policies;
BEGIN
  SELECT count(*) INTO v_dup FROM public.agent_inbound_hashes WHERE text_hash = p_text_hash AND created_at > now() - interval '30 days';
  INSERT INTO public.agent_inbound_hashes (text_hash) VALUES (p_text_hash);
  IF random() < 0.02 THEN DELETE FROM public.agent_inbound_hashes WHERE created_at < now() - interval '31 days'; END IF;
  SELECT * INTO p FROM public.agent_policies WHERE handle = lower(btrim(p_handle)) AND mode <> 'off';
  IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM public.member_verifications v WHERE v.user_id = p.user_id AND v.status = 'verified') THEN
    RETURN jsonb_build_object('found', false, 'duplicates', v_dup);
  END IF;
  RETURN jsonb_build_object('found', true, 'duplicates', v_dup, 'member_id', p.user_id, 'mode', p.mode,
    'welcome_topics', to_jsonb(p.welcome_topics), 'refuse_topics', to_jsonb(p.refuse_topics),
    'min_context', p.min_context, 'daily_cap', p.daily_cap,
    'today_count', (SELECT count(*) FROM public.agent_inbound_requests r WHERE r.member_id = p.user_id AND r.created_at > now() - interval '1 day'),
    'domain_blocked', EXISTS (SELECT 1 FROM public.agent_blocked_domains b WHERE b.user_id = p.user_id AND b.domain = lower(p_domain)));
END $$;
REVOKE ALL ON FUNCTION public.agent_inbound_prepare(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.agent_inbound_prepare(text, text, text) TO service_role;

-- Server: store a screened request. Re-checks the policy and block list so nothing is ever kept
-- for a member whose policy is off or who blocked the domain.
CREATE OR REPLACE FUNCTION public.agent_inbound_record(p_member uuid, p_status text, p_score integer, p_reasons text[], p jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_domain text := lower(coalesce(p->>'requester_domain', '')); v_name text := left(btrim(coalesce(p->>'requester_name', '')), 120);
BEGIN
  IF p_status NOT IN ('held','delivered') THEN RAISE EXCEPTION 'Only held or delivered requests are stored' USING errcode = '22023'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.agent_policies WHERE user_id = p_member AND mode <> 'off') THEN RETURN NULL; END IF;
  IF EXISTS (SELECT 1 FROM public.agent_blocked_domains WHERE user_id = p_member AND domain = v_domain) THEN RETURN NULL; END IF;
  INSERT INTO public.agent_inbound_requests (member_id, status, score, reasons, requester_name, requester_company, requester_email,
    requester_domain, requester_member, on_behalf_of, reason, offer, links, text_hash)
  VALUES (p_member, p_status, greatest(-100, least(100, p_score)), coalesce(p_reasons, '{}'), v_name,
    coalesce(p->>'requester_company', ''), lower(btrim(p->>'requester_email')), v_domain,
    nullif(p->>'requester_member', '')::uuid, coalesce(p->>'on_behalf_of', ''), p->>'reason', coalesce(p->>'offer', ''),
    coalesce((SELECT array_agg(x) FROM jsonb_array_elements_text(coalesce(p->'links', '[]'::jsonb)) x), '{}'), p->>'text_hash')
  RETURNING id INTO v_id;
  IF p_status = 'delivered' THEN
    INSERT INTO public.notifications (user_id, kind, text, link)
    VALUES (p_member, 'agent_request', 'An AI agent asked to reach you for ' || v_name || '. Review it in Agent Inbox.', '/app');
  END IF;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.agent_inbound_record(uuid, text, integer, text[], jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.agent_inbound_record(uuid, text, integer, text[], jsonb) TO service_role;

-- Member: accept (reveals the email to them and adds a CRM person), decline, or block the domain.
CREATE OR REPLACE FUNCTION public.decide_agent_request(p_id uuid, p_decision text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); r public.agent_inbound_requests; v_person uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in first' USING errcode = '42501'; END IF;
  SELECT * INTO r FROM public.agent_inbound_requests WHERE id = p_id AND member_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found' USING errcode = 'P0002'; END IF;
  IF r.status NOT IN ('held','delivered') THEN RAISE EXCEPTION 'This request was already decided' USING errcode = '22023'; END IF;
  IF p_decision = 'accept' THEN
    INSERT INTO public.crm_people (owner_id, full_name, email, company_name, source, notes)
    VALUES (v_uid, r.requester_name, r.requester_email, r.requester_company, 'Agent Inbox', left(r.reason, 1000))
    RETURNING id INTO v_person;
    UPDATE public.agent_inbound_requests SET status = 'accepted', decided_at = now(), crm_person_id = v_person WHERE id = r.id;
    RETURN jsonb_build_object('status', 'accepted', 'email', r.requester_email, 'crm_person_id', v_person);
  ELSIF p_decision = 'decline' THEN
    UPDATE public.agent_inbound_requests SET status = 'declined', decided_at = now() WHERE id = r.id;
    RETURN jsonb_build_object('status', 'declined');
  ELSIF p_decision = 'block' THEN
    INSERT INTO public.agent_blocked_domains (user_id, domain) VALUES (v_uid, r.requester_domain) ON CONFLICT DO NOTHING;
    UPDATE public.agent_inbound_requests SET status = 'blocked', decided_at = now()
      WHERE member_id = v_uid AND requester_domain = r.requester_domain AND status IN ('held','delivered');
    RETURN jsonb_build_object('status', 'blocked', 'domain', r.requester_domain);
  END IF;
  RAISE EXCEPTION 'Unknown decision' USING errcode = '22023';
END $$;
REVOKE ALL ON FUNCTION public.decide_agent_request(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decide_agent_request(uuid, text) TO authenticated;

-- Member: the requester's email for a request they accepted.
CREATE OR REPLACE FUNCTION public.agent_request_contact(p_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT requester_email FROM public.agent_inbound_requests WHERE id = p_id AND member_id = auth.uid() AND status = 'accepted'
$$;
REVOKE ALL ON FUNCTION public.agent_request_contact(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.agent_request_contact(uuid) TO authenticated;
