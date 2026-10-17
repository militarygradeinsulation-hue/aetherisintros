-- ASK INTROS / OPEN MEMBER ENROLLMENT WITH OPTIONAL BUSINESS BADGES
-- New confirmed-email signups can use the network after profile onboarding.
-- Claimed CEO/founder/owner badges still require business-role verification.
-- Existing suspended/denied accounts remain blocked. Mutual intro opt-in and RLS
-- stay mandatory. Serialize founding badges through launch_settings row lock.
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
  v_next integer;
  v_code text := nullif(trim(coalesce(p_invite_code, '')), '');
  v_existing public.early_access_members;
  v_invite public.invitations;
  v_capacity integer;
  v_founding_count integer;
  v_email_confirmed boolean;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select e.* into v_existing from public.early_access_members e where e.user_id = v_uid;
  if found and v_existing.status in ('approved','suspended','denied') then
    if v_existing.status = 'approved' and v_existing.source = 'invite' then
      perform public.auto_verify_invited(v_uid, v_existing.email);
    end if;
    return query select v_existing.status, v_existing.founding_member_number,
      (select s.mode from public.launch_settings s where s.id = 1);
    return;
  end if;

  select u.email, coalesce(v_code, nullif(trim(u.raw_user_meta_data->>'invite_code'), ''))
    into v_email, v_code from auth.users u where u.id = v_uid;
  select s.mode, s.capacity into v_mode, v_capacity
  from public.launch_settings s where s.id = 1 for update;
  select u.email_confirmed_at is not null into v_email_confirmed
  from auth.users u where u.id = v_uid;

  if v_code is not null then
    select i.* into v_invite from public.invitations i
    where lower(i.code) = lower(v_code)
      and i.revoked = false and i.uses < i.max_uses
      and (i.expires_at is null or i.expires_at > now())
      and (i.email is null or lower(i.email) = lower(v_email))
    for update;
  end if;

  if v_invite.id is null then
    -- Open registration: a confirmed email receives a real account. Founding
    -- numbers are limited to the first 1,000, but membership remains open.
    -- The locked launch_settings row serializes founding-number claims.
    if v_mode = 'first_1000' and v_email_confirmed then
      select count(*)::integer, coalesce(max(e.founding_member_number), 0)
        into v_founding_count, v_next
      from public.early_access_members e
      where e.founding_member_number is not null;
      if v_founding_count < v_capacity then v_next := v_next + 1;
      else v_next := null; end if;
      insert into public.early_access_members
        (user_id,email,status,source,founding_member_number,approved_at)
      values (v_uid,v_email,'approved','first_1000',v_next,now())
      on conflict (user_id) do update set
        status='approved',
        source='first_1000',
        founding_member_number=coalesce(early_access_members.founding_member_number, excluded.founding_member_number),
        approved_at=coalesce(early_access_members.approved_at,now()),
        updated_at=now();
      delete from public.waitlist_entries where user_id=v_uid;
      return query select e.status, e.founding_member_number, v_mode
        from public.early_access_members e where e.user_id=v_uid;
      return;
    end if;
    insert into public.early_access_members (user_id,email,status,source)
    values (v_uid,v_email,'pending',
      case when v_mode='closed' then 'closed' else 'code_required' end)
    on conflict (user_id) do update set
      status='pending',source=excluded.source,updated_at=now();
    return query select 'pending'::text,null::integer,v_mode;
    return;
  end if;

  select count(*)::integer, coalesce(max(e.founding_member_number), 0)
    into v_founding_count, v_next from public.early_access_members e
    where e.founding_member_number is not null;
  if v_founding_count < v_capacity then v_next := v_next + 1;
  else v_next := null; end if;

  insert into public.early_access_members
    (user_id, email, status, source, founding_member_number, approved_at, invite_id)
  values (v_uid, v_email, 'approved', 'invite', v_next, now(), v_invite.id)
  on conflict (user_id) do update set
    status = 'approved',
    source = 'invite',
    founding_member_number = coalesce(early_access_members.founding_member_number, v_next),
    approved_at = coalesce(early_access_members.approved_at, now()),
    invite_id = coalesce(v_invite.id, early_access_members.invite_id),
    updated_at = now();

  update public.invitations i set uses = i.uses + 1 where i.id = v_invite.id;
  delete from public.waitlist_entries w where w.user_id = v_uid;

  perform public.auto_verify_invited(v_uid, v_email);

  return query select e.status, e.founding_member_number, v_mode
  from public.early_access_members e where e.user_id = v_uid;
end $function$
;

-- Network membership is distinct from a verified business-role badge. The
-- trusted email has been confirmed and onboarding completed; permissioned
-- network records and mutual opt-in still protect private member activity.
CREATE OR REPLACE FUNCTION public.is_live_member()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $is_live$
  select exists (
    select 1 from public.early_access_members e
    join auth.users u on u.id=e.user_id
    join public.profiles p on p.id=e.user_id
    where e.user_id=auth.uid() and e.status='approved'
      and u.email_confirmed_at is not null and p.onboarded=true
  );
$is_live$;
REVOKE ALL ON FUNCTION public.is_live_member() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_live_member() TO authenticated;
