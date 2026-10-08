-- asks.response_count was never maintained: every live ask showed "0 responses" even
-- after members replied. The database now keeps it equal to the real number of rows in
-- ask_responses (recounted, not incremented, so it cannot drift), and existing asks are
-- corrected once. Authors can still update their own asks, so a guard recomputes the count
-- on every insert and update made by a signed-in member: a client-supplied value is never
-- stored. Service-role writes (the demo seed's illustrative counts) are left alone.

CREATE OR REPLACE FUNCTION public.sync_ask_response_count() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ask text := CASE WHEN TG_OP = 'DELETE' THEN OLD.ask_id ELSE NEW.ask_id END;
BEGIN
  UPDATE public.asks a
     SET response_count = (SELECT count(*) FROM public.ask_responses r WHERE r.ask_id = v_ask)
   WHERE a.id = v_ask;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.sync_ask_response_count() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.asks_response_count_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.response_count := (SELECT count(*) FROM public.ask_responses r WHERE r.ask_id = NEW.id);
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.asks_response_count_guard() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS asks_response_count_guard ON public.asks;
CREATE TRIGGER asks_response_count_guard BEFORE INSERT OR UPDATE ON public.asks
  FOR EACH ROW EXECUTE FUNCTION public.asks_response_count_guard();

DROP TRIGGER IF EXISTS ask_responses_sync_count ON public.ask_responses;
CREATE TRIGGER ask_responses_sync_count AFTER INSERT OR DELETE ON public.ask_responses
  FOR EACH ROW EXECUTE FUNCTION public.sync_ask_response_count();

UPDATE public.asks a
   SET response_count = c.n
  FROM (SELECT a2.id, (SELECT count(*)::int FROM public.ask_responses r WHERE r.ask_id = a2.id) AS n FROM public.asks a2) c
 WHERE c.id = a.id AND a.response_count IS DISTINCT FROM c.n;
