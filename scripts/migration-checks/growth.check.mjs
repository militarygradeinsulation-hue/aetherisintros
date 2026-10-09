// 0041 push subscriptions, app settings, call_app, referrals
export default async ({ ok, as, svc, A, B, C }) => {
  // Settings are server-only, with a strong secret.
  const s = await svc(`select key, value from public.app_settings order by key`)
  ok(s.find(r => r.key === 'dispatch_secret')?.value.length === 64, 'a random dispatch secret is created')
  ok(!!(await as(A, `select * from public.app_settings`)).error, 'members cannot read app settings')
  ok(!!(await as(null, `select * from public.app_settings`)).error, 'visitors cannot either')

  // Push subscriptions.
  const sub = ['https://fcm.googleapis.com/fcm/send/abc123', 'B'.repeat(87), 'a'.repeat(22), 'Chrome']
  ok(!(await as(A, `insert into public.push_subscriptions (endpoint, p256dh, auth, user_agent) values ($1, $2, $3, $4)`, sub)).error, 'members save their own push subscription')
  ok(!!(await as(A, `insert into public.push_subscriptions (endpoint, p256dh, auth) values ('http://evil.example/x', $1, $2)`, [sub[1], sub[2]])).error, 'only https push endpoints')
  ok(!!(await as(A, `insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values ($1, 'https://x.example/2', $2, $3)`, [B, sub[1], sub[2]])).error, 'not for someone else')
  ok((await as(B, `select id from public.push_subscriptions`)).rows.length === 0, "others' subscriptions are private")
  ok((await as(A, `select id from public.push_subscriptions`)).rows.length === 1, 'members see their own')

  // A notification for someone with push on asks the app to deliver it (no-op without app_url).
  ok(!(await svc(`insert into public.notifications (user_id, kind, text) values ('${A}', 'test', 'Hello')`).then(() => null, e => e)), 'creating a notification never fails because of push')
  ok(!!(await as(A, `select public.call_app('/x')`)).error, 'members cannot call the app as the database')

  // Referrals.
  await svc(`insert into public.invitations (id, code, created_by) values ('00000000-0000-4000-8000-0000000000f1', 'ana-abc123', '${A}')`)
  await svc(`update public.profiles set name = 'Cy Referred' where id = '${C}'`)
  await svc(`insert into public.early_access_members (user_id, email, status, invite_id) values ('${C}', 'c@x.test', 'approved', '00000000-0000-4000-8000-0000000000f1') on conflict (user_id) do update set invite_id = excluded.invite_id, status = 'approved'`)
  const r = await as(A, `select name, approved, verified from public.my_referrals()`)
  ok(r.rows?.length === 1 && r.rows[0].name === 'Cy Referred' && r.rows[0].approved === true && r.rows[0].verified === false, 'members see who joined with their invite')
  ok((await as(B, `select * from public.my_referrals()`)).rows?.length === 0, "and nobody else's")
  ok(!!(await as(null, `select * from public.my_referrals()`)).error, 'visitors cannot')
}
