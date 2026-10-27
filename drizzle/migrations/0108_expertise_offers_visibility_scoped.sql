-- 0108: expertise offers are shared only when their owner says so.
-- The rule before this one let every signed-in member read every offer,
-- including offers a member had deliberately left private or limited to their
-- connections. The offer model already carries a visibility field
-- ('private' | 'connections' | 'network' | 'public'), so the rule now reads it:
-- members browse the offers their owners marked network or public, and always
-- see their own.
begin;

drop policy if exists member_read_expertise_offers on public.expertise_offers;
drop policy if exists member_listed_expertise_offers on public.expertise_offers;

create policy member_listed_expertise_offers on public.expertise_offers
  for select to authenticated
  using (owner_id = auth.uid() or coalesce(data->>'visibility','') in ('network','public'));

commit;
