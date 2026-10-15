-- Reputation score cache and peer reactions. Scores are server-owned and never client-writable.
CREATE TABLE public.reputation_scores (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  response_rate numeric(5,2) NOT NULL DEFAULT 0 CHECK (response_rate BETWEEN 0 AND 100),
  intro_success_rate numeric(5,2) NOT NULL DEFAULT 0 CHECK (intro_success_rate BETWEEN 0 AND 100),
  follow_through_rate numeric(5,2) NOT NULL DEFAULT 0 CHECK (follow_through_rate BETWEEN 0 AND 100),
  total_intros integer NOT NULL DEFAULT 0 CHECK (total_intros >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.reputation_scores FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.reputation_scores TO service_role;
GRANT SELECT ON public.reputation_scores TO authenticated;
ALTER TABLE public.reputation_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "live members read reputation scores" ON public.reputation_scores FOR SELECT TO authenticated
  USING (public.is_live_member());

CREATE TABLE public.outcome_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outcome_id uuid NOT NULL REFERENCES public.intro_outcomes(id) ON DELETE CASCADE,
  reactor_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction text NOT NULL CHECK (reaction IN ('verified','skeptical','amazing')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (outcome_id, reactor_id)
);
REVOKE ALL ON public.outcome_reactions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.outcome_reactions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outcome_reactions TO authenticated;
ALTER TABLE public.outcome_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "visible outcome reactions readable" ON public.outcome_reactions FOR SELECT TO authenticated
  USING (reactor_id = auth.uid() OR EXISTS (SELECT 1 FROM public.intro_outcomes o WHERE o.id = outcome_id));
CREATE POLICY "members react to visible peer outcomes" ON public.outcome_reactions FOR INSERT TO authenticated
  WITH CHECK (
    reactor_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.intro_outcomes o WHERE o.id = outcome_id AND o.author_id <> auth.uid())
  );
CREATE POLICY "members update own reaction" ON public.outcome_reactions FOR UPDATE TO authenticated
  USING (reactor_id = auth.uid()) WITH CHECK (reactor_id = auth.uid());
CREATE POLICY "members remove own reaction" ON public.outcome_reactions FOR DELETE TO authenticated USING (reactor_id = auth.uid());

CREATE OR REPLACE FUNCTION public.outcome_reactions_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN NEW.reactor_id := auth.uid(); NEW.created_at := now(); END IF;
  IF TG_OP = 'UPDATE' AND NEW.reactor_id IS DISTINCT FROM OLD.reactor_id THEN
    RAISE EXCEPTION 'Reaction owner cannot change' USING errcode = '42501';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.outcome_reactions_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER outcome_reactions_guard BEFORE INSERT OR UPDATE ON public.outcome_reactions FOR EACH ROW EXECUTE FUNCTION public.outcome_reactions_guard();
