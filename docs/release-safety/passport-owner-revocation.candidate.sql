-- Candidate only: NOT journaled and NOT applied to production.
-- Live 2026-10-26 policy: "own passports" has WITH CHECK
-- (owner_id = auth.uid() AND is_verified_member()).
-- This prevents an unverified former member revoking an existing share.
--
-- Apply only after an independently verified restorable backup and
-- member-A / member-B / anon regression on a production schema clone.
-- Preserve the existing "own passports" creation/edit policy.

BEGIN;

-- Tight restriction for members whose verification has lapsed. They may
-- change exactly one field: revoked, from false to true on their own row.
-- Verified owners retain existing edit permissions.
CREATE OR REPLACE FUNCTION public.passport_unverified_revoke_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'pg_catalog', 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW; -- trusted back-office maintenance retains its usual privileges
  END IF;
  IF OLD.owner_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'You may only update your own passport'
      USING ERRCODE = '42501';
  END IF;
  -- Revocation is monotonic; the original shared token never becomes valid again.
  IF OLD.revoked = TRUE AND NEW.revoked = FALSE THEN
    RAISE EXCEPTION 'Revoked passport links cannot be reactivated'
      USING ERRCODE = '42501';
  END IF;
  IF public.is_verified_member() THEN
    RETURN NEW;
  END IF;
  IF OLD.revoked IS DISTINCT FROM FALSE
     OR NEW.revoked IS DISTINCT FROM TRUE
     OR (to_jsonb(NEW) - 'revoked') IS DISTINCT FROM (to_jsonb(OLD) - 'revoked') THEN
    RAISE EXCEPTION 'Unverified owners may only revoke their existing passport'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.passport_unverified_revoke_guard()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER passport_unverified_revoke_only
BEFORE UPDATE ON public.passports
FOR EACH ROW
EXECUTE FUNCTION public.passport_unverified_revoke_guard();

-- New owner-only UPDATE path permits a revoked=true row even when
-- is_verified_member() is false. The trigger enforces no other edits.
CREATE POLICY passport_owner_revoke
  ON public.passports AS PERMISSIVE
  FOR UPDATE TO authenticated
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (owner_id = (SELECT auth.uid()) AND revoked = TRUE);

COMMIT;

-- Staging acceptance tests (do NOT run against arbitrary production data):
-- 1. verified owner A can create/edit passport A.
-- 2. unverified former owner A may set revoked false -> true and sees 1 row.
-- 3. A may not change label, fields, token, kind, owner_id, etc on revoke.
-- 4. unrelated authenticated B cannot update passport A.
-- 5. anon cannot update passport A.
-- 6. get_passport(A token) no longer returns fields after revoke.
-- 7. previously verified owner A can no longer reactivate revoked passport
--    if product forbids it; add a separate monotonic-revoke policy if needed.
-- 8. confirmed customer test of exact Supabase PostgREST update .select('id').
