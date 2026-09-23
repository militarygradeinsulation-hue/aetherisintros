REVOKE ALL ON public.decisions FROM anon, authenticated, PUBLIC;
REVOKE ALL ON public.approval_queue FROM anon, authenticated, PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.decisions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.approval_queue TO authenticated;
GRANT ALL ON public.decisions TO service_role;
GRANT ALL ON public.approval_queue TO service_role;