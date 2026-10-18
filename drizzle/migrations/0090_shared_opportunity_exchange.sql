-- Canonical Opportunity Exchange. Existing generic envelope is retained.
-- Only explicitly published, nonconfidential network/public posts are shared.
CREATE TABLE IF NOT EXISTS public.professional_opportunities (
 id text PRIMARY KEY, owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 scope text, data jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.professional_opportunity_saves (
 opportunity_id text REFERENCES public.professional_opportunities(id) ON DELETE CASCADE,
 user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, PRIMARY KEY(opportunity_id,user_id)
);
CREATE TABLE public.professional_opportunity_interests (
 opportunity_id text REFERENCES public.professional_opportunities(id) ON DELETE CASCADE,
 user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
 note text NOT NULL CHECK(length(note) BETWEEN 12 AND 2000),
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(opportunity_id,user_id)
);
ALTER TABLE public.professional_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_opportunity_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_opportunity_interests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.professional_opportunities, public.professional_opportunity_saves, public.professional_opportunity_interests FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.professional_opportunities, public.professional_opportunity_saves, public.professional_opportunity_interests TO service_role;

-- This helper is deliberately not executable by clients. Definer RPCs below
-- always check live membership before using it. Connections/confidential sharing
-- stays owner-only until a dedicated consent contract exists.
CREATE FUNCTION public.exchange_visible(p public.professional_opportunities) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT p.owner_id = auth.uid() OR (
   p.scope IN ('network','public') AND coalesce(p.data->>'confidential','false') = 'false'
   AND EXISTS (SELECT 1 FROM public.early_access_members e
     JOIN auth.users u ON u.id=e.user_id JOIN public.profiles pr ON pr.id=e.user_id
     WHERE e.user_id=p.owner_id AND e.status='approved' AND u.email_confirmed_at IS NOT NULL AND pr.onboarded
     AND NOT EXISTS(SELECT 1 FROM public.member_verifications v WHERE v.user_id=e.user_id AND v.status IN ('rejected','suspended')))
 )
$$;
REVOKE ALL ON FUNCTION public.exchange_visible(public.professional_opportunities) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.list_exchange_opportunities() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE result jsonb;
BEGIN
 IF NOT public.is_live_member() THEN RAISE EXCEPTION 'Live membership required' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'id',p.id,'ownerId',p.owner_id,'visibility',p.scope,'createdAt',p.created_at,
   'title',p.data->>'title','objective',p.data->>'objective','kind',p.data->>'kind',
   'whatIsNeeded',p.data->>'whatIsNeeded','whatIsOffered',p.data->>'whatIsOffered',
   'mutualValue',p.data->>'mutualValue','expiresOn',p.data->>'expiresOn','status',p.data->>'status',
   'saved',EXISTS(SELECT 1 FROM public.professional_opportunity_saves s WHERE s.opportunity_id=p.id AND s.user_id=auth.uid()),
   'interest',coalesce((SELECT jsonb_agg(jsonb_build_object('memberId',i.user_id,'note',i.note,'when',i.created_at))
     FROM public.professional_opportunity_interests i WHERE i.opportunity_id=p.id AND (p.owner_id=auth.uid() OR i.user_id=auth.uid())),'[]'::jsonb)
 ) ORDER BY p.created_at DESC),'[]'::jsonb) INTO result
 FROM (SELECT * FROM public.professional_opportunities o WHERE public.exchange_visible(o) ORDER BY o.created_at DESC LIMIT 100) p;
 RETURN result;
END $$;

CREATE FUNCTION public.publish_exchange_opportunity(p_input jsonb) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE new_id text := gen_random_uuid()::text; deadline date; k text;
BEGIN
 IF NOT public.is_live_member() THEN RAISE EXCEPTION 'Live membership required' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(p_input) IS DISTINCT FROM 'object' OR pg_column_size(p_input)>16000 THEN RAISE EXCEPTION 'Invalid opportunity'; END IF;
 FOREACH k IN ARRAY ARRAY['title','objective','whatIsNeeded','whatIsOffered','mutualValue'] LOOP
  IF jsonb_typeof(p_input->k) IS DISTINCT FROM 'string' OR length(btrim(p_input->>k)) NOT BETWEEN 3 AND (CASE WHEN k='title' THEN 140 ELSE 2000 END) THEN RAISE EXCEPTION 'Complete title, objective, need, offer and mutual value'; END IF;
 END LOOP;
 IF coalesce(p_input->>'kind','') NOT IN ('Partnership','Advisory role','Board seat','Acquisition','Investment','Pilot','Hiring','Expert request') THEN RAISE EXCEPTION 'Invalid opportunity kind'; END IF;
 IF coalesce(p_input->>'visibility','') NOT IN ('network','private') THEN RAISE EXCEPTION 'Invalid visibility'; END IF;
 IF coalesce(p_input->>'expiresOn','') !~ '^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'Invalid closing date'; END IF;
 deadline := (p_input->>'expiresOn')::date;
 IF deadline < (now() AT TIME ZONE 'UTC')::date OR deadline > (now() AT TIME ZONE 'UTC')::date+90 THEN RAISE EXCEPTION 'Closing date must be within 90 days'; END IF;
 INSERT INTO public.professional_opportunities(id,owner_id,scope,data) VALUES(new_id,auth.uid(),p_input->>'visibility',jsonb_build_object(
 'title',btrim(p_input->>'title'),'objective',btrim(p_input->>'objective'),'kind',p_input->>'kind',
 'whatIsNeeded',btrim(p_input->>'whatIsNeeded'),'whatIsOffered',btrim(p_input->>'whatIsOffered'),
 'mutualValue',btrim(p_input->>'mutualValue'),'expiresOn',deadline::text,'status','open','confidential',false));
 RETURN new_id;
END $$;

CREATE FUNCTION public.act_on_exchange_opportunity(p_id text,p_action text,p_note text DEFAULT '') RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE p public.professional_opportunities;
BEGIN
 IF NOT public.is_live_member() THEN RAISE EXCEPTION 'Live membership required' USING ERRCODE='42501'; END IF;
 SELECT * INTO p FROM public.professional_opportunities WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR NOT public.exchange_visible(p) THEN RAISE EXCEPTION 'Opportunity unavailable' USING ERRCODE='42501'; END IF;
 IF p_action='save' THEN
  INSERT INTO public.professional_opportunity_saves VALUES(p_id,auth.uid()) ON CONFLICT DO NOTHING;
 ELSIF p_action='unsave' THEN
  DELETE FROM public.professional_opportunity_saves WHERE opportunity_id=p_id AND user_id=auth.uid();
 ELSIF p_action='close' THEN
  IF p.owner_id<>auth.uid() THEN RAISE EXCEPTION 'Only the owner can close this opportunity' USING ERRCODE='42501'; END IF;
  UPDATE public.professional_opportunities SET data=jsonb_set(data,'{status}','"closed"'),updated_at=now() WHERE id=p_id;
 ELSIF p_action='interest' THEN
  IF p.owner_id=auth.uid() THEN RAISE EXCEPTION 'You own this opportunity'; END IF;
  IF coalesce(p.data->>'status','') NOT IN ('open','in-conversation','room-open','deal-room') OR coalesce(p.data->>'expiresOn','') !~ '^\d{4}-\d{2}-\d{2}$'
    THEN RAISE EXCEPTION 'Opportunity is not accepting interest'; END IF;
  IF (p.data->>'expiresOn')::date < (now() AT TIME ZONE 'UTC')::date THEN RAISE EXCEPTION 'Opportunity has expired'; END IF;
  IF length(btrim(coalesce(p_note,''))) NOT BETWEEN 12 AND 2000 THEN RAISE EXCEPTION 'Explain your fit in 12 to 2000 characters'; END IF;
  INSERT INTO public.professional_opportunity_interests(opportunity_id,user_id,note) VALUES(p_id,auth.uid(),btrim(p_note)) ON CONFLICT DO NOTHING;
 ELSE RAISE EXCEPTION 'Invalid opportunity action'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.list_exchange_opportunities(), public.publish_exchange_opportunity(jsonb), public.act_on_exchange_opportunity(text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_exchange_opportunities(), public.publish_exchange_opportunity(jsonb), public.act_on_exchange_opportunity(text,text,text) TO authenticated;
