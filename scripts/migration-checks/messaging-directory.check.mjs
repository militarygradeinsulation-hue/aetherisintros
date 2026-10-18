// 0052 read markers, unread counts and receipts; member directory search and facets
export default async ({ ok, as, svc, A, B, C, ADMIN }) => {
  const T = '33333333-3333-4333-8333-333333333333'
  await svc(`insert into public.dm_threads (id, member_a, member_b, created_by) values ('${T}', '${A}', '${B}', '${A}')`)
  ok(!(await as(A, `insert into public.dm_messages (thread_id, sender_id, text) values ($1, $2, 'Hello Bea')`, [T, A])).error, 'A writes to B')
  await as(B, `insert into public.dm_messages (thread_id, sender_id, text) values ($1, $2, 'Hi Ana')`, [T, B])
  await as(B, `insert into public.dm_messages (thread_id, sender_id, text) values ($1, $2, 'Free on Friday?')`, [T, B])
  const lastFromB = (await svc(`select id from public.dm_messages where sender_id = '${B}' order by created_at desc limit 1`))[0].id

  // Unread counts.
  let r = await as(A, `select * from public.my_unread_counts()`)
  ok(r.rows?.length === 1 && r.rows[0].thread_id === T && r.rows[0].unread === 2, 'A has two unread messages from B')
  r = await as(B, `select * from public.my_unread_counts()`)
  ok(r.rows?.[0]?.unread === 1, 'B has one unread message from A')
  ok((await as(C, `select * from public.my_unread_counts()`)).rows?.length === 0, 'outsiders have no counts for the thread')

  // Only participants mark a thread read; markers are written by the function only.
  ok(!!(await as(C, `select public.mark_thread_read($1)`, [T])).error, 'outsiders cannot mark the thread read')
  ok(!!(await as(A, `insert into public.dm_thread_reads (thread_id, user_id, last_read_at) values ($1, $2, now())`, [T, A])).error, 'members cannot write markers directly')
  ok(!(await as(A, `select public.mark_thread_read($1)`, [T])).error, 'A marks the thread read')
  ok((await as(A, `select * from public.my_unread_counts()`)).rows?.[0]?.unread === 0, 'then A has nothing unread')
  ok((await svc(`select count(*)::int n from public.notifications where user_id = '${A}' and kind = 'message' and not read`))[0].n === 0, "and B's message notifications are marked read")
  ok(!!(await as(A, `update public.dm_thread_reads set last_read_at = now() - interval '1 day'`)).error
    || (await svc(`select count(*)::int n from public.dm_thread_reads where last_read_at < now() - interval '1 hour'`))[0].n === 0, 'markers cannot be edited directly')
  ok((await as(C, `select * from public.dm_thread_reads`)).rows?.length === 0, 'outsiders see no read markers')

  // Receipts (on by default for both).
  r = await as(B, `select * from public.my_unread_counts()`)
  ok(r.rows?.[0]?.peer_read_at && r.rows[0].seen_message_id === lastFromB, "B sees that A has seen B's latest message")
  ok((await as(A, `select * from public.my_unread_counts()`)).rows?.[0]?.seen_message_id === null, 'A sees no receipt before B opens the thread')
  ok((await as(B, `select user_id from public.dm_thread_reads where user_id = $1`, [A])).rows?.length === 1, "B can read A's marker while receipts are shared")
  await as(B, `select public.mark_thread_read($1)`, [T])
  r = await as(A, `select * from public.my_unread_counts()`)
  ok(r.rows?.[0]?.seen_message_id && r.rows[0].peer_read_at, 'A sees that B has seen her message')
  await as(A, `select public.mark_thread_read($1)`, [T])
  r = await as(B, `select * from public.my_unread_counts()`)
  ok(r.rows?.[0]?.seen_message_id === lastFromB, 'marking again keeps the receipt')

  // Turning receipts off hides them both ways.
  ok(!!(await as(null, `select public.set_read_receipts(false)`)).error, 'visitors cannot change receipt settings')
  ok(!(await as(A, `select public.set_read_receipts(false)`)).error, 'A turns read receipts off')
  ok((await as(A, `select show_read_receipts from public.messaging_settings`)).rows?.[0]?.show_read_receipts === false, 'A sees her own setting')
  ok((await as(B, `select * from public.messaging_settings`)).rows?.length === 0, "B cannot see A's setting")
  r = await as(B, `select * from public.my_unread_counts()`)
  ok(r.rows?.[0]?.peer_read_at === null && r.rows[0].seen_message_id === null, 'B no longer sees when A read')
  r = await as(A, `select * from public.my_unread_counts()`)
  ok(r.rows?.[0]?.peer_read_at === null && r.rows[0].seen_message_id === null, 'and A no longer sees when B read')
  ok((await as(B, `select user_id from public.dm_thread_reads where user_id = $1`, [A])).rows?.length === 0, "B cannot read A's marker directly either")
  ok((await as(A, `select user_id from public.dm_thread_reads`)).rows?.length === 1, 'A still sees her own marker')
  await as(A, `select public.set_read_receipts(true)`)
  ok(!!(await as(B, `select public.dm_receipts_enabled($1)`, [A])).error, "members cannot probe another member's setting")

  // New messages count again after the marker.
  await as(B, `insert into public.dm_messages (thread_id, sender_id, text) values ($1, $2, 'One more thing')`, [T, B])
  ok((await as(A, `select * from public.my_unread_counts()`)).rows?.[0]?.unread === 1, 'a new message is unread')

  // Visitors.
  ok(!!(await as(null, `select * from public.my_unread_counts()`)).error, 'visitors cannot read counts')
  ok(!!(await as(null, `select public.mark_thread_read($1)`, [T])).error, 'visitors cannot mark threads')
  ok(!!(await as(null, `select * from public.dm_thread_reads`)).error, 'visitors cannot read markers')

  // ---------------------------------------------------------------- directory search
  const D = '00000000-0000-4000-8000-00000000000d'
  await svc(`insert into auth.users (id) values ('${D}')`)
  await svc(`insert into public.early_access_members (user_id, email, status) values ('${A}', 'a@x.test', 'approved'), ('${B}', 'b@x.test', 'approved'), ('${C}', 'c@x.test', 'approved'), ('${ADMIN}', 'ad@x.test', 'approved')`)
  await svc(`update public.profiles set onboarded = true, email = 'secret-' || left(id::text, 8) || '@mail.test' where id in ('${A}', '${B}', '${C}', '${ADMIN}')`)
  await svc(`update public.profiles set name = 'Ana Ames', company = 'Harbor Freight Co', location = 'Austin, TX', industries = '{Logistics}', expertise = '{Pricing}', can_help_with = 'Fleet financing', looking_for = 'A CFO' where id = '${A}'`)
  await svc(`update public.profiles set location = 'Austin, TX', industries = '{logistics,SaaS}', expertise = '{Hiring}', looking_for = 'Distribution partners', verified_at = now() where id = '${B}'`)
  await svc(`update public.profiles set name = 'Cy Cole', location = 'Austin, TX', industries = '{Logistics}', expertise = '{Pricing}' where id = '${C}'`)
  await svc(`update public.profiles set name = 'Dee Admin', location = 'Denver, CO', industries = '{Fintech}', expertise = '{Pricing}' where id = '${ADMIN}'`)

  r = await as(A, `select * from public.search_members()`)
  ok(r.rows?.length === 4 && Number(r.rows[0].total_count) === 4, 'members search every listed member')
  ok(r.rows[0].id === B && r.rows[0].verified === true, 'verified members come first')
  ok(r.rows.every(row => !('email' in row) && !JSON.stringify(row).includes('@mail.test')), 'search never returns email')
  ok((await as(A, `select id from public.search_members(p_verified_only => true)`)).rows?.map(x => x.id).join() === B, 'verified only')
  ok((await as(A, `select id from public.search_members(p_industries => array['LOGISTICS'])`)).rows?.length === 3, 'industry filter ignores case')
  ok((await as(A, `select id from public.search_members(p_location => 'denver')`)).rows?.map(x => x.id).join() === ADMIN, 'location filter')
  ok((await as(A, `select id from public.search_members(p_expertise => array['fleet financing'])`)).rows?.map(x => x.id).join() === A, 'expertise matches what they can help with')
  ok((await as(A, `select id from public.search_members(p_expertise => array['pricing'], p_location => 'austin')`)).rows?.length === 2, 'filters combine')
  ok((await as(A, `select id from public.search_members(p_looking_for => 'distribution')`)).rows?.map(x => x.id).join() === B, 'looking-for filter')
  ok((await as(A, `select id from public.search_members('harbor')`)).rows?.map(x => x.id).join() === A, 'free-text search over the card')
  ok((await as(A, `select id from public.search_members('secret')`)).rows?.length === 0, 'free text does not search email')
  r = await as(A, `select id, total_count from public.search_members(p_limit => 1, p_offset => 1)`)
  ok(r.rows?.length === 1 && Number(r.rows[0].total_count) === 4, 'pages with a total')
  ok(!!(await as(A, `select * from public.search_members(repeat('x', 201))`)).error, 'overlong searches are refused')

  // Facets hide values shared by fewer than three members.
  r = await as(A, `select * from public.member_directory_facets()`)
  const has = (kind, value) => r.rows?.some(f => f.kind === kind && f.value.toLowerCase() === value.toLowerCase())
  ok(has('industry', 'logistics') && r.rows.find(f => f.kind === 'industry').members === 3, 'an industry three members share is offered with its count')
  ok(!has('industry', 'fintech') && !has('industry', 'saas'), 'industries fewer than three share are hidden')
  ok(has('location', 'austin, tx') && !has('location', 'denver, co'), 'locations below three are hidden')
  ok(has('expertise', 'pricing') && !has('expertise', 'hiring'), 'expertise below three is hidden')

  // Private profiles are left out of search and facets.
  await svc(`update public.profiles set visibility = 'private' where id = '${C}'`)
  ok(!(await as(A, `select id from public.search_members()`)).rows?.some(x => x.id === C), 'private profiles never appear in search')
  ok(!(await as(A, `select id from public.search_members('cy cole')`)).rows?.length, 'not even by name')
  r = await as(A, `select * from public.member_directory_facets()`)
  ok(!has('industry', 'logistics') && !has('location', 'austin, tx'), 'and no longer count toward facets')

  // Unfinished or unapproved profiles are not listed.
  await svc(`update public.early_access_members set status = 'pending' where user_id = '${ADMIN}'`)
  ok(!(await as(A, `select id from public.search_members()`)).rows?.some(x => x.id === ADMIN), 'unapproved members are not listed')

  // Non-members and visitors.
  ok(!!(await as(D, `select * from public.search_members()`)).error, 'accounts without a membership cannot search')
  ok(((await as(D, `select * from public.member_directory_facets()`)).rows ?? []).length === 0, 'and get no facets')
  ok(!!(await as(null, `select * from public.search_members()`)).error, 'visitors cannot search')
  ok(!!(await as(null, `select * from public.member_directory_facets()`)).error, 'visitors cannot read facets')
}
