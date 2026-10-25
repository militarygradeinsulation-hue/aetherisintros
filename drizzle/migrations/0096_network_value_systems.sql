-- Forward-only network systems. Activation must use the managed migration path.
-- Existing referral schema recovery is separately required for introduction release.
BEGIN;
CREATE SCHEMA network_value_private;
REVOKE ALL ON SCHEMA network_value_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA network_value_private TO authenticated, service_role;

CREATE TABLE public.nv_locations (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 city text NOT NULL CHECK(length(city) BETWEEN 1 AND 100),
 latitude numeric NOT NULL CHECK(latitude BETWEEN -90 AND 90 AND latitude=round(latitude,1)),
 longitude numeric NOT NULL CHECK(longitude BETWEEN -180 AND 180 AND longitude=round(longitude,1))
);
CREATE TABLE public.nv_capacity_posts (
 id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES auth.users(id),
 kind text NOT NULL CHECK(kind IN ('available','needed')),
 title text NOT NULL CHECK(length(title) BETWEEN 1 AND 120), details text NOT NULL CHECK(length(details) BETWEEN 1 AND 2000),
 city text NOT NULL, latitude numeric NOT NULL, longitude numeric NOT NULL,
 radius integer NOT NULL CHECK(radius BETWEEN 5 AND 100),
 starts_at timestamptz NOT NULL, expires_at timestamptz NOT NULL, closed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(expires_at>starts_at AND expires_at<=created_at+interval '30 days')
);
CREATE INDEX nv_capacity_active ON public.nv_capacity_posts(expires_at) WHERE closed_at IS NULL;
CREATE TABLE public.nv_capacity_letters (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), post_id uuid NOT NULL REFERENCES public.nv_capacity_posts(id),
 requester_id uuid NOT NULL REFERENCES auth.users(id), note text NOT NULL CHECK(length(note) BETWEEN 1 AND 1000),
 terms text NOT NULL DEFAULT '' CHECK(length(terms)<=3000),
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','offered','accepted','declined')),
 created_at timestamptz NOT NULL DEFAULT now(), offered_at timestamptz, accepted_at timestamptz,
 UNIQUE(post_id,requester_id)
);
-- One authorized contributor per independently reviewed legal business. Do not
-- derive business_key from self-entered company names or email domains. Assignment
-- is an operator action based on existing business verification evidence.
CREATE TABLE public.nv_benchmark_enrollments (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id), business_key text NOT NULL UNIQUE,
 trade text NOT NULL CHECK(length(trade) BETWEEN 1 AND 80),
 size_band text NOT NULL CHECK(size_band IN ('1 to 9','10 to 50','51 to 200','201 or more')),
 region text NOT NULL CHECK(length(region) BETWEEN 1 AND 80),
 verified_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.nv_benchmark_contributions (
 user_id uuid NOT NULL REFERENCES public.nv_benchmark_enrollments(user_id),
 business_key text NOT NULL, trade text NOT NULL, size_band text NOT NULL, region text NOT NULL,
 period date NOT NULL CHECK(period=date_trunc('quarter',period)::date),
 metric text NOT NULL CHECK(metric IN ('response_minutes','followup_percent','close_percent')),
 value numeric NOT NULL CHECK(value>=0 AND value<=CASE WHEN metric='response_minutes' THEN 43200 ELSE 100 END),
 consent_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(business_key,period,metric)
);
CREATE TABLE public.nv_benchmark_releases (
 trade text NOT NULL,size_band text NOT NULL,region text NOT NULL,period date NOT NULL,metric text NOT NULL,
 p25 numeric NOT NULL,median numeric NOT NULL,p75 numeric NOT NULL,
 companies_at_least integer NOT NULL CHECK(companies_at_least>=10),
 published_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(trade,size_band,region,period,metric)
);
CREATE TABLE public.nv_settlements (
 id uuid PRIMARY KEY,connector_id uuid NOT NULL REFERENCES auth.users(id),seller_id uuid NOT NULL REFERENCES auth.users(id),buyer_id uuid NOT NULL REFERENCES auth.users(id),
 title text NOT NULL CHECK(length(title) BETWEEN 1 AND 120),
 rate_bps integer NOT NULL CHECK(rate_bps BETWEEN 1 AND 10000),cap_cents bigint NOT NULL CHECK(cap_cents BETWEEN 100 AND 100000000),
 platform_bps integer NOT NULL DEFAULT 1000 CHECK(platform_bps=1000),window_months integer NOT NULL CHECK(window_months BETWEEN 1 AND 24),
 terms jsonb NOT NULL,terms_hash text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 released_at timestamptz,referral_id uuid REFERENCES public.referrals(id),cancelled_at timestamptz,
 CHECK(connector_id<>seller_id AND connector_id<>buyer_id AND seller_id<>buyer_id)
);
CREATE TABLE public.nv_settlement_signatures (
 agreement_id uuid NOT NULL REFERENCES public.nv_settlements(id),user_id uuid NOT NULL REFERENCES auth.users(id),
 typed_name text NOT NULL CHECK(length(typed_name) BETWEEN 1 AND 150),terms_hash text NOT NULL,
 consent_text text NOT NULL,signed_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(agreement_id,user_id)
);
CREATE TABLE public.nv_settlement_events (
 agreement_id uuid NOT NULL REFERENCES public.nv_settlements(id),step text NOT NULL CHECK(step IN ('intro_accepted','meeting_held','proposal_sent','closed_won','invoice_paid')),
 actor_id uuid NOT NULL REFERENCES auth.users(id),evidence text NOT NULL CHECK(length(evidence) BETWEEN 1 AND 1500),
 invoice_cents bigint CHECK(invoice_cents BETWEEN 1 AND 1000000000),created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(agreement_id,step)
);
-- No member may mutate these tables directly, even their own records. Every
-- action passes the authoritative state machine below. No raw peer rows leave it.
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['nv_locations','nv_capacity_posts','nv_capacity_letters','nv_benchmark_enrollments','nv_benchmark_contributions','nv_benchmark_releases','nv_settlements','nv_settlement_signatures','nv_settlement_events'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
  EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
  EXECUTE format('COMMENT ON TABLE public.%I IS %L',t,'Deny direct member access. Use the permission checked network_value RPC.');
 END LOOP;
END $$;

CREATE FUNCTION network_value_private.verified(p_uid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT p_uid IS NOT NULL AND public.is_approved_member(p_uid) AND EXISTS(
  SELECT 1 FROM public.member_verifications v WHERE v.user_id=p_uid AND v.status='verified' AND v.verified_at IS NOT NULL
 );
$$;
CREATE FUNCTION network_value_private.miles(a numeric,b numeric,c numeric,d numeric) RETURNS double precision
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT 3958.7613 * 2 * asin(sqrt(least(1::double precision,
 power(sin(radians((c-a)::double precision)/2),2)+cos(radians(a::double precision))*cos(radians(c::double precision))*power(sin(radians((d-b)::double precision)/2),2))));
$$;

-- Closed quarters only. Repeated publication is immutable, preventing queries
-- over arbitrary micro-cohorts or before/after contribution differencing. Counts
-- are bucketed, there are no minima/maxima or peer identities in the release.
CREATE FUNCTION network_value_private.publish_benchmarks(p_period date) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE n integer;
BEGIN
 IF p_period IS NULL OR p_period<>date_trunc('quarter',p_period)::date OR p_period+interval '3 months'>date_trunc('quarter',now()) THEN
  RAISE EXCEPTION 'Only a completed quarter can be released' USING ERRCODE='22023';
 END IF;
 INSERT INTO public.nv_benchmark_releases(trade,size_band,region,period,metric,p25,median,p75,companies_at_least)
 SELECT c.trade,c.size_band,c.region,c.period,c.metric,
 round((percentile_cont(.25) WITHIN GROUP(ORDER BY c.value))::numeric,2),
 round((percentile_cont(.50) WITHIN GROUP(ORDER BY c.value))::numeric,2),
 round((percentile_cont(.75) WITHIN GROUP(ORDER BY c.value))::numeric,2),
 (count(DISTINCT c.business_key)/5*5)::integer
 FROM public.nv_benchmark_contributions c WHERE c.period=p_period
 GROUP BY c.trade,c.size_band,c.region,c.period,c.metric
 HAVING count(DISTINCT c.business_key)>=10
 ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS n=ROW_COUNT; RETURN n;
END $$;

CREATE FUNCTION network_value_private.dispatch(p_action text,p_data jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 u uuid:=auth.uid(); loc public.nv_locations; post public.nv_capacity_posts;
 letter public.nv_capacity_letters; enrollment public.nv_benchmark_enrollments;
 agreement public.nv_settlements; other uuid; new_id uuid; terms jsonb;
 current_period date:=date_trunc('quarter',now())::date; steps text[]:=ARRAY['intro_accepted','meeting_held','proposal_sent','closed_won','invoice_paid'];
 step_index integer; expected_actor uuid; r integer:=coalesce((p_data->>'radius')::integer,60);
BEGIN
 IF u IS NULL OR NOT public.is_live_member() OR NOT public.is_approved_member(u) THEN
  RAISE EXCEPTION 'Approved membership required' USING ERRCODE='42501';
 END IF;
 IF jsonb_typeof(p_data)<>'object' OR r NOT BETWEEN 5 AND 100 THEN RAISE EXCEPTION 'Invalid request' USING ERRCODE='22023'; END IF;
 SELECT * INTO loc FROM public.nv_locations WHERE user_id=u;
 SELECT * INTO enrollment FROM public.nv_benchmark_enrollments WHERE user_id=u;
 IF p_action NOT IN ('load','location','benchmark_withdraw') AND NOT network_value_private.verified(u) THEN
  RAISE EXCEPTION 'Verified business membership required' USING ERRCODE='42501';
 END IF;
 CASE p_action
 WHEN 'load' THEN NULL;
 WHEN 'location' THEN
  IF length(btrim(p_data->>'city')) NOT BETWEEN 1 AND 100 OR (p_data->>'latitude')::numeric NOT BETWEEN -90 AND 90 OR (p_data->>'longitude')::numeric NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'Choose a valid location' USING ERRCODE='22023'; END IF;
  INSERT INTO public.nv_locations VALUES(u,btrim(p_data->>'city'),round((p_data->>'latitude')::numeric,1),round((p_data->>'longitude')::numeric,1))
  ON CONFLICT(user_id) DO UPDATE SET city=excluded.city,latitude=excluded.latitude,longitude=excluded.longitude;
 WHEN 'capacity_post' THEN
  IF loc.user_id IS NULL THEN RAISE EXCEPTION 'Save your approximate location first' USING ERRCODE='22023'; END IF;
  IF (p_data->>'expires_at')::timestamptz<=now() OR (p_data->>'starts_at')::timestamptz<now()-interval '1 day' THEN RAISE EXCEPTION 'Choose current availability dates' USING ERRCODE='22023'; END IF;
  INSERT INTO public.nv_capacity_posts(id,owner_id,kind,title,details,city,latitude,longitude,radius,starts_at,expires_at)
  VALUES((p_data->>'id')::uuid,u,p_data->>'kind',btrim(p_data->>'title'),btrim(p_data->>'details'),loc.city,loc.latitude,loc.longitude,r,(p_data->>'starts_at')::timestamptz,(p_data->>'expires_at')::timestamptz)
  ON CONFLICT(id) DO NOTHING;
  IF NOT EXISTS(SELECT 1 FROM public.nv_capacity_posts WHERE id=(p_data->>'id')::uuid AND owner_id=u) THEN RAISE EXCEPTION 'Post unavailable' USING ERRCODE='42501'; END IF;
 WHEN 'capacity_close' THEN
  UPDATE public.nv_capacity_posts SET closed_at=coalesce(closed_at,now()) WHERE id=(p_data->>'id')::uuid AND owner_id=u;
  IF NOT FOUND THEN RAISE EXCEPTION 'Post unavailable' USING ERRCODE='42501'; END IF;
 WHEN 'capacity_request' THEN
  SELECT * INTO post FROM public.nv_capacity_posts WHERE id=(p_data->>'post_id')::uuid FOR UPDATE;
  IF post.id IS NULL OR post.owner_id=u OR post.expires_at<=now() OR post.closed_at IS NOT NULL OR loc.user_id IS NULL OR NOT network_value_private.verified(post.owner_id)
   OR network_value_private.miles(loc.latitude,loc.longitude,post.latitude,post.longitude)>post.radius THEN RAISE EXCEPTION 'This post is not available to request' USING ERRCODE='42501'; END IF;
  INSERT INTO public.nv_capacity_letters(post_id,requester_id,note) VALUES(post.id,u,btrim(p_data->>'note')) ON CONFLICT(post_id,requester_id) DO NOTHING;
 WHEN 'capacity_terms','capacity_accept','capacity_decline' THEN
  SELECT * INTO letter FROM public.nv_capacity_letters WHERE id=(p_data->>'id')::uuid FOR UPDATE;
  SELECT * INTO post FROM public.nv_capacity_posts WHERE id=letter.post_id;
  IF letter.id IS NULL OR u NOT IN (post.owner_id,letter.requester_id) THEN RAISE EXCEPTION 'Request unavailable' USING ERRCODE='42501'; END IF;
  IF p_action='capacity_terms' THEN
   IF post.owner_id<>u OR letter.state NOT IN ('pending','offered') THEN RAISE EXCEPTION 'Only the owner may offer terms before acceptance' USING ERRCODE='42501'; END IF;
   IF length(btrim(p_data->>'terms')) NOT BETWEEN 1 AND 3000 THEN RAISE EXCEPTION 'Write the proposed terms' USING ERRCODE='22023'; END IF;
   UPDATE public.nv_capacity_letters SET terms=btrim(p_data->>'terms'),state='offered',offered_at=now() WHERE id=letter.id;
  ELSIF p_action='capacity_accept' THEN
   IF letter.requester_id<>u OR letter.state<>'offered' OR letter.terms IS DISTINCT FROM p_data->>'terms' THEN RAISE EXCEPTION 'Terms changed. Reopen and review before accepting.' USING ERRCODE='22023'; END IF;
   UPDATE public.nv_capacity_letters SET state='accepted',accepted_at=now() WHERE id=letter.id;
  ELSE
   IF letter.state='accepted' THEN RAISE EXCEPTION 'Accepted terms cannot be silently cancelled. Contact the other member.' USING ERRCODE='22023'; END IF;
   UPDATE public.nv_capacity_letters SET state='declined' WHERE id=letter.id;
  END IF;
 WHEN 'benchmark_share' THEN
  IF enrollment.user_id IS NULL THEN RAISE EXCEPTION 'A reviewed company cohort is required before sharing' USING ERRCODE='42501'; END IF;
  IF p_data->>'consent' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Explicit contribution consent required' USING ERRCODE='22023'; END IF;
  INSERT INTO public.nv_benchmark_contributions(user_id,business_key,trade,size_band,region,period,metric,value)
  VALUES(u,enrollment.business_key,enrollment.trade,enrollment.size_band,enrollment.region,current_period,p_data->>'metric',(p_data->>'value')::numeric)
  ON CONFLICT(business_key,period,metric) DO UPDATE SET value=excluded.value,consent_at=now() WHERE nv_benchmark_contributions.user_id=u;
 WHEN 'benchmark_withdraw' THEN
  DELETE FROM public.nv_benchmark_contributions WHERE user_id=u AND metric=p_data->>'metric';
 WHEN 'settlement_create' THEN
  IF NOT network_value_private.verified((p_data->>'seller_id')::uuid) OR NOT network_value_private.verified((p_data->>'buyer_id')::uuid) THEN RAISE EXCEPTION 'Choose verified members' USING ERRCODE='42501'; END IF;
  terms:=jsonb_build_object('version',1,'title',btrim(p_data->>'title'),'connector_id',u,'seller_id',p_data->>'seller_id','buyer_id',p_data->>'buyer_id',
   'connector_name',(SELECT name FROM public.profiles WHERE id=u),'seller_name',(SELECT name FROM public.profiles WHERE id=(p_data->>'seller_id')::uuid),'buyer_name',(SELECT name FROM public.profiles WHERE id=(p_data->>'buyer_id')::uuid),
   'rate_bps',(p_data->>'rate_bps')::integer,'cap_cents',(p_data->>'cap_cents')::bigint,'currency','USD','basis','First paid invoice only','payer','seller',
   'window_months',(p_data->>'window_months')::integer,'platform_bps',1000,'platform_fee_basis','10 percent of connector fee','processing','Payment processing charges are not included. Separate payment authorization is required.',
   'payment_activation','Electronic acknowledgement records terms only. No automatic debit, transfer or bank payout is authorized or executed by this pilot.');
  INSERT INTO public.nv_settlements(id,connector_id,seller_id,buyer_id,title,rate_bps,cap_cents,window_months,terms,terms_hash)
  VALUES((p_data->>'id')::uuid,u,(p_data->>'seller_id')::uuid,(p_data->>'buyer_id')::uuid,btrim(p_data->>'title'),(p_data->>'rate_bps')::integer,(p_data->>'cap_cents')::bigint,(p_data->>'window_months')::integer,terms,encode(sha256(convert_to(terms::text,'UTF8')),'hex'))
  ON CONFLICT(id) DO NOTHING;
  IF NOT EXISTS(SELECT 1 FROM public.nv_settlements WHERE id=(p_data->>'id')::uuid AND connector_id=u) THEN RAISE EXCEPTION 'Agreement unavailable' USING ERRCODE='42501'; END IF;
 WHEN 'settlement_sign','settlement_release','settlement_confirm','settlement_cancel' THEN
  SELECT * INTO agreement FROM public.nv_settlements WHERE id=(p_data->>'id')::uuid FOR UPDATE;
  IF agreement.id IS NULL OR u NOT IN (agreement.connector_id,agreement.seller_id,agreement.buyer_id) THEN RAISE EXCEPTION 'Agreement unavailable' USING ERRCODE='42501'; END IF;
  IF agreement.cancelled_at IS NOT NULL THEN RAISE EXCEPTION 'This agreement was cancelled' USING ERRCODE='22023'; END IF;
  IF p_action='settlement_sign' THEN
   IF agreement.terms_hash IS DISTINCT FROM p_data->>'terms_hash' OR p_data->>'consent' IS DISTINCT FROM 'true' OR agreement.released_at IS NOT NULL THEN RAISE EXCEPTION 'Review the current terms before signing' USING ERRCODE='22023'; END IF;
   INSERT INTO public.nv_settlement_signatures(agreement_id,user_id,typed_name,terms_hash,consent_text)
   VALUES(agreement.id,u,btrim(p_data->>'typed_name'),agreement.terms_hash,'I have read and electronically acknowledge these exact referral terms. I understand payments are not activated.') ON CONFLICT DO NOTHING;
  ELSIF p_action='settlement_cancel' THEN
   IF agreement.released_at IS NOT NULL THEN RAISE EXCEPTION 'Released agreements retain their audit record. Contact the parties to resolve changes.' USING ERRCODE='22023'; END IF;
   UPDATE public.nv_settlements SET cancelled_at=now() WHERE id=agreement.id;
  ELSIF p_action='settlement_release' THEN
   IF to_regprocedure('public.create_referral(uuid,uuid,text,uuid)') IS NULL THEN RAISE EXCEPTION 'Referral release is awaiting database recovery. Signed terms are preserved.' USING ERRCODE='22023'; END IF;
   IF u<>agreement.connector_id OR (SELECT count(*) FROM public.nv_settlement_signatures WHERE agreement_id=agreement.id AND terms_hash=agreement.terms_hash)<>3 THEN RAISE EXCEPTION 'All three parties must sign before release' USING ERRCODE='42501'; END IF;
   IF agreement.released_at IS NULL THEN
    IF NOT network_value_private.verified(agreement.seller_id) OR NOT network_value_private.verified(agreement.buyer_id) THEN RAISE EXCEPTION 'A participant is no longer verified' USING ERRCODE='42501'; END IF;
    SELECT id INTO new_id FROM public.create_referral(agreement.seller_id,agreement.buyer_id,'Agreed referral: '||agreement.title,NULL);
    UPDATE public.nv_settlements SET referral_id=new_id,released_at=now() WHERE id=agreement.id;
   END IF;
  ELSE
   IF agreement.released_at IS NULL THEN RAISE EXCEPTION 'Release the signed introduction first' USING ERRCODE='22023'; END IF;
   step_index:=array_position(steps,p_data->>'step');
   IF step_index IS NULL THEN RAISE EXCEPTION 'Unknown milestone' USING ERRCODE='22023'; END IF;
   expected_actor:=CASE WHEN step_index IN (1,2) THEN agreement.buyer_id ELSE agreement.seller_id END;
   IF u<>expected_actor THEN RAISE EXCEPTION 'Only the responsible participant may confirm this milestone' USING ERRCODE='42501'; END IF;
   IF step_index>1 AND NOT EXISTS(SELECT 1 FROM public.nv_settlement_events WHERE agreement_id=agreement.id AND step=steps[step_index-1]) THEN RAISE EXCEPTION 'Confirm earlier milestones first' USING ERRCODE='22023'; END IF;
   IF step_index=4 AND now()>agreement.released_at+make_interval(months=>agreement.window_months) THEN RAISE EXCEPTION 'The agreed closing window has expired' USING ERRCODE='22023'; END IF;
   IF step_index=5 AND ((p_data->>'invoice_cents')::bigint IS NULL OR (p_data->>'invoice_cents')::bigint<=0) THEN RAISE EXCEPTION 'Enter the first paid invoice amount' USING ERRCODE='22023'; END IF;
   INSERT INTO public.nv_settlement_events(agreement_id,step,actor_id,evidence,invoice_cents)
   VALUES(agreement.id,steps[step_index],u,btrim(p_data->>'evidence'),CASE WHEN step_index=5 THEN (p_data->>'invoice_cents')::bigint ELSE NULL END) ON CONFLICT DO NOTHING;
  END IF;
 ELSE RAISE EXCEPTION 'Unknown network action' USING ERRCODE='22023';
 END CASE;
 SELECT * INTO loc FROM public.nv_locations WHERE user_id=u;
 RETURN jsonb_build_object('referrals_ready',to_regprocedure('public.create_referral(uuid,uuid,text,uuid)') IS NOT NULL,'user_id',u,'verified',network_value_private.verified(u),'period',current_period,
  'location',CASE WHEN loc.user_id IS NOT NULL THEN jsonb_build_object('city',loc.city,'latitude',loc.latitude,'longitude',loc.longitude) END,
  'cohort',CASE WHEN enrollment.user_id IS NOT NULL THEN jsonb_build_object('trade',enrollment.trade,'size_band',enrollment.size_band,'region',enrollment.region) END,
  'contributions',coalesce((SELECT jsonb_agg(jsonb_build_object('metric',metric,'value',value)) FROM public.nv_benchmark_contributions WHERE user_id=u AND period=current_period),'[]'),
  'benchmarks',coalesce((SELECT jsonb_agg(jsonb_build_object('metric',r.metric,'period',r.period,'value',c.value,'median',r.median,'p25',r.p25,'p75',r.p75,'companies_at_least',r.companies_at_least))
   FROM public.nv_benchmark_releases r JOIN public.nv_benchmark_contributions c USING(trade,size_band,region,period,metric)
   WHERE c.user_id=u AND network_value_private.verified(u)),'[]'),
  'posts',coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM (
   SELECT p.id,p.owner_id,p.kind,p.title,p.details,p.city,coalesce(v.business_name,'Verified business') AS company,
   (round((network_value_private.miles(loc.latitude,loc.longitude,p.latitude,p.longitude)/5)::numeric)*5)::integer AS distance_miles,
   p.starts_at,p.expires_at,p.radius,p.closed_at
   FROM public.nv_capacity_posts p JOIN public.member_verifications v ON v.user_id=p.owner_id AND v.status='verified' AND v.verified_at IS NOT NULL
   WHERE network_value_private.verified(u) AND network_value_private.verified(p.owner_id) AND (p.owner_id=u OR (loc.user_id IS NOT NULL AND p.closed_at IS NULL AND p.expires_at>now() AND network_value_private.miles(loc.latitude,loc.longitude,p.latitude,p.longitude)<=least(r,p.radius)))
   ORDER BY p.created_at DESC LIMIT 100) x),'[]'),
  'letters',coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM (
   SELECT l.id,l.post_id,p.owner_id,l.requester_id,p.title,l.note,l.terms,l.state,l.created_at FROM public.nv_capacity_letters l JOIN public.nv_capacity_posts p ON p.id=l.post_id WHERE u IN(p.owner_id,l.requester_id) ORDER BY l.created_at DESC LIMIT 100) x),'[]'),
  'settlements',coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM (
   SELECT s.*,coalesce((SELECT jsonb_agg(to_jsonb(sig)) FROM public.nv_settlement_signatures sig WHERE sig.agreement_id=s.id),'[]') signatures,
   coalesce((SELECT jsonb_agg(to_jsonb(e) ORDER BY e.created_at) FROM public.nv_settlement_events e WHERE e.agreement_id=s.id),'[]') events
   FROM public.nv_settlements s WHERE u IN(s.connector_id,s.seller_id,s.buyer_id) ORDER BY s.created_at DESC LIMIT 100) x),'[]'),
  'members',coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT p.id,p.name,p.company FROM public.profiles p WHERE p.id<>u AND network_value_private.verified(u) AND network_value_private.verified(p.id) ORDER BY p.name LIMIT 200) x),'[]')
 );
END $$;

CREATE FUNCTION public.network_value(p_action text,p_data jsonb DEFAULT '{}') RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT network_value_private.dispatch(p_action,p_data) $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA network_value_private FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION network_value_private.dispatch(text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION network_value_private.publish_benchmarks(date) TO service_role;
REVOKE ALL ON FUNCTION public.network_value(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.network_value(text,jsonb) TO authenticated;
COMMIT;
