// 0026 notifications: database-owned, with production's notify_intro_activity left in place
export default async ({ ok, as, svc, A, B, C }) => {
  await svc(`update public.profiles set name = 'Alex Requester' where id = '${A}'`)
  await svc(`update public.profiles set name = 'Blair Target' where id = '${B}'`)
  const count = async (uid, kind) => (await as(uid, `select count(*)::int as n from public.notifications where ($1::text is null or kind = $1)`, [kind ?? null])).rows[0].n

  console.log('introductions (production trigger, unchanged)')
  const before = await count(B, 'intro_request')
  let r = await as(A, `insert into public.intro_requests (user_id, member_id, reason) values ($1, $2, 'Renewal at Northwind') returning id`, [A, B])
  const intro = r.rows[0].id
  ok(await count(B, 'intro_request') === before + 1, 'target is notified once of a new request')
  await as(A, `insert into public.intro_requests (user_id, member_id, reason) values ($1, $2, 'again') on conflict (user_id, member_id) do update set reason = excluded.reason`, [A, B])
  ok(await count(B, 'intro_request') === before + 1, 'a repeated request does not notify again')

  r = await as(A, `update public.intro_requests set status = 'accepted' where id = $1 returning status`, [intro])
  ok(r.rows[0].status !== 'accepted', 'requester cannot accept their own request by setting status')
  r = await svc(`select count(*)::int as n from public.relationships where user_id = '${A}' and member_id = '${B}'`)
  ok(r[0].n === 0, 'so no connection is created without the target')

  await as(B, `update public.intro_requests set member_opt_in = true, status = 'accepted' where id = $1`, [intro])
  ok(await count(A, 'intro_accepted') === 1, 'requester is notified when the target accepts')
  r = await svc(`select count(*)::int as n from public.relationships where (user_id = '${A}' and member_id = '${B}') or (user_id = '${B}' and member_id = '${A}')`)
  ok(r[0].n === 2, 'acceptance by the target creates the two-way connection (production behaviour kept)')

  console.log('messages and follows (new triggers)')
  r = await as(A, `insert into public.dm_threads (member_a, member_b, created_by) values ($1, $2, $1) returning id`, [A, B])
  await as(A, `insert into public.dm_messages (thread_id, sender_id, text) values ($1, $2, 'hello')`, [r.rows[0].id, A])
  r = await as(B, `select text, actor_id from public.notifications where kind = 'message'`)
  ok(r.rows.length === 1 && r.rows[0].text === 'Alex Requester sent you a message.' && r.rows[0].actor_id === A, 'a message notifies the other participant')
  ok(await count(A, 'message') === 0, 'the sender is not notified of their own message')
  await as(C, `insert into public.follows (follower_id, followee_id, kind) values ($1, $2, 'follow')`, [C, B])
  await as(C, `insert into public.follows (follower_id, followee_id, kind) values ($1, $2, 'saved')`, [C, A])
  ok(await count(B, 'follow') === 1, 'a follow notifies the person followed')
  ok(await count(A, 'saved') === 0 && await count(A, 'follow') === 0, 'saving someone stays private')

  console.log('no client-written notifications')
  r = await as(C, `insert into public.notifications (user_id, kind, text) values ($1, 'system', 'Your account is locked. Verify at evil.example')`, [B])
  ok(!!r.error, 'a member cannot insert a notification for someone else (phishing)')
  r = await as(C, `insert into public.notifications (user_id, actor_id, kind, text) values ($1, $1, 'x', 'x')`, [C])
  ok(!!r.error, 'a member cannot insert notifications at all')

  console.log('reading')
  r = await as(C, `select count(*)::int as n from public.notifications where user_id = $1`, [B])
  ok(r.rows[0].n === 0, 'others cannot read your notifications')
  const unread = await count(B)
  r = await as(B, `select public.mark_notifications_read(null) as n`)
  ok(r.rows[0].n === unread && unread > 0, 'mark all read covers exactly your unread notifications')
  r = await as(A, `select public.mark_notifications_read(null) as n`)
  ok(r.rows[0].n === await count(A), 'mark read only touches your own')
}
