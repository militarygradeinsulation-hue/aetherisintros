-- Gmail, staged: when a member also grants Gmail's metadata permission, the sync reads only
-- the From/To/Cc/Date headers of recent mail (never subjects or bodies) to see when they last
-- emailed each member. Off until the site turns it on (GOOGLE_GMAIL_ENABLED) after Google's
-- restricted-scope review. Signals stay private to the member, like calendar ones.
ALTER TABLE public.relationship_signals DROP CONSTRAINT IF EXISTS relationship_signals_source_check;
ALTER TABLE public.relationship_signals ADD CONSTRAINT relationship_signals_source_check CHECK (source IN ('calendar', 'email'));
