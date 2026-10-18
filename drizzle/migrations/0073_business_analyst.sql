-- Private AI strategic analyses. Writes are server-owned; members read only their own history.
CREATE TABLE public.business_diagnostics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  generated_at timestamptz NOT NULL DEFAULT now(),
  model_used text CHECK (model_used IS NULL OR char_length(model_used) <= 120),
  lead_leaks jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(lead_leaks)='array' AND octet_length(lead_leaks::text) <= 30000),
  cold_relationships jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(cold_relationships)='array' AND octet_length(cold_relationships::text) <= 30000),
  partner_needs jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(partner_needs)='array' AND octet_length(partner_needs::text) <= 30000),
  top_opportunities jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(top_opportunities)='array' AND octet_length(top_opportunities::text) <= 50000),
  health_score integer NOT NULL DEFAULT 50 CHECK (health_score BETWEEN 0 AND 100),
  summary text NOT NULL DEFAULT '' CHECK (char_length(summary) <= 8000)
);
CREATE INDEX business_diagnostics_owner_idx ON public.business_diagnostics (user_id, generated_at DESC);
REVOKE ALL ON public.business_diagnostics FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.business_diagnostics TO service_role;
GRANT SELECT ON public.business_diagnostics TO authenticated;
ALTER TABLE public.business_diagnostics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read own business diagnostics" ON public.business_diagnostics FOR SELECT TO authenticated USING (user_id = auth.uid());
