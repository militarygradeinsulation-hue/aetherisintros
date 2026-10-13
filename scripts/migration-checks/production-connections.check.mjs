// Production RPC regression: the three Trusted Providers reads must work for
// authenticated users, without granting anonymous or unrelated record access.
// Relationship intelligence is caller-specific and contains recorded evidence.
export default async ({ ok, as, svc, A, B, C }) => {
  for (const name of ['provider_directory','my_provider_requests','provider_inbox']) {
    const member = await as(A, `select public.${name}() as value`)
    ok(!member.error && Array.isArray(member.rows?.[0]?.value), `${name}: member can load results`)
    const outsider = await as(null, `select public.${name}() as value`)
    ok(!!outsider.error, `${name}: public visitor has no access`)
  }
  await svc(`insert into public.early_access_members(user_id,email,status) values
      ('${A}','verified-a@example.test','approved'),
      ('${B}','verified-b@example.test','approved'),
      ('${C}','pending-c@example.test','pending')
      on conflict(user_id) do update set status=excluded.status`)
  await svc(`update public.profiles set onboarded=true, visibility='network' where id in ('${A}','${B}')`)
  let r = await as(A,`select * from public.my_relationship_evidence(array['${B}'::uuid])`)
  ok(!r.error && r.rows?.length === 1 && r.rows[0].member_id === B,
    'approved member can inspect evidence about visible counterpart')
  const before = Number(r.rows?.[0]?.message_count ?? 0)
  const info = r.rows?.[0] ?? {}
  ok(!('email' in info) && !('phone' in info) && !('note' in info),
    'relationship evidence exposes no private contact information')
  r = await as(A,`select * from public.my_relationship_evidence(array['${C}'::uuid])`)
  ok(!r.error && r.rows?.length === 0, 'unapproved accounts are not disclosed through evidence')
  r = await as(null,`select * from public.my_relationship_evidence(array['${B}'::uuid])`)
  ok(!!r.error, 'public cannot enumerate member relationship evidence')
  r = await as(C,`select * from public.my_relationship_evidence(array['${B}'::uuid])`)
  ok(!r.error && r.rows.length === 0, 'unapproved caller cannot enumerate members')
  const thread = (await svc(`select id from public.dm_threads where (member_a='${A}' and member_b='${B}') or (member_b='${A}' and member_a='${B}') limit 1`))[0]
  let threadId = thread?.id
  if (!threadId) {
    const pair = [A,B].sort()
    threadId = (await svc(`insert into public.dm_threads(member_a,member_b,created_by,intro_context)
      values ('${pair[0]}','${pair[1]}','${A}','Relationship evidence regression')
      returning id`))[0]?.id
  }
  if (threadId) await svc(`insert into public.dm_messages(thread_id,sender_id,text)
    values ('${threadId}','${A}','A confirmed relationship evidence message')`)
  r = await as(A,`select * from public.my_relationship_evidence(array['${B}'::uuid])`)
  ok(!r.error && Number(r.rows?.[0]?.message_count) > before && !!r.rows?.[0]?.last_message_at,
    'recorded message increases count and produces actual exchange timestamp')
}
