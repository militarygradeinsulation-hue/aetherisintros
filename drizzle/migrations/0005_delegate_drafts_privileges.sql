revoke all privileges on public.delegate_message_drafts from authenticated, anon;
grant select, insert, delete on public.delegate_message_drafts to authenticated;
grant all on public.delegate_message_drafts to service_role;