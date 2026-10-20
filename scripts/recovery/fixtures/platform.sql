-- SYNTHETIC platform shell, not a live schema. No user rows or credentials.
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE ROLE authenticator; CREATE ROLE supabase_admin; CREATE ROLE supabase_auth_admin; CREATE ROLE supabase_storage_admin;
CREATE SCHEMA auth;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, email_confirmed_at timestamptz, last_sign_in_at timestamptz, raw_user_meta_data jsonb DEFAULT '{}', raw_app_meta_data jsonb DEFAULT '{}', created_at timestamptz DEFAULT now());
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub'),'')::uuid $$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT auth.jwt()->>'role' $$;
CREATE SCHEMA storage;
CREATE TABLE storage.buckets(id text PRIMARY KEY, name text, public boolean DEFAULT false, file_size_limit bigint, allowed_mime_types text[]);
CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text, owner uuid, owner_id text, metadata jsonb);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
GRANT ALL ON storage.objects, storage.buckets TO service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO authenticated;
CREATE SCHEMA extensions;
CREATE PUBLICATION supabase_realtime;

-- Realtime structure ONLY: does not simulate message delivery.
CREATE SCHEMA realtime;
CREATE TABLE realtime.messages(id bigint, extension text, topic text);
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION realtime.topic() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_setting('realtime.topic',true) $$;
GRANT USAGE ON SCHEMA realtime TO authenticated;
GRANT SELECT, INSERT ON realtime.messages TO authenticated;

-- Fixture copied from 0029 to supply documented frozen-history ordering gap.
CREATE OR REPLACE FUNCTION public.relative_label(ts timestamp with time zone)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select case
    when ts is null then ''
    when now() - ts < interval '2 minutes'  then 'Just now'
    when now() - ts < interval '1 hour'     then extract(minute from now() - ts)::int || 'm ago'
    when now() - ts < interval '1 day'      then extract(hour   from now() - ts)::int || 'h ago'
    when now() - ts < interval '30 days'    then extract(day    from now() - ts)::int || 'd ago'
    else to_char(ts, 'Mon DD, YYYY')
  end;
$function$;

-- Fixture copied from 0029 to supply documented frozen-history ordering gap.
CREATE OR REPLACE FUNCTION public.memories_before_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_key text;
begin
  -- always stamp an accurate label at write time
  new.when_label := public.relative_label(coalesce(new.created_at, now()));

  -- drop near-duplicate writes (same user, same text, same source, within 10 minutes)
  if exists (
    select 1 from public.memories m
    where m.user_id = new.user_id
      and m.text    = new.text
      and m.source  = new.source
      and m.created_at > now() - interval '10 minutes'
  ) then
    return null;
  end if;

  -- supersede: a restated fact replaces the prior version instead of stacking
  v_key := case when position(':' in new.text) > 0
                then lower(btrim(split_part(new.text, ':', 1)))
                else null end;
  new.fact_key := v_key;

  if v_key is not null then
    delete from public.memories m
    where m.user_id = new.user_id
      and m.source  = new.source
      and m.fact_key = v_key;
  end if;

  return new;
end;
$function$;
