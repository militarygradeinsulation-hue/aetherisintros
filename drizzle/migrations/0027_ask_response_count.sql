-- asks.response_count was never maintained: every live ask showed "0 responses" even
-- after members replied. The database now keeps it equal to the real number of rows in
-- ask_responses (recounted, not incremented, so it cannot drift), and existing asks are
-- corrected once.

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

DROP TRIGGER IF EXISTS ask_responses_sync_count ON public.ask_responses;
CREATE TRIGGER ask_responses_sync_count AFTER INSERT OR DELETE ON public.ask_responses
  FOR EACH ROW EXECUTE FUNCTION public.sync_ask_response_count();

UPDATE public.asks a
   SET response_count = c.n
  FROM (SELECT ask_id, count(*)::int AS n FROM public.ask_responses GROUP BY ask_id) c
 WHERE c.ask_id = a.id AND a.response_count IS DISTINCT FROM c.n;
