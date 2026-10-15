// 0047 member workspace sync: private per-member store rows with optimistic versioning
export default async ({ ok, as, svc, A, B }) => {
  const save = (uid, key, data, base) =>
    as(uid, `select * from public.save_workspace_state($1, $2::jsonb, $3)`, [key, JSON.stringify(data), base])

  const first = await save(A, 'aetheris-moat-v1-live', { consent: [{ id: 'c1' }] }, 0)
  ok(first.rows?.[0]?.saved === true && Number(first.rows[0].current_version) === 1, 'first save creates version 1')
  const second = await save(A, 'aetheris-moat-v1-live', { consent: [{ id: 'c1' }, { id: 'c2' }] }, 1)
  ok(second.rows?.[0]?.saved === true && Number(second.rows[0].current_version) === 2, 'a save on the current version moves it on')

  const stale = await save(A, 'aetheris-moat-v1-live', { consent: [] }, 1)
  ok(stale.rows?.[0]?.saved === false && Number(stale.rows[0].current_version) === 2, 'a stale write is rejected')
  ok(stale.rows?.[0]?.current_data?.consent?.length === 2, 'and returns the current data so the client can merge')
  ok((await svc(`select data from public.member_workspace_state where user_id = '${A}'`))[0]?.data?.consent?.length === 2, 'the stale write changed nothing')
  const fresh = await save(A, 'aetheris-moat-v1-live', { consent: [] }, 0)
  ok(fresh.rows?.[0]?.saved === false, 'a "first" save over an existing row is also rejected')

  ok((await as(A, `select store_key, version from public.member_workspace_state`)).rows?.length === 1, 'members read their own rows')
  ok((await as(B, `select * from public.member_workspace_state`)).rows?.length === 0, "but not anyone else's")
  ok((await as(B, `delete from public.member_workspace_state where user_id = $1 returning user_id`, [A])).rows?.length === 0, "nor delete anyone else's")
  ok(!!(await as(B, `insert into public.member_workspace_state (user_id, store_key, data) values ($1, 'aetheris-pro-v1-live', '{}')`, [A])).error, 'nor write a row as someone else')
  const own = await as(B, `insert into public.member_workspace_state (store_key, data) values ('aetheris-pro-v1-live', '{"x":1}') returning user_id, version`)
  ok(own.rows?.[0]?.user_id === B && Number(own.rows[0].version) === 1, 'a direct insert takes the member id from the session')
  ok(!!(await as(B, `update public.member_workspace_state set version = 99`)).error, 'versions cannot be edited directly')
  ok(!!(await as(B, `insert into public.member_workspace_state (store_key, data, version) values ('aetheris-platform-v1-live', '{}', 50)`)).error, 'nor set on insert')

  ok(!!(await save(A, 'aetheris-moat-v1-demo', { consent: [] }, 0)).error, 'demo stores are never accepted')
  ok(!!(await save(A, 'anything-else', {}, 0)).error, 'only allowlisted keys are accepted')
  ok(!!(await save(A, 'aetheris-pro-v1-live', [1, 2], 0)).error, 'data must be an object')
  ok(!!(await as(A, `select * from public.save_workspace_state('aetheris-pro-v1-live', jsonb_build_object('blob', repeat('x', 2100000)), 0)`)).error, 'data over 2 MB is refused')
  ok((await save(A, 'aetheris.ledger.patch', { deals: {} }, 0)).rows?.[0]?.saved === true, 'the workspace edits store is allowed')

  ok(!!(await as(null, `select * from public.member_workspace_state`)).error, 'visitors read nothing')
  ok(!!(await save(null, 'aetheris-pro-v1-live', {}, 0)).error, 'visitors cannot save')

  await svc(`delete from auth.users where id = '${B}'`)
  ok((await svc(`select count(*)::int as n from public.member_workspace_state where user_id = '${B}'`))[0]?.n === 0, 'deleting the account deletes the rows')
}
