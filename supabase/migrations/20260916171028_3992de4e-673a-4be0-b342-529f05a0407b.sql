-- ============================================================ CRM: companies
CREATE TABLE public.crm_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  account_id uuid,
  name text NOT NULL,
  domain text NOT NULL DEFAULT '',
  industry text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  website text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  employees text NOT NULL DEFAULT '',
  revenue_band text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  directory_company_id uuid,
  network_company_id text,
  custom jsonb NOT NULL DEFAULT '{}'::jsonb,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_companies TO authenticated;
GRANT ALL ON public.crm_companies TO service_role;
ALTER TABLE public.crm_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own crm companies" ON public.crm_companies FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE INDEX crm_companies_owner_idx ON public.crm_companies (owner_id, name);
CREATE TRIGGER crm_companies_touch BEFORE UPDATE ON public.crm_companies
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =============================================================== CRM: people
CREATE TABLE public.crm_people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  account_id uuid,
  full_name text NOT NULL,
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  company_id uuid REFERENCES public.crm_companies(id) ON DELETE SET NULL,
  company_name text NOT NULL DEFAULT '',
  lifecycle text NOT NULL DEFAULT 'Lead',
  status text NOT NULL DEFAULT 'active',
  location text NOT NULL DEFAULT '',
  linkedin_url text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  member_id text,
  profile_id uuid,
  directory_contact_id uuid,
  custom jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_activity_at timestamptz,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crm_people_lifecycle_check CHECK (lifecycle IN
    ('Lead','Prospect','Customer','Partner','Investor','Advisor','Talent','Vendor','Other'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_people TO authenticated;
GRANT ALL ON public.crm_people TO service_role;
ALTER TABLE public.crm_people ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own crm people" ON public.crm_people FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE INDEX crm_people_owner_idx ON public.crm_people (owner_id, full_name);
CREATE UNIQUE INDEX crm_people_owner_member_idx ON public.crm_people (owner_id, member_id) WHERE member_id IS NOT NULL;
CREATE TRIGGER crm_people_touch BEFORE UPDATE ON public.crm_people
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================ CRM: pipelines
CREATE TABLE public.crm_pipelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  account_id uuid,
  name text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_pipelines TO authenticated;
GRANT ALL ON public.crm_pipelines TO service_role;
ALTER TABLE public.crm_pipelines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own crm pipelines" ON public.crm_pipelines FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE TRIGGER crm_pipelines_touch BEFORE UPDATE ON public.crm_pipelines
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.crm_pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  pipeline_id uuid NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  probability integer NOT NULL DEFAULT 0,
  is_won boolean NOT NULL DEFAULT false,
  is_lost boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_pipeline_stages TO authenticated;
GRANT ALL ON public.crm_pipeline_stages TO service_role;
ALTER TABLE public.crm_pipeline_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own crm stages" ON public.crm_pipeline_stages FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE INDEX crm_stages_pipeline_idx ON public.crm_pipeline_stages (pipeline_id, position);
CREATE TRIGGER crm_stages_touch BEFORE UPDATE ON public.crm_pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ======================================================== CRM: opportunities
CREATE TABLE public.crm_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  account_id uuid,
  name text NOT NULL,
  pipeline_id uuid REFERENCES public.crm_pipelines(id) ON DELETE SET NULL,
  stage_id uuid REFERENCES public.crm_pipeline_stages(id) ON DELETE SET NULL,
  stage_name text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  probability integer NOT NULL DEFAULT 0,
  value_state text NOT NULL DEFAULT 'known',
  expected_close date,
  person_id uuid REFERENCES public.crm_people(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.crm_companies(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT '',
  next_action text NOT NULL DEFAULT '',
  detail text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  custom jsonb NOT NULL DEFAULT '{}'::jsonb,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crm_opportunities_value_state_check CHECK (value_state IN ('known','modeled','unquantified')),
  CONSTRAINT crm_opportunities_status_check CHECK (status IN ('open','won','lost','paused'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_opportunities TO authenticated;
GRANT ALL ON public.crm_opportunities TO service_role;
ALTER TABLE public.crm_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own crm opportunities" ON public.crm_opportunities FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE INDEX crm_opportunities_owner_idx ON public.crm_opportunities (owner_id, stage_id);
CREATE TRIGGER crm_opportunities_touch BEFORE UPDATE ON public.crm_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================== CRM: activities
CREATE TABLE public.crm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  account_id uuid,
  kind text NOT NULL DEFAULT 'note',
  subject text NOT NULL,
  detail text NOT NULL DEFAULT '',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  person_id uuid REFERENCES public.crm_people(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.crm_companies(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES public.crm_opportunities(id) ON DELETE CASCADE,
  intro_request_id uuid,
  thread_id text,
  calendar_event_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crm_activities_kind_check CHECK (kind IN
    ('call','email','meeting','message','intro','note','task','demo','other'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_activities TO authenticated;
GRANT ALL ON public.crm_activities TO service_role;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own crm activities" ON public.crm_activities FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE INDEX crm_activities_owner_idx ON public.crm_activities (owner_id, occurred_at DESC);

-- ================================================================ CRM: tasks
CREATE TABLE public.crm_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  account_id uuid,
  title text NOT NULL,
  detail text NOT NULL DEFAULT '',
  due_at timestamptz,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  assignee text NOT NULL DEFAULT '',
  person_id uuid REFERENCES public.crm_people(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.crm_companies(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES public.crm_opportunities(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crm_tasks_priority_check CHECK (priority IN ('low','medium','high')),
  CONSTRAINT crm_tasks_status_check CHECK (status IN ('open','doing','done','cancelled'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_tasks TO authenticated;
GRANT ALL ON public.crm_tasks TO service_role;
ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own crm tasks" ON public.crm_tasks FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE INDEX crm_tasks_owner_idx ON public.crm_tasks (owner_id, status, due_at);
CREATE TRIGGER crm_tasks_touch BEFORE UPDATE ON public.crm_tasks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ================================================================ CRM: notes
CREATE TABLE public.crm_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  account_id uuid,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_notes TO authenticated;
GRANT ALL ON public.crm_notes TO service_role;
ALTER TABLE public.crm_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own crm notes" ON public.crm_notes FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE INDEX crm_notes_entity_idx ON public.crm_notes (owner_id, entity_type, entity_id);
CREATE TRIGGER crm_notes_touch BEFORE UPDATE ON public.crm_notes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ================================================================= CRM: tags
CREATE TABLE public.crm_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT 'cobalt',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_tags TO authenticated;
GRANT ALL ON public.crm_tags TO service_role;
ALTER TABLE public.crm_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own crm tags" ON public.crm_tags FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE UNIQUE INDEX crm_tags_owner_name_idx ON public.crm_tags (owner_id, lower(name));

CREATE TABLE public.crm_entity_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  tag_id uuid NOT NULL REFERENCES public.crm_tags(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tag_id, entity_type, entity_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_entity_tags TO authenticated;
GRANT ALL ON public.crm_entity_tags TO service_role;
ALTER TABLE public.crm_entity_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own crm entity tags" ON public.crm_entity_tags FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- ====================================================== CRM: custom fields
CREATE TABLE public.crm_custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  entity_type text NOT NULL,
  key text NOT NULL,
  label text NOT NULL,
  type text NOT NULL DEFAULT 'text',
  options text[] NOT NULL DEFAULT '{}',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, entity_type, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_custom_fields TO authenticated;
GRANT ALL ON public.crm_custom_fields TO service_role;
ALTER TABLE public.crm_custom_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own crm custom fields" ON public.crm_custom_fields FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE TABLE public.crm_custom_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  field_id uuid NOT NULL REFERENCES public.crm_custom_fields(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  value jsonb NOT NULL DEFAULT 'null'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (field_id, entity_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_custom_field_values TO authenticated;
GRANT ALL ON public.crm_custom_field_values TO service_role;
ALTER TABLE public.crm_custom_field_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own crm custom values" ON public.crm_custom_field_values FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- ======================================================= links + event ledger
CREATE TABLE public.entity_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  from_type text NOT NULL,
  from_id text NOT NULL,
  to_type text NOT NULL,
  to_id text NOT NULL,
  relation text NOT NULL DEFAULT 'linked',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, from_type, from_id, to_type, to_id, relation)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entity_links TO authenticated;
GRANT ALL ON public.entity_links TO service_role;
ALTER TABLE public.entity_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own entity links" ON public.entity_links FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE TABLE public.entity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  event text NOT NULL,
  summary text NOT NULL DEFAULT '',
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'app',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.entity_events TO authenticated;
GRANT ALL ON public.entity_events TO service_role;
ALTER TABLE public.entity_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own entity events" ON public.entity_events FOR SELECT TO authenticated
  USING (owner_id = auth.uid());
CREATE POLICY "append own entity events" ON public.entity_events FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE INDEX entity_events_owner_idx ON public.entity_events (owner_id, created_at DESC);

-- ================================================================ GRID
CREATE TABLE public.grid_workbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  account_id uuid,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grid_workbooks TO authenticated;
GRANT ALL ON public.grid_workbooks TO service_role;
ALTER TABLE public.grid_workbooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own workbooks" ON public.grid_workbooks FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE TRIGGER grid_workbooks_touch BEFORE UPDATE ON public.grid_workbooks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.grid_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  workbook_id uuid NOT NULL REFERENCES public.grid_workbooks(id) ON DELETE CASCADE,
  name text NOT NULL,
  mode text NOT NULL DEFAULT 'freeform',
  entity_type text,
  position integer NOT NULL DEFAULT 0,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT grid_sheets_mode_check CHECK (mode IN ('linked','freeform'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grid_sheets TO authenticated;
GRANT ALL ON public.grid_sheets TO service_role;
ALTER TABLE public.grid_sheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sheets" ON public.grid_sheets FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE INDEX grid_sheets_workbook_idx ON public.grid_sheets (workbook_id, position);
CREATE TRIGGER grid_sheets_touch BEFORE UPDATE ON public.grid_sheets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.grid_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  sheet_id uuid NOT NULL REFERENCES public.grid_sheets(id) ON DELETE CASCADE,
  name text NOT NULL,
  key text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  type text NOT NULL DEFAULT 'text',
  width integer NOT NULL DEFAULT 160,
  formula text NOT NULL DEFAULT '',
  default_value text NOT NULL DEFAULT '',
  options text[] NOT NULL DEFAULT '{}',
  source_field text,
  relation_type text,
  writable boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sheet_id, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grid_columns TO authenticated;
GRANT ALL ON public.grid_columns TO service_role;
ALTER TABLE public.grid_columns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own columns" ON public.grid_columns FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE INDEX grid_columns_sheet_idx ON public.grid_columns (sheet_id, position);
CREATE TRIGGER grid_columns_touch BEFORE UPDATE ON public.grid_columns
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.grid_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  sheet_id uuid NOT NULL REFERENCES public.grid_sheets(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  entity_type text,
  entity_id text,
  values jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grid_rows TO authenticated;
GRANT ALL ON public.grid_rows TO service_role;
ALTER TABLE public.grid_rows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own rows" ON public.grid_rows FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE INDEX grid_rows_sheet_idx ON public.grid_rows (sheet_id, position);
CREATE TRIGGER grid_rows_touch BEFORE UPDATE ON public.grid_rows
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.grid_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  sheet_id uuid NOT NULL REFERENCES public.grid_sheets(id) ON DELETE CASCADE,
  name text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grid_views TO authenticated;
GRANT ALL ON public.grid_views TO service_role;
ALTER TABLE public.grid_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own views" ON public.grid_views FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE TRIGGER grid_views_touch BEFORE UPDATE ON public.grid_views
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================ default pipeline per account
CREATE OR REPLACE FUNCTION public.ensure_default_pipeline()
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT id INTO v_id FROM public.crm_pipelines
   WHERE owner_id = v_uid AND archived = false
   ORDER BY is_default DESC, position ASC LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  INSERT INTO public.crm_pipelines (owner_id, name, is_default, position)
  VALUES (v_uid, 'Relationship Pipeline', true, 0)
  RETURNING id INTO v_id;

  INSERT INTO public.crm_pipeline_stages (owner_id, pipeline_id, name, position, probability, is_won, is_lost)
  VALUES
    (v_uid, v_id, 'Identified', 0, 10, false, false),
    (v_uid, v_id, 'Qualified', 1, 25, false, false),
    (v_uid, v_id, 'Warm Path Found', 2, 40, false, false),
    (v_uid, v_id, 'Conversation', 3, 55, false, false),
    (v_uid, v_id, 'Proposal', 4, 70, false, false),
    (v_uid, v_id, 'Decision', 5, 85, false, false),
    (v_uid, v_id, 'Won', 6, 100, true, false),
    (v_uid, v_id, 'Not Now', 7, 0, false, true);

  RETURN v_id;
END $$;

GRANT EXECUTE ON FUNCTION public.ensure_default_pipeline() TO authenticated;