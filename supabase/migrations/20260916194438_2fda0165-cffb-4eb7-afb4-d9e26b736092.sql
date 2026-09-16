-- 1. Fixed lookup path on remaining functions
ALTER FUNCTION public.memories_before_insert() SET search_path = public;
ALTER FUNCTION public.relative_label(timestamp with time zone) SET search_path = public;

-- 2. Least privilege on function execution
REVOKE ALL ON FUNCTION public.memories_before_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.relative_label(timestamp with time zone) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ensure_default_pipeline() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_early_access(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_live_member() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.founding_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_waitlist(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.connect_new_member_to_owner() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 3. Circle rosters: only circles the requester belongs to
CREATE OR REPLACE FUNCTION public.is_circle_member(p_circle text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.circle_memberships m
    WHERE m.circle_id = p_circle AND m.user_id = auth.uid()
  )
$$;
REVOKE ALL ON FUNCTION public.is_circle_member(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_circle_member(text) TO authenticated, service_role;

DROP POLICY IF EXISTS "memberships readable by members" ON public.circle_memberships;
CREATE POLICY "memberships readable within own circles"
ON public.circle_memberships FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_circle_member(circle_id));

-- 4. Directory: gated to approved live members, PII columns withheld
DROP POLICY IF EXISTS "Members can search contacts" ON public.directory_contacts;
CREATE POLICY "Live members can search contacts"
ON public.directory_contacts FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_live_member());

DROP POLICY IF EXISTS "Members can search companies" ON public.directory_companies;
CREATE POLICY "Live members can search companies"
ON public.directory_companies FOR SELECT TO authenticated
USING (public.is_live_member());

REVOKE SELECT ON public.directory_contacts FROM authenticated, anon;
GRANT SELECT (id, user_id, full_name, title, company_name, industry, location, seniority, source, is_member, created_at, updated_at)
ON public.directory_contacts TO authenticated;

REVOKE SELECT ON public.directory_companies FROM authenticated, anon;
GRANT SELECT (id, name, industry, city, region, country, website, employees, revenue, source, created_at, updated_at)
ON public.directory_companies TO authenticated;

-- 5. Profiles: member emails no longer readable across the network
REVOKE SELECT ON public.profiles FROM authenticated, anon;
GRANT SELECT (id, name, initials, title, company, location, focus, thesis, bio, looking_for, can_help_with,
  want_to_meet, availability, industries, expertise, avatar_url, onboarded, created_at, updated_at)
ON public.profiles TO authenticated;