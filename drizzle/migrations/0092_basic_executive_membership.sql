-- Basic access is open to every email-confirmed account. Executive access is
-- granted only through an admin-reviewed application; titles/metadata do not elevate.
CREATE TABLE public.member_tiers (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier text NOT NULL DEFAULT 'basic' CHECK (tier IN ('basic','executive')),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.executive_applications (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL CHECK (length(full_name) BETWEEN 2 AND 120),
  title text NOT NULL CHECK (length(title) BETWEEN 2 AND 120),
  company text NOT NULL CHECK (length(company) BETWEEN 2 AND 160),
  profile_url text NOT NULL CHECK (length(profile_url) BETWEEN 8 AND 400),
  reason text NOT NULL CHECK (length(reason) BETWEEN 30 AND 2000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','declined')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.member_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executive_applications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.member_tiers, public.executive_applications FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.member_tiers, public.executive_applications TO service_role;
-- Existing approved network members retain their current capabilities on rollout.
INSERT INTO public.member_tiers(user_id,tier)
SELECT e.user_id,'executive' FROM public.early_access_members e WHERE e.status='approved'
ON CONFLICT(user_id) DO NOTHING;

CREATE FUNCTION public.my_membership_tier() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT CASE WHEN public.is_admin() THEN 'executive'
  ELSE coalesce((SELECT t.tier FROM public.member_tiers t WHERE t.user_id=auth.uid()),'basic') END
$$;
REVOKE ALL ON FUNCTION public.my_membership_tier() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.my_membership_tier() TO authenticated;

CREATE FUNCTION public.claim_basic_membership() RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE uid uuid := auth.uid(); em text; existing_status text;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Sign in first' USING ERRCODE='42501'; END IF;
 SELECT email INTO em FROM auth.users WHERE id=uid AND email_confirmed_at IS NOT NULL;
 IF em IS NULL THEN RAISE EXCEPTION 'Confirm your email first' USING ERRCODE='42501'; END IF;
 -- Do not turn suspended or denied members into basic members.
 SELECT status INTO existing_status FROM public.early_access_members WHERE user_id=uid FOR UPDATE;
 IF existing_status IN ('denied','suspended','revoked','rejected','banned') THEN RAISE EXCEPTION 'Account restricted' USING ERRCODE='42501'; END IF;
 IF existing_status IS DISTINCT FROM 'approved' THEN
  INSERT INTO public.early_access_members(user_id,email,status,approved_at)
  VALUES(uid,em,'approved',now())
  ON CONFLICT(user_id) DO UPDATE SET status='approved',approved_at=coalesce(early_access_members.approved_at,now()),updated_at=now();
 END IF;
 INSERT INTO public.member_tiers(user_id,tier) VALUES(uid,'basic') ON CONFLICT(user_id) DO NOTHING;
 RETURN public.my_membership_tier();
END $$;
REVOKE ALL ON FUNCTION public.claim_basic_membership() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.claim_basic_membership() TO authenticated;

CREATE FUNCTION public.apply_for_executive(p_name text,p_title text,p_company text,p_profile_url text,p_reason text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE uid uuid := auth.uid();
BEGIN
 IF uid IS NULL OR NOT public.is_live_member() THEN RAISE EXCEPTION 'Complete Basic onboarding first' USING ERRCODE='42501'; END IF;
 IF public.my_membership_tier()='executive' THEN RETURN 'approved'; END IF;
 IF length(btrim(coalesce(p_name,''))) NOT BETWEEN 2 AND 120 OR length(btrim(coalesce(p_title,''))) NOT BETWEEN 2 AND 120
 OR length(btrim(coalesce(p_company,''))) NOT BETWEEN 2 AND 160
 OR length(btrim(coalesce(p_reason,''))) NOT BETWEEN 30 AND 2000
 OR length(coalesce(p_profile_url,'')) NOT BETWEEN 8 AND 400
 OR p_profile_url !~* '^https://[^[:space:]]+$'
 THEN RAISE EXCEPTION 'Complete every field and include an HTTPS professional profile' USING ERRCODE='22023'; END IF;
 INSERT INTO public.executive_applications(user_id,full_name,title,company,profile_url,reason)
 VALUES(uid,btrim(p_name),btrim(p_title),btrim(p_company),btrim(p_profile_url),btrim(p_reason))
 ON CONFLICT(user_id) DO UPDATE SET
 full_name=excluded.full_name,title=excluded.title,company=excluded.company,
 profile_url=excluded.profile_url,reason=excluded.reason,
 status='pending',reviewed_by=NULL,reviewed_at=NULL
 WHERE executive_applications.status <> 'approved';
 RETURN 'pending';
END $$;
REVOKE ALL ON FUNCTION public.apply_for_executive(text,text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.apply_for_executive(text,text,text,text,text) TO authenticated;

CREATE FUNCTION public.my_executive_application() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT coalesce((SELECT jsonb_build_object('status',a.status,'submittedAt',a.created_at)
 FROM public.executive_applications a WHERE a.user_id=auth.uid()),'{}'::jsonb)
$$;
REVOKE ALL ON FUNCTION public.my_executive_application() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.my_executive_application() TO authenticated;

CREATE FUNCTION public.admin_executive_applications() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE result jsonb;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin only' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('userId',user_id,'name',full_name,'title',title,
 'company',company,'profileUrl',profile_url,'reason',reason,'status',status,'createdAt',created_at)
 ORDER BY created_at DESC),'[]'::jsonb) INTO result
 FROM public.executive_applications;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_executive_applications() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_executive_applications() TO authenticated;

CREATE FUNCTION public.review_executive_application(p_user uuid,p_approve boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin only' USING ERRCODE='42501'; END IF;
 UPDATE public.executive_applications SET status=CASE WHEN p_approve THEN 'approved' ELSE 'declined' END,
 reviewed_by=auth.uid(),reviewed_at=now() WHERE user_id=p_user AND status='pending';
 IF NOT FOUND THEN RAISE EXCEPTION 'No pending application' USING ERRCODE='22023'; END IF;
 IF p_approve THEN
  INSERT INTO public.member_tiers(user_id,tier,approved_by,approved_at)
  VALUES(p_user,'executive',auth.uid(),now())
  ON CONFLICT(user_id) DO UPDATE SET tier='executive',approved_by=excluded.approved_by,approved_at=excluded.approved_at;
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.review_executive_application(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_executive_application(uuid,boolean) TO authenticated;

-- Backend caps: a Basic member can initiate up to 3 introduction requests per
-- calendar month. This covers both the RPC and direct RLS-authorized inserts.
CREATE FUNCTION public.enforce_basic_intro_quota() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF auth.uid() IS NOT NULL AND NOT public.is_admin() AND public.my_membership_tier()='basic' THEN
  -- Serialize concurrent requests by the same member so parallel inserts cannot evade the quota.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text, 0));
  IF (SELECT count(*) FROM public.intro_requests r WHERE r.user_id=auth.uid()
      AND r.created_at >= date_trunc('month',now())
      AND r.created_at < date_trunc('month',now())+interval '1 month') >= 3
  THEN RAISE EXCEPTION 'Basic members can request three introductions per month. Apply for Executive to unlock more.' USING ERRCODE='42501'; END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enforce_basic_intro_quota() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER basic_intro_quota BEFORE INSERT ON public.intro_requests
FOR EACH ROW EXECUTE FUNCTION public.enforce_basic_intro_quota();

-- Opportunity publishing is Executive-only; Basic members can still browse
-- and express interest. Direct writes remain revoked/RLS-protected.
CREATE FUNCTION public.enforce_executive_opportunity_publish() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NOT public.is_admin() AND public.my_membership_tier()<>'executive' THEN
  RAISE EXCEPTION 'Executive approval required to publish opportunities' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enforce_executive_opportunity_publish() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER executive_opportunity_publish BEFORE INSERT ON public.professional_opportunities
FOR EACH ROW EXECUTE FUNCTION public.enforce_executive_opportunity_publish();
