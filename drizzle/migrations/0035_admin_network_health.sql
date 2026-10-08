-- Admin-only network health. network_health() was closed to everyone but the service role in
-- 0030 because it returned every member's email to anonymous callers; this wrapper gives the
-- same report to signed-in admins only, for the admin page.

CREATE OR REPLACE FUNCTION public.admin_network_health()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorised' USING errcode = '42501'; END IF;
  RETURN public.network_health();
END $$;
REVOKE ALL ON FUNCTION public.admin_network_health() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_network_health() TO authenticated;
