// 0040 quiet automatic connections, error capture, deletion records
export default async ({ ok, as, svc, A, B }) => {
  // The live trigger that connects each new profile to everyone (supabase/migrations).
  await svc(`drop trigger if exists profiles_connect_owner on public.profiles`)
  await svc(`create trigger profiles_connect_owner after insert on public.profiles for each row execute function public.connect_new_member_to_owner()`)
  const before = (await svc(`select count(*)::int n from public.notifications where kind = 'connection'`))[0].n
  const N = '00000000-0000-4000-8000-0000000000ee'
  await svc(`insert into auth.users (id) values ('${N}')`)
  await svc(`insert into public.profiles (id, name) values ('${N}', 'Newcomer')`)
  const links = (await svc(`select count(*)::int n from public.follows where follower_id = '${N}' or followee_id = '${N}'`))[0].n
  ok(links >= 6, `a new member is still connected to everyone both ways (${links} links)`)
  const after = (await svc(`select count(*)::int n from public.notifications where kind = 'connection'`))[0].n
  ok(after === before, 'but nobody is notified about automatic connections')
  await svc(`delete from public.follows where follower_id = '${A}' and followee_id = '${B}' and kind = 'connection'`)
  await as(A, `insert into public.follows (follower_id, followee_id, kind) values ($1, $2, 'connection')`, [A, B])
  ok((await svc(`select count(*)::int n from public.notifications where user_id = '${B}' and kind = 'connection'`))[0].n === 1, 'a connection a member makes still notifies')

  // Error capture.
  ok(!(await as(A, `select public.log_app_error('Boom', 'at x', 'https://app/x', 'UA')`)).error, 'members report errors')
  ok(!(await as(null, `select public.log_app_error('Visitor boom')`)).error, 'visitors report errors too')
  let r = await svc(`select source, user_id, message from public.app_errors order by created_at`)
  ok(r.length === 2 && r[0].user_id === A && r[1].user_id === null, 'errors are stored with who hit them')
  for (let i = 0; i < 25; i++) await as(B, `select public.log_app_error('spam')`)
  ok((await svc(`select count(*)::int n from public.app_errors where user_id = '${B}'`))[0].n === 20, 'one person cannot flood the log (20 a minute)')
  await as(A, `select public.log_app_error($1)`, ['x'.repeat(5000)])
  ok((await svc(`select max(length(message))::int m from public.app_errors`))[0].m === 1000, 'reports are size-limited')
  ok((await as(A, `select id from public.app_errors`)).rows?.length === 0, 'members cannot read the error log')
  await svc(`insert into public.user_roles values ('${B}', 'admin')`)
  ok((await as(B, `select id from public.app_errors`)).rows?.length > 0, 'admins can')
  ok(!!(await as(A, `insert into public.app_errors (source, message) values ('client', 'forged')`)).error, 'nobody writes the log directly')

  // Deletion records are server-only.
  ok(!!(await as(A, `select * from public.account_deletions`)).error, 'deletion records are not readable by members')
}
