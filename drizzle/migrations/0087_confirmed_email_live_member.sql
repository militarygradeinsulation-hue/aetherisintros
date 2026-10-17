-- Ordinary live membership is separate from the optional executive-role badge.
-- The preceding 0086 migration already handles launch mode, invitations and
-- founding capacity. Never replace that migration or bypass email confirmation.
CREATE OR REPLACE FUNCTION public.is_live_member()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $membership$
  SELECT EXISTS (
    SELECT 1
    FROM public.early_access_members e
    JOIN auth.users u ON u.id = e.user_id
    JOIN public.profiles p ON p.id = e.user_id
    WHERE e.user_id = auth.uid()
      AND e.status = 'approved'
      AND u.email_confirmed_at IS NOT NULL
      AND p.onboarded IS TRUE
      AND NOT EXISTS (
        SELECT 1 FROM public.member_verifications v
         WHERE v.user_id = e.user_id
           AND v.status IN ('rejected', 'suspended')
      )
  )
$membership$;
REVOKE ALL ON FUNCTION public.is_live_member() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_live_member() TO authenticated;
