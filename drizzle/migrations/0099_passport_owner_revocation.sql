-- Narrow additive passport revocation repair; preserves the existing owner policy.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.passports TO authenticated;
GRANT ALL ON public.passports TO service_role;

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
