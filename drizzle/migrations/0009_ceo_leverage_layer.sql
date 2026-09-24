CREATE TABLE public.negotiation_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
  status text NOT NULL DEFAULT 'preparing' CHECK (status IN ('preparing','active','paused','agreed','walked_away','closed')),
  linked_person_id uuid,
  linked_company_id uuid,
  linked_opportunity_id uuid,
  objective text NOT NULL DEFAULT '',
  desired_outcome text NOT NULL DEFAULT '',
  must_haves text NOT NULL DEFAULT '',
  nice_to_haves text NOT NULL DEFAULT '',
  walk_away text NOT NULL DEFAULT '',
  counterpart_priorities text NOT NULL DEFAULT '',
  leverage_evidence text NOT NULL DEFAULT '',
  unknowns text NOT NULL DEFAULT '',
  batna text NOT NULL DEFAULT '',
  concessions jsonb NOT NULL DEFAULT '[]'::jsonb,
  meeting_prep text NOT NULL DEFAULT '',
  outcome text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.negotiation_rooms TO authenticated;
GRANT ALL ON public.negotiation_rooms TO service_role;
ALTER TABLE public.negotiation_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage negotiation rooms" ON public.negotiation_rooms FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE INDEX negotiation_rooms_owner_updated ON public.negotiation_rooms(owner_id, updated_at DESC);

CREATE TABLE public.scenario_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
  linked_opportunity_id uuid,
  scenario_type text NOT NULL DEFAULT 'custom' CHECK (scenario_type IN ('deal_slip','customer_churn','opportunity_win','opportunity_loss','headcount','probability','revenue','custom')),
  recorded_inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  assumptions jsonb NOT NULL DEFAULT '{}'::jsonb,
  baseline jsonb NOT NULL DEFAULT '{}'::jsonb,
  scenario_result jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scenario_rooms TO authenticated;
GRANT ALL ON public.scenario_rooms TO service_role;
ALTER TABLE public.scenario_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage scenario rooms" ON public.scenario_rooms FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE INDEX scenario_rooms_owner_updated ON public.scenario_rooms(owner_id, updated_at DESC);

CREATE TABLE public.executive_office_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  label text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 160),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 30 CHECK (duration_minutes BETWEEN 10 AND 180),
  capacity integer NOT NULL DEFAULT 1 CHECK (capacity BETWEEN 1 AND 20),
  purpose text NOT NULL DEFAULT '',
  relevance text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.executive_office_hours TO authenticated;
GRANT ALL ON public.executive_office_hours TO service_role;
ALTER TABLE public.executive_office_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage office hours" ON public.executive_office_hours FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Verified members discover enabled office hours" ON public.executive_office_hours FOR SELECT TO authenticated USING (enabled = true AND ends_at > now() AND public.is_verified_member());
CREATE INDEX executive_office_hours_owner_start ON public.executive_office_hours(owner_id, starts_at);

CREATE TABLE public.office_hour_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  window_id uuid NOT NULL REFERENCES public.executive_office_hours(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL DEFAULT auth.uid(),
  owner_id uuid NOT NULL,
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 1000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','declined','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  acted_at timestamptz,
  UNIQUE(window_id, requester_id)
);
GRANT SELECT, INSERT, UPDATE ON public.office_hour_requests TO authenticated;
GRANT ALL ON public.office_hour_requests TO service_role;
ALTER TABLE public.office_hour_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read office hour requests" ON public.office_hour_requests FOR SELECT TO authenticated USING (auth.uid() = requester_id OR auth.uid() = owner_id);
CREATE POLICY "Verified members request office hours" ON public.office_hour_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = requester_id AND requester_id <> owner_id AND public.is_verified_member() AND EXISTS (SELECT 1 FROM public.executive_office_hours w WHERE w.id = window_id AND w.owner_id = owner_id AND w.enabled = true AND w.ends_at > now()));
CREATE POLICY "Owners decide office hour requests" ON public.office_hour_requests FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE INDEX office_hour_requests_owner_status ON public.office_hour_requests(owner_id, status);

CREATE OR REPLACE FUNCTION public.ceo_leverage_owner_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN RAISE EXCEPTION 'owner_id is immutable'; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER negotiation_rooms_owner_guard BEFORE UPDATE ON public.negotiation_rooms FOR EACH ROW EXECUTE FUNCTION public.ceo_leverage_owner_guard();
CREATE TRIGGER scenario_rooms_owner_guard BEFORE UPDATE ON public.scenario_rooms FOR EACH ROW EXECUTE FUNCTION public.ceo_leverage_owner_guard();
CREATE TRIGGER executive_office_hours_owner_guard BEFORE UPDATE ON public.executive_office_hours FOR EACH ROW EXECUTE FUNCTION public.ceo_leverage_owner_guard();

CREATE OR REPLACE FUNCTION public.office_hour_request_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id OR NEW.requester_id IS DISTINCT FROM OLD.requester_id OR NEW.window_id IS DISTINCT FROM OLD.window_id OR NEW.reason IS DISTINCT FROM OLD.reason OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'office-hour request identity and request text are immutable';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER office_hour_requests_guard BEFORE UPDATE ON public.office_hour_requests FOR EACH ROW EXECUTE FUNCTION public.office_hour_request_guard();

CREATE TRIGGER negotiation_rooms_touch BEFORE UPDATE ON public.negotiation_rooms FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER scenario_rooms_touch BEFORE UPDATE ON public.scenario_rooms FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER executive_office_hours_touch BEFORE UPDATE ON public.executive_office_hours FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

REVOKE ALL ON public.negotiation_rooms, public.scenario_rooms, public.executive_office_hours, public.office_hour_requests FROM anon, PUBLIC;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.negotiation_rooms, public.scenario_rooms, public.executive_office_hours, public.office_hour_requests FROM authenticated;