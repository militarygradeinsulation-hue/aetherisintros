// 0034 weekly digest preferences: opt-in, private token, server-owned send log
export default async ({ ok, as, svc, A, B }) => {
  let r = await as(A, `insert into public.email_preferences (user_id, weekly_digest) values ($1, true) returning weekly_digest`, [A])
  ok(r.rows?.[0]?.weekly_digest === true, 'members turn the digest on for themselves')
  ok(!!(await as(A, `insert into public.email_preferences (user_id, weekly_digest) values ($1, true)`, [B])).error, 'not for anyone else')
  ok(!!(await as(A, `select unsubscribe_token from public.email_preferences`)).error, 'the unsubscribe token is not readable by members')
  ok(!!(await as(A, `update public.email_preferences set last_digest_at = now() where user_id = $1`, [A])).error, 'members cannot touch the send log')
  ok(!!(await as(A, `update public.email_preferences set unsubscribe_token = gen_random_uuid() where user_id = $1`, [A])).error, 'or rotate the token')
  r = await as(A, `update public.email_preferences set weekly_digest = false where user_id = $1 returning weekly_digest`, [A])
  ok(r.rows?.[0]?.weekly_digest === false, 'and turn it off again')
  await svc(`insert into public.email_preferences (user_id, weekly_digest) values ('${B}', true)`)
  ok((await as(A, `select user_id from public.email_preferences`)).rows.length === 1, "members cannot see others' settings")
  ok(!!(await as(null, `select user_id from public.email_preferences`)).error, 'visitors see nothing')
  ok((await svc(`select count(*)::int n from public.email_preferences where unsubscribe_token is not null`))[0].n === 2, 'every row gets an unsubscribe token')
  r = await svc(`select weekly_digest from public.email_preferences where user_id = '${A}'`)
  ok(r[0].weekly_digest === false, 'the digest is off unless chosen')
}
