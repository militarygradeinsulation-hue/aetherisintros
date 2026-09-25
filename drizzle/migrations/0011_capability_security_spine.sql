-- P1 Capability security spine. Forward-only Drizzle migration.

-- ============ Helpers: entity ownership ============
CREATE OR REPLACE FUNCTION public.is_uuid_text(p text) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT p ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
$$;

CREATE OR REPLACE FUNCTION public.entity_owned_by(p_owner uuid, p_type text, p_id text) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v uuid;
BEGIN
  IF p_owner IS NULL OR p_id IS NULL OR char_length(p_id) = 0 THEN RETURN false; END IF;
  IF p_type = 'signal' OR p_type = 'ask' THEN
    RETURN EXISTS (SELECT 1 FROM public.asks a WHERE a.id = p_id AND a.author_id = p_owner);
  END IF;
  IF p_type = 'member' THEN
    RETURN public.is_uuid_text(p_id) AND EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = p_id::uuid);
  END IF;
  IF NOT public.is_uuid_text(p_id) THEN RETURN false; END IF;
  v := p_id::uuid;
  RETURN CASE p_type
    WHEN 'person' THEN EXISTS (SELECT 1 FROM public.crm_people x WHERE x.id = v AND x.owner_id = p_owner)
    WHEN 'company' THEN EXISTS (SELECT 1 FROM public.crm_companies x WHERE x.id = v AND x.owner_id = p_owner)
    WHEN 'opportunity' THEN EXISTS (SELECT 1 FROM public.crm_opportunities x WHERE x.id = v AND x.owner_id = p_owner)
    WHEN 'task' THEN EXISTS (SELECT 1 FROM public.crm_tasks x WHERE x.id = v AND x.owner_id = p_owner)
    WHEN 'note' THEN EXISTS (SELECT 1 FROM public.crm_notes x WHERE x.id = v AND x.owner_id = p_owner)
    WHEN 'activity' THEN EXISTS (SELECT 1 FROM public.crm_activities x WHERE x.id = v AND x.owner_id = p_owner)
    WHEN 'decision' THEN EXISTS (SELECT 1 FROM public.decisions x WHERE x.id = v AND x.user_id = p_owner)
    WHEN 'mission' THEN EXISTS (SELECT 1 FROM public.missions x WHERE x.id = v AND x.owner_id = p_owner)
    WHEN 'meeting' THEN EXISTS (SELECT 1 FROM public.calendar_events x WHERE x.id = v AND x.user_id = p_owner)
    WHEN 'intro_request' THEN EXISTS (SELECT 1 FROM public.intro_requests x WHERE x.id = v AND x.user_id = p_owner)
    WHEN 'negotiation' THEN EXISTS (SELECT 1 FROM public.negotiation_rooms x WHERE x.id = v AND x.owner_id = p_owner)
    WHEN 'scenario' THEN EXISTS (SELECT 1 FROM public.scenario_rooms x WHERE x.id = v AND x.owner_id = p_owner)
    WHEN 'self' THEN v = p_owner
    ELSE false
  END;
END $$;
REVOKE EXECUTE ON FUNCTION public.entity_owned_by(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.entity_owned_by(uuid, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.owns_entity(p_type text, p_id text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND public.entity_owned_by(auth.uid(), p_type, p_id)
$$;
REVOKE EXECUTE ON FUNCTION public.owns_entity(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owns_entity(text, text) TO authenticated, service_role;

-- ============ approval_queue hardening ============
ALTER TABLE public.approval_queue ADD COLUMN IF NOT EXISTS run_id uuid;
ALTER TABLE public.approval_queue ADD COLUMN IF NOT EXISTS proposal_id uuid;
ALTER TABLE public.approval_queue DROP CONSTRAINT approval_queue_action_type_check;
ALTER TABLE public.approval_queue ADD CONSTRAINT approval_queue_action_type_check CHECK (action_type IN
  ('send_message','request_intro','update_opportunity','create_follow_up','schedule_meeting','share_data','other','capability_proposal'));

DROP POLICY IF EXISTS "Owners manage their approvals" ON public.approval_queue;
REVOKE ALL ON public.approval_queue FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.approval_queue TO authenticated;
GRANT ALL ON public.approval_queue TO service_role;
CREATE POLICY "approvals read own" ON public.approval_queue FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "approvals insert pending own" ON public.approval_queue FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending' AND acted_at IS NULL AND run_id IS NULL AND proposal_id IS NULL AND action_type <> 'capability_proposal');
CREATE POLICY "approvals decide own" ON public.approval_queue FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status = 'pending') WITH CHECK (user_id = auth.uid() AND status IN ('approved','rejected'));
CREATE POLICY "approvals delete own" ON public.approval_queue FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.approval_transition_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR current_setting('app.approval_rpc', true) = '1' THEN RETURN NEW; END IF;
  IF (NEW.action_type, NEW.summary, NEW.payload, NEW.source, NEW.created_at, NEW.run_id, NEW.proposal_id)
     IS DISTINCT FROM (OLD.action_type, OLD.summary, OLD.payload, OLD.source, OLD.created_at, OLD.run_id, OLD.proposal_id) THEN
    RAISE EXCEPTION 'Approval content cannot be changed' USING errcode = '42501';
  END IF;
  IF OLD.status <> 'pending' OR NEW.status NOT IN ('approved','rejected') THEN
    RAISE EXCEPTION 'Approvals can only move from pending to approved or rejected' USING errcode = '42501';
  END IF;
  NEW.acted_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER approvals_transition_guard BEFORE UPDATE ON public.approval_queue
  FOR EACH ROW EXECUTE FUNCTION public.approval_transition_guard();

-- ============ entity_events provenance ============
DROP POLICY IF EXISTS "append own entity events" ON public.entity_events;
CREATE POLICY "append own app entity events" ON public.entity_events FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND source IN ('app','ask-intros') AND event NOT LIKE 'capability.%' AND event NOT LIKE 'proposal.%' AND event NOT LIKE 'finding.%');
REVOKE ALL ON public.entity_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.entity_events TO authenticated;
GRANT ALL ON public.entity_events TO service_role;

-- ============ entity_links integrity ============
ALTER TABLE public.entity_links ADD CONSTRAINT entity_links_type_chk CHECK (
  from_type IN ('person','company','opportunity','task','note','activity','decision','mission','meeting','intro_request','negotiation','scenario','signal','ask','member','self','capability_run','capability_finding','capability_proposal')
  AND to_type IN ('person','company','opportunity','task','note','activity','decision','mission','meeting','intro_request','negotiation','scenario','signal','ask','member','self','capability_run','capability_finding','capability_proposal')
) NOT VALID;
ALTER TABLE public.entity_links VALIDATE CONSTRAINT entity_links_type_chk;

-- ============ Capability tables ============
CREATE TABLE public.capability_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  actor_kind text NOT NULL DEFAULT 'member' CHECK (actor_kind IN ('member','delegate')),
  capability_id text NOT NULL CHECK (capability_id ~ '^[a-z]+(\.[a-z_]+)+$' AND char_length(capability_id) <= 80),
  verb text NOT NULL CHECK (verb IN ('diagnose','prepare','challenge','find','fix','draft','create','analyze','build','test')),
  subject_type text NOT NULL,
  subject_id text NOT NULL CHECK (char_length(subject_id) BETWEEN 1 AND 120),
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','context_built','running','needs_input','result_ready','proposals_ready','needs_approval','applied','closed','cancelled','failed','partial','unavailable')),
  progress integer NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  step_label text NOT NULL DEFAULT '' CHECK (char_length(step_label) <= 200),
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  input_hash text NOT NULL DEFAULT '',
  result jsonb,
  granted_scopes text[] NOT NULL DEFAULT '{}',
  web_domains text[] NOT NULL DEFAULT '{}',
  cost_tier text NOT NULL DEFAULT 'light' CHECK (cost_tier IN ('light','medium','heavy')),
  engine text CHECK (engine IS NULL OR engine IN ('deterministic','ai','hybrid')),
  error_code text,
  error_message text CHECK (error_message IS NULL OR char_length(error_message) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.capability_runs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.capability_runs TO authenticated;
GRANT ALL ON public.capability_runs TO service_role;
ALTER TABLE public.capability_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "runs read owner or actor" ON public.capability_runs FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR actor_id = auth.uid());
CREATE INDEX capability_runs_owner_idx ON public.capability_runs (owner_id, created_at DESC);
CREATE INDEX capability_runs_subject_idx ON public.capability_runs (owner_id, subject_type, subject_id);
CREATE TRIGGER capability_runs_freeze BEFORE UPDATE ON public.capability_runs
  FOR EACH ROW EXECUTE FUNCTION public.freeze_columns('owner_id','actor_id','actor_kind','capability_id','verb','subject_type','subject_id','input','input_hash','granted_scopes','created_at');

CREATE TABLE public.capability_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  run_id uuid NOT NULL REFERENCES public.capability_runs(id) ON DELETE CASCADE,
  capability_id text NOT NULL,
  subject_type text NOT NULL,
  subject_id text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('risk','gap','leak','pattern','competitive','unknown','opportunity')),
  claim text NOT NULL CHECK (char_length(claim) BETWEEN 1 AND 1000),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  confidence integer NOT NULL DEFAULT 50 CHECK (confidence BETWEEN 0 AND 100),
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(evidence) = 'array'),
  unknowns jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(unknowns) = 'array'),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','dismissed')),
  resolved_note text NOT NULL DEFAULT '' CHECK (char_length(resolved_note) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
REVOKE ALL ON public.capability_findings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.capability_findings TO authenticated;
GRANT ALL ON public.capability_findings TO service_role;
ALTER TABLE public.capability_findings ENABLE ROW LEVEL SECURITY;
CREATE INDEX capability_findings_subject_idx ON public.capability_findings (owner_id, subject_type, subject_id, status);
CREATE TRIGGER capability_findings_freeze BEFORE UPDATE ON public.capability_findings
  FOR EACH ROW EXECUTE FUNCTION public.freeze_columns('owner_id','run_id','capability_id','subject_type','subject_id','kind','claim','evidence','created_at');

CREATE TABLE public.capability_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  run_id uuid NOT NULL REFERENCES public.capability_runs(id) ON DELETE CASCADE,
  finding_id uuid REFERENCES public.capability_findings(id) ON DELETE SET NULL,
  impact text NOT NULL CHECK (impact IN ('read','draft','write','external')),
  summary text NOT NULL CHECK (char_length(summary) BETWEEN 1 AND 500),
  action jsonb NOT NULL DEFAULT '{}'::jsonb,
  target_type text NOT NULL,
  target_id text,
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','queued','applied','rejected','dismissed')),
  approval_id uuid,
  created_by uuid NOT NULL,
  created_by_kind text NOT NULL CHECK (created_by_kind IN ('member','delegate')),
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);
REVOKE ALL ON public.capability_proposals FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.capability_proposals TO authenticated;
GRANT ALL ON public.capability_proposals TO service_role;
ALTER TABLE public.capability_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "proposals read owner or creator" ON public.capability_proposals FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR created_by = auth.uid());
CREATE INDEX capability_proposals_run_idx ON public.capability_proposals (run_id);
CREATE TRIGGER capability_proposals_freeze BEFORE UPDATE ON public.capability_proposals
  FOR EACH ROW EXECUTE FUNCTION public.freeze_columns('owner_id','run_id','finding_id','impact','summary','action','target_type','target_id','created_by','created_by_kind','created_at');

CREATE TABLE public.capability_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  capability_id text NOT NULL CHECK (char_length(capability_id) <= 80),
  subject_type text NOT NULL,
  subject_id text NOT NULL,
  until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, capability_id, subject_type, subject_id)
);
REVOKE ALL ON public.capability_dismissals FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.capability_dismissals TO authenticated;
GRANT ALL ON public.capability_dismissals TO service_role;
ALTER TABLE public.capability_dismissals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dismissals read own" ON public.capability_dismissals FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "dismissals insert own" ON public.capability_dismissals FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "dismissals delete own" ON public.capability_dismissals FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE TABLE public.delegate_capability_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  principal_id uuid NOT NULL DEFAULT auth.uid(),
  delegate_id uuid NOT NULL REFERENCES public.delegates(id) ON DELETE CASCADE,
  capability_id text NOT NULL CHECK (capability_id = '*' OR capability_id ~ '^[a-z]+(\.[a-z_]+)+$'),
  subject_type text,
  subject_id text,
  access text NOT NULL CHECK (access IN ('read','run')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (subject_id IS NULL OR subject_type IS NOT NULL)
);
REVOKE ALL ON public.delegate_capability_grants FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.delegate_capability_grants TO authenticated;
GRANT ALL ON public.delegate_capability_grants TO service_role;
ALTER TABLE public.delegate_capability_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "grants principal read" ON public.delegate_capability_grants FOR SELECT TO authenticated
  USING (principal_id = auth.uid() OR EXISTS (SELECT 1 FROM public.delegates d WHERE d.id = delegate_id AND d.delegate_user_id = auth.uid()));
CREATE POLICY "grants principal insert" ON public.delegate_capability_grants FOR INSERT TO authenticated
  WITH CHECK (principal_id = auth.uid() AND EXISTS (SELECT 1 FROM public.delegates d WHERE d.id = delegate_id AND d.principal_id = auth.uid() AND d.status <> 'revoked'));
CREATE POLICY "grants principal delete" ON public.delegate_capability_grants FOR DELETE TO authenticated USING (principal_id = auth.uid());

CREATE TABLE public.capability_limits (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  light_daily integer NOT NULL DEFAULT 200 CHECK (light_daily >= 0),
  medium_daily integer NOT NULL DEFAULT 25 CHECK (medium_daily >= 0),
  heavy_daily integer NOT NULL DEFAULT 5 CHECK (heavy_daily >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
REVOKE ALL ON public.capability_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON public.capability_limits TO authenticated;
GRANT ALL ON public.capability_limits TO service_role;
ALTER TABLE public.capability_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "limits readable" ON public.capability_limits FOR SELECT TO authenticated USING (true);
CREATE POLICY "limits admin update" ON public.capability_limits FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
INSERT INTO public.capability_limits (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE public.capability_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  run_id uuid REFERENCES public.capability_runs(id) ON DELETE SET NULL,
  tier text NOT NULL CHECK (tier IN ('light','medium','heavy')),
  units numeric NOT NULL DEFAULT 1,
  provider text NOT NULL DEFAULT '',
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.capability_usage FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.capability_usage TO service_role;
ALTER TABLE public.capability_usage ENABLE ROW LEVEL SECURITY;
CREATE INDEX capability_usage_owner_day_idx ON public.capability_usage (owner_id, created_at DESC);

-- ============ Delegate capability check ============
CREATE OR REPLACE FUNCTION public.can_delegate(p_principal uuid, p_capability text, p_subject_type text, p_subject_id text, p_access text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.delegates d
    JOIN public.delegate_capability_grants g ON g.delegate_id = d.id AND g.principal_id = d.principal_id
    WHERE d.principal_id = p_principal AND d.delegate_user_id = auth.uid() AND d.status = 'active'
      AND (g.capability_id = '*' OR g.capability_id = p_capability)
      AND (g.subject_type IS NULL OR (g.subject_type = p_subject_type AND (g.subject_id IS NULL OR g.subject_id = p_subject_id)))
      AND (g.access = p_access OR (p_access = 'read' AND g.access = 'run')))
$$;
REVOKE EXECUTE ON FUNCTION public.can_delegate(uuid, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_delegate(uuid, text, text, text, text) TO authenticated, service_role;

CREATE POLICY "findings read owner or granted delegate" ON public.capability_findings FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.can_delegate(owner_id, capability_id, subject_type, subject_id, 'read'));

-- ============ entity_links verified writes ============
DROP POLICY IF EXISTS "own entity links" ON public.entity_links;
REVOKE ALL ON public.entity_links FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.entity_links TO authenticated;
GRANT ALL ON public.entity_links TO service_role;
CREATE POLICY "links read own" ON public.entity_links FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "links insert verified" ON public.entity_links FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND public.owns_entity(from_type, from_id) AND public.owns_entity(to_type, to_id));
CREATE POLICY "links delete own" ON public.entity_links FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- ============ RPCs ============
CREATE OR REPLACE FUNCTION public.link_entities(p_from_type text, p_from_id text, p_to_type text, p_to_id text, p_relation text DEFAULT 'linked')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING errcode = '42501'; END IF;
  IF NOT public.entity_owned_by(v_uid, p_from_type, p_from_id) OR NOT public.entity_owned_by(v_uid, p_to_type, p_to_id) THEN
    RAISE EXCEPTION 'Both linked records must belong to you' USING errcode = '42501';
  END IF;
  IF char_length(coalesce(p_relation,'')) NOT BETWEEN 1 AND 40 THEN RAISE EXCEPTION 'Invalid relation'; END IF;
  INSERT INTO public.entity_links (owner_id, from_type, from_id, to_type, to_id, relation)
  VALUES (v_uid, p_from_type, p_from_id, p_to_type, p_to_id, p_relation)
  ON CONFLICT (owner_id, from_type, from_id, to_type, to_id, relation) DO UPDATE SET relation = EXCLUDED.relation
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- Extend ownership for capability records (after tables exist).
CREATE OR REPLACE FUNCTION public.capability_record_owned_by(p_owner uuid, p_type text, p_id text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_uuid_text(p_id) AND CASE p_type
    WHEN 'capability_run' THEN EXISTS (SELECT 1 FROM public.capability_runs x WHERE x.id = p_id::uuid AND x.owner_id = p_owner)
    WHEN 'capability_finding' THEN EXISTS (SELECT 1 FROM public.capability_findings x WHERE x.id = p_id::uuid AND x.owner_id = p_owner)
    WHEN 'capability_proposal' THEN EXISTS (SELECT 1 FROM public.capability_proposals x WHERE x.id = p_id::uuid AND x.owner_id = p_owner)
    ELSE false END
$$;
REVOKE EXECUTE ON FUNCTION public.capability_record_owned_by(uuid, text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.entity_owned_by(p_owner uuid, p_type text, p_id text) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v uuid;
BEGIN
  IF p_owner IS NULL OR p_id IS NULL OR char_length(p_id) = 0 THEN RETURN false; END IF;
  IF p_type IN ('capability_run','capability_finding','capability_proposal') THEN
    RETURN public.capability_record_owned_by(p_owner, p_type, p_id);
  END IF;
  IF p_type = 'signal' OR p_type = 'ask' THEN
    RETURN EXISTS (SELECT 1 FROM public.asks a WHERE a.id = p_id AND a.author_id = p_owner);
  END IF;
  IF p_type = 'member' THEN
    RETURN public.is_uuid_text(p_id) AND EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = p_id::uuid);
  END IF;
  IF NOT public.is_uuid_text(p_id) THEN RETURN false; END IF;
  v := p_id::uuid;
  RETURN CASE p_type
    WHEN 'person' THEN EXISTS (SELECT 1 FROM public.crm_people x WHERE x.id = v AND x.owner_id = p_owner)
    WHEN 'company' THEN EXISTS (SELECT 1 FROM public.crm_companies x WHERE x.id = v AND x.owner_id = p_owner)
    WHEN 'opportunity' THEN EXISTS (SELECT 1 FROM public.crm_opportunities x WHERE x.id = v AND x.owner_id = p_owner)
    WHEN 'task' THEN EXISTS (SELECT 1 FROM public.crm_tasks x WHERE x.id = v AND x.owner_id = p_owner)
    WHEN 'note' THEN EXISTS (SELECT 1 FROM public.crm_notes x WHERE x.id = v AND x.owner_id = p_owner)
    WHEN 'activity' THEN EXISTS (SELECT 1 FROM public.crm_activities x WHERE x.id = v AND x.owner_id = p_owner)
    WHEN 'decision' THEN EXISTS (SELECT 1 FROM public.decisions x WHERE x.id = v AND x.user_id = p_owner)
    WHEN 'mission' THEN EXISTS (SELECT 1 FROM public.missions x WHERE x.id = v AND x.owner_id = p_owner)
    WHEN 'meeting' THEN EXISTS (SELECT 1 FROM public.calendar_events x WHERE x.id = v AND x.user_id = p_owner)
    WHEN 'intro_request' THEN EXISTS (SELECT 1 FROM public.intro_requests x WHERE x.id = v AND x.user_id = p_owner)
    WHEN 'negotiation' THEN EXISTS (SELECT 1 FROM public.negotiation_rooms x WHERE x.id = v AND x.owner_id = p_owner)
    WHEN 'scenario' THEN EXISTS (SELECT 1 FROM public.scenario_rooms x WHERE x.id = v AND x.owner_id = p_owner)
    WHEN 'self' THEN v = p_owner
    ELSE false
  END;
END $$;
REVOKE EXECUTE ON FUNCTION public.entity_owned_by(uuid, text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.append_capability_event(p_run_id uuid, p_event text, p_summary text DEFAULT '', p_detail jsonb DEFAULT '{}'::jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); r public.capability_runs; v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING errcode = '42501'; END IF;
  SELECT * INTO r FROM public.capability_runs WHERE id = p_run_id;
  IF NOT FOUND OR (r.owner_id <> v_uid AND r.actor_id <> v_uid) THEN RAISE EXCEPTION 'Run not found' USING errcode = '42501'; END IF;
  IF p_event !~ '^(capability|proposal|finding|asset)\.[a-z_]+$' THEN RAISE EXCEPTION 'Invalid capability event'; END IF;
  INSERT INTO public.entity_events (owner_id, entity_type, entity_id, event, summary, detail, source)
  VALUES (r.owner_id, r.subject_type, r.subject_id, p_event, left(coalesce(p_summary,''), 500),
          coalesce(p_detail,'{}'::jsonb) || jsonb_build_object('run_id', r.id, 'capability_id', r.capability_id, 'actor_id', v_uid, 'actor_kind', r.actor_kind, 'granted_scopes', to_jsonb(r.granted_scopes)),
          'capability')
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.start_capability_run(p_capability_id text, p_verb text, p_subject_type text, p_subject_id text,
  p_input jsonb DEFAULT '{}'::jsonb, p_input_hash text DEFAULT '', p_scopes text[] DEFAULT '{}', p_cost_tier text DEFAULT 'light', p_principal uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_owner uuid; v_kind text := 'member'; v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING errcode = '42501'; END IF;
  IF p_principal IS NOT NULL AND p_principal <> v_uid THEN
    IF NOT public.can_delegate(p_principal, p_capability_id, p_subject_type, p_subject_id, 'run') THEN
      RAISE EXCEPTION 'No delegate permission for this capability' USING errcode = '42501';
    END IF;
    v_owner := p_principal; v_kind := 'delegate';
  ELSE
    v_owner := v_uid;
  END IF;
  IF NOT public.entity_owned_by(v_owner, p_subject_type, p_subject_id) THEN
    RAISE EXCEPTION 'Subject not found' USING errcode = '42501';
  END IF;
  INSERT INTO public.capability_runs (owner_id, actor_id, actor_kind, capability_id, verb, subject_type, subject_id, input, input_hash, granted_scopes, cost_tier)
  VALUES (v_owner, v_uid, v_kind, p_capability_id, p_verb, p_subject_type, p_subject_id, coalesce(p_input,'{}'::jsonb), coalesce(p_input_hash,''), coalesce(p_scopes,'{}'), p_cost_tier)
  RETURNING id INTO v_id;
  PERFORM public.append_capability_event(v_id, 'capability.requested', 'Requested ' || p_capability_id, '{}'::jsonb);
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.capability_transition_allowed(p_from text, p_to text) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE p_from
    WHEN 'requested' THEN p_to IN ('context_built','cancelled','failed','unavailable')
    WHEN 'context_built' THEN p_to IN ('running','cancelled','failed','unavailable')
    WHEN 'running' THEN p_to IN ('running','needs_input','result_ready','partial','cancelled','failed','unavailable')
    WHEN 'needs_input' THEN p_to IN ('running','cancelled')
    WHEN 'result_ready' THEN p_to IN ('proposals_ready','closed')
    WHEN 'partial' THEN p_to IN ('proposals_ready','closed','running')
    WHEN 'proposals_ready' THEN p_to IN ('needs_approval','applied','closed')
    WHEN 'needs_approval' THEN p_to IN ('applied','closed')
    WHEN 'applied' THEN p_to IN ('closed')
    WHEN 'failed' THEN p_to IN ('running','closed')
    ELSE false END
$$;

CREATE OR REPLACE FUNCTION public.set_capability_run_status(p_run_id uuid, p_status text, p_progress integer DEFAULT NULL, p_step_label text DEFAULT NULL,
  p_engine text DEFAULT NULL, p_result jsonb DEFAULT NULL, p_error_code text DEFAULT NULL, p_error_message text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); r public.capability_runs;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING errcode = '42501'; END IF;
  SELECT * INTO r FROM public.capability_runs WHERE id = p_run_id FOR UPDATE;
  IF NOT FOUND OR (r.owner_id <> v_uid AND r.actor_id <> v_uid) THEN RAISE EXCEPTION 'Run not found' USING errcode = '42501'; END IF;
  IF NOT public.capability_transition_allowed(r.status, p_status) THEN
    RAISE EXCEPTION 'Run cannot move from % to %', r.status, p_status USING errcode = '22023';
  END IF;
  IF r.actor_kind = 'delegate' AND p_status = 'applied' THEN
    RAISE EXCEPTION 'Delegate runs are applied only through principal approval' USING errcode = '42501';
  END IF;
  UPDATE public.capability_runs SET
    status = p_status,
    progress = coalesce(p_progress, CASE WHEN p_status IN ('result_ready','applied','closed') THEN 100 ELSE progress END),
    step_label = coalesce(left(p_step_label, 200), step_label),
    engine = coalesce(p_engine, engine),
    result = coalesce(p_result, result),
    error_code = CASE WHEN p_status IN ('failed','unavailable','partial') THEN p_error_code ELSE NULL END,
    error_message = CASE WHEN p_status IN ('failed','unavailable','partial') THEN left(p_error_message, 500) ELSE NULL END,
    started_at = CASE WHEN p_status = 'running' THEN coalesce(started_at, now()) ELSE started_at END,
    finished_at = CASE WHEN p_status IN ('closed','cancelled','unavailable') THEN now() ELSE finished_at END,
    updated_at = now()
  WHERE id = p_run_id;
  PERFORM public.append_capability_event(p_run_id, 'capability.' || p_status, 'Run ' || p_status,
    jsonb_build_object('from', r.status, 'engine', p_engine, 'error_code', p_error_code));
END $$;

CREATE OR REPLACE FUNCTION public.add_capability_finding(p_run_id uuid, p_kind text, p_claim text, p_severity text DEFAULT 'medium',
  p_confidence integer DEFAULT 50, p_evidence jsonb DEFAULT '[]'::jsonb, p_unknowns jsonb DEFAULT '[]'::jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); r public.capability_runs; v_id uuid;
BEGIN
  SELECT * INTO r FROM public.capability_runs WHERE id = p_run_id;
  IF v_uid IS NULL OR NOT FOUND OR (r.owner_id <> v_uid AND r.actor_id <> v_uid) THEN RAISE EXCEPTION 'Run not found' USING errcode = '42501'; END IF;
  IF r.status NOT IN ('running','result_ready','partial') THEN RAISE EXCEPTION 'Findings can only be added while a run is producing results'; END IF;
  INSERT INTO public.capability_findings (owner_id, run_id, capability_id, subject_type, subject_id, kind, claim, severity, confidence, evidence, unknowns)
  VALUES (r.owner_id, r.id, r.capability_id, r.subject_type, r.subject_id, p_kind, p_claim, p_severity, p_confidence, coalesce(p_evidence,'[]'::jsonb), coalesce(p_unknowns,'[]'::jsonb))
  RETURNING id INTO v_id;
  PERFORM public.append_capability_event(p_run_id, 'finding.created', left(p_claim, 200), jsonb_build_object('finding_id', v_id, 'kind', p_kind));
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.resolve_capability_finding(p_id uuid, p_status text, p_note text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); f public.capability_findings;
BEGIN
  SELECT * INTO f FROM public.capability_findings WHERE id = p_id FOR UPDATE;
  IF v_uid IS NULL OR NOT FOUND OR f.owner_id <> v_uid THEN RAISE EXCEPTION 'Finding not found' USING errcode = '42501'; END IF;
  IF p_status NOT IN ('open','resolved','dismissed') THEN RAISE EXCEPTION 'Invalid finding status'; END IF;
  UPDATE public.capability_findings SET status = p_status, resolved_note = left(coalesce(p_note,''), 500),
    resolved_at = CASE WHEN p_status = 'open' THEN NULL ELSE now() END WHERE id = p_id;
  PERFORM public.append_capability_event(f.run_id, 'finding.' || p_status, 'Finding ' || p_status, jsonb_build_object('finding_id', p_id));
END $$;

CREATE OR REPLACE FUNCTION public.add_capability_proposal(p_run_id uuid, p_impact text, p_summary text, p_action jsonb, p_target_type text, p_target_id text DEFAULT NULL, p_finding_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); r public.capability_runs; v_id uuid;
BEGIN
  SELECT * INTO r FROM public.capability_runs WHERE id = p_run_id;
  IF v_uid IS NULL OR NOT FOUND OR (r.owner_id <> v_uid AND r.actor_id <> v_uid) THEN RAISE EXCEPTION 'Run not found' USING errcode = '42501'; END IF;
  IF r.status NOT IN ('running','result_ready','partial','proposals_ready') THEN RAISE EXCEPTION 'Proposals can only be added to an active run'; END IF;
  IF p_target_id IS NOT NULL AND NOT public.entity_owned_by(r.owner_id, p_target_type, p_target_id) THEN
    RAISE EXCEPTION 'Proposal target not found' USING errcode = '42501';
  END IF;
  IF p_finding_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.capability_findings f WHERE f.id = p_finding_id AND f.run_id = r.id) THEN
    RAISE EXCEPTION 'Finding does not belong to this run';
  END IF;
  INSERT INTO public.capability_proposals (owner_id, run_id, finding_id, impact, summary, action, target_type, target_id, created_by, created_by_kind)
  VALUES (r.owner_id, r.id, p_finding_id, p_impact, p_summary, coalesce(p_action,'{}'::jsonb), p_target_type, p_target_id, v_uid, r.actor_kind)
  RETURNING id INTO v_id;
  PERFORM public.append_capability_event(p_run_id, 'proposal.created', left(p_summary, 200), jsonb_build_object('proposal_id', v_id, 'impact', p_impact));
  RETURN v_id;
END $$;

-- Level 1 autonomy: read/draft may be applied by the owner; write/external always queue for approval.
CREATE OR REPLACE FUNCTION public.decide_capability_proposal(p_id uuid, p_decision text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); p public.capability_proposals; v_approval uuid;
BEGIN
  SELECT * INTO p FROM public.capability_proposals WHERE id = p_id FOR UPDATE;
  IF v_uid IS NULL OR NOT FOUND OR p.owner_id <> v_uid THEN RAISE EXCEPTION 'Proposal not found' USING errcode = '42501'; END IF;
  IF p.status <> 'proposed' THEN RAISE EXCEPTION 'Proposal already decided'; END IF;
  IF p_decision = 'apply' THEN
    IF p.impact IN ('write','external') OR p.created_by_kind = 'delegate' THEN
      RAISE EXCEPTION 'This change needs approval first' USING errcode = '42501';
    END IF;
    UPDATE public.capability_proposals SET status = 'applied', decided_at = now() WHERE id = p_id;
    PERFORM public.append_capability_event(p.run_id, 'proposal.applied', left(p.summary, 200), jsonb_build_object('proposal_id', p_id));
    RETURN NULL;
  ELSIF p_decision = 'queue' THEN
    PERFORM set_config('app.approval_rpc', '1', true);
    INSERT INTO public.approval_queue (user_id, action_type, summary, payload, source, status, run_id, proposal_id)
    VALUES (p.owner_id, 'capability_proposal', p.summary, jsonb_build_object('impact', p.impact, 'target_type', p.target_type, 'target_id', p.target_id, 'action', p.action), 'capability', 'pending', p.run_id, p.id)
    RETURNING id INTO v_approval;
    PERFORM set_config('app.approval_rpc', '0', true);
    UPDATE public.capability_proposals SET status = 'queued', approval_id = v_approval WHERE id = p_id;
    PERFORM public.append_capability_event(p.run_id, 'proposal.queued', left(p.summary, 200), jsonb_build_object('proposal_id', p_id, 'approval_id', v_approval));
    RETURN v_approval;
  ELSIF p_decision IN ('reject','dismiss') THEN
    UPDATE public.capability_proposals SET status = CASE WHEN p_decision = 'reject' THEN 'rejected' ELSE 'dismissed' END, decided_at = now() WHERE id = p_id;
    PERFORM public.append_capability_event(p.run_id, 'proposal.' || CASE WHEN p_decision = 'reject' THEN 'rejected' ELSE 'dismissed' END, left(p.summary, 200), jsonb_build_object('proposal_id', p_id));
    RETURN NULL;
  END IF;
  RAISE EXCEPTION 'Invalid decision';
END $$;

-- Only path to "executed": owner, after approval.
CREATE OR REPLACE FUNCTION public.mark_approval_executed(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); a public.approval_queue;
BEGIN
  SELECT * INTO a FROM public.approval_queue WHERE id = p_id FOR UPDATE;
  IF v_uid IS NULL OR NOT FOUND OR a.user_id <> v_uid THEN RAISE EXCEPTION 'Approval not found' USING errcode = '42501'; END IF;
  IF a.status <> 'approved' THEN RAISE EXCEPTION 'Only approved actions can be executed' USING errcode = '42501'; END IF;
  PERFORM set_config('app.approval_rpc', '1', true);
  UPDATE public.approval_queue SET status = 'executed', acted_at = now() WHERE id = p_id;
  PERFORM set_config('app.approval_rpc', '0', true);
  IF a.proposal_id IS NOT NULL THEN
    UPDATE public.capability_proposals SET status = 'applied', decided_at = now() WHERE id = a.proposal_id AND status = 'queued';
    PERFORM public.append_capability_event(a.run_id, 'proposal.applied', left(a.summary, 200), jsonb_build_object('proposal_id', a.proposal_id, 'approval_id', p_id));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.my_capability_usage_today()
RETURNS TABLE(tier text, used bigint, daily_limit integer) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.tier,
    (SELECT count(*) FROM public.capability_usage u WHERE u.owner_id = auth.uid() AND u.tier = t.tier AND u.created_at > date_trunc('day', now())),
    CASE t.tier WHEN 'light' THEN l.light_daily WHEN 'medium' THEN l.medium_daily ELSE l.heavy_daily END
  FROM (VALUES ('light'),('medium'),('heavy')) AS t(tier) CROSS JOIN public.capability_limits l
  WHERE auth.uid() IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION public.capability_usage_totals(p_days integer DEFAULT 7)
RETURNS TABLE(day date, tier text, runs bigint) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorised' USING errcode = '42501'; END IF;
  RETURN QUERY SELECT u.created_at::date, u.tier, count(*) FROM public.capability_usage u
    WHERE u.created_at > now() - make_interval(days => greatest(1, least(p_days, 90))) GROUP BY 1, 2 ORDER BY 1 DESC, 2;
END $$;

-- Function privileges: authenticated only, never anon/PUBLIC.
REVOKE EXECUTE ON FUNCTION public.link_entities(text, text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.append_capability_event(uuid, text, text, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.start_capability_run(text, text, text, text, jsonb, text, text[], text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_capability_run_status(uuid, text, integer, text, text, jsonb, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.add_capability_finding(uuid, text, text, text, integer, jsonb, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.resolve_capability_finding(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.add_capability_proposal(uuid, text, text, jsonb, text, text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.decide_capability_proposal(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_approval_executed(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.my_capability_usage_today() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.capability_usage_totals(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.link_entities(text, text, text, text, text), public.append_capability_event(uuid, text, text, jsonb),
  public.start_capability_run(text, text, text, text, jsonb, text, text[], text, uuid), public.set_capability_run_status(uuid, text, integer, text, text, jsonb, text, text),
  public.add_capability_finding(uuid, text, text, text, integer, jsonb, jsonb), public.resolve_capability_finding(uuid, text, text),
  public.add_capability_proposal(uuid, text, text, jsonb, text, text, uuid), public.decide_capability_proposal(uuid, text),
  public.mark_approval_executed(uuid), public.my_capability_usage_today(), public.capability_usage_totals(integer) TO authenticated, service_role;
