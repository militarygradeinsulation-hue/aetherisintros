ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS what_i_do text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS building text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS open_to text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS scheduling_enabled boolean NOT NULL DEFAULT false;

CREATE TABLE public.executive_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  relationship_context text NOT NULL DEFAULT '',
  outcome text NOT NULL DEFAULT '',
  who_should_meet text NOT NULL DEFAULT '',
  display_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT executive_recommendations_distinct_people CHECK (author_id <> recipient_id),
  CONSTRAINT executive_recommendations_body_length CHECK (char_length(body) BETWEEN 10 AND 2000)
);

GRANT SELECT, INSERT, DELETE ON public.executive_recommendations TO authenticated;
GRANT ALL ON public.executive_recommendations TO service_role;

ALTER TABLE public.executive_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "verified members read approved recommendations"
ON public.executive_recommendations
FOR SELECT TO authenticated
USING (
  public.is_verified_member()
  AND (display_approved OR author_id = auth.uid() OR recipient_id = auth.uid())
);

CREATE POLICY "verified members write their recommendations"
ON public.executive_recommendations
FOR INSERT TO authenticated
WITH CHECK (
  public.is_verified_member()
  AND author_id = auth.uid()
  AND recipient_id <> auth.uid()
);

CREATE POLICY "authors delete their recommendations"
ON public.executive_recommendations
FOR DELETE TO authenticated
USING (author_id = auth.uid());

CREATE INDEX executive_recommendations_recipient_idx
  ON public.executive_recommendations (recipient_id, display_approved, created_at DESC);
CREATE INDEX executive_recommendations_author_idx
  ON public.executive_recommendations (author_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.update_my_executive_recommendation(
  p_id uuid,
  p_body text,
  p_relationship_context text DEFAULT '',
  p_outcome text DEFAULT '',
  p_who_should_meet text DEFAULT ''
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_verified_member() THEN
    RAISE EXCEPTION 'Verified membership required';
  END IF;
  IF char_length(trim(p_body)) NOT BETWEEN 10 AND 2000 THEN
    RAISE EXCEPTION 'Recommendation must be between 10 and 2000 characters';
  END IF;
  UPDATE public.executive_recommendations
  SET body = trim(p_body),
      relationship_context = trim(p_relationship_context),
      outcome = trim(p_outcome),
      who_should_meet = trim(p_who_should_meet),
      updated_at = now()
  WHERE id = p_id AND author_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Recommendation not found'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_executive_recommendation_display(
  p_id uuid,
  p_display_approved boolean
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_verified_member() THEN
    RAISE EXCEPTION 'Verified membership required';
  END IF;
  UPDATE public.executive_recommendations
  SET display_approved = p_display_approved, updated_at = now()
  WHERE id = p_id AND recipient_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Recommendation not found'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.update_my_executive_recommendation(uuid,text,text,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_executive_recommendation_display(uuid,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_my_executive_recommendation(uuid,text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_executive_recommendation_display(uuid,boolean) TO authenticated;