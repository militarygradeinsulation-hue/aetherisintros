// 0043 google connections and relationship signals are private to their owner
export default async ({ ok, as, svc, A, B }) => {
  await svc(`insert into public.google_connections (user_id, google_email, scopes, refresh_token_enc) values ('${A}', 'ana@gmail.test', '{calendar.readonly}', 'enc:secret')`)
  ok((await as(A, `select google_email, last_sync_at from public.google_connections`)).rows?.[0]?.google_email === 'ana@gmail.test', 'members see their own connection')
  ok(!!(await as(A, `select refresh_token_enc from public.google_connections`)).error, 'but never the token')
  ok((await as(B, `select user_id from public.google_connections`)).rows?.length === 0, "nor anyone else's connection")
  ok(!!(await as(A, `insert into public.google_connections (user_id, refresh_token_enc) values ($1, 'x')`, [A])).error, 'connections are created by the server only')
  await svc(`insert into public.relationship_signals (user_id, member_id, source, last_at, count_90d) values ('${A}', '${B}', 'calendar', now(), 3)`)
  ok((await as(A, `select count_90d from public.relationship_signals`)).rows?.[0]?.count_90d === 3, 'members see their own calendar signals')
  ok((await as(B, `select * from public.relationship_signals`)).rows?.length === 0, 'the other member does not see them')
  ok(!!(await as(A, `update public.relationship_signals set count_90d = 99`)).error, 'signals are written by the server only')
  ok((await as(A, `delete from public.google_connections returning user_id`)).rows?.length === 1, 'members can disconnect')
  await svc(`update auth.users set email = 'Bo@Example.test', email_confirmed_at = now() where id = '${B}'`)
  ok((await svc(`select * from public.member_ids_for_emails(array['bo@example.test', 'nobody@example.test'])`))?.[0]?.user_id === B, 'attendee emails match confirmed member addresses')
  await svc(`update auth.users set email_confirmed_at = null where id = '${B}'`)
  ok((await svc(`select * from public.member_ids_for_emails(array['bo@example.test'])`))?.length === 0, 'unconfirmed addresses never match')
  ok(!!(await as(A, `select * from public.member_ids_for_emails(array['bo@example.test'])`)).error, 'members cannot look up addresses')
  ok(!!(await as(null, `select * from public.relationship_signals`)).error, 'visitors see nothing')
}
