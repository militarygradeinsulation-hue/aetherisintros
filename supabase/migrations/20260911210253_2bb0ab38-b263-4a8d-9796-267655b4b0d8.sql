create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.profiles (id, email, name, initials)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(coalesce(new.email,'member'), '@', 1)),
    upper(left(coalesce(new.raw_user_meta_data->>'name', coalesce(new.email,'M')), 1))
  )
  on conflict (id) do nothing;

  -- Bootstrap: the very first account becomes the launch administrator.
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin')
    on conflict (user_id, role) do nothing;
  end if;

  return new;
end;
$function$;