// 0084 — confirmed live introduction lineage and permission-safe feed/provider reads.
export default async ({ ok, as, svc, A, B, C }) => {
  await svc(`insert into public.early_access_members(user_id,email,status) values
     ('${A}','intro-a@example.test','approved'),
     ('${B}','intro-b@example.test','approved'),
     ('${C}','intro-c@example.test','pending')
     on conflict(user_id) do update set status=excluded.status`)
  await svc(`update public.profiles set onboarded=true, visibility='network' where id in ('${A}','${B}')`)
  const sql = (who, note = 'Discuss a potential collaboration') =>
    `select public.request_verified_intro('${who}'::uuid, $$${note}$$) as receipt`

  let r = await as(null, sql(B))
  ok(!!r.error, 'anonymous callers cannot create introductions')
  r = await as(C, sql(B))
  ok(!!r.error, 'unapproved accounts cannot create introductions')
  r = await as(A, sql(C))
  ok(!!r.error, 'pending recipients cannot receive live introduction requests')
  r = await as(A, sql(A))
  ok(!!r.error, 'members cannot request introductions to themselves')
  r = await as(A, sql(B, 'no'))
  ok(!!r.error, 'short or invalid notes fail before saving')

  r = await as(A, sql(B))
  ok(!r.error && r.rows?.[0]?.receipt?.id, 'approved member requests a real live profile')
  const id = r.rows?.[0]?.receipt?.id
  r = await as(A, sql(B))
  ok(!r.error && r.rows?.[0]?.receipt?.id === id && r.rows?.[0]?.receipt?.state === 'existing',
    'request retries do not create duplicate introductions')
  const saved = (await svc(`select target_user_id,requester_opt_in,member_opt_in,status
    from public.intro_requests where id='${id}'`))[0]
  ok(saved.target_user_id === B && saved.requester_opt_in && !saved.member_opt_in,
    'the receiving member must still opt in; requests are not auto-accepted')

  for (const name of ['provider_directory','my_provider_requests','provider_inbox']) {
    r = await as(A,`select public.${name}() as payload`)
    ok(!r.error && Array.isArray(r.rows?.[0]?.payload), `${name} loads for approved members`)
    r = await as(null,`select public.${name}() as payload`)
    ok(!!r.error, `${name} is not callable by anonymous visitors`)
  }
  for (const name of ['posts','asks']) {
    r = await as(A,`select id from public.${name} limit 1`)
    ok(!r.error, `authenticated network ${name} reads are authorized`)
  }
  // A deployed 0085 must restore privileges needed by real member posts and
  // asks, not only the reads exercised by the initial 0084 test.
  for (const table of ['posts', 'asks']) {
    for (const ability of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
      const privilege = (await svc(`select has_table_privilege('authenticated','public.${table}','${ability}') as allowed`))[0]
      ok(privilege.allowed === true, `authenticated can ${ability} ${table} subject to existing RLS`)
    }
  }
  for (const signature of [
    'request_verified_intro(uuid,text)', 'visible_member_profiles(uuid[],integer,integer)',
    'my_intro_participant_names(uuid[])', 'my_relationship_evidence(uuid[])',
    'provider_directory()', 'my_provider_requests()', 'provider_inbox()',
  ]) {
    const permission = (await svc(`select has_function_privilege('authenticated','public.${signature}','EXECUTE') as allowed`))[0]
    ok(permission.allowed === true, `authenticated may invoke ${signature} with server-side authorization`)
  }
  for (const name of ['seed_learnings','seed_threads','signals']) {
    r = await as(A,`select id from public.${name} limit 1`)
    ok(!!r.error, `private demo ${name} remains closed to authenticated members`)
  }
}
