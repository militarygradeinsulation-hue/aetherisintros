GRANT SELECT (verified_role, verified_at, verified_business, verification_public_summary, what_i_do, building, open_to, scheduling_enabled) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_early_access(p_invite_code text DEFAULT NULL::text)
 RETURNS TABLE(status text, founding_member_number integer, mode text)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_mode text;
  v_next integer;
  v_code text := nullif(trim(coalesce(p_invite_code, '')), '');
  v_existing public.early_access_members;
  v_invite public.invitations;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select e.* into v_existing from public.early_access_members e where e.user_id = v_uid;
  if found and v_existing.status in ('approved','suspended','denied') then
    return query select v_existing.status, v_existing.founding_member_number,
      (select s.mode from public.launch_settings s where s.id = 1);
    return;
  end if;

  -- Fall back to the invite code saved at sign-up (email confirmation / Google return paths).
  select u.email, coalesce(v_code, nullif(trim(u.raw_user_meta_data->>'invite_code'), ''))
    into v_email, v_code from auth.users u where u.id = v_uid;
  select s.mode into v_mode from public.launch_settings s where s.id = 1 for update;

  if v_code is not null then
    select i.* into v_invite from public.invitations i
    where lower(i.code) = lower(v_code)
      and i.revoked = false and i.uses < i.max_uses
      and (i.expires_at is null or i.expires_at > now())
      and (i.email is null or lower(i.email) = lower(v_email))
    for update;
  end if;

  if v_invite.id is null then
    insert into public.early_access_members (user_id, email, status, source)
    values (v_uid, v_email, 'pending', 'code_required')
    on conflict (user_id) do update set status = 'pending', source = 'code_required', updated_at = now();
    return query select 'pending'::text, null::integer, v_mode;
    return;
  end if;

  select coalesce(max(e.founding_member_number), 0) + 1 into v_next from public.early_access_members e;

  insert into public.early_access_members
    (user_id, email, status, source, founding_member_number, approved_at, invite_id)
  values (v_uid, v_email, 'approved', 'invite', v_next, now(), v_invite.id)
  on conflict (user_id) do update set
    status = 'approved',
    founding_member_number = coalesce(early_access_members.founding_member_number, v_next),
    approved_at = coalesce(early_access_members.approved_at, now()),
    invite_id = coalesce(v_invite.id, early_access_members.invite_id),
    updated_at = now();

  update public.invitations i set uses = i.uses + 1 where i.id = v_invite.id;
  delete from public.waitlist_entries w where w.user_id = v_uid;

  return query select e.status, e.founding_member_number, v_mode
  from public.early_access_members e where e.user_id = v_uid;
end $function$;