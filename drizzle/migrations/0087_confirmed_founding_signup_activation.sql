-- Apply after 0086_restore_launch_mode_signup.
-- Open first-1,000 admission already allocates an approved founding place. This
-- makes a CONFIRMED-email account usable without falsely assigning a CEO badge.
-- All invitation, whitelist, suspended and rejected approval rules stay intact.
CREATE OR REPLACE FUNCTION public.confirm_founding_signup()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE confirmed_at timestamptz;
BEGIN
  IF NEW.status <> 'approved' OR NEW.source <> 'first_1000' THEN
    RETURN NEW;
  END IF;
  SELECT u.email_confirmed_at INTO confirmed_at
    FROM auth.users u WHERE u.id = NEW.user_id;
  IF confirmed_at IS NULL THEN
    RAISE EXCEPTION 'Confirm your email before joining the live network'
      USING ERRCODE = '42501';
  END IF;
  -- Membership status is NOT an executive-role credential. The badge remains
  -- unset, and a future role review must supply independent evidence.
  INSERT INTO public.member_verifications
    (user_id,status,verification_level,verified_at,decision_reason)
  VALUES (NEW.user_id,'verified',0,now(),
          'Email confirmed; business leadership role not verified')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION public.confirm_founding_signup()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS founding_signup_confirmed ON public.early_access_members;
CREATE TRIGGER founding_signup_confirmed
AFTER INSERT OR UPDATE OF status, source
ON public.early_access_members
FOR EACH ROW EXECUTE FUNCTION public.confirm_founding_signup();

-- Existing email-confirmed first-1,000 members can enter on next sign-in.
-- Do not override records with submitted identity claims or reviewer decisions.
INSERT INTO public.member_verifications
  (user_id,status,verification_level,verified_at,decision_reason)
SELECT e.user_id,'verified',0,now(),
       'Email confirmed; business leadership role not verified'
  FROM public.early_access_members e
  JOIN auth.users u ON u.id=e.user_id
 WHERE e.status='approved' AND e.source='first_1000'
   AND u.email_confirmed_at IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;
