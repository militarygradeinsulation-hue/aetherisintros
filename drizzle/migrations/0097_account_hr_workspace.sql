-- Private, account-owned HR. No employer-wide access is inferred from profile text.
BEGIN;
CREATE SCHEMA hr_private;
REVOKE ALL ON SCHEMA hr_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA hr_private TO authenticated, service_role;
CREATE TABLE public.hr_workspaces (
 owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 context jsonb NOT NULL CHECK(jsonb_typeof(context)='object' AND octet_length(context::text)<=20000),
 version integer NOT NULL DEFAULT 1 CHECK(version>0),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.hr_records (
 id uuid PRIMARY KEY,owner_id uuid NOT NULL REFERENCES public.hr_workspaces(owner_id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('employee','job','candidate','task','leave','policy','review','training','benefit','timesheet','document')),
 fields jsonb NOT NULL CHECK(jsonb_typeof(fields)='object' AND octet_length(fields::text)<=100000),
 version integer NOT NULL DEFAULT 1 CHECK(version>0),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX hr_records_owner_kind ON public.hr_records(owner_id,kind);
CREATE TABLE public.hr_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 action text NOT NULL, kind text,record_id uuid,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX hr_audit_owner_time ON public.hr_audit(owner_id,created_at DESC);
ALTER TABLE public.hr_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hr_workspaces,public.hr_records,public.hr_audit FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.hr_workspaces,public.hr_records,public.hr_audit TO authenticated;
GRANT ALL ON public.hr_workspaces,public.hr_records,public.hr_audit TO service_role;
CREATE POLICY hr_workspace_owner_read ON public.hr_workspaces FOR SELECT TO authenticated USING(owner_id=(SELECT auth.uid()) AND public.is_live_member());
CREATE POLICY hr_record_owner_read ON public.hr_records FOR SELECT TO authenticated USING(owner_id=(SELECT auth.uid()) AND public.is_live_member());
CREATE POLICY hr_audit_owner_read ON public.hr_audit FOR SELECT TO authenticated USING(owner_id=(SELECT auth.uid()) AND public.is_live_member());
CREATE TRIGGER hr_workspace_freeze BEFORE UPDATE ON public.hr_workspaces FOR EACH ROW EXECUTE FUNCTION public.freeze_columns('owner_id');
CREATE TRIGGER hr_record_freeze BEFORE UPDATE ON public.hr_records FOR EACH ROW EXECUTE FUNCTION public.freeze_columns('id','owner_id','kind');
CREATE TRIGGER hr_audit_freeze BEFORE UPDATE ON public.hr_audit FOR EACH ROW EXECUTE FUNCTION public.freeze_columns('id','owner_id','record_id','kind','action','created_at');
-- No member DML grants: ownership, kind and IDs cannot be reassigned. All writes
-- use the serialized, version-checked commands below, including direct RPC calls.

CREATE FUNCTION hr_private.validate_fields(p_kind text,p_fields jsonb) RETURNS void
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE specs jsonb := '{"employee":[{"key":"name","label":"Full name","type":"text","required":true},{"key":"role","label":"Job title","type":"text","required":true},{"key":"department","label":"Department","type":"text","required":false},{"key":"manager","label":"Manager","type":"text","required":false},{"key":"email","label":"Work email","type":"text","required":false},{"key":"location","label":"Work location","type":"text","required":false},{"key":"start","label":"Start date","type":"date","required":false},{"key":"status","label":"Employment status","type":"select","required":true,"options":["Active","Onboarding","On leave","Departed"]},{"key":"type","label":"Engagement","type":"select","required":true,"options":["Employee","Contractor"]},{"key":"notes","label":"Work responsibilities","type":"textarea","required":false}],"job":[{"key":"title","label":"Role title","type":"text","required":true},{"key":"department","label":"Department","type":"text","required":false},{"key":"location","label":"Work location","type":"text","required":false},{"key":"employment","label":"Employment arrangement","type":"select","required":true,"options":["Full time","Part time","Contract","Temporary"]},{"key":"status","label":"Role status","type":"select","required":true,"options":["Draft","Open","Paused","Filled","Closed"]},{"key":"description","label":"Responsibilities and essential qualifications","type":"textarea","required":true},{"key":"compensation","label":"Compensation range and currency","type":"text","required":false},{"key":"due","label":"Target start date","type":"date","required":false}],"candidate":[{"key":"name","label":"Candidate name","type":"text","required":true},{"key":"job","label":"Open role","type":"job","required":true},{"key":"email","label":"Contact email","type":"text","required":false},{"key":"status","label":"Application stage","type":"select","required":true,"options":["Applied","Screening","Interview","Offer","Hired","Declined","Withdrawn"]},{"key":"evidence","label":"Job related evidence and interview notes","type":"textarea","required":false},{"key":"due","label":"Next follow up","type":"date","required":false}],"task":[{"key":"title","label":"Task","type":"text","required":true},{"key":"employee","label":"Employee","type":"employee","required":true},{"key":"workflow","label":"Workflow","type":"select","required":true,"options":["Onboarding","Offboarding","General"]},{"key":"assignee","label":"Responsible person","type":"text","required":true},{"key":"due","label":"Due date","type":"date","required":false},{"key":"status","label":"Task status","type":"select","required":true,"options":["To do","In progress","Done"]},{"key":"details","label":"Instructions","type":"textarea","required":false}],"leave":[{"key":"title","label":"Request label","type":"text","required":true},{"key":"employee","label":"Employee","type":"employee","required":true},{"key":"category","label":"Category","type":"select","required":true,"options":["Vacation","Personal","Unpaid","Other"]},{"key":"start","label":"First day","type":"date","required":true},{"key":"end","label":"Last day","type":"date","required":true},{"key":"hours","label":"Requested hours","type":"number","required":true,"max":744},{"key":"status","label":"Decision","type":"select","required":true,"options":["Pending","Approved","Declined","Cancelled"]},{"key":"approver","label":"Decision maker","type":"text","required":false}],"policy":[{"key":"title","label":"Policy title","type":"text","required":true},{"key":"content","label":"Policy text","type":"textarea","required":true},{"key":"status","label":"Review status","type":"select","required":true,"options":["Draft","In review","Approved","Retired"]},{"key":"reviewer","label":"Reviewer","type":"text","required":false},{"key":"due","label":"Review date","type":"date","required":false},{"key":"effective","label":"Effective date","type":"date","required":false}],"review":[{"key":"title","label":"Review title","type":"text","required":true},{"key":"employee","label":"Employee","type":"employee","required":true},{"key":"manager","label":"Review owner","type":"text","required":true},{"key":"goals","label":"Goals and agreed measures","type":"textarea","required":true},{"key":"evidence","label":"Observed work and employee feedback","type":"textarea","required":false},{"key":"development","label":"Support and development plan","type":"textarea","required":false},{"key":"status","label":"Review status","type":"select","required":true,"options":["Draft","Scheduled","Discussed","Complete"]},{"key":"due","label":"Review date","type":"date","required":false}],"training":[{"key":"title","label":"Training or credential","type":"text","required":true},{"key":"employee","label":"Employee","type":"employee","required":true},{"key":"provider","label":"Training provider","type":"text","required":false},{"key":"status","label":"Progress","type":"select","required":true,"options":["Assigned","In progress","Completed","Expired"]},{"key":"due","label":"Due or renewal date","type":"date","required":false},{"key":"evidence","label":"Completion reference","type":"textarea","required":false}],"benefit":[{"key":"title","label":"Benefit name","type":"text","required":true},{"key":"provider","label":"Provider","type":"text","required":false},{"key":"eligibility","label":"Eligibility to review","type":"textarea","required":false},{"key":"details","label":"Plan summary and provider contact","type":"textarea","required":true},{"key":"status","label":"Plan status","type":"select","required":true,"options":["Draft","Active","Closed"]},{"key":"due","label":"Renewal or enrollment deadline","type":"date","required":false}],"timesheet":[{"key":"title","label":"Pay period label","type":"text","required":true},{"key":"employee","label":"Employee","type":"employee","required":true},{"key":"start","label":"Period start","type":"date","required":true},{"key":"end","label":"Period end","type":"date","required":true},{"key":"regular","label":"Regular hours","type":"number","required":true,"max":744},{"key":"overtime","label":"Overtime hours","type":"number","required":true,"max":744},{"key":"rate","label":"Regular hourly rate","type":"number","required":true,"max":10000},{"key":"overtimeRate","label":"Overtime hourly rate","type":"number","required":true,"max":20000},{"key":"currency","label":"Currency","type":"select","required":true,"options":["USD","CAD","GBP","EUR","AUD"]},{"key":"status","label":"Hours approval","type":"select","required":true,"options":["Draft","Submitted","Approved","Exported"]}],"document":[{"key":"title","label":"Document title","type":"text","required":true},{"key":"category","label":"Document category","type":"text","required":false},{"key":"content","label":"Document text","type":"textarea","required":true},{"key":"status","label":"Review status","type":"select","required":true,"options":["Draft","In review","Approved","Archived"]},{"key":"reviewer","label":"Reviewer","type":"text","required":false},{"key":"due","label":"Review date","type":"date","required":false}]}'::jsonb; spec jsonb; pair record; val text; key text;
BEGIN
 IF NOT specs ? p_kind OR jsonb_typeof(p_fields) IS DISTINCT FROM 'object' OR octet_length(p_fields::text)>100000 THEN RAISE EXCEPTION 'Invalid HR record' USING ERRCODE='22023'; END IF;
 FOR pair IN SELECT * FROM jsonb_each(p_fields) LOOP
  IF jsonb_typeof(pair.value)<>'string' OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(specs->p_kind) v WHERE v->>'key'=pair.key) THEN RAISE EXCEPTION 'Unknown HR field' USING ERRCODE='22023'; END IF;
 END LOOP;
 FOR spec IN SELECT * FROM jsonb_array_elements(specs->p_kind) LOOP
  key:=spec->>'key'; val:=coalesce(p_fields->>key,'');
  IF (spec->>'required')::boolean AND length(btrim(val))=0 THEN RAISE EXCEPTION 'Required HR field is missing' USING ERRCODE='22023'; END IF;
  IF length(val)>(CASE WHEN spec->>'type'='textarea' THEN 20000 ELSE 500 END) THEN RAISE EXCEPTION 'HR field too long' USING ERRCODE='22023'; END IF;
  IF val<>'' THEN
   IF spec->>'type'='select' AND NOT ((spec->'options') ? val) THEN RAISE EXCEPTION 'Invalid HR choice' USING ERRCODE='22023'; END IF;
   IF spec->>'type'='date' AND (val !~ '^\d{4}-\d{2}-\d{2}$' OR to_char(val::date,'YYYY-MM-DD')<>val) THEN RAISE EXCEPTION 'Invalid HR date' USING ERRCODE='22023'; END IF;
   IF spec->>'type'='number' AND (val !~ '^\d+(\.\d+)?$' OR val::numeric NOT BETWEEN 0 AND (spec->>'max')::numeric) THEN RAISE EXCEPTION 'Invalid HR number' USING ERRCODE='22023'; END IF;
  END IF;
 END LOOP;
 IF coalesce(p_fields->>'start','')<>'' AND coalesce(p_fields->>'end','')<>'' AND p_fields->>'end'<p_fields->>'start' THEN RAISE EXCEPTION 'End date precedes start date' USING ERRCODE='22023'; END IF;
 IF p_kind='timesheet' AND (p_fields->>'regular')::numeric+(p_fields->>'overtime')::numeric>744 THEN RAISE EXCEPTION 'Hours exceed the period limit' USING ERRCODE='22023'; END IF;
 IF p_fields->>'status'='Approved' AND ((p_kind IN ('policy','document') AND length(btrim(coalesce(p_fields->>'reviewer','')))=0) OR (p_kind='leave' AND length(btrim(coalesce(p_fields->>'approver','')))=0)) THEN RAISE EXCEPTION 'Record the decision maker' USING ERRCODE='22023'; END IF;
END $$;

CREATE FUNCTION hr_private.dispatch(p_action text,p_data jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid:=auth.uid(); w public.hr_workspaces; rec public.hr_records; item jsonb; batch jsonb; changed integer; action_kind text; linked text; c jsonb;
BEGIN
 IF u IS NULL OR NOT public.is_live_member() THEN RAISE EXCEPTION 'Approved membership required' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(p_data) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid HR command' USING ERRCODE='22023'; END IF;
 -- Serialize first creation and subsequent writes for this account.
 PERFORM pg_advisory_xact_lock(hashtextextended(u::text,497));
 SELECT * INTO w FROM public.hr_workspaces WHERE owner_id=u FOR UPDATE;
 IF p_action='context' THEN
  c:=p_data->'context';
  IF jsonb_typeof(c) IS DISTINCT FROM 'object' OR octet_length(c::text)>20000 OR length(btrim(coalesce(c->>'company',''))) NOT BETWEEN 1 AND 180 OR c->>'workModel' NOT IN ('Field','Office','Hybrid','Remote') OR c->>'workModel' IS NULL
   OR EXISTS(SELECT 1 FROM jsonb_each(c) x WHERE jsonb_typeof(x.value)<>'string' OR x.key NOT IN ('company','industry','description','locations','teamSize','workModel','priorities','policyContext'))
   THEN RAISE EXCEPTION 'Invalid business context' USING ERRCODE='22023'; END IF;
  IF coalesce(w.version,0) IS DISTINCT FROM (p_data->>'version')::integer THEN RAISE EXCEPTION 'HR workspace changed. Reload before saving.' USING ERRCODE='40001'; END IF;
  INSERT INTO public.hr_workspaces(owner_id,context) VALUES(u,c) ON CONFLICT(owner_id) DO UPDATE SET context=excluded.context,version=hr_workspaces.version+1,updated_at=now();
  INSERT INTO public.hr_audit(owner_id,action) VALUES(u,'Business context saved');
 ELSIF p_action IN ('record','plan') THEN
  IF w.owner_id IS NULL THEN RAISE EXCEPTION 'Confirm your business setup first' USING ERRCODE='22023'; END IF;
  batch:=CASE WHEN p_action='record' THEN jsonb_build_array(p_data->'record') ELSE p_data->'records' END;
  IF jsonb_typeof(batch) IS DISTINCT FROM 'array' OR jsonb_array_length(batch) NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION 'Invalid HR batch' USING ERRCODE='22023'; END IF;
  FOR item IN SELECT * FROM jsonb_array_elements(batch) LOOP
   action_kind:=item->>'kind';PERFORM hr_private.validate_fields(action_kind,item->'fields');
   IF p_action='plan' AND (action_kind<>'task' OR (item->>'version')::integer IS DISTINCT FROM 0) THEN RAISE EXCEPTION 'Plans must contain new tasks' USING ERRCODE='22023'; END IF;
   FOREACH linked IN ARRAY ARRAY['employee','job'] LOOP
    IF coalesce(item->'fields'->>linked,'')<>'' AND NOT EXISTS(SELECT 1 FROM public.hr_records r WHERE r.owner_id=u AND r.id=(item->'fields'->>linked)::uuid AND r.kind=CASE WHEN linked='employee' THEN 'employee' ELSE 'job' END) THEN RAISE EXCEPTION 'Linked record is not in your HR account' USING ERRCODE='42501'; END IF;
   END LOOP;
   IF (item->>'version')::integer=0 THEN
    IF (SELECT count(*) FROM public.hr_records WHERE owner_id=u)>=1000 THEN RAISE EXCEPTION 'The workspace limit is 1000 records. Export and review older records.' USING ERRCODE='22023'; END IF;
    INSERT INTO public.hr_records(id,owner_id,kind,fields) VALUES((item->>'id')::uuid,u,action_kind,item->'fields');
   ELSE
    UPDATE public.hr_records SET fields=item->'fields',version=version+1,updated_at=now() WHERE id=(item->>'id')::uuid AND owner_id=u AND kind=action_kind AND version=(item->>'version')::integer;
    GET DIAGNOSTICS changed=ROW_COUNT;
    IF changed<>1 THEN RAISE EXCEPTION 'HR record changed. Reload before saving.' USING ERRCODE='40001'; END IF;
   END IF;
   INSERT INTO public.hr_audit(owner_id,action,kind,record_id) VALUES(u,CASE WHEN (item->>'version')::integer=0 THEN 'Record created' ELSE 'Record updated' END,action_kind,(item->>'id')::uuid);
  END LOOP;
 ELSIF p_action='delete' THEN
  SELECT * INTO rec FROM public.hr_records WHERE id=(p_data->>'id')::uuid AND owner_id=u;
  IF rec.id IS NULL OR rec.version IS DISTINCT FROM (p_data->>'version')::integer THEN RAISE EXCEPTION 'HR record changed. Reload before deleting.' USING ERRCODE='40001'; END IF;
  IF EXISTS(SELECT 1 FROM public.hr_records r WHERE r.owner_id=u AND (r.fields->>'employee'=rec.id::text OR r.fields->>'job'=rec.id::text)) THEN RAISE EXCEPTION 'Remove or reassign linked records before deleting this record.' USING ERRCODE='22023'; END IF;
  DELETE FROM public.hr_records WHERE id=rec.id AND owner_id=u;
  INSERT INTO public.hr_audit(owner_id,action,kind,record_id) VALUES(u,'Record deleted',rec.kind,rec.id);
 ELSIF p_action<>'load' THEN RAISE EXCEPTION 'Unknown HR action' USING ERRCODE='22023';
 END IF;
 RETURN jsonb_build_object('userId',u,'context',(SELECT context FROM public.hr_workspaces WHERE owner_id=u),'version',coalesce((SELECT version FROM public.hr_workspaces WHERE owner_id=u),0),
 'records',coalesce((SELECT jsonb_agg(jsonb_build_object('id',r.id,'kind',r.kind,'fields',r.fields,'version',r.version,'updated_at',r.updated_at) ORDER BY updated_at DESC) FROM public.hr_records r WHERE owner_id=u),'[]'),
 'audit',coalesce((SELECT jsonb_agg(to_jsonb(a)) FROM (SELECT action,kind,created_at FROM public.hr_audit WHERE owner_id=u ORDER BY created_at DESC,id DESC LIMIT 50) a),'[]'));
END $$;
CREATE FUNCTION public.hr_workspace(p_action text,p_data jsonb DEFAULT '{}') RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT hr_private.dispatch(p_action,p_data) $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA hr_private FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION hr_private.dispatch(text,jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.hr_workspace(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.hr_workspace(text,jsonb) TO authenticated;
COMMIT;
