-- Commitments reuse the canonical crm_tasks table.
ALTER TABLE public.crm_tasks
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'task' CHECK (kind IN ('task','commitment')),
  ADD COLUMN IF NOT EXISTS owed_to text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS waiting_on text NOT NULL DEFAULT 'me' CHECK (waiting_on IN ('me','them')),
  ADD COLUMN IF NOT EXISTS thread_id text,
  ADD COLUMN IF NOT EXISTS calendar_event_id uuid;

CREATE TABLE public.decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
  status text NOT NULL DEFAULT 'exploring' CHECK (status IN ('exploring','decided','reversed','archived')),
  context text NOT NULL DEFAULT '',
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  chosen_option text NOT NULL DEFAULT '',
  rationale text NOT NULL DEFAULT '',
  assumptions text NOT NULL DEFAULT '',
  risks text NOT NULL DEFAULT '',
  expected_outcome text NOT NULL DEFAULT '',
  review_date date,
  actual_outcome text NOT NULL DEFAULT '',
  linked_person_ids text[] NOT NULL DEFAULT '{}',
  linked_company_ids text[] NOT NULL DEFAULT '{}',
  linked_opportunity_ids text[] NOT NULL DEFAULT '{}',
  linked_event_ids text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.decisions TO authenticated;
GRANT ALL ON public.decisions TO service_role;
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their decisions" ON public.decisions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER decisions_touch BEFORE UPDATE ON public.decisions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.approval_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('send_message','request_intro','update_opportunity','create_follow_up','schedule_meeting','share_data','other')),
  summary text NOT NULL CHECK (char_length(summary) BETWEEN 1 AND 500),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','executed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  acted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.approval_queue TO authenticated;
GRANT ALL ON public.approval_queue TO service_role;
ALTER TABLE public.approval_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their approvals" ON public.approval_queue FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX approval_queue_user_status ON public.approval_queue(user_id, status);
CREATE INDEX decisions_user_review ON public.decisions(user_id, review_date);