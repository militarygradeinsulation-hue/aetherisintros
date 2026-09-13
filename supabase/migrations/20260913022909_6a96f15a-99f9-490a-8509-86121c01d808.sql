create extension if not exists pg_trgm;

create table public.directory_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text not null default '',
  city text not null default '',
  region text not null default '',
  country text not null default '',
  website text not null default '',
  phone text not null default '',
  employees text not null default '',
  revenue text not null default '',
  source text not null default 'import',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.directory_companies to authenticated;
grant all on public.directory_companies to service_role;
alter table public.directory_companies enable row level security;
create policy "Members can search companies" on public.directory_companies for select to authenticated using (true);

create table public.directory_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  title text not null default '',
  company_name text not null default '',
  industry text not null default '',
  location text not null default '',
  email text not null default '',
  phone text not null default '',
  linkedin_url text not null default '',
  seniority text not null default '',
  source text not null default 'import',
  is_member boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.directory_contacts to authenticated;
grant all on public.directory_contacts to service_role;
alter table public.directory_contacts enable row level security;
create policy "Members can search contacts" on public.directory_contacts for select to authenticated using (true);

create index directory_companies_name_trgm on public.directory_companies using gin (name gin_trgm_ops);
create index directory_companies_industry_idx on public.directory_companies (lower(industry));
create index directory_contacts_name_trgm on public.directory_contacts using gin (full_name gin_trgm_ops);
create index directory_contacts_company_trgm on public.directory_contacts using gin (company_name gin_trgm_ops);
create index directory_contacts_member_idx on public.directory_contacts (is_member);
create unique index directory_contacts_email_key on public.directory_contacts (lower(email)) where email <> '';
create unique index directory_contacts_user_key on public.directory_contacts (user_id) where user_id is not null;

create trigger directory_companies_touch before update on public.directory_companies
  for each row execute function public.touch_updated_at();
create trigger directory_contacts_touch before update on public.directory_contacts
  for each row execute function public.touch_updated_at();

-- Every member who signs up joins the same directory other members search.
create or replace function public.sync_member_directory()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_email text;
begin
  select u.email into v_email from auth.users u where u.id = new.id;

  update public.directory_contacts d
     set user_id = new.id,
         is_member = true,
         full_name = coalesce(nullif(new.name, ''), d.full_name),
         title = coalesce(nullif(new.title, ''), d.title),
         company_name = coalesce(nullif(new.company, ''), d.company_name),
         location = coalesce(nullif(new.location, ''), d.location),
         source = 'member',
         updated_at = now()
   where d.user_id = new.id
      or (v_email is not null and v_email <> '' and lower(d.email) = lower(v_email));

  if not found then
    insert into public.directory_contacts
      (user_id, full_name, title, company_name, industry, location, email, source, is_member)
    values
      (new.id, coalesce(nullif(new.name, ''), 'Member'), coalesce(new.title, ''), coalesce(new.company, ''),
       coalesce((new.industries)[1], ''), coalesce(new.location, ''), coalesce(v_email, ''), 'member', true)
    on conflict do nothing;
  end if;

  return new;
end $$;

create trigger profiles_directory_sync
  after insert or update of name, title, company, location, industries on public.profiles
  for each row execute function public.sync_member_directory();