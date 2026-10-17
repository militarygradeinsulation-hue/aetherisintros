-- After 0086 grants founding access, registered approved members can USE the
-- live network once they complete onboarding. A business role verification
-- remains a separate evidence-based badge and must never be fabricated.
-- RLS/consent/private data boundaries still apply to every authenticated user.
CREATE OR REPLACE FUNCTION public.is_live_member() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $member$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.early_access_members e
    WHERE e.user_id = auth.uid() AND e.status = 'approved'
  )
$member$;
REVOKE ALL ON FUNCTION public.is_live_member() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_live_member() TO authenticated;
