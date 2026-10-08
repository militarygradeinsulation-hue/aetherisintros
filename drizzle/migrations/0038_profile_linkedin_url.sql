-- A member's LinkedIn profile link, set when they import their profile from LinkedIn (or edit
-- it). Shown on their profile to other members. Only a canonical public profile address is
-- accepted (https://www.linkedin.com/in/<handle>), so the field cannot carry other links.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS linkedin_url text NOT NULL DEFAULT ''
  CONSTRAINT profiles_linkedin_url_check CHECK (linkedin_url = '' OR linkedin_url ~ '^https://www\.linkedin\.com/in/[A-Za-z0-9%_.-]{3,200}$');

-- Readable with the rest of the profile; members already update their own row.
GRANT SELECT (linkedin_url) ON public.profiles TO authenticated;
