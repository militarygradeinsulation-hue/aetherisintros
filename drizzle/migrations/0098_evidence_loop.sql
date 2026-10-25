-- Opt-in, private timing and consented, mutually reported matching evidence.
-- Does not migrate private notes, identify counterparties or assert causality.
CREATE SCHEMA evidence_private;
REVOKE ALL ON SCHEMA evidence_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA evidence_private TO authenticated, service_role;

CREATE TABLE public.evidence_preferences (
 owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 timing boolean NOT NULL DEFAULT false,
 ranking boolean NOT NULL DEFAULT false,
 newcomer boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.task_time_records (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 task text NOT NULL CHECK(task IN ('contact','prep','followup','context','content','coordinate')),
 started_at timestamptz NOT NULL DEFAULT now(),
 finished_at timestamptz,
 active_seconds integer NOT NULL DEFAULT 0 CHECK(active_seconds BETWEEN 0 AND 14400),
 baseline_seconds integer CHECK(baseline_seconds BETWEEN 1 AND 14400),
 baseline_kind text CHECK(baseline_kind IN ('estimate','observed')),
 baseline_samples integer NOT NULL DEFAULT 0 CHECK(baseline_samples BETWEEN 0 AND 1000),
 CHECK((baseline_seconds IS NULL AND baseline_kind IS NULL AND baseline_samples=0) OR (baseline_seconds IS NOT NULL AND baseline_kind IS NOT NULL AND baseline_samples>0)),
 CHECK(finished_at IS NULL OR finished_at>=started_at)
);
CREATE UNIQUE INDEX task_time_one_running ON public.task_time_records(owner_id) WHERE finished_at IS NULL;
CREATE INDEX task_time_owner_recent ON public.task_time_records(owner_id,started_at DESC);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['evidence_preferences','task_time_records'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated',t);
  EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
  EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
  EXECUTE format('CREATE POLICY owner_read ON public.%I FOR SELECT TO authenticated USING(owner_id=auth.uid() AND public.is_live_member())',t);
 END LOOP;
END $$;
CREATE TRIGGER evidence_owner_immutable BEFORE UPDATE ON public.evidence_preferences FOR EACH ROW EXECUTE FUNCTION public.freeze_columns('owner_id');
CREATE TRIGGER task_time_identity_immutable BEFORE UPDATE ON public.task_time_records FOR EACH ROW EXECUTE FUNCTION public.freeze_columns('id','owner_id','task','started_at','baseline_seconds','baseline_kind','baseline_samples');

CREATE FUNCTION evidence_private.workspace(p_action text,p_data jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid:=auth.uid(); pref public.evidence_preferences; r public.task_time_records; seconds integer; result jsonb;
BEGIN
 IF u IS NULL OR NOT public.is_live_member() THEN RAISE EXCEPTION 'Approved membership required' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(p_data) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid command' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(u::text,498));
 SELECT * INTO pref FROM public.evidence_preferences WHERE owner_id=u;
 IF p_action='preferences' THEN
  IF jsonb_typeof(p_data->'timing') IS DISTINCT FROM 'boolean' OR jsonb_typeof(p_data->'ranking') IS DISTINCT FROM 'boolean' OR jsonb_typeof(p_data->'newcomer') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Choose each privacy setting' USING ERRCODE='22023'; END IF;
  INSERT INTO public.evidence_preferences(owner_id,timing,ranking,newcomer) VALUES(u,(p_data->>'timing')::boolean,(p_data->>'ranking')::boolean,(p_data->>'newcomer')::boolean)
  ON CONFLICT(owner_id) DO UPDATE SET timing=excluded.timing,ranking=excluded.ranking,newcomer=excluded.newcomer,updated_at=now();
  -- Revoking timing consent discards the incomplete session immediately.
  IF NOT (p_data->>'timing')::boolean THEN DELETE FROM public.task_time_records WHERE owner_id=u AND finished_at IS NULL; END IF;
 ELSIF p_action='start' THEN
  IF NOT coalesce(pref.timing,false) THEN RAISE EXCEPTION 'Enable private timing first' USING ERRCODE='42501'; END IF;
  IF EXISTS(SELECT 1 FROM public.task_time_records WHERE owner_id=u AND finished_at IS NULL) THEN RAISE EXCEPTION 'Finish or discard your current task first' USING ERRCODE='22023'; END IF;
  IF (SELECT count(*) FROM public.task_time_records WHERE owner_id=u)>=10000 THEN RAISE EXCEPTION 'Export and delete older timing records before continuing' USING ERRCODE='22023'; END IF;
  INSERT INTO public.task_time_records(owner_id,task,baseline_seconds,baseline_kind,baseline_samples)
   VALUES(u,p_data->>'task',(p_data->>'baselineSeconds')::integer,p_data->>'baselineKind',coalesce((p_data->>'baselineSamples')::integer,0));
 ELSIF p_action='finish' THEN
  IF NOT coalesce(pref.timing,false) THEN RAISE EXCEPTION 'Timing consent required' USING ERRCODE='42501'; END IF;
  SELECT * INTO r FROM public.task_time_records WHERE id=(p_data->>'id')::uuid AND owner_id=u FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Timing record not found' USING ERRCODE='42501'; END IF;
  -- Retry after a lost response is idempotent. No second record or changed duration.
  IF r.finished_at IS NULL THEN
   seconds:=(p_data->>'activeSeconds')::integer;
   IF seconds IS NULL OR seconds<1 OR seconds>14400 OR seconds>ceil(extract(epoch FROM(now()-r.started_at))) THEN RAISE EXCEPTION 'Invalid active duration' USING ERRCODE='22023'; END IF;
   UPDATE public.task_time_records SET finished_at=now(),active_seconds=seconds WHERE id=r.id;
  END IF;
 ELSIF p_action='delete' THEN
  DELETE FROM public.task_time_records WHERE owner_id=u AND id=(p_data->>'id')::uuid;
 ELSIF p_action='vouch' THEN
  IF jsonb_typeof(p_data->'approve') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Choose approval' USING ERRCODE='22023'; END IF;
  PERFORM public.set_executive_recommendation_display((p_data->>'id')::uuid,(p_data->>'approve')::boolean);
 ELSIF p_action='erase' THEN
  DELETE FROM public.task_time_records WHERE owner_id=u;
 ELSIF p_action<>'load' THEN RAISE EXCEPTION 'Unknown evidence action' USING ERRCODE='22023';
 END IF;
 SELECT jsonb_build_object(
  'preferences',coalesce((SELECT jsonb_build_object('timing',timing,'ranking',ranking,'newcomer',newcomer) FROM public.evidence_preferences WHERE owner_id=u),'{"timing":false,"ranking":false,"newcomer":false}'::jsonb),
  'records',coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.started_at DESC) FROM (SELECT id,task,started_at,finished_at,active_seconds,baseline_seconds,baseline_kind,baseline_samples FROM public.task_time_records WHERE owner_id=u ORDER BY started_at DESC LIMIT 10000) x),'[]'::jsonb),
  'vouches',coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT e.id,e.body,e.display_approved,p.name AS author_name FROM public.executive_recommendations e JOIN public.profiles p ON p.id=e.author_id WHERE e.recipient_id=u ORDER BY e.created_at DESC LIMIT 100) x),'[]'::jsonb),
  'newcomerUntil',(SELECT created_at+interval '30 days' FROM auth.users WHERE id=u)
 ) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION evidence_private.workspace(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION evidence_private.workspace(text,jsonb) TO authenticated;
CREATE FUNCTION public.evidence_workspace(p_action text DEFAULT 'load',p_data jsonb DEFAULT '{}') RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT evidence_private.workspace(p_action,p_data)$$;
REVOKE ALL ON FUNCTION public.evidence_workspace(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.evidence_workspace(text,jsonb) TO authenticated;

-- Historical recommendations did not persist recipient approval provenance.
-- New ranking uses only recommendations confirmed through this guard; legacy
-- display flags alone never become starter trust evidence.
ALTER TABLE public.executive_recommendations ADD COLUMN recipient_approved_at timestamptz;
CREATE FUNCTION evidence_private.guard_vouch() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  NEW.display_approved:=false; NEW.recipient_approved_at:=NULL;
 ELSE
  IF auth.uid() IS NOT NULL AND (NEW.author_id,NEW.recipient_id,NEW.id,NEW.created_at) IS DISTINCT FROM (OLD.author_id,OLD.recipient_id,OLD.id,OLD.created_at) THEN RAISE EXCEPTION 'Recommendation identity is immutable' USING ERRCODE='42501'; END IF;
  IF (NEW.body,NEW.relationship_context,NEW.outcome,NEW.who_should_meet) IS DISTINCT FROM (OLD.body,OLD.relationship_context,OLD.outcome,OLD.who_should_meet) THEN
   NEW.display_approved:=false; NEW.recipient_approved_at:=NULL;
  ELSIF auth.uid()=OLD.recipient_id THEN
   NEW.recipient_approved_at:=CASE WHEN NEW.display_approved THEN now() END;
  ELSIF (NEW.display_approved,NEW.recipient_approved_at) IS DISTINCT FROM (OLD.display_approved,OLD.recipient_approved_at) THEN
   RAISE EXCEPTION 'Only the recipient may approve a vouch' USING ERRCODE='42501';
  END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION evidence_private.guard_vouch() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER evidence_vouch_approval BEFORE INSERT OR UPDATE ON public.executive_recommendations FOR EACH ROW EXECUTE FUNCTION evidence_private.guard_vouch();

-- Explicit rank consent from BOTH participants is separate from permission to
-- show an outcome to its counterpart. Latest terminal reports must agree.
-- One contribution per distinct counterpart, a 365-day horizon, no values/notes.
CREATE FUNCTION evidence_private.match_signals(p_members uuid[]) RETURNS TABLE(
 member_id uuid, confirmed_partners integer, successful_partners integer,
 newcomer_until timestamptz, approved_vouches integer
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 WITH visible AS (
  SELECT p.id, s.ranking, CASE WHEN s.newcomer THEN u.created_at+interval '30 days' END AS newcomer_until
  FROM public.profiles p JOIN auth.users u ON u.id=p.id
  LEFT JOIN public.evidence_preferences s ON s.owner_id=p.id
  WHERE auth.uid() IS NOT NULL AND public.is_live_member() AND public.is_approved_member(auth.uid())
    AND p.id<>auth.uid() AND p.id=ANY(p_members)
    AND p.onboarded AND p.visibility IN ('network','public') AND public.is_approved_member(p.id)
  ORDER BY p.id LIMIT 100
 ), reports AS (
  SELECT DISTINCT ON (o.intro_request_id,o.author_id) o.intro_request_id,o.author_id,o.stage,o.outcome_category,o.shareable,o.attribution,o.created_at
  FROM public.intro_outcomes o
  JOIN public.intro_requests i ON i.id=o.intro_request_id
  WHERE i.accepted_at IS NOT NULL AND i.requester_opt_in AND i.member_opt_in
    AND i.accepted_at>=now()-interval '365 days'
    AND (i.user_id IN(SELECT id FROM visible) OR i.target_user_id IN(SELECT id FROM visible))
    AND o.author_id IN(i.user_id,i.target_user_id)
    AND o.stage IN ('outcome','no_outcome')
  ORDER BY o.intro_request_id,o.author_id,o.created_at DESC,o.id DESC
 ), paired AS (
  SELECT i.user_id a,i.target_user_id b,(r.stage='outcome') AS success,greatest(r.created_at,s.created_at) AS reported_at
  FROM public.intro_requests i
  JOIN reports r ON r.intro_request_id=i.id AND r.author_id=i.user_id
  JOIN reports s ON s.intro_request_id=i.id AND s.author_id=i.target_user_id
  JOIN public.evidence_preferences x ON x.owner_id=i.user_id AND x.ranking
  JOIN public.evidence_preferences y ON y.owner_id=i.target_user_id AND y.ranking
  WHERE i.user_id<>i.target_user_id AND r.shareable AND s.shareable AND r.stage=s.stage
    AND (r.stage='no_outcome' OR (r.outcome_category=s.outcome_category AND r.outcome_category IS NOT NULL AND r.attribution IN('direct','influenced') AND s.attribution IN('direct','influenced')))
 ), distinct_partners AS (
  SELECT DISTINCT ON(v.id,CASE WHEN a=v.id THEN b ELSE a END) v.id,
    CASE WHEN a=v.id THEN b ELSE a END AS partner,success
  FROM visible v JOIN paired ON a=v.id OR b=v.id WHERE v.ranking
  ORDER BY v.id,CASE WHEN a=v.id THEN b ELSE a END,reported_at DESC
 )
 SELECT v.id,
  (SELECT count(*)::integer FROM distinct_partners d WHERE d.id=v.id),
  (SELECT count(*)::integer FROM distinct_partners d WHERE d.id=v.id AND d.success),
  CASE WHEN v.newcomer_until>now() THEN v.newcomer_until END,
  (SELECT count(DISTINCT e.author_id)::integer FROM public.executive_recommendations e
   JOIN public.member_verifications mv ON mv.user_id=e.author_id AND mv.status='verified'
   WHERE e.recipient_id=v.id AND e.display_approved AND e.recipient_approved_at IS NOT NULL AND e.author_id<>v.id AND public.is_approved_member(e.author_id))
 FROM visible v;
$$;
REVOKE ALL ON FUNCTION evidence_private.match_signals(uuid[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION evidence_private.match_signals(uuid[]) TO authenticated;
CREATE FUNCTION public.match_evidence_signals(p_members uuid[]) RETURNS TABLE(
 member_id uuid,confirmed_partners integer,successful_partners integer,newcomer_until timestamptz,approved_vouches integer
) LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$SELECT * FROM evidence_private.match_signals(p_members)$$;
REVOKE ALL ON FUNCTION public.match_evidence_signals(uuid[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.match_evidence_signals(uuid[]) TO authenticated;
