-- Business leak check results, private to the member who took the check. Answers are option
-- indexes per question; the score is recomputed client-side from them, and the stored index
-- lets a member see whether their business is leaking less over time.

CREATE TABLE public.leak_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text NOT NULL DEFAULT '' CHECK (char_length(company_name) <= 140),
  answers jsonb NOT NULL CHECK (jsonb_typeof(answers) = 'object'),
  leak_index integer NOT NULL CHECK (leak_index BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX leak_checks_owner_idx ON public.leak_checks (owner_id, created_at DESC);

REVOKE ALL ON public.leak_checks FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.leak_checks TO service_role;
GRANT SELECT, DELETE ON public.leak_checks TO authenticated;
GRANT INSERT (company_name, answers, leak_index) ON public.leak_checks TO authenticated;
ALTER TABLE public.leak_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own leak checks read" ON public.leak_checks FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "own leak checks create" ON public.leak_checks FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "own leak checks delete" ON public.leak_checks FOR DELETE TO authenticated USING (owner_id = auth.uid());
