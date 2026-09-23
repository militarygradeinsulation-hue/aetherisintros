GRANT INSERT ON public.verification_events TO authenticated;
GRANT ALL ON public.verification_events TO service_role;
GRANT ALL ON public.verification_checks TO service_role;
CREATE POLICY "Admins log reviewer events" ON public.verification_events
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND actor_id = auth.uid());