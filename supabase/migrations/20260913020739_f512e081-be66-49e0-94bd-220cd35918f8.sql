CREATE OR REPLACE FUNCTION public.claim_early_access(p_invite_code text DEFAULT NULL::text)
 RETURNS TABLE(status text, founding_member_number integer, mode text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_mode text;
  v_capacity integer;
  v_taken integer;
  v_next integer;
  v_existing public.early_access_members;
  v_invite public.invitations;
  v_whitelisted boolean := false;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select e.* into v_existing from public.early_access_members e where e.user_id = v_uid;
  if found and v_existing.status in ('approved','suspended','denied') then
    return query select v_existing.status, v_existing.founding_member_number,
      (select s.mode from public.launch_settings s where s.id = 1);
    return;
  end if;

  select u.email into v_email from auth.users u where u.id = v_uid;

  select s.mode, s.capacity into v_mode, v_capacity
  from public.launch_settings s where s.id = 1 for update;

  if p_invite_code is not null and length(trim(p_invite_code)) > 0 then
    select i.* into v_invite from public.invitations i
    where lower(i.code) = lower(trim(p_invite_code))
      and i.revoked = false
      and i.uses < i.max_uses
      and (i.expires_at is null or i.expires_at > now())
      and (i.email is null or lower(i.email) = lower(v_email))
    for update;
  end if;

  select exists (
    select 1 from public.whitelist_entries w
    where lower(w.email) = lower(v_email) and w.status = 'active'
  ) into v_whitelisted;

  select count(*)::int into v_taken from public.early_access_members e
  where e.status = 'approved' and e.founding_member_number is not null;

  if v_mode = 'closed' and v_invite.id is null and not v_whitelisted then
    insert into public.early_access_members (user_id, email, status, source)
    values (v_uid, v_email, 'denied', 'closed')
    on conflict (user_id) do update set status = 'denied', source = 'closed', updated_at = now();
    return query select 'denied'::text, null::integer, v_mode;
    return;
  end if;

  if v_mode = 'invite_only' and v_invite.id is null and not v_whitelisted then
    insert into public.early_access_members (user_id, email, status, source)
    values (v_uid, v_email, 'pending', 'invite_only')
    on conflict (user_id) do update set status = 'pending', source = 'invite_only', updated_at = now();
    return query select 'pending'::text, null::integer, v_mode;
    return;
  end if;

  if v_taken >= v_capacity and v_invite.id is null and not v_whitelisted then
    insert into public.early_access_members (user_id, email, status, source)
    values (v_uid, v_email, 'waitlisted', 'capacity')
    on conflict (user_id) do update set status = 'waitlisted', source = 'capacity', updated_at = now();
    insert into public.waitlist_entries (email, user_id, source)
    values (v_email, v_uid, 'capacity') on conflict (email) do nothing;
    return query select 'waitlisted'::text, null::integer, v_mode;
    return;
  end if;

  select coalesce(max(e.founding_member_number), 0) + 1 into v_next
  from public.early_access_members e;

  insert into public.early_access_members
    (user_id, email, status, source, founding_member_number, approved_at, invite_id)
  values
    (v_uid, v_email,'approved',
     case when v_invite.id is not null then 'invite' when v_whitelisted then 'whitelist' else v_mode end,
     v_next, now(), v_invite.id)
  on conflict (user_id) do update set
    status = 'approved',
    founding_member_number = coalesce(early_access_members.founding_member_number, v_next),
    approved_at = coalesce(early_access_members.approved_at, now()),
    invite_id = coalesce(v_invite.id, early_access_members.invite_id),
    updated_at = now();

  if v_invite.id is not null then
    update public.invitations i set uses = i.uses + 1 where i.id = v_invite.id;
  end if;

  delete from public.waitlist_entries w where w.user_id = v_uid;

  return query select e.status, e.founding_member_number, v_mode
  from public.early_access_members e where e.user_id = v_uid;
end $function$;

GRANT EXECUTE ON FUNCTION public.claim_early_access(text) TO authenticated;