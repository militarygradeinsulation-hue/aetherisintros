drop function if exists public.tighten_noop();

revoke all on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

revoke all on function public.is_live_member() from public, anon;
grant execute on function public.is_live_member() to authenticated;

revoke all on function public.claim_early_access(text) from public, anon;
grant execute on function public.claim_early_access(text) to authenticated;

revoke all on function public.founding_stats() from public;
grant execute on function public.founding_stats() to anon, authenticated;

revoke all on function public.join_waitlist(text, text) from public;
grant execute on function public.join_waitlist(text, text) to anon, authenticated;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.touch_updated_at() from public, anon, authenticated;