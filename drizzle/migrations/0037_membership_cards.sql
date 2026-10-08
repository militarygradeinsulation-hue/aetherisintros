-- Membership cards.
--
-- Every verified member gets an Ask Intros membership card: their name, the date they were
-- verified and a code of their own (AI-<initials>-<5 digits>, e.g. AI-AN-59104). The card is
-- issued by the database the moment a member becomes verified, by any route (an admin
-- decision or an invite that vouches for them), so no path can skip it. The code is unique
-- and kept for later use (looking a member up, checking a card someone shows).
--
-- The card is emailed to the member once (the server sends it and records when), and their
-- profile shows it to other members as proof they are verified. If verification is removed
-- the card is revoked and disappears from the profile; if they are verified again the same
-- card and code come back.

CREATE TABLE public.membership_cards (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE CHECK (code ~ '^AI-[A-Z]{2}-[0-9]{5}$'),
  holder_name text NOT NULL CHECK (char_length(btrim(holder_name)) BETWEEN 1 AND 120),
  verified_at timestamptz NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  revoked_at timestamptz,
  -- Unguessable id for the emailed card image; never shown to other members.
  image_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  -- Email delivery, managed by the server (service role) only.
  email_due boolean NOT NULL DEFAULT true,
  emailed_at timestamptz,
  email_attempts integer NOT NULL DEFAULT 0
);

REVOKE ALL ON public.membership_cards FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.membership_cards TO service_role;
-- Members see the card itself, never the image token or delivery bookkeeping, and cannot
-- write: cards are issued and revoked only by the database.
GRANT SELECT (user_id, code, holder_name, verified_at, issued_at, status) ON public.membership_cards TO authenticated;
ALTER TABLE public.membership_cards ENABLE ROW LEVEL SECURITY;
-- Same audience as profiles: your own card always; other members' active cards.
CREATE POLICY "members read active cards" ON public.membership_cards FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (status = 'active' AND public.is_live_member() AND public.is_approved_member(user_id)));

-- The name printed on the card: the profile name, else the name given for verification.
CREATE OR REPLACE FUNCTION public.membership_card_name(p_user uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT left(coalesce(
    (SELECT nullif(btrim(p.name), '') FROM public.profiles p WHERE p.id = p_user),
    (SELECT coalesce(nullif(btrim(v.display_name), ''), nullif(btrim(v.legal_name), ''))
       FROM public.member_verifications v WHERE v.user_id = p_user LIMIT 1)
  ), 120)
$$;
REVOKE ALL ON FUNCTION public.membership_card_name(uuid) FROM PUBLIC, anon, authenticated;

-- AI-<first and last initial>-<5 digits>, unused so far. Accented initials are folded.
CREATE OR REPLACE FUNCTION public.new_membership_code(p_name text)
RETURNS text LANGUAGE plpgsql VOLATILE SET search_path = public AS $$
DECLARE v_clean text; v_words text[]; v_init text; v_code text;
BEGIN
  v_clean := upper(translate(coalesce(p_name, ''),
    'ÀÁÂÃÄÅĀĂĄÇĆČĎÈÉÊËĒĖĘĚÌÍÎÏĪĮÑŃŇÒÓÔÕÖŌŘŚŠŞŤÙÚÛÜŪŮŲÝŸŽŹŻàáâãäåāăąçćčďèéêëēėęěìíîïīįñńňòóôõöōřśšşťùúûüūůųýÿžźżŁłØø',
    'AAAAAAAAACCCDEEEEEEEEIIIIIINNNOOOOOORSSSTUUUUUUUYYZZZaaaaaaaaacccdeeeeeeeeiiiiiinnnoooooorssstuuuuuuuyyzzzLlOo'));
  v_clean := btrim(regexp_replace(regexp_replace(v_clean, '[^A-Z ]', '', 'g'), '\s+', ' ', 'g'));
  v_words := string_to_array(v_clean, ' ');
  IF v_clean = '' THEN v_init := 'XX';
  ELSIF cardinality(v_words) = 1 THEN v_init := rpad(left(v_words[1], 2), 2, 'X');
  ELSE v_init := left(v_words[1], 1) || left(v_words[cardinality(v_words)], 1);
  END IF;
  LOOP
    v_code := 'AI-' || v_init || '-' || (10000 + floor(random() * 90000))::int::text;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.membership_cards WHERE code = v_code);
  END LOOP;
  RETURN v_code;
END $$;
REVOKE ALL ON FUNCTION public.new_membership_code(text) FROM PUBLIC, anon, authenticated;

-- Issue (or restore) a verified member's card. A card waits until the member has a name.
-- p_announce = false issues it without queueing the welcome email.
CREATE OR REPLACE FUNCTION public.issue_membership_card(p_user uuid, p_announce boolean DEFAULT true)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text; v_verified timestamptz;
BEGIN
  SELECT v.verified_at INTO v_verified FROM public.member_verifications v
   WHERE v.user_id = p_user AND v.status = 'verified' LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.membership_cards WHERE user_id = p_user) THEN
    UPDATE public.membership_cards SET status = 'active', revoked_at = NULL WHERE user_id = p_user AND status <> 'active';
    RETURN;
  END IF;
  v_name := public.membership_card_name(p_user);
  IF v_name IS NULL THEN RETURN; END IF;
  FOR attempt IN 1..5 LOOP
    BEGIN
      INSERT INTO public.membership_cards (user_id, code, holder_name, verified_at, email_due)
      VALUES (p_user, public.new_membership_code(v_name), v_name, coalesce(v_verified, now()), coalesce(p_announce, true));
      RETURN;
    EXCEPTION WHEN unique_violation THEN
      -- Another session issued it, or two codes collided: re-check and try a fresh code.
      IF EXISTS (SELECT 1 FROM public.membership_cards WHERE user_id = p_user) THEN RETURN; END IF;
    END;
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.issue_membership_card(uuid, boolean) FROM PUBLIC, anon, authenticated;

-- Verification decides the card: verified issues or restores it, anything else revokes it.
CREATE OR REPLACE FUNCTION public.membership_card_follow_verification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'verified' THEN
    PERFORM public.issue_membership_card(NEW.user_id, true);
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'verified' THEN
    UPDATE public.membership_cards SET status = 'revoked', revoked_at = now() WHERE user_id = NEW.user_id AND status = 'active';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.membership_card_follow_verification() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS member_verifications_membership_card ON public.member_verifications;
CREATE TRIGGER member_verifications_membership_card AFTER INSERT OR UPDATE OF status ON public.member_verifications
  FOR EACH ROW EXECUTE FUNCTION public.membership_card_follow_verification();

-- The card carries the member's current profile name; a verified member who had no name yet
-- gets their card as soon as they add one.
CREATE OR REPLACE FUNCTION public.membership_card_follow_name()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF nullif(btrim(NEW.name), '') IS NULL OR (TG_OP = 'UPDATE' AND NEW.name IS NOT DISTINCT FROM OLD.name) THEN RETURN NEW; END IF;
  UPDATE public.membership_cards SET holder_name = left(btrim(NEW.name), 120) WHERE user_id = NEW.id;
  IF NOT FOUND THEN PERFORM public.issue_membership_card(NEW.id, true); END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.membership_card_follow_name() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS profiles_membership_card ON public.profiles;
CREATE TRIGGER profiles_membership_card AFTER INSERT OR UPDATE OF name ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.membership_card_follow_name();

-- Look up a code (for example one shown on a card). Members only; says whether it is active.
CREATE OR REPLACE FUNCTION public.lookup_membership_code(p_code text)
RETURNS TABLE (member_id uuid, holder_name text, verified_at timestamptz, status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.user_id, c.holder_name, c.verified_at, c.status
    FROM public.membership_cards c
   WHERE c.code = upper(btrim(coalesce(p_code, ''))) AND public.is_approved_member(auth.uid())
$$;
REVOKE ALL ON FUNCTION public.lookup_membership_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lookup_membership_code(text) TO authenticated;

-- Members verified before cards existed get theirs now, without an automatic email; an admin
-- can send each one from the verification page.
SELECT public.issue_membership_card(v.user_id, false) FROM public.member_verifications v WHERE v.status = 'verified';
