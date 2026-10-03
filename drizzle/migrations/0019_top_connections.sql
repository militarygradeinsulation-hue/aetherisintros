CREATE OR REPLACE FUNCTION public.my_top_connections()
RETURNS TABLE(member_id uuid, reason text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  select i.created_by, 'inviter' from public.early_access_members e
    join public.invitations i on i.id = e.invite_id
    where e.user_id = auth.uid() and i.created_by is not null and i.created_by <> auth.uid()
  union all
  select s.owner_user_id, 'founder' from public.launch_settings s
    where s.id = 1 and s.owner_user_id is not null and s.owner_user_id <> auth.uid()
$$;
REVOKE ALL ON FUNCTION public.my_top_connections() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_top_connections() TO authenticated;

-- Founder is always connected to every member, both ways (backfill + future via existing trigger).
INSERT INTO public.relationships (user_id, member_id, kind)
  SELECT p.id, s.owner_user_id::text, 'connection' FROM public.profiles p, public.launch_settings s
  WHERE s.owner_user_id IS NOT NULL AND p.id <> s.owner_user_id ON CONFLICT DO NOTHING;
INSERT INTO public.relationships (user_id, member_id, kind)
  SELECT s.owner_user_id, p.id::text, 'connection' FROM public.profiles p, public.launch_settings s
  WHERE s.owner_user_id IS NOT NULL AND p.id <> s.owner_user_id ON CONFLICT DO NOTHING;