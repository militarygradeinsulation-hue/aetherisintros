-- Production recovery for live member network access.
-- Execute after 0084_live_intro_secure_read_grants.sql on the SAME live database.
-- This does not modify rows or expose the private demo catalogue.
BEGIN;

GRANT USAGE ON SCHEMA public TO authenticated;

-- Existing RLS policies protect member SELECT and author INSERT.
GRANT SELECT, INSERT ON TABLE public.posts, public.asks TO authenticated;
REVOKE SELECT, INSERT ON TABLE public.posts, public.asks FROM anon;

-- Restore callable provider APIs without exposing private provider tables.
REVOKE ALL ON FUNCTION public.provider_directory() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_provider_requests() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.provider_inbox() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provider_directory() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_provider_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION public.provider_inbox() TO authenticated;

-- Approved-membership and double opt-in are enforced inside the server RPC.
REVOKE ALL ON FUNCTION public.request_verified_intro(uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_verified_intro(uuid, text)
  TO authenticated;

-- NEVER GRANT access to public.signals, public.seed_threads or
-- public.seed_learnings to "fix" the live feed: these are demo-only sources.
COMMIT;
