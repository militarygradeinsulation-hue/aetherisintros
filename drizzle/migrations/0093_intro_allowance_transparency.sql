-- Give members an authoritative, private view of the introduction allowance.
-- Quotas remain enforced by 0092's database trigger; this is read-only.
CREATE FUNCTION public.my_intro_allowance() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE member_id uuid := auth.uid(); member_tier text; used_count integer; reset_at timestamptz;
BEGIN
 IF member_id IS NULL OR NOT public.is_live_member() THEN
  RAISE EXCEPTION 'Active membership required' USING ERRCODE='42501';
 END IF;
 member_tier := public.my_membership_tier();
 SELECT count(*)::integer INTO used_count FROM public.intro_requests r
 WHERE r.user_id=member_id
 AND r.created_at >= date_trunc('month',now())
 AND r.created_at < date_trunc('month',now()) + interval '1 month';
 reset_at := date_trunc('month',now()) + interval '1 month';
 RETURN jsonb_build_object('tier',member_tier,'used',used_count,
  'limit',CASE WHEN member_tier='executive' THEN null ELSE 3 END,
  'remaining',CASE WHEN member_tier='executive' THEN null ELSE greatest(0,3-used_count) END,
  'resetsAt',reset_at);
END $$;
REVOKE ALL ON FUNCTION public.my_intro_allowance() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.my_intro_allowance() TO authenticated;
