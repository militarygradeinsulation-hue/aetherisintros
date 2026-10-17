-- Open founding registration while preserving identity checks and invitation vouching.
-- Changes access CLAIM only; no broad table grants, bypass of RLS, or automatic business verification.
-- The lock on launch_settings serializes founding-number allocation across signups.
UPDATE public.launch_settings SET mode = 'first_1000', updated_at = now()
WHERE id = 1 AND mode = 'invite_only';

CREATE OR REPLACE FUNCTION public.claim_early_access(p_invite_code text DEFAULT NULL::text)
RETURNS TABLE(status text, founding_member_number integer, mode text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_confirmed timestamptz;
  v_mode text;
  v_capacity integer;
  v_next integer;
  v_code text := nullif(btrim(coalesce(p_invite_code, '')), '');
  v_existing public.early_access_members;
  v_invite public.invitations;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000'; END IF;
  SELECT e.* INTO v_existing FROM public.early_access_members e WHERE e.user_id = v_uid;
  IF FOUND AND v_existing.status IN ('approved','suspended','denied') THEN
    RETURN QUERY SELECT v_existing.status, v_existing.founding_member_number,
      (SELECT s.mode FROM public.launch_settings s WHERE s.id = 1);
    RETURN;
  END IF;

  SELECT u.email, u.email_confirmed_at,
    coalesce(v_code, nullif(btrim(u.raw_user_meta_data->>'invite_code'), ''))
  INTO v_email, v_confirmed, v_code FROM auth.users u WHERE u.id = v_uid;
  IF v_email IS NULL OR v_confirmed IS NULL THEN
    RAISE EXCEPTION 'Confirm your email before claiming membership' USING ERRCODE = 'P0001';
  END IF;

  SELECT s.mode, s.capacity INTO v_mode, v_capacity
    FROM public.launch_settings s WHERE s.id = 1 FOR UPDATE;
  IF v_mode IS NULL THEN RAISE EXCEPTION 'Membership settings unavailable'; END IF;

  IF v_code IS NOT NULL THEN
    SELECT i.* INTO v_invite FROM public.invitations i
    WHERE lower(i.code) = lower(v_code)
      AND i.revoked = false AND i.uses < i.max_uses
      AND (i.expires_at IS NULL OR i.expires_at > now())
      AND (i.email IS NULL OR lower(i.email) = lower(v_email))
    FOR UPDATE;
  END IF;

  IF v_mode <> 'first_1000' AND v_invite.id IS NULL THEN
    INSERT INTO public.early_access_members (user_id,email,status,source)
    VALUES (v_uid,v_email,'pending','invite_required')
    ON CONFLICT (user_id) DO UPDATE
      SET status='pending',source='invite_required',updated_at=now();
    RETURN QUERY SELECT 'pending'::text, null::integer, v_mode;
    RETURN;
  END IF;

  -- Founding numbers are a finite designation, NOT a cap on ordinary members.
  SELECT coalesce(max(e.founding_member_number),0)+1 INTO v_next
    FROM public.early_access_members e;
  IF v_next > least(greatest(coalesce(v_capacity,1000),0),100000) THEN
    v_next := null;
  END IF;

  INSERT INTO public.early_access_members
    (user_id,email,status,source,founding_member_number,approved_at,invite_id)
  VALUES (v_uid,v_email,'approved',
    CASE WHEN v_invite.id IS NOT NULL THEN 'invite' ELSE 'open_signup' END,
    v_next,now(),v_invite.id)
  ON CONFLICT (user_id) DO UPDATE SET
    status='approved',
    source=EXCLUDED.source,
    founding_member_number=coalesce(early_access_members.founding_member_number,EXCLUDED.founding_member_number),
    approved_at=coalesce(early_access_members.approved_at,now()),
    invite_id=coalesce(early_access_members.invite_id,EXCLUDED.invite_id),
    updated_at=now();

  IF v_invite.id IS NOT NULL THEN
    UPDATE public.invitations i SET uses = uses + 1 WHERE i.id = v_invite.id;
    -- Member vouching already exists in the product. Never override rejection/suspension.
    INSERT INTO public.member_verifications AS mv
      (user_id,status,verification_level,verified_at,submitted_at,decision_reason)
    VALUES (v_uid,'verified',1,now(),now(),'Vouched by member invitation')
    ON CONFLICT (user_id) DO UPDATE SET
      status='verified',verification_level=1,verified_at=now(),
      submitted_at=coalesce(mv.submitted_at,now()),
      decision_reason='Vouched by member invitation'
    WHERE mv.status NOT IN ('rejected','suspended');
  END IF;

  DELETE FROM public.waitlist_entries w WHERE w.user_id = v_uid;
  RETURN QUERY SELECT e.status,e.founding_member_number,v_mode
  FROM public.early_access_members e WHERE e.user_id = v_uid;
END
$function$;

REVOKE ALL ON FUNCTION public.claim_early_access(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_early_access(text) TO authenticated, service_role;
