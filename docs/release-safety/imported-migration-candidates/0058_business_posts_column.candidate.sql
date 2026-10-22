ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS business jsonb;

CREATE OR REPLACE FUNCTION public.business_post_valid(p_kind text, p_title text, p_detail text, p_business jsonb)
RETURNS boolean LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE
  k text;
  v jsonb;
  l jsonb;
  has_money boolean;
BEGIN
  IF p_kind NOT IN ('Need', 'Offer', 'Proof of work') THEN RETURN p_business IS NULL; END IF;
  IF p_business IS NULL OR jsonb_typeof(p_business) <> 'object' THEN RETURN false; END IF;
  IF char_length(btrim(p_title)) NOT BETWEEN 3 AND 140 THEN RETURN false; END IF;
  IF char_length(btrim(p_detail)) NOT BETWEEN 10 AND 2000 THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(p_business) key WHERE key <> ALL (ARRAY['category','budgetMin','budgetMax','startingPrice','currency','deadline','availability','geography','links'])) THEN RETURN false; END IF;
  IF (p_business ->> 'category') IS NULL OR (p_business ->> 'category') <> ALL (ARRAY['Sales & customers','Marketing','Technology','Operations','Finance & capital','Legal & compliance','Talent & hiring','Design & creative','Consulting','Other']) THEN RETURN false; END IF;
  FOREACH k IN ARRAY ARRAY['budgetMin','budgetMax','startingPrice'] LOOP
    v := p_business -> k;
    IF v IS NOT NULL AND (jsonb_typeof(v) <> 'number' OR (v #>> '{}')::numeric <= 0 OR (v #>> '{}')::numeric > 1000000000) THEN RETURN false; END IF;
  END LOOP;
  IF p_kind <> 'Need' AND (p_business ? 'budgetMin' OR p_business ? 'budgetMax' OR p_business ? 'deadline') THEN RETURN false; END IF;
  IF p_kind <> 'Offer' AND (p_business ? 'startingPrice' OR p_business ? 'availability') THEN RETURN false; END IF;
  IF p_kind <> 'Proof of work' AND p_business ? 'links' THEN RETURN false; END IF;
  IF (p_business ? 'budgetMin') AND (p_business ? 'budgetMax') AND (p_business ->> 'budgetMin')::numeric > (p_business ->> 'budgetMax')::numeric THEN RETURN false; END IF;
  has_money := (p_business ? 'budgetMin') OR (p_business ? 'budgetMax') OR (p_business ? 'startingPrice');
  IF p_business ? 'currency' THEN
    IF jsonb_typeof(p_business -> 'currency') <> 'string' OR (p_business ->> 'currency') <> ALL (ARRAY['USD','EUR','GBP','CAD','AUD','CHF','JPY','SGD','AED']) THEN RETURN false; END IF;
  ELSIF has_money THEN RETURN false;
  END IF;
  FOREACH k IN ARRAY ARRAY['deadline','availability','geography'] LOOP
    v := p_business -> k;
    IF v IS NOT NULL AND (jsonb_typeof(v) <> 'string' OR char_length(v #>> '{}') > 80) THEN RETURN false; END IF;
  END LOOP;
  IF p_business ? 'deadline' THEN
    IF (p_business ->> 'deadline') !~ '^\d{4}-\d{2}-\d{2}$' THEN RETURN false; END IF;
    BEGIN PERFORM (p_business ->> 'deadline')::date; EXCEPTION WHEN others THEN RETURN false; END;
  END IF;
  IF p_kind = 'Proof of work' THEN
    IF NOT (p_business ? 'links') OR jsonb_typeof(p_business -> 'links') <> 'array' OR jsonb_array_length(p_business -> 'links') NOT BETWEEN 1 AND 5 THEN RETURN false; END IF;
    FOR l IN SELECT * FROM jsonb_array_elements(p_business -> 'links') LOOP
      IF jsonb_typeof(l) <> 'string' OR char_length(l #>> '{}') > 2048 OR (l #>> '{}') !~ '^https://[^\s/@?#]+\.[^\s/@?#]+([/?#]\S*)?$' THEN RETURN false; END IF;
    END LOOP;
  END IF;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.business_post_valid(text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.business_post_valid(text, text, text, jsonb) TO authenticated, service_role;

ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_business_shape;
ALTER TABLE public.posts ADD CONSTRAINT posts_business_shape
  CHECK (public.business_post_valid(kind, text, detail, business)) NOT VALID;