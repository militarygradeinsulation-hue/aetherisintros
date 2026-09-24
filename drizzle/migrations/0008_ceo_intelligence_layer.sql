-- Future Me: extend the existing decisions table (no new decision store).
ALTER TABLE public.decisions
  ADD COLUMN IF NOT EXISTS prediction text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS confidence integer CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS assumption_review text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS same_again text NOT NULL DEFAULT '' CHECK (same_again IN ('', 'yes', 'no', 'unsure'));

-- Private executive marks on canonical people: strategic relationships, bench, influence roles.
CREATE TABLE public.ceo_relationship_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('strategic', 'bench', 'influence')),
  subject_id text NOT NULL CHECK (char_length(subject_id) BETWEEN 1 AND 120),
  company_id text,
  label text NOT NULL DEFAULT '' CHECK (char_length(label) <= 80),
  outcome text NOT NULL DEFAULT '' CHECK (char_length(outcome) <= 1000),
  cadence_days integer CHECK (cadence_days IS NULL OR cadence_days BETWEEN 1 AND 365),
  value_give text NOT NULL DEFAULT '' CHECK (char_length(value_give) <= 1000),
  value_need text NOT NULL DEFAULT '' CHECK (char_length(value_need) <= 1000),
  next_action text NOT NULL DEFAULT '' CHECK (char_length(next_action) <= 500),
  next_touch date,
  mission_id text,
  notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, subject_id)
);
REVOKE ALL ON public.ceo_relationship_marks FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ceo_relationship_marks TO authenticated;
GRANT ALL ON public.ceo_relationship_marks TO service_role;
ALTER TABLE public.ceo_relationship_marks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their relationship marks" ON public.ceo_relationship_marks FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ceo_marks_user_kind ON public.ceo_relationship_marks(user_id, kind);

CREATE OR REPLACE FUNCTION public.ceo_marks_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.kind IS DISTINCT FROM OLD.kind OR NEW.subject_id IS DISTINCT FROM OLD.subject_id THEN
    RAISE EXCEPTION 'Owner, kind and subject cannot change';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER ceo_marks_guard BEFORE UPDATE ON public.ceo_relationship_marks FOR EACH ROW EXECUTE FUNCTION public.ceo_marks_guard();

-- Owner identity immutable on decisions + approvals as well.
CREATE OR REPLACE FUNCTION public.ceo_owner_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN RAISE EXCEPTION 'Owner cannot change'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS decisions_owner_guard ON public.decisions;
CREATE TRIGGER decisions_owner_guard BEFORE UPDATE ON public.decisions FOR EACH ROW EXECUTE FUNCTION public.ceo_owner_guard();
DROP TRIGGER IF EXISTS approvals_owner_guard ON public.approval_queue;
CREATE TRIGGER approvals_owner_guard BEFORE UPDATE ON public.approval_queue FOR EACH ROW EXECUTE FUNCTION public.ceo_owner_guard();