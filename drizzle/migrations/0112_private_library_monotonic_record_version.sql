-- Forward-only correction: touch_updated_at() uses now(), which is constant
-- throughout one transaction. Multiple edits in a single transaction can
-- retain an identical version, defeating the RPC's stale edit/delete guard.
-- Use a strictly increasing value for private contacts only; no other tables change.
--
-- Requires 0065 and 0110. Do not run this before the private-library baseline.
CREATE OR REPLACE FUNCTION public.private_library_monotonic_record_touch()
RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := GREATEST(
    pg_catalog.clock_timestamp(),
    OLD.updated_at + interval '1 microsecond'
  );
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.private_library_monotonic_record_touch()
  FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS private_library_records_touch ON public.private_library_records;
CREATE TRIGGER private_library_records_touch
  BEFORE UPDATE ON public.private_library_records
  FOR EACH ROW EXECUTE FUNCTION public.private_library_monotonic_record_touch();
