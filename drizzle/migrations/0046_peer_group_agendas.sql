CREATE TABLE IF NOT EXISTS public.peer_group_agendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.peer_groups(id) ON DELETE CASCADE,
  session_number integer NOT NULL DEFAULT 1,
  generated_at timestamptz DEFAULT now(),
  discussion_questions jsonb DEFAULT '[]',
  focus_theme text,
  prepared_by_ai boolean DEFAULT true
);

REVOKE ALL ON public.peer_group_agendas FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.peer_group_agendas TO service_role;
GRANT SELECT ON public.peer_group_agendas TO authenticated;
GRANT INSERT (group_id, session_number, discussion_questions, focus_theme, prepared_by_ai) ON public.peer_group_agendas TO authenticated;

ALTER TABLE public.peer_group_agendas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group_members_read_agendas" ON public.peer_group_agendas FOR SELECT TO authenticated
  USING (public.can_read_peer_group(group_id));

CREATE POLICY "group_facilitators_create_agendas" ON public.peer_group_agendas FOR INSERT TO authenticated
  WITH CHECK (public.is_peer_group_facilitator(group_id));

CREATE TABLE IF NOT EXISTS public.peer_group_commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.peer_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  commitment text NOT NULL CHECK (char_length(btrim(commitment)) BETWEEN 3 AND 1000),
  due_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'missed')),
  session_number integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX peer_group_commitments_group_idx ON public.peer_group_commitments (group_id, created_at);
CREATE INDEX peer_group_commitments_user_idx ON public.peer_group_commitments (user_id);

REVOKE ALL ON public.peer_group_commitments FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.peer_group_commitments TO service_role;
GRANT SELECT ON public.peer_group_commitments TO authenticated;
GRANT INSERT (group_id, commitment, due_date, session_number) ON public.peer_group_commitments TO authenticated;
GRANT UPDATE (status, completed_at) ON public.peer_group_commitments TO authenticated;
GRANT DELETE ON public.peer_group_commitments TO authenticated;

ALTER TABLE public.peer_group_commitments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group_members_see_commitments" ON public.peer_group_commitments FOR SELECT TO authenticated
  USING (public.can_read_peer_group(group_id));

CREATE POLICY "own_commitments_insert" ON public.peer_group_commitments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.can_read_peer_group(group_id));

CREATE POLICY "own_commitments_update" ON public.peer_group_commitments FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "own_commitments_delete" ON public.peer_group_commitments FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.peer_group_commitments_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.user_id := auth.uid();
    NEW.status := 'active';
    NEW.created_at := now();
    NEW.completed_at := NULL;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
      NEW.completed_at := now();
    END IF;
    IF NEW.status = 'active' THEN
      NEW.completed_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER peer_group_commitments_guard BEFORE INSERT OR UPDATE ON public.peer_group_commitments
  FOR EACH ROW EXECUTE FUNCTION public.peer_group_commitments_guard();
