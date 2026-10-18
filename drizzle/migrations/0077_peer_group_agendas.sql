-- AI-generated agendas and accountability commitments inside existing confidential peer groups.
CREATE TABLE IF NOT EXISTS public.peer_group_agendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.peer_groups(id) ON DELETE CASCADE,
  session_number integer NOT NULL DEFAULT 1 CHECK (session_number > 0),
  generated_at timestamptz NOT NULL DEFAULT now(),
  discussion_questions jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(discussion_questions)='array' AND octet_length(discussion_questions::text)<=30000),
  focus_theme text CHECK (focus_theme IS NULL OR char_length(focus_theme)<=500),
  prepared_by_ai boolean NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS peer_group_agendas_group_idx ON public.peer_group_agendas(group_id,generated_at DESC);
REVOKE ALL ON public.peer_group_agendas FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.peer_group_agendas TO service_role;
GRANT SELECT ON public.peer_group_agendas TO authenticated;
GRANT INSERT (group_id,session_number,discussion_questions,focus_theme,prepared_by_ai) ON public.peer_group_agendas TO authenticated;
ALTER TABLE public.peer_group_agendas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "agreed members read agendas" ON public.peer_group_agendas;
CREATE POLICY "agreed members read agendas" ON public.peer_group_agendas FOR SELECT TO authenticated USING (public.can_read_peer_group(group_id));
DROP POLICY IF EXISTS "facilitator creates agendas" ON public.peer_group_agendas;
CREATE POLICY "facilitator creates agendas" ON public.peer_group_agendas FOR INSERT TO authenticated WITH CHECK (public.is_peer_group_facilitator(group_id));

CREATE TABLE public.peer_group_commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.peer_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  commitment text NOT NULL CHECK (char_length(btrim(commitment)) BETWEEN 3 AND 1000),
  due_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','missed')),
  session_number integer NOT NULL DEFAULT 1 CHECK (session_number > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX peer_group_commitments_group_idx ON public.peer_group_commitments(group_id,created_at DESC);
CREATE INDEX peer_group_commitments_user_idx ON public.peer_group_commitments(user_id,status);
REVOKE ALL ON public.peer_group_commitments FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.peer_group_commitments TO service_role;
GRANT SELECT, INSERT, DELETE ON public.peer_group_commitments TO authenticated;
GRANT UPDATE (status) ON public.peer_group_commitments TO authenticated;
ALTER TABLE public.peer_group_commitments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agreed members read commitments" ON public.peer_group_commitments FOR SELECT TO authenticated USING (public.can_read_peer_group(group_id));
CREATE POLICY "members add own commitments" ON public.peer_group_commitments FOR INSERT TO authenticated
  WITH CHECK (user_id=auth.uid() AND public.can_read_peer_group(group_id));
CREATE POLICY "members update own commitments" ON public.peer_group_commitments FOR UPDATE TO authenticated
  USING (user_id=auth.uid() AND public.can_read_peer_group(group_id))
  WITH CHECK (user_id=auth.uid() AND public.can_read_peer_group(group_id));
CREATE POLICY "members delete own commitments" ON public.peer_group_commitments FOR DELETE TO authenticated
  USING (user_id=auth.uid() AND public.is_peer_group_member(group_id));

CREATE OR REPLACE FUNCTION public.peer_group_commitments_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF TG_OP='INSERT' THEN NEW.user_id:=auth.uid(); NEW.status:='active'; NEW.created_at:=now(); NEW.completed_at:=NULL; END IF;
  IF TG_OP='UPDATE' THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.group_id IS DISTINCT FROM OLD.group_id THEN
      RAISE EXCEPTION 'Commitment owner and group cannot change' USING errcode='42501';
    END IF;
    IF NEW.status='completed' AND OLD.status IS DISTINCT FROM 'completed' THEN NEW.completed_at:=now();
    ELSIF NEW.status<>'completed' THEN NEW.completed_at:=NULL; END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.peer_group_commitments_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER peer_group_commitments_guard BEFORE INSERT OR UPDATE ON public.peer_group_commitments
  FOR EACH ROW EXECUTE FUNCTION public.peer_group_commitments_guard();
