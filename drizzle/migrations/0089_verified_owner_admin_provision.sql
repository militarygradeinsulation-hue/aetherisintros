-- One-time owner provisioning for the existing, email-confirmed Ask Intros account.
-- This grants no permission merely for entering a quick-access code.
-- A newly registered or unconfirmed account receives no elevation.
DO $$
DECLARE owner_id uuid;
BEGIN
  SELECT id INTO owner_id
  FROM auth.users
  WHERE lower(email) = 'aetheris.technology@outlook.com'
    AND email_confirmed_at IS NOT NULL;
  IF owner_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (owner_id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
