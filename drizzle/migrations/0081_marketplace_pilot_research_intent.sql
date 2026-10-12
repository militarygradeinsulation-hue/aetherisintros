-- Capture authenticated marketplace pilot research intent without posting a
-- public listing, granting outreach permission, or leaking profile/contact data.
-- One private editable response per approved member. All writes go through
-- an authenticated server-validated RPC; arbitrary table writes are denied.

CREATE TABLE IF NOT EXISTS public.marketplace_pilot_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  intent text NOT NULL CHECK (intent IN ('buy','offer','both','exploring')),
  response jsonb NOT NULL CHECK (jsonb_typeof(response) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS marketplace_pilot_intent_idx
  ON public.marketplace_pilot_interests(intent, updated_at DESC);
REVOKE ALL ON public.marketplace_pilot_interests FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.marketplace_pilot_interests TO service_role;
GRANT SELECT ON public.marketplace_pilot_interests TO authenticated;
ALTER TABLE public.marketplace_pilot_interests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pilot interest self read" ON public.marketplace_pilot_interests;
CREATE POLICY "pilot interest self read"
  ON public.marketplace_pilot_interests FOR SELECT TO authenticated
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "pilot interest admin review" ON public.marketplace_pilot_interests;
CREATE POLICY "pilot interest admin review"
  ON public.marketplace_pilot_interests FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.submit_marketplace_pilot_interest(p_response jsonb)
RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_intent text;
  v_id uuid;
  v_key text;
  v_loc jsonb;
  v_opt jsonb;
BEGIN
  IF v_user IS NULL OR NOT public.is_live_member() OR NOT public.is_approved_member(v_user) THEN
    RAISE EXCEPTION 'Approved member required' USING ERRCODE = '42501';
  END IF;
  IF p_response IS NULL OR jsonb_typeof(p_response) <> 'object'
     OR octet_length(p_response::text) > 16000 THEN
    RAISE EXCEPTION 'Invalid pilot response' USING ERRCODE = '22023';
  END IF;
  FOR v_key IN SELECT jsonb_object_keys(p_response) LOOP
    IF v_key NOT IN ('intent','organization','role','industry','location',
                    'difficulty','buyer','provider','preferences','optIns') THEN
      RAISE EXCEPTION 'Unexpected pilot response field' USING ERRCODE = '22023';
    END IF;
  END LOOP;
  v_intent := p_response->>'intent';
  IF v_intent IS NULL OR v_intent NOT IN ('buy','offer','both','exploring') THEN
    RAISE EXCEPTION 'Choose your pilot intent' USING ERRCODE = '22023';
  END IF;
  FOREACH v_key IN ARRAY ARRAY['organization','role','industry','difficulty'] LOOP
    IF length(btrim(coalesce(p_response->>v_key,''))) = 0
       OR length(p_response->>v_key) > CASE WHEN v_key='difficulty' THEN 1000 ELSE 120 END THEN
      RAISE EXCEPTION 'Required pilot details are missing or too long' USING ERRCODE = '22023';
    END IF;
  END LOOP;
  v_loc := p_response->'location';
  IF jsonb_typeof(v_loc) IS DISTINCT FROM 'object'
     OR length(btrim(coalesce(v_loc->>'city',''))) = 0
     OR length(v_loc->>'city') > 120
     OR jsonb_typeof(v_loc->'remote') IS DISTINCT FROM 'boolean' THEN
    RAISE EXCEPTION 'Invalid broad location' USING ERRCODE = '22023';
  END IF;
  v_opt := p_response->'optIns';
  IF jsonb_typeof(v_opt) IS DISTINCT FROM 'object'
     OR jsonb_typeof(v_opt->'pilotContact') IS DISTINCT FROM 'boolean'
     OR jsonb_typeof(v_opt->'feedbackInterview') IS DISTINCT FROM 'boolean'
     OR jsonb_typeof(v_opt->'realPilotProject') IS DISTINCT FROM 'boolean' THEN
    RAISE EXCEPTION 'Explicit research preferences are required' USING ERRCODE = '22023';
  END IF;
  IF (v_intent IN ('buy','both')) <> (jsonb_typeof(p_response->'buyer') = 'object')
     OR (v_intent IN ('offer','both')) <> (jsonb_typeof(p_response->'provider') = 'object') THEN
    RAISE EXCEPTION 'Only relevant buyer/provider sections are accepted' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(p_response->'preferences') IS NOT NULL
     AND jsonb_typeof(p_response->'preferences') <> 'object' THEN
    RAISE EXCEPTION 'Invalid preferences' USING ERRCODE = '22023';
  END IF;
  -- Enforce the largest conditional-field bounds, even for callers bypassing
  -- the form. The client additionally validates individual field formats.
  IF v_intent IN ('buy','both') AND (
       length(btrim(coalesce(p_response->'buyer'->>'need',''))) = 0
       OR length(coalesce(p_response->'buyer'->>'need','')) > 1000
       OR length(btrim(coalesce(p_response->'buyer'->>'outcome',''))) = 0
       OR length(coalesce(p_response->'buyer'->>'outcome','')) > 1000
     ) THEN
    RAISE EXCEPTION 'Buyer need and outcome are required' USING ERRCODE = '22023';
  END IF;
  IF v_intent IN ('offer','both') AND (
       length(btrim(coalesce(p_response->'provider'->>'description',''))) = 0
       OR length(coalesce(p_response->'provider'->>'description','')) > 1000
       OR jsonb_typeof(p_response->'provider'->'categories') <> 'array'
       OR jsonb_array_length(p_response->'provider'->'categories') NOT BETWEEN 1 AND 3
     ) THEN
    RAISE EXCEPTION 'Provider description and categories are required' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.marketplace_pilot_interests(user_id,intent,response)
  VALUES (v_user,v_intent,p_response)
  ON CONFLICT (user_id) DO UPDATE SET
    intent=excluded.intent, response=excluded.response, updated_at=now()
  RETURNING id INTO v_id;
  RETURN v_id;
END
$function$;
REVOKE ALL ON FUNCTION public.submit_marketplace_pilot_interest(jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_marketplace_pilot_interest(jsonb)
  TO authenticated;
