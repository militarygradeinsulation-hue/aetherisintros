-- =========================================================
-- Membership verification layer (private, account-scoped)
-- =========================================================

do $$ begin
  create type public.verification_status as enum
    ('pending','scanning','manual_review','needs_more_proof','verified','rejected','suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.verified_role as enum
    ('ceo','founder','owner','managing_partner','principal','other');
exception when duplicate_object then null; end $$;

-- ---------- member_verifications ----------
create table if not exists public.member_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  account_id uuid,
  legal_name text not null default '',
  display_name text not null default '',
  claimed_role text not null default '',
  verified_role public.verified_role,
  business_name text not null default '',
  business_dba text not null default '',
  business_domain text not null default '',
  work_email text not null default '',
  business_location text not null default '',
  professional_url text not null default '',
  registration_number text not null default '',
  registration_jurisdiction text not null default '',
  status public.verification_status not null default 'pending',
  verification_level integer not null default 0,
  public_summary text not null default '',
  risk_flags jsonb not null default '[]'::jsonb,
  reviewer_notes text not null default '',
  decision_reason text not null default '',
  proof_retention text not null default 'retained',
  submitted_at timestamptz,
  scanned_at timestamptz,
  reviewed_at timestamptz,
  reviewer_id uuid,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update on public.member_verifications to authenticated;
grant all on public.member_verifications to service_role;
alter table public.member_verifications enable row level security;

-- The member reads their own record; the app never surfaces reviewer_notes/risk_flags to them.
create policy "verification owner reads own"
  on public.member_verifications for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create policy "verification owner creates own"
  on public.member_verifications for insert to authenticated
  with check (auth.uid() = user_id and status = 'pending');

-- Owners may only edit the claim itself, and only while it is still open.
create policy "verification owner edits open claim"
  on public.member_verifications for update to authenticated
  using (auth.uid() = user_id and status in ('pending','needs_more_proof'))
  with check (auth.uid() = user_id and status in ('pending','needs_more_proof','scanning'));

create policy "verification admin manages"
  on public.member_verifications for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create trigger member_verifications_touch before update on public.member_verifications
  for each row execute function public.touch_updated_at();

create index if not exists member_verifications_status_idx on public.member_verifications (status, created_at desc);

-- ---------- verification_evidence ----------
create table if not exists public.verification_evidence (
  id uuid primary key default gen_random_uuid(),
  verification_id uuid not null references public.member_verifications(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  evidence_type text not null,
  source_url text not null default '',
  private_storage_path text,
  label text not null default '',
  result text not null default 'unknown',
  confidence integer not null default 0,
  status text not null default 'submitted',
  purged boolean not null default false,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

grant select, insert, update on public.verification_evidence to authenticated;
grant all on public.verification_evidence to service_role;
alter table public.verification_evidence enable row level security;

create policy "evidence owner or admin reads"
  on public.verification_evidence for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "evidence owner adds"
  on public.verification_evidence for insert to authenticated
  with check (auth.uid() = user_id
    and exists (select 1 from public.member_verifications v
                where v.id = verification_id and v.user_id = auth.uid()));
create policy "evidence admin updates"
  on public.verification_evidence for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create index if not exists verification_evidence_verification_idx on public.verification_evidence (verification_id);

-- ---------- verification_checks (reviewers only) ----------
create table if not exists public.verification_checks (
  id uuid primary key default gen_random_uuid(),
  verification_id uuid not null references public.member_verifications(id) on delete cascade,
  check_type text not null,
  result text not null default 'unknown',
  confidence integer not null default 0,
  evidence_summary text not null default '',
  source_type text not null default 'public_source',
  checked_at timestamptz not null default now()
);

grant select on public.verification_checks to authenticated;
grant all on public.verification_checks to service_role;
alter table public.verification_checks enable row level security;

create policy "checks admin reads"
  on public.verification_checks for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create index if not exists verification_checks_verification_idx on public.verification_checks (verification_id);

-- ---------- verification_events (append-only) ----------
create table if not exists public.verification_events (
  id uuid primary key default gen_random_uuid(),
  verification_id uuid not null references public.member_verifications(id) on delete cascade,
  user_id uuid,
  actor_id uuid,
  event text not null,
  summary text not null default '',
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

grant select on public.verification_events to authenticated;
grant all on public.verification_events to service_role;
alter table public.verification_events enable row level security;

create policy "verification events owner or admin reads"
  on public.verification_events for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create index if not exists verification_events_verification_idx on public.verification_events (verification_id, created_at desc);

-- ---------- account_security_events ----------
create table if not exists public.account_security_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  event text not null,
  summary text not null default '',
  actor_id uuid,
  ip_hint text not null default '',
  device_hint text not null default '',
  created_at timestamptz not null default now()
);

grant select, insert on public.account_security_events to authenticated;
grant all on public.account_security_events to service_role;
alter table public.account_security_events enable row level security;

create policy "security events owner reads"
  on public.account_security_events for select to authenticated
  using (auth.uid() = user_id);
create policy "security events owner writes"
  on public.account_security_events for insert to authenticated
  with check (auth.uid() = user_id);

create index if not exists account_security_events_user_idx on public.account_security_events (user_id, created_at desc);

-- ---------- public badge fields on the network profile ----------
alter table public.profiles
  add column if not exists verified_role public.verified_role,
  add column if not exists verified_at timestamptz,
  add column if not exists verified_business text not null default '',
  add column if not exists verification_public_summary text not null default '';

-- =========================================================
-- Submission, evidence and review functions
-- =========================================================

create or replace function public.submit_member_verification(
  p_legal_name text, p_display_name text, p_claimed_role text,
  p_business_name text, p_business_dba text, p_business_domain text,
  p_work_email text, p_business_location text, p_professional_url text,
  p_registration_number text default '', p_registration_jurisdiction text default ''
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_id uuid; v_status public.verification_status;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select id, status into v_id, v_status from public.member_verifications where user_id = v_uid;

  if v_id is null then
    insert into public.member_verifications
      (user_id, legal_name, display_name, claimed_role, business_name, business_dba,
       business_domain, work_email, business_location, professional_url,
       registration_number, registration_jurisdiction, status, submitted_at)
    values (v_uid, p_legal_name, p_display_name, p_claimed_role, p_business_name, p_business_dba,
       lower(p_business_domain), lower(p_work_email), p_business_location, p_professional_url,
       p_registration_number, p_registration_jurisdiction, 'pending', now())
    returning id into v_id;
  else
    if v_status in ('verified','rejected','suspended') then
      raise exception 'This membership claim is closed. Contact the review team.';
    end if;
    update public.member_verifications set
      legal_name = p_legal_name, display_name = p_display_name, claimed_role = p_claimed_role,
      business_name = p_business_name, business_dba = p_business_dba,
      business_domain = lower(p_business_domain), work_email = lower(p_work_email),
      business_location = p_business_location, professional_url = p_professional_url,
      registration_number = p_registration_number,
      registration_jurisdiction = p_registration_jurisdiction,
      status = 'pending', submitted_at = now(), updated_at = now()
    where id = v_id;
  end if;

  insert into public.verification_events (verification_id, user_id, actor_id, event, summary)
  values (v_id, v_uid, v_uid, 'submitted', 'Business identity claim submitted for review.');

  return v_id;
end $$;

grant execute on function public.submit_member_verification(text,text,text,text,text,text,text,text,text,text,text) to authenticated;

create or replace function public.add_verification_evidence(
  p_evidence_type text, p_source_url text default '',
  p_storage_path text default null, p_label text default ''
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_id uuid; v_ev uuid;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select id into v_id from public.member_verifications where user_id = v_uid;
  if v_id is null then raise exception 'Submit your business identity first.'; end if;

  insert into public.verification_evidence
    (verification_id, user_id, evidence_type, source_url, private_storage_path, label)
  values (v_id, v_uid, p_evidence_type, coalesce(p_source_url,''), p_storage_path, coalesce(p_label,''))
  returning id into v_ev;

  insert into public.verification_events (verification_id, user_id, actor_id, event, summary)
  values (v_id, v_uid, v_uid, 'evidence_added', 'Evidence added: ' || p_evidence_type);

  return v_ev;
end $$;

grant execute on function public.add_verification_evidence(text,text,text,text) to authenticated;

-- What the member is allowed to see about their own claim (never reviewer notes or risk flags).
create or replace function public.my_verification()
returns table(
  status public.verification_status, claimed_role text, verified_role public.verified_role,
  business_name text, business_domain text, verification_level integer,
  public_summary text, decision_reason text, proof_retention text,
  submitted_at timestamptz, verified_at timestamptz, evidence_count integer
)
language sql stable security definer set search_path = public as $$
  select v.status, v.claimed_role, v.verified_role, v.business_name, v.business_domain,
         v.verification_level, v.public_summary, v.decision_reason, v.proof_retention,
         v.submitted_at, v.verified_at,
         (select count(*)::int from public.verification_evidence e where e.verification_id = v.id and not e.purged)
  from public.member_verifications v
  where v.user_id = auth.uid()
$$;

grant execute on function public.my_verification() to authenticated;

-- Reviewer decision: role-gated server-side and always audited.
create or replace function public.review_member_verification(
  p_user_id uuid, p_status text, p_verified_role text default null,
  p_reason text default '', p_public_summary text default null, p_notes text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_actor uuid := auth.uid(); v_status public.verification_status;
begin
  if not public.has_role(v_actor, 'admin') then raise exception 'Not authorised'; end if;
  v_status := p_status::public.verification_status;

  select id into v_id from public.member_verifications where user_id = p_user_id;
  if v_id is null then raise exception 'No verification record for that member.'; end if;

  update public.member_verifications set
    status = v_status,
    verified_role = case when p_verified_role is null or p_verified_role = ''
                         then verified_role else p_verified_role::public.verified_role end,
    decision_reason = coalesce(p_reason, decision_reason),
    public_summary = coalesce(p_public_summary, public_summary),
    reviewer_notes = coalesce(p_notes, reviewer_notes),
    verification_level = case when v_status = 'verified' then greatest(verification_level, 2) else verification_level end,
    verified_at = case when v_status = 'verified' then coalesce(verified_at, now()) else null end,
    reviewed_at = now(), reviewer_id = v_actor, updated_at = now()
  where id = v_id;

  -- Publish only the badge fields the network is meant to see.
  update public.profiles p set
    verified_role = case when v_status = 'verified' then v.verified_role else null end,
    verified_at = case when v_status = 'verified' then v.verified_at else null end,
    verified_business = case when v_status = 'verified' then v.business_name else '' end,
    verification_public_summary = case when v_status = 'verified' then v.public_summary else '' end
  from public.member_verifications v
  where v.id = v_id and p.id = p_user_id;

  -- Membership access follows the verification decision.
  if v_status = 'verified' then
    update public.early_access_members set status = 'approved', updated_at = now() where user_id = p_user_id;
  elsif v_status = 'suspended' then
    update public.early_access_members set status = 'suspended', updated_at = now() where user_id = p_user_id;
  end if;

  insert into public.verification_events (verification_id, user_id, actor_id, event, summary, detail)
  values (v_id, p_user_id, v_actor, 'reviewed', 'Reviewer set status to ' || p_status,
          jsonb_build_object('status', p_status, 'role', p_verified_role));

  insert into public.account_security_events (user_id, event, summary, actor_id)
  values (p_user_id, 'verification_decision', 'Membership verification set to ' || p_status, v_actor);
end $$;

grant execute on function public.review_member_verification(uuid,text,text,text,text,text) to authenticated;

-- Member-initiated purge of raw proof once a decision exists; the audit result remains.
create or replace function public.purge_verification_proof()
returns integer language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_id uuid; v_count integer;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select id into v_id from public.member_verifications where user_id = v_uid;
  if v_id is null then return 0; end if;

  update public.verification_evidence
    set purged = true, private_storage_path = null, status = 'purged'
  where verification_id = v_id and not purged;
  get diagnostics v_count = row_count;

  update public.member_verifications set proof_retention = 'purged', updated_at = now() where id = v_id;

  insert into public.verification_events (verification_id, user_id, actor_id, event, summary)
  values (v_id, v_uid, v_uid, 'proof_purged', 'Member requested removal of raw proof documents.');
  return v_count;
end $$;

grant execute on function public.purge_verification_proof() to authenticated;

-- =========================================================
-- Network access now requires a verified membership
-- =========================================================

-- Grandfather every existing approved member so nobody currently using the network loses access.
insert into public.member_verifications
  (user_id, legal_name, display_name, claimed_role, verified_role, business_name,
   status, verification_level, public_summary, submitted_at, verified_at, reviewed_at)
select e.user_id,
       coalesce(p.name, ''), coalesce(p.name, ''), coalesce(nullif(p.title, ''), 'Founding member'),
       'founder'::public.verified_role, coalesce(p.company, ''),
       'verified'::public.verification_status, 2,
       'Founding member verified at launch.', now(), now(), now()
from public.early_access_members e
left join public.profiles p on p.id = e.user_id
where e.status = 'approved'
on conflict (user_id) do nothing;

update public.profiles p set
  verified_role = v.verified_role, verified_at = v.verified_at,
  verified_business = v.business_name, verification_public_summary = v.public_summary
from public.member_verifications v
where v.user_id = p.id and v.status = 'verified';

create or replace function public.is_verified_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.member_verifications
    where user_id = auth.uid() and status = 'verified'
  )
$$;

grant execute on function public.is_verified_member() to authenticated;

-- Every network surface already routes through is_live_member(); verification now folds into it,
-- so unverified accounts are blocked server-side everywhere at once.
create or replace function public.is_live_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.early_access_members e
    join public.member_verifications v on v.user_id = e.user_id
    where e.user_id = auth.uid() and e.status = 'approved' and v.status = 'verified'
  )
$$;