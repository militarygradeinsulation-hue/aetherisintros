CREATE OR REPLACE FUNCTION public.icp_state_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.store_key LIKE 'icp:%' OR (TG_OP='UPDATE' AND OLD.store_key LIKE 'icp:%') THEN
  IF current_user IN ('authenticated','anon','authenticator') OR auth.uid() IS NULL OR NEW.user_id<>auth.uid() OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Use the private reviewed prospect workflow'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE POLICY icp_private_read_guard ON public.member_workspace_state AS RESTRICTIVE FOR SELECT TO authenticated USING (store_key NOT LIKE 'icp:%' OR public.has_role(auth.uid(),'admin'));
CREATE POLICY icp_retain_review_history ON public.member_workspace_state AS RESTRICTIVE FOR DELETE TO authenticated USING (store_key NOT LIKE 'icp:%');