-- =========================================================
-- Atomic accept / decline of an introduction request.
--
-- Before this, the inbox approved the context capsule and then updated the request in two
-- separate client writes; a failure between them left an approved capsule on a pending
-- request. This function does both in one transaction, after checking that the caller is
-- the request's target and the request is still pending.
--
-- SECURITY INVOKER: every write still goes through RLS and the existing guards
-- (intro_requests_consent_guard, capsule_edit_guard), which key off auth.uid().
-- =========================================================

create or replace function public.respond_to_intro_request(p_intro_request_id uuid, p_accept boolean)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  r public.intro_requests;
begin
  if v_uid is null then
    raise exception 'Sign in to respond to an introduction' using errcode = '28000';
  end if;

  -- Lock the row so a concurrent accept/decline/withdraw cannot interleave.
  select * into r from public.intro_requests where id = p_intro_request_id for update;
  if not found then
    raise exception 'This introduction request no longer exists' using errcode = 'P0002';
  end if;
  if r.target_user_id is distinct from v_uid then
    raise exception 'Only the introduced member can respond to this request' using errcode = '42501';
  end if;
  if r.member_opt_in or r.status in ('accepted', 'connected', 'declined') then
    raise exception 'This introduction request was already answered' using errcode = '55000';
  end if;

  if p_accept then
    update public.intro_context_capsules set target_approved = true
      where intro_request_id = p_intro_request_id;
    update public.intro_requests set member_opt_in = true, status = 'accepted'
      where id = p_intro_request_id;
  else
    update public.intro_requests set status = 'declined'
      where id = p_intro_request_id;
  end if;

  -- The consent guard silently reverts unauthorised status changes; verify it held.
  select * into r from public.intro_requests where id = p_intro_request_id;
  if (p_accept and not (r.member_opt_in and r.status in ('accepted', 'connected')))
     or (not p_accept and r.status is distinct from 'declined') then
    raise exception 'The response could not be recorded' using errcode = '42501';
  end if;

  return r.status;
end $$;

revoke all on function public.respond_to_intro_request(uuid, boolean) from public, anon;
grant execute on function public.respond_to_intro_request(uuid, boolean) to authenticated;
