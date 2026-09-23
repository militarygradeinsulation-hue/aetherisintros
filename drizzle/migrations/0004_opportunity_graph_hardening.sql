-- 1) Least-privilege table grants
do $$ declare t text; begin
  foreach t in array array['missions','intro_context_capsules','relationship_rooms','intro_feedback','delegates','passports','digital_you_rules'] loop
    execute format('revoke all privileges on public.%I from authenticated, anon', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;
grant select, insert, update, delete on public.missions to authenticated;
grant select, insert, update on public.intro_context_capsules to authenticated;
grant select, insert, update on public.relationship_rooms to authenticated;
grant select, insert, update, delete on public.intro_feedback to authenticated;
grant select, insert, update, delete on public.delegates to authenticated;
grant select, insert, update, delete on public.passports to authenticated;
grant select, insert, update, delete on public.digital_you_rules to authenticated;

-- 2) Generic immutable-column guard (service role / maintenance has no auth.uid() and may bypass)
create or replace function public.freeze_columns()
returns trigger language plpgsql set search_path = public as $$
declare c text;
begin
  if auth.uid() is null then return new; end if;
  foreach c in array tg_argv loop
    if (to_jsonb(new) -> c) is distinct from (to_jsonb(old) -> c) then
      raise exception 'Column % cannot be changed after creation', c using errcode = '42501';
    end if;
  end loop;
  return new;
end $$;

create trigger relationship_rooms_freeze before update on public.relationship_rooms
  for each row execute function public.freeze_columns('intro_request_id','participant_a','participant_b');
create trigger capsules_freeze before update on public.intro_context_capsules
  for each row execute function public.freeze_columns('intro_request_id','author_id');
create trigger intro_feedback_freeze before update on public.intro_feedback
  for each row execute function public.freeze_columns('author_id','intro_request_id');
create trigger missions_freeze before update on public.missions
  for each row execute function public.freeze_columns('owner_id');
create trigger passports_freeze before update on public.passports
  for each row execute function public.freeze_columns('owner_id','token');
create trigger delegates_freeze before update on public.delegates
  for each row execute function public.freeze_columns('principal_id','delegate_email');
do $$ declare t text; begin
  foreach t in array array['crm_people','crm_companies','crm_opportunities','crm_tasks','crm_activities','crm_notes'] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.freeze_columns(''owner_id'')', t || '_owner_freeze', t);
  end loop;
end $$;
create trigger calendar_events_owner_freeze before update on public.calendar_events
  for each row execute function public.freeze_columns('user_id');

-- Capsule edit authority
create or replace function public.capsule_edit_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); r public.intro_requests; v_narrative_changed boolean;
begin
  if v_uid is null then return new; end if;
  select * into r from public.intro_requests where id = new.intro_request_id;
  v_narrative_changed :=
    (new.why_exists, new.why_requester, new.why_target, new.why_now, new.first_goal,
     new.shared_context, new.excluded_context, new.mission_title, new.signal_text)
    is distinct from
    (old.why_exists, old.why_requester, old.why_target, old.why_now, old.first_goal,
     old.shared_context, old.excluded_context, old.mission_title, old.signal_text);
  if v_uid = r.user_id then
    if new.target_approved is distinct from old.target_approved and not v_narrative_changed then
      raise exception 'Only the introduced member can set their approval' using errcode = '42501';
    end if;
    if v_narrative_changed then new.target_approved := false; end if;
  elsif v_uid = r.target_user_id then
    if v_narrative_changed then
      raise exception 'The requester-authored context cannot be rewritten by the other side' using errcode = '42501';
    end if;
    if new.requester_approved is distinct from old.requester_approved then
      raise exception 'Only the requester can set their approval' using errcode = '42501';
    end if;
  else
    raise exception 'Not a participant' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger capsules_edit_guard before update on public.intro_context_capsules
  for each row execute function public.capsule_edit_guard();

-- 3) Delegates: invite/accept/decline; principal can never assign delegate_user_id or activate
create or replace function public.delegate_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.uid() is null or current_setting('app.delegate_rpc', true) = '1' then return new; end if;
  if tg_op = 'INSERT' then
    new.delegate_user_id := null;
    new.status := 'invited';
    new.delegate_email := lower(trim(new.delegate_email));
    return new;
  end if;
  if new.delegate_user_id is distinct from old.delegate_user_id then
    raise exception 'Delegate account can only be linked by the delegate accepting' using errcode = '42501';
  end if;
  if new.status is distinct from old.status and new.status <> 'revoked' then
    raise exception 'Only the delegate can accept an invitation' using errcode = '42501';
  end if;
  if old.status = 'revoked' and new.permissions is distinct from old.permissions then
    raise exception 'A revoked grant cannot be changed' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger delegates_guard before insert or update on public.delegates
  for each row execute function public.delegate_guard();

create or replace function public.my_delegate_invites()
returns table(id uuid, principal_name text, role_label text, permissions text[], status text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select d.id, coalesce(p.name, 'A verified member'), d.role_label, d.permissions, d.status, d.created_at
  from public.delegates d
  join auth.users u on u.id = auth.uid()
  left join public.profiles p on p.id = d.principal_id
  where d.status in ('invited','active')
    and (d.delegate_user_id = auth.uid() or (d.delegate_user_id is null and lower(d.delegate_email) = lower(u.email)))
$$;

create or replace function public.accept_delegate_invite(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_email text; v_confirmed timestamptz; d public.delegates;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select u.email, u.email_confirmed_at into v_email, v_confirmed from auth.users u where u.id = v_uid;
  if v_confirmed is null then raise exception 'Confirm your email before accepting'; end if;
  select * into d from public.delegates where id = p_id for update;
  if not found or d.status <> 'invited' or d.delegate_user_id is not null then raise exception 'Invitation not available'; end if;
  if lower(d.delegate_email) <> lower(v_email) then raise exception 'This invitation was sent to a different email address'; end if;
  if d.principal_id = v_uid then raise exception 'You cannot be your own delegate'; end if;
  perform set_config('app.delegate_rpc', '1', true);
  update public.delegates set delegate_user_id = v_uid, status = 'active' where id = p_id;
  perform set_config('app.delegate_rpc', '0', true);
  insert into public.account_security_events (user_id, event, summary, actor_id)
  values (d.principal_id, 'delegate_accepted', 'Delegate ' || d.delegate_email || ' accepted access', v_uid);
end $$;

create or replace function public.decline_delegate_invite(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_email text; d public.delegates;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select u.email into v_email from auth.users u where u.id = v_uid;
  select * into d from public.delegates where id = p_id for update;
  if not found or d.status = 'revoked' then raise exception 'Invitation not available'; end if;
  if not (d.delegate_user_id = v_uid or (d.delegate_user_id is null and lower(d.delegate_email) = lower(v_email))) then
    raise exception 'Not your invitation';
  end if;
  perform set_config('app.delegate_rpc', '1', true);
  update public.delegates set status = 'revoked', permissions = '{}' where id = p_id;
  perform set_config('app.delegate_rpc', '0', true);
end $$;

create or replace function public.has_delegate_permission(p_principal uuid, p_perm text)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (
    select 1 from public.delegates d
    where d.principal_id = p_principal and d.delegate_user_id = auth.uid()
      and d.status = 'active' and p_perm = any(d.permissions))
$$;

revoke execute on function public.my_delegate_invites() from public, anon;
revoke execute on function public.accept_delegate_invite(uuid) from public, anon;
revoke execute on function public.decline_delegate_invite(uuid) from public, anon;
revoke execute on function public.has_delegate_permission(uuid, text) from public, anon;
grant execute on function public.my_delegate_invites() to authenticated;
grant execute on function public.accept_delegate_invite(uuid) to authenticated;
grant execute on function public.decline_delegate_invite(uuid) to authenticated;
grant execute on function public.has_delegate_permission(uuid, text) to authenticated;

-- 4) Delegate policies on principal-owned records (additive, least privilege, no deletes)
do $$ declare t text; begin
  foreach t in array array['crm_people','crm_companies','crm_tasks','crm_activities'] loop
    execute format('create policy "delegate crm read" on public.%I for select to authenticated using (public.has_delegate_permission(owner_id, ''crm''))', t);
    execute format('create policy "delegate crm insert" on public.%I for insert to authenticated with check (public.has_delegate_permission(owner_id, ''crm''))', t);
    execute format('create policy "delegate crm update" on public.%I for update to authenticated using (public.has_delegate_permission(owner_id, ''crm'')) with check (public.has_delegate_permission(owner_id, ''crm''))', t);
  end loop;
end $$;
create policy "delegate opportunity read" on public.crm_opportunities for select to authenticated
  using (public.has_delegate_permission(owner_id,'crm') or public.has_delegate_permission(owner_id,'opportunity_updates'));
create policy "delegate opportunity insert" on public.crm_opportunities for insert to authenticated
  with check (public.has_delegate_permission(owner_id,'crm'));
create policy "delegate opportunity update" on public.crm_opportunities for update to authenticated
  using (public.has_delegate_permission(owner_id,'crm') or public.has_delegate_permission(owner_id,'opportunity_updates'))
  with check (public.has_delegate_permission(owner_id,'crm') or public.has_delegate_permission(owner_id,'opportunity_updates'));
create policy "delegate notes read" on public.crm_notes for select to authenticated using (public.has_delegate_permission(owner_id,'relationship_notes'));
create policy "delegate notes insert" on public.crm_notes for insert to authenticated with check (public.has_delegate_permission(owner_id,'relationship_notes'));
create policy "delegate notes update" on public.crm_notes for update to authenticated
  using (public.has_delegate_permission(owner_id,'relationship_notes')) with check (public.has_delegate_permission(owner_id,'relationship_notes'));
create policy "delegate calendar read" on public.calendar_events for select to authenticated
  using (public.has_delegate_permission(user_id,'calendar') or public.has_delegate_permission(user_id,'scheduling'));
create policy "delegate schedule insert" on public.calendar_events for insert to authenticated with check (public.has_delegate_permission(user_id,'scheduling'));
create policy "delegate schedule update" on public.calendar_events for update to authenticated
  using (public.has_delegate_permission(user_id,'scheduling')) with check (public.has_delegate_permission(user_id,'scheduling'));

-- Draft messages: drafts only; there is no send path from this table
create table public.delegate_message_drafts (
  id uuid primary key default gen_random_uuid(),
  principal_id uuid not null,
  author_id uuid not null default auth.uid(),
  recipient_label text not null default '',
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.delegate_message_drafts to authenticated;
grant all on public.delegate_message_drafts to service_role;
alter table public.delegate_message_drafts enable row level security;
create policy "delegate writes drafts" on public.delegate_message_drafts for insert to authenticated
  with check (author_id = auth.uid() and public.has_delegate_permission(principal_id,'draft_messages'));
create policy "delegate reads own drafts" on public.delegate_message_drafts for select to authenticated
  using (author_id = auth.uid() and public.has_delegate_permission(principal_id,'draft_messages'));
create policy "principal reads drafts" on public.delegate_message_drafts for select to authenticated
  using (principal_id = auth.uid());
create policy "principal deletes drafts" on public.delegate_message_drafts for delete to authenticated
  using (principal_id = auth.uid());

-- 5) Passport: no anon table access; RPC is the only read path
revoke all on public.passports from anon;
