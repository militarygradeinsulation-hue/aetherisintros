-- Public founding enrollment: email-confirmed signups may enter an open first_1000
-- network without a referral. Never imply an unreviewed business role is verified.
-- Invite-only and closed modes remain under the owner's launch-settings control.
CREATE OR REPLACE FUNCTION public.claim_early_access(p_invite_code text DEFAULT NULL)
RETURNS TABLE(status text, founding_member_number integer, mode text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $claim$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_confirmed timestamptz;
  v_mode text;
  v_capacity integer;
  v_taken integer;
  v_next integer;
  v_code text := nullif(trim(coalesce(p_invite_code, '')), '');
  v_existing public.early_access_members;
  v_invite public.invitations;
  v_restricted boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in before claiming access' USING ERRCODE='42501'; END IF;
  SELECT u.email, u.email_confirmed_at INTO v_email, v_confirmed
    FROM auth.users u WHERE u.id = v_uid;
  IF v_email IS NULL OR v_confirmed IS NULL THEN
    RAISE EXCEPTION 'Confirm your email address before entering the network' USING ERRCODE='42501';
  END IF;

  SELECT m.* INTO v_existing FROM public.early_access_members m WHERE m.user_id = v_uid;
  IF FOUND AND v_existing.status IN ('approved','suspended','denied') THEN
    RETURN QUERY SELECT v_existing.status, v_existing.founding_member_number, s.mode
      FROM public.launch_settings s WHERE s.id=1;
    RETURN;
  END IF;

  -- Serialize claims under the launch row: two simultaneous signups cannot
  -- take the same founding number or exceed the selected public capacity.
  SELECT s.mode, s.capacity INTO v_mode, v_capacity
    FROM public.launch_settings s WHERE s.id=1 FOR UPDATE;
  IF v_mode IS NULL THEN
    RAISE EXCEPTION 'Member registration is not configured' USING ERRCODE='55000';
  END IF;

  IF v_code IS NULL THEN
    SELECT nullif(trim(u.raw_user_meta_data->>'invite_code'), '')
      INTO v_code FROM auth.users u WHERE u.id=v_uid;
  END IF;
  IF v_code IS NOT NULL THEN
    SELECT i.* INTO v_invite FROM public.invitations i
      WHERE lower(i.code)=lower(v_code)
        AND NOT i.revoked AND i.uses < i.max_uses
        AND (i.expires_at IS NULL OR i.expires_at > now())
        AND (i.email IS NULL OR lower(i.email)=lower(v_email))
      FOR UPDATE;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.member_verifications v
      WHERE v.user_id=v_uid AND v.status IN ('rejected','suspended')
  ) INTO v_restricted;
  IF v_restricted THEN
    INSERT INTO public.early_access_members (user_id,email,status,source)
      VALUES (v_uid,v_email,'pending','verification_blocked')
      ON CONFLICT (user_id) DO UPDATE SET status='pending',source='verification_blocked',updated_at=now();
    RETURN QUERY SELECT 'pending'::text,NULL::integer,v_mode;
    RETURN;
  END IF;

  IF v_invite.id IS NULL AND v_mode <> 'first_1000' THEN
    INSERT INTO public.early_access_members (user_id,email,status,source)
      VALUES (v_uid,v_email,'pending',v_mode)
      ON CONFLICT (user_id) DO UPDATE SET status='pending',source=v_mode,updated_at=now();
    RETURN QUERY SELECT 'pending'::text,NULL::integer,v_mode;
    RETURN;
  END IF;

  SELECT count(*)::integer INTO v_taken FROM public.early_access_members m
    WHERE m.status='approved' AND m.founding_member_number IS NOT NULL;
  IF v_invite.id IS NULL AND v_taken >= v_capacity THEN
    INSERT INTO public.early_access_members (user_id,email,status,source)
      VALUES (v_uid,v_email,'waitlisted','capacity')
      ON CONFLICT (user_id) DO UPDATE SET status='waitlisted',source='capacity',updated_at=now();
    INSERT INTO public.waitlist_entries (email,user_id,source)
      VALUES (v_email,v_uid,'capacity') ON CONFLICT (email) DO NOTHING;
    RETURN QUERY SELECT 'waitlisted'::text,NULL::integer,v_mode;
    RETURN;
  END IF;

  SELECT coalesce(max(m.founding_member_number),0)+1 INTO v_next
    FROM public.early_access_members m;
  INSERT INTO public.early_access_members
    (user_id,email,status,source,founding_member_number,approved_at,invite_id)
  VALUES (v_uid,v_email,'approved',
          CASE WHEN v_invite.id IS NULL THEN 'email_confirmed_signup' ELSE 'invite' END,
          v_next,now(),v_invite.id)
  ON CONFLICT (user_id) DO UPDATE SET
    status='approved',
    source=excluded.source,
    founding_member_number=coalesce(early_access_members.founding_member_number,v_next),
    approved_at=coalesce(early_access_members.approved_at,now()),
    invite_id=coalesce(excluded.invite_id,early_access_members.invite_id),
    updated_at=now();

  IF v_invite.id IS NOT NULL THEN
    UPDATE public.invitations i SET uses=i.uses+1 WHERE i.id=v_invite.id;
  END IF;
  DELETE FROM public.waitlist_entries w WHERE w.user_id=v_uid;

  -- Level zero proves a confirmed email account only. No verified_role is set.
  -- An owner/CEO badge still requires a separate business-role review.
  INSERT INTO public.member_verifications AS mv
    (user_id,status,verification_level,verified_role,verified_at,submitted_at,public_summary,decision_reason)
  VALUES (v_uid,'verified',CASE WHEN v_invite.id IS NULL THEN 0 ELSE 1 END,
          NULL,now(),now(),'Email-confirmed member',
          CASE WHEN v_invite.id IS NULL THEN 'Self-service confirmed email; business role not verified'
               ELSE 'Vouched by member invite ' || v_invite.code END)
  ON CONFLICT (user_id) DO UPDATE SET
    status='verified',
    verification_level=greatest(mv.verification_level,excluded.verification_level),
    verified_at=coalesce(mv.verified_at,now()),
    submitted_at=coalesce(mv.submitted_at,now()),
    decision_reason=CASE WHEN mv.verification_level > 0
      THEN mv.decision_reason ELSE excluded.decision_reason END
  -- A pending executive-role investigation is not auto-approved as a
  -- side effect of signing up. Only a fresh, unsubmitted membership row
  -- may receive ordinary email-confirmed access.
  WHERE mv.status='verified' OR
    (mv.status='pending' AND mv.submitted_at IS NULL
      AND nullif(trim(coalesce(mv.claimed_role,'')), '') IS NULL);

  RETURN QUERY SELECT m.status,m.founding_member_number,v_mode
    FROM public.early_access_members m WHERE m.user_id=v_uid;
END
$claim$;

REVOKE ALL ON FUNCTION public.claim_early_access(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_early_access(text) TO authenticated;
