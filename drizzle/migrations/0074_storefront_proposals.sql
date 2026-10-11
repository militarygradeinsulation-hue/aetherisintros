-- One canonical member storefront plus a private proposal workflow.
CREATE TABLE public.member_storefronts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  headline text CHECK (headline IS NULL OR char_length(headline) <= 240),
  services jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(services)='array' AND octet_length(services::text) <= 50000),
  seeking jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(seeking)='array' AND octet_length(seeking::text) <= 30000),
  ideal_client text CHECK (ideal_client IS NULL OR char_length(ideal_client) <= 3000),
  intake_questions jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(intake_questions)='array' AND octet_length(intake_questions::text) <= 30000),
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.member_storefronts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.member_storefronts TO service_role;
GRANT SELECT, INSERT, DELETE ON public.member_storefronts TO authenticated;
GRANT UPDATE (headline, services, seeking, ideal_client, intake_questions, is_public) ON public.member_storefronts TO authenticated;
ALTER TABLE public.member_storefronts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners read storefront" ON public.member_storefronts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "members read public storefront" ON public.member_storefronts FOR SELECT TO authenticated USING (is_public AND public.is_live_member());
CREATE POLICY "owners create storefront" ON public.member_storefronts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "owners edit storefront" ON public.member_storefronts FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "owners delete storefront" ON public.member_storefronts FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.member_storefront_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN NEW.user_id := auth.uid(); NEW.created_at := now(); END IF;
  IF TG_OP = 'UPDATE' AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Storefront owner cannot change' USING errcode = '42501';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.member_storefront_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER member_storefront_guard BEFORE INSERT OR UPDATE ON public.member_storefronts
  FOR EACH ROW EXECUTE FUNCTION public.member_storefront_guard();

CREATE TABLE public.proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storefront_id uuid REFERENCES public.member_storefronts(id) ON DELETE SET NULL,
  subject text NOT NULL CHECK (char_length(btrim(subject)) BETWEEN 3 AND 240),
  message text NOT NULL CHECK (char_length(btrim(message)) BETWEEN 3 AND 6000),
  answers jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(answers)='object' AND octet_length(answers::text) <= 30000),
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','viewed','accepted','declined','countered')),
  counter_message text CHECK (counter_message IS NULL OR char_length(counter_message) <= 6000),
  viewed_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (from_user_id <> to_user_id)
);
CREATE INDEX proposals_from_idx ON public.proposals (from_user_id, created_at DESC);
CREATE INDEX proposals_to_idx ON public.proposals (to_user_id, status, created_at DESC);
REVOKE ALL ON public.proposals FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.proposals TO service_role;
GRANT SELECT, INSERT ON public.proposals TO authenticated;
GRANT UPDATE (status, counter_message, viewed_at, responded_at) ON public.proposals TO authenticated;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "proposal parties read" ON public.proposals FOR SELECT TO authenticated USING (auth.uid() IN (from_user_id, to_user_id));
CREATE POLICY "sender creates proposal" ON public.proposals FOR INSERT TO authenticated
  WITH CHECK (from_user_id = auth.uid() AND to_user_id <> auth.uid());
CREATE POLICY "recipient responds to proposal" ON public.proposals FOR UPDATE TO authenticated
  USING (to_user_id = auth.uid()) WITH CHECK (to_user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.proposals_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.from_user_id := auth.uid();
    NEW.status := 'sent';
    NEW.viewed_at := NULL;
    NEW.responded_at := NULL;
  ELSE
    IF (NEW.from_user_id, NEW.to_user_id, NEW.storefront_id, NEW.subject, NEW.message, NEW.answers)
       IS DISTINCT FROM
       (OLD.from_user_id, OLD.to_user_id, OLD.storefront_id, OLD.subject, OLD.message, OLD.answers) THEN
      RAISE EXCEPTION 'Proposal identity and original terms are immutable' USING errcode = '42501';
    END IF;
    IF NEW.status IN ('accepted','declined','countered') AND OLD.status IS DISTINCT FROM NEW.status THEN
      NEW.responded_at := now();
    END IF;
    IF NEW.status <> 'countered' THEN NEW.counter_message := NULL; END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.proposals_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER proposals_guard BEFORE INSERT OR UPDATE ON public.proposals FOR EACH ROW EXECUTE FUNCTION public.proposals_guard();
