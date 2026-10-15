-- AI-suggested warm referral paths and double-opt-in requests.
CREATE TABLE public.referral_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  for_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  connector_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  path_explanation text NOT NULL CHECK (char_length(btrim(path_explanation)) BETWEEN 3 AND 2000),
  shared_context text CHECK (shared_context IS NULL OR char_length(shared_context) <= 2000),
  strength_score integer NOT NULL DEFAULT 50 CHECK (strength_score BETWEEN 0 AND 100),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','acted_on','dismissed','snoozed')),
  snoozed_until timestamptz,
  generated_at timestamptz NOT NULL DEFAULT now(),
  acted_at timestamptz
);
CREATE INDEX referral_suggestions_owner_idx ON public.referral_suggestions (for_user_id, status, generated_at DESC);
REVOKE ALL ON public.referral_suggestions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.referral_suggestions TO service_role;
GRANT SELECT ON public.referral_suggestions TO authenticated;
ALTER TABLE public.referral_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read own referral suggestions" ON public.referral_suggestions FOR SELECT TO authenticated USING (for_user_id = auth.uid());

CREATE TABLE public.referral_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id uuid REFERENCES public.referral_suggestions(id) ON DELETE SET NULL,
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connector_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL CHECK (char_length(btrim(message)) BETWEEN 3 AND 2000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CHECK (requester_id <> connector_id AND requester_id <> target_id AND connector_id <> target_id)
);
CREATE INDEX referral_requests_connector_idx ON public.referral_requests (connector_id, status, created_at DESC);
CREATE INDEX referral_requests_requester_idx ON public.referral_requests (requester_id, created_at DESC);
REVOKE ALL ON public.referral_requests FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.referral_requests TO service_role;
GRANT SELECT ON public.referral_requests TO authenticated;
ALTER TABLE public.referral_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "referral request parties read" ON public.referral_requests FOR SELECT TO authenticated
  USING (auth.uid() IN (requester_id, connector_id, target_id));
