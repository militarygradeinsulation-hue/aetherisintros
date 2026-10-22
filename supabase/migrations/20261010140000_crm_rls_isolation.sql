-- Ensure every CRM table is row-level-security-isolated per account (owner_id = auth.uid()).
-- Idempotent: duplicate policies are ignored. Existing "own crm …" policies already enforce the same rule.

ALTER TABLE public.crm_people ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "crm_people_owner" ON public.crm_people FOR ALL TO authenticated
    USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "crm_activities_owner" ON public.crm_activities FOR ALL TO authenticated
    USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.crm_notes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "crm_notes_owner" ON public.crm_notes FOR ALL TO authenticated
    USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "crm_tasks_owner" ON public.crm_tasks FOR ALL TO authenticated
    USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.crm_opportunities ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "crm_opportunities_owner" ON public.crm_opportunities FOR ALL TO authenticated
    USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
