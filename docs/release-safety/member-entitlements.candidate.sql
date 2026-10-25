-- PREPARATION ONLY: not a cutover migration. Do not apply until all feature
-- entry points and privileged handlers have entitlement enforcement.
-- Existing identity cards retain their verification meaning and identifiers.
CREATE TABLE IF NOT EXISTS public.member_legacy_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  networking boolean NOT NULL DEFAULT true,
  business boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.member_legacy_access TO service_role;
REVOKE ALL ON public.member_legacy_access FROM PUBLIC, anon, authenticated;
ALTER TABLE public.member_legacy_access ENABLE ROW LEVEL SECURITY;
-- A one-time snapshot, not a repeatable grant for future Basic signups.
-- The operator must run this candidate once, at the eventual cutover.
INSERT INTO public.member_legacy_access(user_id, networking, business)
SELECT e.user_id, true, coalesce(t.tier = 'executive', false)
FROM public.early_access_members e
LEFT JOIN public.member_tiers t ON t.user_id = e.user_id
WHERE e.status = 'approved'
ON CONFLICT(user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.my_member_entitlements()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE uid uuid := auth.uid(); li boolean := false; paid boolean := false;
        old_network boolean := false; old_business boolean := false;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Sign in first' USING ERRCODE='42501'; END IF;
  IF NOT public.is_live_member() THEN
    RETURN jsonb_build_object('level','basic','networking',false,'business',false,'blackCard',false,'linkedinVerified',false);
  END IF;
  -- Managed Auth identity records, never profiles or editable user metadata.
  SELECT EXISTS(SELECT 1 FROM auth.identities i WHERE i.user_id=uid
    AND i.provider='linkedin_oidc' AND length(btrim(coalesce(i.provider_id,''))) > 0) INTO li;
  -- A checkout return, trial, past-due record or expired period is not paid access.
  SELECT EXISTS(SELECT 1 FROM public.memberships m WHERE m.user_id=uid
    AND m.status='active' AND m.amount_cents > 0
    AND m.stripe_subscription_id IS NOT NULL
    AND m.current_period_end > now()) INTO paid;
  SELECT l.networking, l.business INTO old_network,old_business
    FROM public.member_legacy_access l WHERE l.user_id=uid;
  RETURN jsonb_build_object(
    'level', CASE WHEN paid THEN 'paid' WHEN coalesce(old_network,false) OR coalesce(old_business,false) THEN 'legacy'
                  WHEN li THEN 'linkedin_verified' ELSE 'basic' END,
    'networking', paid OR li OR coalesce(old_network,false),
    'business', paid OR coalesce(old_business,false),
    'blackCard', paid, 'linkedinVerified', li);
END $$;
REVOKE ALL ON FUNCTION public.my_member_entitlements() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_member_entitlements() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.require_member_feature(p_feature text)
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE e jsonb;
BEGIN
  IF p_feature NOT IN ('networking','business','blackCard') THEN
    RAISE EXCEPTION 'Unknown feature' USING ERRCODE='22023';
  END IF;
  e := public.my_member_entitlements();
  IF NOT coalesce((e->>p_feature)::boolean,false) THEN
    RAISE EXCEPTION 'Membership upgrade required' USING ERRCODE='42501';
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.require_member_feature(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.require_member_feature(text) TO authenticated, service_role;