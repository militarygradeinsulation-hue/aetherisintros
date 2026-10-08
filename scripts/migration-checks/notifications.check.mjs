// 0026 introduction notifications
export default async ({ db, ok, as, svc, A, B, C, ADMIN }) => {
  await svc(`update public.profiles set name = 'Alex Requester' where id = '${A}'`)
  await svc(`update public.profiles set name = 'Blair Target' where id = '${B}'`)
  console.log('notifications')
  let r = await as(A, `insert into public.intro_requests (user_id, member_id) values ($1, $2) returning id`, [A, B])
  const intro = r.rows[0].id
  r = await as(B, `select kind, text, link, actor_id from public.notifications`)
  ok(r.rows.length === 1 && r.rows[0].kind === 'intro_request' && r.rows[0].text.startsWith('Alex Requester asked') && r.rows[0].actor_id === A, 'target is notified of a new request')
  ok(!r.rows[0].text.includes('reason'), 'notification carries no private context')
  // Assistant-style request with no target_user_id still notifies (target derived by the consent guard).
  const Q = '00000000-0000-4000-8000-0000000000a9'
  await svc(`insert into auth.users values ('${Q}')`)
  r = await as(Q, `insert into public.intro_requests (user_id, member_id) values ($1, $2) returning id`, [Q, B])
  ok(!r.error, 'assistant-style request inserts: ' + (r.error ?? 'ok'))
  r = await as(B, `select count(*)::int as n from public.notifications where kind = 'intro_request'`)
  ok(r.rows[0].n === 2, 'requests without an explicit target still notify the target')
  // Re-requesting the same person does not notify twice.
  await as(A, `insert into public.intro_requests (user_id, member_id, reason) values ($1, $2, 'again') on conflict (user_id, member_id) do update set reason = excluded.reason`, [A, B])
  r = await as(B, `select count(*)::int as n from public.notifications where kind = 'intro_request'`)
  ok(r.rows[0].n === 2, 'a repeated request does not notify again')
  r = await as(A, `select count(*)::int as n from public.notifications`)
  ok(r.rows[0].n === 0, 'requester gets nothing until acceptance')
  await as(B, `update public.intro_requests set member_opt_in = true, status = 'accepted' where id = $1`, [intro])
  r = await as(A, `select kind, text from public.notifications`)
  ok(r.rows.length === 1 && r.rows[0].kind === 'intro_accepted' && r.rows[0].text.startsWith('Blair Target accepted'), 'requester is notified once on acceptance')
  await as(B, `update public.intro_requests set status = 'connected' where id = $1`, [intro])
  r = await as(A, `select count(*)::int as n from public.notifications`)
  ok(r.rows[0].n === 1, 'later updates do not re-notify')
  r = await as(C, `select count(*)::int as n from public.notifications where user_id = $1`, [B])
  ok(r.rows[0].n === 0, 'others cannot read your notifications')
  r = await as(B, `select public.mark_notifications_read(null) as n`)
  ok(r.rows[0].n === 2, 'mark all read')
  r = await as(A, `select public.mark_notifications_read(null) as n`)
  ok(r.rows[0].n === 1, 'mark read only touches your own')
}
