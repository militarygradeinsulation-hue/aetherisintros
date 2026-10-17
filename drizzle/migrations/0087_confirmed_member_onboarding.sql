-- 0087: An approved founding account can use the live network after it has
-- confirmed its email and completed real profile onboarding.
-- Business-role verification and its public badge are separate and earned.
-- Reviewer rejection or suspension always blocks access.
CREATE OR REPLACE FUNCTION public.is_live_member()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $live$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.early_access_members AS e
    JOIN auth.users AS u ON u.id = e.user_id
    JOIN public.profiles AS p ON p.id = e.user_id
    WHERE e.user_id = auth.uid()
      AND e.status = 'approved'
      AND u.email_confirmed_at IS NOT NULL
      AND p.onboarded IS TRUE
      AND NOT EXISTS (
        SELECT 1 FROM public.member_verifications AS v
        WHERE v.user_id = e.user_id
          AND v.status IN ('rejected', 'suspended')
      )
  )
$live$;
REVOKE ALL ON FUNCTION public.is_live_member() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_live_member() TO authenticated;
