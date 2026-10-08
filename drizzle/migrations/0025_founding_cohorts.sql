-- Founding cohorts: invite a named group (for example existing Aetheris clients) with one
-- single-use, email-locked link per person, then track each invitee from invitation to a
-- counterpart-reported outcome. Admin-only. Nothing is emailed by the system: admins
-- send the links themselves, so every invitation is a deliberate, personal act.

CREATE TABLE public.invite_cohorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 120),
  source_label text NOT NULL DEFAULT '' CHECK (char_length(source_label) <= 60),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.invite_cohorts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.invite_cohorts TO authenticated;
GRANT ALL ON public.invite_cohorts TO service_role;
ALTER TABLE public.invite_cohorts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read cohorts" ON public.invite_cohorts FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "admins create cohorts" ON public.invite_cohorts FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND created_by = auth.uid());

ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS cohort_id uuid REFERENCES public.invite_cohorts(id) ON DELETE SET NULL;
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS invitee_name text NOT NULL DEFAULT '';
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS invitee_company text NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS invitations_cohort_idx ON public.invitations (cohort_id) WHERE cohort_id IS NOT NULL;

-- Create one email-locked, single-use invitation per row. Rows are {email, name, company}.
-- Returns what happened to each row so the admin sees skips instead of silent drops.
CREATE OR REPLACE FUNCTION public.create_cohort_invites(p_cohort uuid, p_rows jsonb, p_days integer DEFAULT 60)
RETURNS TABLE(email text, code text, outcome text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row jsonb;
  v_email text;
  v_code text;
  v_expires timestamptz := now() + make_interval(days => greatest(1, least(coalesce(p_days, 60), 365)));
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorised' USING errcode = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.invite_cohorts c WHERE c.id = p_cohort) THEN
    RAISE EXCEPTION 'Unknown cohort' USING errcode = '22023';
  END IF;
  IF jsonb_typeof(p_rows) <> 'array' OR jsonb_array_length(p_rows) > 500 THEN
    RAISE EXCEPTION 'Send between 1 and 500 rows at a time' USING errcode = '22023';
  END IF;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    v_email := lower(trim(coalesce(v_row->>'email', '')));
    IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
      email := v_email; code := NULL; outcome := 'invalid_email'; RETURN NEXT; CONTINUE;
    END IF;
    IF EXISTS (SELECT 1 FROM public.early_access_members m WHERE lower(m.email) = v_email AND m.status = 'approved') THEN
      email := v_email; code := NULL; outcome := 'already_member'; RETURN NEXT; CONTINUE;
    END IF;
    SELECT i.code INTO v_code FROM public.invitations i
     WHERE lower(i.email) = v_email AND NOT i.revoked AND i.uses < i.max_uses AND (i.expires_at IS NULL OR i.expires_at > now())
     LIMIT 1;
    IF v_code IS NOT NULL THEN
      -- An existing invite with no cohort joins this one, so the person shows in its funnel.
      -- Columns are table-qualified: `code` is also an output parameter of this function.
      UPDATE public.invitations i SET cohort_id = p_cohort,
             invitee_name = CASE WHEN i.invitee_name = '' THEN left(trim(coalesce(v_row->>'name', '')), 160) ELSE i.invitee_name END,
             invitee_company = CASE WHEN i.invitee_company = '' THEN left(trim(coalesce(v_row->>'company', '')), 160) ELSE i.invitee_company END
       WHERE lower(i.code) = lower(v_code) AND i.cohort_id IS NULL;
      email := v_email; code := v_code; outcome := 'already_invited'; RETURN NEXT; CONTINUE;
    END IF;
    LOOP
      v_code := 'f-' || substr(md5(gen_random_uuid()::text), 1, 10);
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.invitations i WHERE lower(i.code) = v_code);
    END LOOP;
    INSERT INTO public.invitations (code, email, max_uses, expires_at, created_by, cohort_id, invitee_name, invitee_company)
    VALUES (v_code, v_email, 1, v_expires, auth.uid(), p_cohort,
            left(trim(coalesce(v_row->>'name', '')), 160), left(trim(coalesce(v_row->>'company', '')), 160));
    email := v_email; code := v_code; outcome := 'created'; RETURN NEXT;
  END LOOP;
END $$;

-- Where each invitee is on the path to proving value. Stages are cumulative and evidence-
-- based: an outcome counts only when the other side of an introduction reported it.
CREATE OR REPLACE FUNCTION public.cohort_activation(p_cohort uuid)
RETURNS TABLE(invite_id uuid, email text, invitee_name text, invitee_company text, code text, expires_at timestamptz, stage text, user_id uuid)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorised' USING errcode = '42501'; END IF;
  RETURN QUERY
  WITH inv AS (
    SELECT i.id, i.email, i.invitee_name, i.invitee_company, i.code, i.expires_at,
           (SELECT m.user_id FROM public.early_access_members m WHERE m.invite_id = i.id AND m.status = 'approved' LIMIT 1) AS uid
      FROM public.invitations i
     WHERE i.cohort_id = p_cohort AND NOT i.revoked
  )
  SELECT inv.id, inv.email, inv.invitee_name, inv.invitee_company, inv.code, inv.expires_at,
    CASE
      WHEN inv.uid IS NULL THEN CASE WHEN inv.expires_at IS NOT NULL AND inv.expires_at < now() THEN 'expired' ELSE 'invited' END
      WHEN EXISTS (
        SELECT 1 FROM public.intro_requests r JOIN public.intro_outcomes o ON o.intro_request_id = r.id
         WHERE (r.user_id = inv.uid OR r.target_user_id = inv.uid) AND o.author_id <> inv.uid AND o.stage = 'outcome') THEN 'outcome'
      WHEN EXISTS (
        SELECT 1 FROM public.intro_requests r
         WHERE (r.user_id = inv.uid OR r.target_user_id = inv.uid) AND r.accepted_at IS NOT NULL) THEN 'introduced'
      WHEN EXISTS (SELECT 1 FROM public.asks a WHERE a.author_id = inv.uid AND NOT a.is_demo) THEN 'asked'
      WHEN EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = inv.uid AND p.onboarded) THEN 'onboarded'
      ELSE 'joined'
    END,
    inv.uid
  FROM inv
  ORDER BY inv.invitee_name, inv.email;
END $$;

CREATE OR REPLACE FUNCTION public.revoke_cohort_invite(p_invite uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorised' USING errcode = '42501'; END IF;
  UPDATE public.invitations SET revoked = true WHERE id = p_invite AND cohort_id IS NOT NULL AND uses = 0;
END $$;

REVOKE ALL ON FUNCTION public.create_cohort_invites(uuid, jsonb, integer), public.cohort_activation(uuid), public.revoke_cohort_invite(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_cohort_invites(uuid, jsonb, integer), public.cohort_activation(uuid), public.revoke_cohort_invite(uuid) TO authenticated;
