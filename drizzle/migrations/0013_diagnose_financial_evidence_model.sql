-- Findings: financial / evidence / cause-chain / outcome model (additive; existing rows unaffected)
ALTER TABLE public.capability_findings
  ADD COLUMN IF NOT EXISTS financial_classification text,
  ADD COLUMN IF NOT EXISTS financial_low numeric,
  ADD COLUMN IF NOT EXISTS financial_high numeric,
  ADD COLUMN IF NOT EXISTS currency text,
  ADD COLUMN IF NOT EXISTS root_cause text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cause_chain jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS overlap_group text,
  ADD COLUMN IF NOT EXISTS overlap_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS baseline_metric jsonb,
  ADD COLUMN IF NOT EXISTS target_metric jsonb,
  ADD COLUMN IF NOT EXISTS actual_outcome jsonb,
  ADD COLUMN IF NOT EXISTS recovered_value numeric,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS layer text NOT NULL DEFAULT 'fact',
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.capability_findings
  ADD CONSTRAINT findings_fin_class_chk CHECK (financial_classification IS NULL OR financial_classification IN ('verified_loss','attributed_loss','estimated_exposure','opportunity_value','risk_exposure')),
  ADD CONSTRAINT findings_currency_chk CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$'),
  ADD CONSTRAINT findings_fin_range_chk CHECK (financial_low IS NULL OR financial_high IS NULL OR (financial_low >= 0 AND financial_low <= financial_high)),
  ADD CONSTRAINT findings_fin_needs_class_chk CHECK ((financial_low IS NULL AND financial_high IS NULL) OR (currency IS NOT NULL AND financial_classification IS NOT NULL)),
  ADD CONSTRAINT findings_recovered_needs_verify_chk CHECK (recovered_value IS NULL OR (verified_at IS NOT NULL AND recovered_value >= 0)),
  ADD CONSTRAINT findings_root_cause_len_chk CHECK (char_length(root_cause) <= 500),
  ADD CONSTRAINT findings_chain_array_chk CHECK (jsonb_typeof(cause_chain) = 'array' AND jsonb_array_length(cause_chain) <= 12),
  ADD CONSTRAINT findings_overlap_group_chk CHECK (overlap_group IS NULL OR char_length(overlap_group) <= 120),
  ADD CONSTRAINT findings_layer_chk CHECK (layer IN ('fact','recommendation')),
  ADD CONSTRAINT findings_provider_chk CHECK (provider ~ '^[a-z_]{2,40}$');

-- Evidence rule: a leak needs >= 2 independent evidence references; any money figure needs evidence.
CREATE OR REPLACE FUNCTION public.capability_finding_evidence_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_refs integer;
BEGIN
  SELECT count(DISTINCT coalesce(e->>'kind','') || ':' || coalesce(e->>'ref',''))
    INTO v_refs FROM jsonb_array_elements(NEW.evidence) e WHERE coalesce(e->>'ref','') <> '';
  IF NEW.kind = 'leak' AND v_refs < 2 THEN
    RAISE EXCEPTION 'A revenue leak needs at least two independent evidence references' USING errcode = '23514';
  END IF;
  IF (NEW.financial_low IS NOT NULL OR NEW.financial_high IS NOT NULL) AND v_refs < 1 THEN
    RAISE EXCEPTION 'Financial values need evidence' USING errcode = '23514';
  END IF;
  IF NEW.financial_classification = 'verified_loss' AND NEW.verified_at IS NULL THEN
    RAISE EXCEPTION 'A verified loss needs verification' USING errcode = '23514';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS capability_findings_evidence_guard ON public.capability_findings;
CREATE TRIGGER capability_findings_evidence_guard BEFORE INSERT OR UPDATE ON public.capability_findings
  FOR EACH ROW EXECUTE FUNCTION public.capability_finding_evidence_guard();

-- Structured finding creation (server-side path only; direct table writes remain revoked).
CREATE OR REPLACE FUNCTION public.add_capability_finding_v2(p_run_id uuid, p jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); r public.capability_runs; v_id uuid;
BEGIN
  SELECT * INTO r FROM public.capability_runs WHERE id = p_run_id;
  IF v_uid IS NULL OR NOT FOUND OR (r.owner_id <> v_uid AND r.actor_id <> v_uid) THEN RAISE EXCEPTION 'Run not found' USING errcode = '42501'; END IF;
  IF r.status NOT IN ('running','result_ready','partial') THEN RAISE EXCEPTION 'Findings can only be added while a run is producing results'; END IF;
  INSERT INTO public.capability_findings (owner_id, run_id, capability_id, subject_type, subject_id, kind, claim, severity, confidence,
    evidence, unknowns, financial_classification, financial_low, financial_high, currency, root_cause, cause_chain, overlap_group,
    baseline_metric, target_metric, layer, provider)
  VALUES (r.owner_id, r.id, r.capability_id, r.subject_type, r.subject_id, p->>'kind', p->>'claim', coalesce(p->>'severity','medium'),
    coalesce((p->>'confidence')::int, 50), coalesce(p->'evidence','[]'::jsonb), coalesce(p->'unknowns','[]'::jsonb),
    nullif(p->>'financial_classification',''), (p->>'financial_low')::numeric, (p->>'financial_high')::numeric, nullif(p->>'currency',''),
    left(coalesce(p->>'root_cause',''), 500), coalesce(p->'cause_chain','[]'::jsonb), nullif(p->>'overlap_group',''),
    p->'baseline_metric', p->'target_metric', coalesce(p->>'layer','fact'), coalesce(p->>'provider','internal'))
  RETURNING id INTO v_id;
  PERFORM public.append_capability_event(p_run_id, 'finding.created', left(p->>'claim', 200), jsonb_build_object('finding_id', v_id, 'kind', p->>'kind'));
  RETURN v_id;
END $$;

-- Memory events: allow memory/outcome namespaces on the capability event path.
CREATE OR REPLACE FUNCTION public.append_capability_event(p_run_id uuid, p_event text, p_summary text DEFAULT '', p_detail jsonb DEFAULT '{}'::jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); r public.capability_runs; v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING errcode = '42501'; END IF;
  SELECT * INTO r FROM public.capability_runs WHERE id = p_run_id;
  IF NOT FOUND OR (r.owner_id <> v_uid AND r.actor_id <> v_uid) THEN RAISE EXCEPTION 'Run not found' USING errcode = '42501'; END IF;
  IF p_event !~ '^(capability|proposal|finding|asset|memory|outcome)\.[a-z_]+$' THEN RAISE EXCEPTION 'Invalid capability event'; END IF;
  INSERT INTO public.entity_events (owner_id, entity_type, entity_id, event, summary, detail, source)
  VALUES (r.owner_id, r.subject_type, r.subject_id, p_event, left(coalesce(p_summary,''), 500),
          coalesce(p_detail,'{}'::jsonb) || jsonb_build_object('run_id', r.id, 'capability_id', r.capability_id, 'actor_id', v_uid, 'actor_kind', r.actor_kind, 'granted_scopes', to_jsonb(r.granted_scopes)),
          'capability')
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- Record public domains queried (transparency), owner/actor only, only when public research was approved.
CREATE OR REPLACE FUNCTION public.record_capability_web_domain(p_run_id uuid, p_domain text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); r public.capability_runs;
BEGIN
  SELECT * INTO r FROM public.capability_runs WHERE id = p_run_id FOR UPDATE;
  IF v_uid IS NULL OR NOT FOUND OR (r.owner_id <> v_uid AND r.actor_id <> v_uid) THEN RAISE EXCEPTION 'Run not found' USING errcode = '42501'; END IF;
  IF NOT ('web:read' = ANY (r.granted_scopes)) THEN RAISE EXCEPTION 'Public research was not approved for this run' USING errcode = '42501'; END IF;
  IF p_domain !~ '^[a-z0-9.-]{3,120}$' THEN RAISE EXCEPTION 'Invalid domain'; END IF;
  UPDATE public.capability_runs SET web_domains = array(SELECT DISTINCT unnest(web_domains || p_domain)) WHERE id = p_run_id;
END $$;

-- Baseline / target for closed-loop tracking (owner only).
CREATE OR REPLACE FUNCTION public.set_finding_baseline(p_id uuid, p_baseline jsonb, p_target jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); f public.capability_findings;
BEGIN
  SELECT * INTO f FROM public.capability_findings WHERE id = p_id FOR UPDATE;
  IF v_uid IS NULL OR NOT FOUND OR f.owner_id <> v_uid THEN RAISE EXCEPTION 'Finding not found' USING errcode = '42501'; END IF;
  UPDATE public.capability_findings SET baseline_metric = p_baseline, target_metric = p_target WHERE id = p_id;
END $$;

-- Outcome verification: recovered value only after an applied proposal AND with evidence.
CREATE OR REPLACE FUNCTION public.record_finding_outcome(p_id uuid, p_actual jsonb, p_recovered numeric, p_evidence jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); f public.capability_findings; v_applied boolean; v_ev jsonb := coalesce(p_evidence,'[]'::jsonb);
BEGIN
  SELECT * INTO f FROM public.capability_findings WHERE id = p_id FOR UPDATE;
  IF v_uid IS NULL OR NOT FOUND OR f.owner_id <> v_uid THEN RAISE EXCEPTION 'Finding not found' USING errcode = '42501'; END IF;
  IF jsonb_typeof(v_ev) <> 'array' THEN RAISE EXCEPTION 'Evidence must be a list'; END IF;
  SELECT EXISTS (SELECT 1 FROM public.capability_proposals p WHERE p.finding_id = p_id AND p.status = 'applied') INTO v_applied;
  IF p_recovered IS NOT NULL THEN
    IF NOT v_applied THEN RAISE EXCEPTION 'Recovery can only be recorded after an applied action' USING errcode = '42501'; END IF;
    IF jsonb_array_length(v_ev) < 1 THEN RAISE EXCEPTION 'Recovered value needs verification evidence' USING errcode = '23514'; END IF;
  END IF;
  UPDATE public.capability_findings SET actual_outcome = p_actual, recovered_value = p_recovered,
    verified_at = CASE WHEN jsonb_array_length(v_ev) > 0 THEN now() ELSE verified_at END
  WHERE id = p_id;
  PERFORM public.append_capability_event(f.run_id, 'outcome.recorded', 'Outcome recorded',
    jsonb_build_object('finding_id', p_id, 'actual', p_actual, 'recovered', p_recovered, 'evidence', v_ev));
END $$;

-- Enterprise operating graph: extend allowed link types (superset of previous list).
ALTER TABLE public.entity_links DROP CONSTRAINT IF EXISTS entity_links_type_chk;
ALTER TABLE public.entity_links ADD CONSTRAINT entity_links_type_chk CHECK (
  from_type IN ('person','company','opportunity','task','note','activity','decision','mission','meeting','intro_request','negotiation','scenario','signal','ask','member','self','capability_run','capability_finding','capability_proposal','department','commitment','process','system','vendor','contract','customer','outcome')
  AND to_type IN ('person','company','opportunity','task','note','activity','decision','mission','meeting','intro_request','negotiation','scenario','signal','ask','member','self','capability_run','capability_finding','capability_proposal','department','commitment','process','system','vendor','contract','customer','outcome')
) NOT VALID;
ALTER TABLE public.entity_links VALIDATE CONSTRAINT entity_links_type_chk;

REVOKE EXECUTE ON FUNCTION public.add_capability_finding_v2(uuid, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.record_capability_web_domain(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_finding_baseline(uuid, jsonb, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.record_finding_outcome(uuid, jsonb, numeric, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.capability_finding_evidence_guard() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_capability_finding_v2(uuid, jsonb), public.record_capability_web_domain(uuid, text),
  public.set_finding_baseline(uuid, jsonb, jsonb), public.record_finding_outcome(uuid, jsonb, numeric, jsonb) TO authenticated, service_role;
