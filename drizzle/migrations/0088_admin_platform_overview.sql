-- Owner analytics are available only to authenticated users who hold the admin role.
-- Never place the owner's access code or email in source, URL parameters, or SQL.
CREATE OR REPLACE FUNCTION public.admin_platform_overview()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin access required' USING errcode = '42501';
  END IF;
  RETURN jsonb_build_object(
    'registered_accounts', (SELECT count(*) FROM auth.users),
    'confirmed_accounts', (SELECT count(*) FROM auth.users WHERE email_confirmed_at IS NOT NULL),
    'approved_members', (SELECT count(*) FROM public.early_access_members WHERE status = 'approved'),
    'pending_members', (SELECT count(*) FROM public.early_access_members WHERE status IN ('pending', 'waitlisted')),
    'onboarded_profiles', (SELECT count(*) FROM public.profiles WHERE onboarded IS TRUE),
    'posts', (SELECT count(*) FROM public.posts),
    'asks', (SELECT count(*) FROM public.asks),
    'messages', (SELECT count(*) FROM public.dm_messages),
    'introduction_requests', (SELECT count(*) FROM public.intro_requests),
    'generated_at', now()
  );
END $$;
REVOKE ALL ON FUNCTION public.admin_platform_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_platform_overview() TO authenticated;
