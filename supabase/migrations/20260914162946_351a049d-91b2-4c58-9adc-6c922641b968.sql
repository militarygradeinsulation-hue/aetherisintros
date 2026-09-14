ALTER TABLE public.launch_settings ADD COLUMN IF NOT EXISTS owner_user_id uuid;

UPDATE public.launch_settings SET owner_user_id = 'f044cc3d-0643-464e-b402-3e3cb24cef57' WHERE id = 1;

CREATE OR REPLACE FUNCTION public.connect_new_member_to_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_owner uuid;
begin
  select s.owner_user_id into v_owner from public.launch_settings s where s.id = 1;
  if v_owner is null or v_owner = new.id then return new; end if;

  insert into public.relationships (user_id, member_id, kind)
  values (new.id, v_owner::text, 'connection')
  on conflict (user_id, member_id, kind) do nothing;

  insert into public.relationships (user_id, member_id, kind)
  values (v_owner, new.id::text, 'connection')
  on conflict (user_id, member_id, kind) do nothing;

  insert into public.follows (follower_id, followee_id, kind)
  values (new.id, v_owner, 'connection')
  on conflict (follower_id, followee_id, kind) do nothing;

  insert into public.follows (follower_id, followee_id, kind)
  values (v_owner, new.id, 'connection')
  on conflict (follower_id, followee_id, kind) do nothing;

  return new;
end $$;

DROP TRIGGER IF EXISTS profiles_connect_owner ON public.profiles;
CREATE TRIGGER profiles_connect_owner
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.connect_new_member_to_owner();

-- Backfill: connect every existing member to the owner both ways.
INSERT INTO public.relationships (user_id, member_id, kind)
SELECT p.id, s.owner_user_id::text, 'connection'
FROM public.profiles p CROSS JOIN public.launch_settings s
WHERE s.id = 1 AND s.owner_user_id IS NOT NULL AND p.id <> s.owner_user_id
ON CONFLICT (user_id, member_id, kind) DO NOTHING;

INSERT INTO public.relationships (user_id, member_id, kind)
SELECT s.owner_user_id, p.id::text, 'connection'
FROM public.profiles p CROSS JOIN public.launch_settings s
WHERE s.id = 1 AND s.owner_user_id IS NOT NULL AND p.id <> s.owner_user_id
ON CONFLICT (user_id, member_id, kind) DO NOTHING;

INSERT INTO public.follows (follower_id, followee_id, kind)
SELECT p.id, s.owner_user_id, 'connection'
FROM public.profiles p CROSS JOIN public.launch_settings s
WHERE s.id = 1 AND s.owner_user_id IS NOT NULL AND p.id <> s.owner_user_id
ON CONFLICT (follower_id, followee_id, kind) DO NOTHING;

INSERT INTO public.follows (follower_id, followee_id, kind)
SELECT s.owner_user_id, p.id, 'connection'
FROM public.profiles p CROSS JOIN public.launch_settings s
WHERE s.id = 1 AND s.owner_user_id IS NOT NULL AND p.id <> s.owner_user_id
ON CONFLICT (follower_id, followee_id, kind) DO NOTHING;