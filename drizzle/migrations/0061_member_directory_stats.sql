-- Privacy-safe aggregate counts for the live member directory.
-- Exact identities still come only from search_members; this function exposes counts only.
CREATE OR REPLACE FUNCTION public.member_directory_stats()
RETURNS TABLE (members integer, companies integer, locations integer, industries integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH visible AS (
    SELECT p.id, p.company, p.location, coalesce(p.industries, '{}'::text[]) AS industries
      FROM public.profiles p
     WHERE auth.uid() IS NOT NULL
       AND public.is_live_member()
       AND public.is_approved_member(p.id)
       AND p.onboarded
       AND p.verified_at IS NOT NULL
       AND coalesce(p.visibility, 'network') <> 'private'
       AND p.id <> auth.uid()
  )
  SELECT
    count(*)::integer,
    count(DISTINCT nullif(lower(btrim(company)), ''))::integer,
    count(DISTINCT nullif(lower(btrim(location)), ''))::integer,
    (
      SELECT count(DISTINCT lower(btrim(industry)))::integer
        FROM visible v
        CROSS JOIN LATERAL unnest(v.industries) AS industry
       WHERE btrim(industry) <> ''
    )
  FROM visible
$$;

REVOKE ALL ON FUNCTION public.member_directory_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.member_directory_stats() TO authenticated, service_role;
