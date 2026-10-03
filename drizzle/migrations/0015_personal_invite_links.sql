ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS personal boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS invitations_one_personal_per_member ON public.invitations (created_by) WHERE personal;
CREATE UNIQUE INDEX IF NOT EXISTS invitations_code_ci ON public.invitations (lower(code));

-- Returns (creating once) the signed-in member's personal invite code.
CREATE OR REPLACE FUNCTION public.my_invite_code()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare
  v_uid uuid := auth.uid();
  v_code text;
  v_base text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if not public.is_approved_member(v_uid) then raise exception 'Only members can invite'; end if;
  select i.code into v_code from public.invitations i where i.created_by = v_uid and i.personal;
  if v_code is not null then return v_code; end if;
  select lower(regexp_replace(split_part(coalesce(p.name, 'member'), ' ', 1), '[^a-zA-Z]', '', 'g'))
    into v_base from public.profiles p where p.id = v_uid;
  if coalesce(v_base, '') = '' then v_base := 'member'; end if;
  loop
    v_code := left(v_base, 12) || '-' || substr(md5(gen_random_uuid()::text), 1, 6);
    exit when not exists (select 1 from public.invitations i where lower(i.code) = v_code);
  end loop;
  insert into public.invitations (code, max_uses, created_by, personal)
  values (v_code, 1000000, v_uid, true);
  return v_code;
end $$;
REVOKE ALL ON FUNCTION public.my_invite_code() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_invite_code() TO authenticated;

-- Public check so the sign-up page can show who invited you (first name only).
CREATE OR REPLACE FUNCTION public.invite_preview(p_code text)
RETURNS TABLE(valid boolean, inviter_name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  select true, split_part(coalesce(p.name, ''), ' ', 1)
  from public.invitations i left join public.profiles p on p.id = i.created_by
  where lower(i.code) = lower(trim(p_code)) and not i.revoked and i.uses < i.max_uses
    and (i.expires_at is null or i.expires_at > now())
  limit 1
$$;
REVOKE ALL ON FUNCTION public.invite_preview(text) FROM public;
GRANT EXECUTE ON FUNCTION public.invite_preview(text) TO anon, authenticated;

-- When an invited member is approved, connect inviter and invitee both ways.
CREATE OR REPLACE FUNCTION public.connect_invite_pair()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare v_inviter uuid;
begin
  if new.status <> 'approved' or new.invite_id is null then return new; end if;
  if tg_op = 'UPDATE' and old.status = 'approved' and old.invite_id is not distinct from new.invite_id then return new; end if;
  select i.created_by into v_inviter from public.invitations i where i.id = new.invite_id;
  if v_inviter is null or v_inviter = new.user_id then return new; end if;
  insert into public.relationships (user_id, member_id, kind) values (new.user_id, v_inviter::text, 'connection') on conflict (user_id, member_id, kind) do nothing;
  insert into public.relationships (user_id, member_id, kind) values (v_inviter, new.user_id::text, 'connection') on conflict (user_id, member_id, kind) do nothing;
  insert into public.follows (follower_id, followee_id, kind) values (new.user_id, v_inviter, 'connection') on conflict (follower_id, followee_id, kind) do nothing;
  insert into public.follows (follower_id, followee_id, kind) values (v_inviter, new.user_id, 'connection') on conflict (follower_id, followee_id, kind) do nothing;
  return new;
end $$;
REVOKE ALL ON FUNCTION public.connect_invite_pair() FROM public, anon, authenticated;
DROP TRIGGER IF EXISTS early_access_connect_invite_pair ON public.early_access_members;
CREATE TRIGGER early_access_connect_invite_pair AFTER INSERT OR UPDATE OF status, invite_id ON public.early_access_members
  FOR EACH ROW EXECUTE FUNCTION public.connect_invite_pair();