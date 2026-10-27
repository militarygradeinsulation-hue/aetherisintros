-- 0107: company profiles hold each member's own conversation history and
-- dormant opportunities with a company, so they belong to one member, not to
-- the whole network. The table had no owner column, so the gateway's writes
-- (which always set owner_id) were failing and the only rule in force let any
-- signed-in member read and write every row.
begin;

alter table public.company_profiles add column if not exists owner_id uuid;
create index if not exists company_profiles_owner_idx on public.company_profiles (owner_id);

drop policy if exists member_read_company_profiles on public.company_profiles;
drop policy if exists owner_read_company_profiles on public.company_profiles;
drop policy if exists owner_write_company_profiles on public.company_profiles;
drop policy if exists owner_update_company_profiles on public.company_profiles;
drop policy if exists owner_delete_company_profiles on public.company_profiles;

create policy owner_read_company_profiles on public.company_profiles
  for select to authenticated using (owner_id = auth.uid());
create policy owner_write_company_profiles on public.company_profiles
  for insert to authenticated with check (owner_id = auth.uid());
create policy owner_update_company_profiles on public.company_profiles
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy owner_delete_company_profiles on public.company_profiles
  for delete to authenticated using (owner_id = auth.uid());

commit;
