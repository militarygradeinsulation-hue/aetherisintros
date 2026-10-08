-- Foundation: quieter sign-ups, error capture, and real account deletion records.

-- 1. A new member is still connected to everyone automatically, but those automatic
--    connections no longer notify every member ("X connected with you" × the whole network).
--    Connections a member makes themselves still notify as before.
CREATE OR REPLACE FUNCTION public.connect_new_member_to_owner()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_other uuid;
begin
  perform set_config('app.auto_connect', 'on', true);
  for v_other in
    select p.id from public.profiles p where p.id <> new.id
  loop
    insert into public.relationships (user_id, member_id, kind)
    values (new.id, v_other::text, 'connection')
    on conflict (user_id, member_id, kind) do nothing;

    insert into public.relationships (user_id, member_id, kind)
    values (v_other, new.id::text, 'connection')
    on conflict (user_id, member_id, kind) do nothing;

    insert into public.follows (follower_id, followee_id, kind)
    values (new.id, v_other, 'connection')
    on conflict (follower_id, followee_id, kind) do nothing;

    insert into public.follows (follower_id, followee_id, kind)
    values (v_other, new.id, 'connection')
    on conflict (follower_id, followee_id, kind) do nothing;
  end loop;
  perform set_config('app.auto_connect', 'off', true);
  return new;
end $function$;
REVOKE ALL ON FUNCTION public.connect_new_member_to_owner() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_new_follow() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text;
BEGIN
  IF NEW.kind NOT IN ('connection','follow') OR NEW.followee_id = NEW.follower_id THEN RETURN NULL; END IF;
  IF coalesce(current_setting('app.auto_connect', true), '') = 'on' THEN RETURN NULL; END IF;
  SELECT coalesce(nullif(btrim(p.name), ''), 'A member') INTO v_name FROM public.profiles p WHERE p.id = NEW.follower_id;
  INSERT INTO public.notifications (user_id, actor_id, kind, text, link)
  VALUES (NEW.followee_id, NEW.follower_id, NEW.kind,
          coalesce(v_name, 'A member') || CASE WHEN NEW.kind = 'connection' THEN ' connected with you.' ELSE ' is following your work.' END,
          'people');
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.notify_new_follow() FROM PUBLIC, anon, authenticated;

-- 2. Error capture. Browsers report errors through log_app_error (rate-limited per person);
--    the server writes directly. Only admins read them.
CREATE TABLE public.app_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL CHECK (source IN ('client', 'server')),
  user_id uuid,
  message text NOT NULL,
  stack text NOT NULL DEFAULT '',
  url text NOT NULL DEFAULT '',
  user_agent text NOT NULL DEFAULT ''
);
CREATE INDEX app_errors_recent_idx ON public.app_errors (created_at DESC);
REVOKE ALL ON public.app_errors FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.app_errors TO service_role;
GRANT SELECT ON public.app_errors TO authenticated;
ALTER TABLE public.app_errors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read errors" ON public.app_errors FOR SELECT TO authenticated USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.log_app_error(p_message text, p_stack text DEFAULT '', p_url text DEFAULT '', p_user_agent text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_recent int; v_limit int;
BEGIN
  IF nullif(btrim(coalesce(p_message, '')), '') IS NULL THEN RETURN; END IF;
  -- At most 20 reports a minute per signed-in person, 200 a minute from visitors overall.
  SELECT count(*) INTO v_recent FROM public.app_errors
   WHERE created_at > now() - interval '1 minute' AND source = 'client' AND user_id IS NOT DISTINCT FROM v_uid;
  v_limit := CASE WHEN v_uid IS NULL THEN 200 ELSE 20 END;
  IF v_recent >= v_limit THEN RETURN; END IF;
  INSERT INTO public.app_errors (source, user_id, message, stack, url, user_agent)
  VALUES ('client', v_uid, left(p_message, 1000), left(coalesce(p_stack, ''), 4000), left(coalesce(p_url, ''), 500), left(coalesce(p_user_agent, ''), 300));
  -- Keep two weeks.
  DELETE FROM public.app_errors WHERE created_at < now() - interval '14 days';
END $$;
REVOKE ALL ON FUNCTION public.log_app_error(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_app_error(text, text, text, text) TO anon, authenticated;

-- 3. Account deletion: the server deletes the account (everything owned cascades); this
--    keeps only that a deletion happened, with no personal data.
CREATE TABLE public.account_deletions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  deleted_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.account_deletions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.account_deletions TO service_role;
ALTER TABLE public.account_deletions ENABLE ROW LEVEL SECURITY;
