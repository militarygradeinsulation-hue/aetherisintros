CREATE OR REPLACE FUNCTION public.icp_save(p_key text,p_data jsonb,p_expected bigint DEFAULT 0) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid:=auth.uid(); v bigint; old_data jsonb; person uuid; a text; b text; allowed jsonb := '{"new":["shortlisted","draft","dismissed","not_appropriate"],"shortlisted":["draft","dismissed","not_appropriate"],"draft":["approved","dismissed","not_appropriate"],"approved":["draft","invited","dismissed","not_appropriate"],"invited":["accepted","not_appropriate"],"accepted":["follow_up","not_appropriate"],"follow_up":["not_appropriate"],"dismissed":["shortlisted"],"not_appropriate":[]}';
BEGIN
 IF u IS NULL OR NOT public.has_role(u,'admin') THEN RAISE EXCEPTION 'Private owner access required'; END IF;
 IF p_key<>'icp:profiles' AND p_key NOT LIKE 'icp:person:%' THEN RAISE EXCEPTION 'Invalid key'; END IF;
 IF octet_length(p_data::text)>100000 THEN RAISE EXCEPTION 'Input too large'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(u::text||p_key));
 SELECT version,data INTO v,old_data FROM public.member_workspace_state WHERE user_id=u AND store_key=p_key;
 IF coalesce(v,0)<>p_expected THEN RAISE EXCEPTION 'Changed elsewhere. Reload before saving.'; END IF;
 IF p_key LIKE 'icp:person:%' THEN
  person:=substring(p_key from 12)::uuid;
  IF NOT EXISTS(SELECT 1 FROM public.crm_people WHERE id=person AND owner_id=u AND NOT archived) THEN RAISE EXCEPTION 'Person is not in your CRM'; END IF;
  a:=coalesce(old_data->>'status','new'); b:=p_data->>'status';
  IF b IS NULL OR NOT allowed ? b OR (b<>a AND NOT (allowed->a ? b)) THEN RAISE EXCEPTION 'Invalid transition'; END IF;
  IF b='approved' AND (length(trim(coalesce(p_data->>'note','')))=0 OR length(p_data->>'note')>300 OR coalesce((p_data->>'consent')::boolean,false)=false) THEN RAISE EXCEPTION 'Review note and confirm contact permission'; END IF;
  IF a='approved' AND b<>'draft' AND coalesce(old_data->>'note','')<>coalesce(p_data->>'note','') THEN RAISE EXCEPTION 'Edited notes require review again'; END IF;
  IF p_data=old_data THEN RETURN jsonb_build_object('version',v,'data',old_data); END IF;
  INSERT INTO public.crm_activities(owner_id,kind,subject,detail,person_id) VALUES(u,CASE WHEN b<>a AND b=ANY(ARRAY['invited','accepted','follow_up']) THEN 'message' ELSE 'note' END,'Prospect review: '||b,coalesce(p_data->>'note',''),person);
  INSERT INTO public.entity_events(owner_id,entity_type,entity_id,event,summary,source) VALUES(u,'crm_person',person::text,'prospect_review','Prospect review: '||b,'app');
  IF b<>a AND b=ANY(ARRAY['invited','accepted','follow_up']) THEN UPDATE public.crm_people SET last_activity_at=now() WHERE id=person AND owner_id=u; END IF;
 END IF;
 INSERT INTO public.member_workspace_state(user_id,store_key,data,version) VALUES(u,p_key,p_data,1) ON CONFLICT(user_id,store_key) DO UPDATE SET data=excluded.data,version=member_workspace_state.version+1,updated_at=now() RETURNING version INTO v;
 RETURN jsonb_build_object('version',v,'data',p_data);
END $$;
REVOKE ALL ON FUNCTION public.icp_save(text,jsonb,bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.icp_save(text,jsonb,bigint) TO authenticated;
CREATE OR REPLACE FUNCTION public.icp_state_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN IF NEW.store_key LIKE 'icp:%' AND (auth.uid() IS NULL OR NEW.user_id<>auth.uid() OR NOT public.has_role(auth.uid(),'admin')) THEN RAISE EXCEPTION 'Private owner access required'; END IF; RETURN NEW; END $$;
CREATE TRIGGER icp_private_workspace_guard BEFORE INSERT OR UPDATE ON public.member_workspace_state FOR EACH ROW EXECUTE FUNCTION public.icp_state_guard();