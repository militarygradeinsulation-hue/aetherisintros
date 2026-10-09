// 0044 peer groups: confidential groups, agreement gate, sessions, board, issue processing
export default async ({ ok, as, svc, A, B, C, ADMIN }) => {
  // Groups are created and staffed by admins only.
  ok(!!(await as(A, `insert into public.peer_groups (name) values ('My own forum')`)).error, 'members cannot create groups')
  let r = await as(ADMIN, `insert into public.peer_groups (name, description, cadence, facilitator_id, max_size) values ('Forum One', 'Founders past $10M', 'First Tuesday, monthly', $1, 3) returning id`, [A])
  ok(!r.error && r.rows?.length === 1, 'admins create a group with a facilitator')
  const G = r.rows?.[0]?.id
  ok((await svc(`select user_id from public.peer_group_members where group_id = '${G}'`)).map(x => x.user_id).join() === A, 'the facilitator is added as a member')
  ok((await svc(`select count(*)::int n from public.notifications where user_id = '${A}' and kind = 'peer_group_added'`))[0].n === 1, 'and is told')
  ok(!!(await as(ADMIN, `insert into public.peer_groups (name, max_size) values ('Too big', 17)`)).error, 'groups hold at most 16')

  ok(!!(await as(A, `insert into public.peer_group_members (group_id, user_id) values ($1, $2)`, [G, C])).error, 'members (even the facilitator) cannot add members')
  ok(!(await as(ADMIN, `insert into public.peer_group_members (group_id, user_id) values ($1, $2)`, [G, B])).error, 'admins add members')
  ok((await svc(`select count(*)::int n from public.notifications where user_id = '${B}' and kind = 'peer_group_added'`))[0].n === 1, 'the added member is notified')

  // Max size: Forum One holds 3. Add a third member, then a fourth fails.
  const D = '00000000-0000-4000-8000-00000000000d'
  await svc(`insert into auth.users (id) values ('${D}')`)
  await svc(`insert into public.profiles (id, name) values ('${D}', 'Dee')`)
  ok(!(await as(ADMIN, `insert into public.peer_group_members (group_id, user_id) values ($1, $2)`, [G, D])).error, 'admins fill the group to its size')
  r = await as(ADMIN, `insert into public.peer_group_members (group_id, user_id) values ($1, $2)`, [G, C])
  ok(!!r.error && /full/.test(r.error), 'a full group refuses another member')
  ok(!!(await as(ADMIN, `update public.peer_groups set max_size = 2 where id = $1`, [G])).error, 'a group cannot shrink below its membership')
  ok(!!(await as(A, `update public.peer_groups set max_size = 16 where id = $1`, [G])).error || (await svc(`select max_size from public.peer_groups where id = '${G}'`))[0].max_size === 3, 'members cannot change the group')
  ok(!(await as(ADMIN, `delete from public.peer_group_members where group_id = $1 and user_id = $2`, [G, D])).error, 'admins remove members')
  ok((await svc(`select count(*)::int n from public.peer_group_members where group_id = '${G}'`))[0].n === 2, 'the member is gone')

  // Visibility of the group itself.
  ok((await as(B, `select name from public.peer_groups`)).rows?.map(x => x.name).join() === 'Forum One', 'members see the groups they belong to')
  ok((await as(C, `select id from public.peer_groups`)).rows?.length === 0, 'outsiders do not see the group exists')
  ok((await as(C, `select user_id from public.peer_group_members`)).rows?.length === 0, 'outsiders do not see the roster')
  ok((await as(B, `select user_id from public.peer_group_members`)).rows?.length === 2, 'members see the roster')
  ok((await as(null, `select id from public.peer_groups`)).error !== undefined, 'visitors see nothing')

  // Agreement gate: A (facilitator) accepts; B has not yet.
  ok(!(await as(A, `select public.accept_peer_group_agreement($1)`, [G])).error, 'a member accepts the confidentiality agreement')
  ok(!!(await as(C, `select public.accept_peer_group_agreement($1)`, [G])).error, 'outsiders cannot accept it')
  ok(!!(await as(B, `update public.peer_group_members set agreement_accepted_at = now()`)).error, 'the agreement is accepted only through the RPC')

  // Sessions: the facilitator or an admin schedules; other members cannot.
  ok(!!(await as(B, `insert into public.peer_group_sessions (group_id, starts_at) values ($1, '2026-11-03T17:00:00Z')`, [G])).error, 'ordinary members cannot schedule sessions')
  ok(!(await as(A, `insert into public.peer_group_sessions (group_id, starts_at, agenda, meeting_url) values ($1, '2026-11-03T17:00:00Z', 'Updates, then one issue', '/app')`, [G])).error, 'the facilitator schedules a session')
  ok(!!(await as(A, `insert into public.peer_group_sessions (group_id, starts_at, meeting_url) values ($1, now(), 'javascript:alert(1)')`, [G])).error, 'meeting links must be web links')
  ok((await svc(`select count(*)::int n from public.notifications where user_id = '${B}' and kind = 'peer_group_session'`))[0].n === 1, 'members are told about a new session')
  ok((await as(B, `select id from public.peer_group_sessions`)).rows?.length === 0, 'a member who has not accepted the agreement sees no sessions')
  ok((await as(ADMIN, `select id from public.peer_group_sessions`)).rows?.length === 1, 'admins see sessions to manage them')
  ok((await as(C, `select id from public.peer_group_sessions`)).rows?.length === 0, 'outsiders see no sessions')

  // Discussion board.
  r = await as(A, `insert into public.peer_group_posts (group_id, body) values ($1, 'Who has moved a CFO into a COO role?') returning id`, [G])
  ok(!r.error, 'an agreed member posts')
  const P = r.rows?.[0]?.id
  ok(!!(await as(B, `insert into public.peer_group_posts (group_id, body) values ($1, 'hello')`, [G])).error, 'a member without the agreement cannot post')
  ok((await as(B, `select id from public.peer_group_posts`)).rows?.length === 0, 'a member without the agreement sees no posts')
  ok((await as(C, `select count(*)::int n from public.peer_group_posts`)).rows?.[0]?.n === 0, 'outsiders cannot even count posts')
  ok((await as(ADMIN, `select id from public.peer_group_posts`)).rows?.length === 0, 'admins outside the group do not read the board')
  ok(!!(await as(C, `insert into public.peer_group_posts (group_id, body) values ($1, 'hi')`, [G])).error, 'outsiders cannot post')
  ok(!!(await as(C, `insert into public.peer_group_posts (group_id, parent_id, body) values ($1, $2, 'hi')`, [G, P])).error, 'outsiders cannot reply')

  ok(!(await as(B, `select public.accept_peer_group_agreement($1)`, [G])).error, 'B accepts the agreement')
  ok((await as(B, `select id from public.peer_group_posts`)).rows?.length === 1, 'and then sees the board')
  ok((await as(B, `select id from public.peer_group_sessions`)).rows?.length === 1, 'and the sessions')
  r = await as(B, `insert into public.peer_group_posts (group_id, parent_id, body) values ($1, $2, 'I did, happy to talk') returning id, group_id`, [G, P])
  ok(!r.error && r.rows?.[0]?.group_id === G, 'members reply to a post')
  ok(!!(await as(A, `insert into public.peer_group_posts (group_id, parent_id, body) values ($1, $2, 'nested')`, [G, r.rows?.[0]?.id])).error, 'replies stay one level deep')
  ok((await as(B, `update public.peer_group_posts set body = 'edited' where id = $1 returning id`, [P])).rows?.length === 0, 'only the author edits a post')
  ok((await as(B, `delete from public.peer_group_posts where id = $1 returning id`, [P])).rows?.length === 0, 'only the author deletes a post')
  ok((await as(A, `update public.peer_group_posts set body = 'Who has moved a CFO into a COO role? (edited)' where id = $1 returning id`, [P])).rows?.length === 1, 'the author edits their post')
  ok(!!(await as(A, `update public.peer_group_posts set author_id = $2 where id = $1`, [P, B])).error, 'authorship cannot be changed')
  ok(!!(await as(A, `update public.peer_group_posts set group_id = gen_random_uuid() where id = $1`, [P])).error, 'posts cannot be moved to another group')

  // Issue processing.
  r = await as(B, `insert into public.peer_group_issues (group_id, title, context, help_needed) values ($1, 'Co-founder wants out', 'We split 50/50 in 2019.', 'How to structure a buyout') returning id`, [G])
  ok(!r.error, 'a member brings an issue')
  const I = r.rows?.[0]?.id
  ok((await svc(`select count(*)::int n from public.notifications where user_id = '${A}' and kind = 'peer_group_issue'`))[0].n === 1, 'the group is told a new issue was posted')
  ok(!(await svc(`select text from public.notifications where kind = 'peer_group_issue'`))[0].text.includes('Co-founder'), 'the notification does not reveal the issue')
  ok(!(await as(A, `insert into public.peer_group_perspectives (issue_id, body) values ($1, 'Get a valuation first.')`, [I])).error, 'others add perspectives')
  ok(!!(await as(C, `insert into public.peer_group_perspectives (issue_id, body) values ($1, 'x')`, [I])).error, 'outsiders cannot add perspectives')
  ok((await as(C, `select id from public.peer_group_issues`)).rows?.length === 0 && (await as(C, `select id from public.peer_group_perspectives`)).rows?.length === 0, 'outsiders see no issues or perspectives')
  ok((await as(A, `update public.peer_group_issues set status = 'resolved', outcome = 'Agreed a buyout' where id = $1 returning id`, [I])).rows?.length === 0, 'only the owner resolves an issue')
  ok(!!(await as(B, `update public.peer_group_issues set status = 'resolved' where id = $1`, [I])).error, 'resolving needs an outcome note')
  r = await as(B, `update public.peer_group_issues set status = 'resolved', outcome = 'Agreed a staged buyout over 3 years.' where id = $1 returning resolved_at`, [I])
  ok(!r.error && !!r.rows?.[0]?.resolved_at, 'the owner marks it resolved with an outcome')

  // Leaving and removal.
  ok((await as(B, `delete from public.peer_group_members where group_id = $1 and user_id = $2 returning user_id`, [G, A])).rows?.length === 0, 'members cannot remove each other')
  ok((await as(ADMIN, `delete from public.peer_group_members where group_id = $1 and user_id = $2 returning user_id`, [G, A])).rows?.length === 1, 'admins remove a member')
  ok((await svc(`select facilitator_id from public.peer_groups where id = '${G}'`))[0].facilitator_id === null, 'a removed facilitator stops facilitating')
  ok((await as(A, `select id from public.peer_group_posts`)).rows?.length === 0 && (await as(A, `select id from public.peer_groups`)).rows?.length === 0, 'a removed member sees nothing any more')

  // Join requests.
  ok(!(await as(C, `insert into public.peer_group_requests (note) values ('I run a 40-person agency and want a forum.')`)).error, 'any member asks to join a peer group')
  ok(!!(await as(C, `insert into public.peer_group_requests (note) values ('Asking a second time, please.')`)).error, 'one open request at a time')
  ok(!!(await as(C, `insert into public.peer_group_requests (note) values ('short')`)).error, 'requests need a short note')
  ok((await as(A, `select id from public.peer_group_requests`)).rows?.length === 0, "members do not see others' requests")
  r = await as(ADMIN, `select id from public.peer_group_requests`)
  ok(r.rows?.length === 1, 'admins see requests')
  const REQ = r.rows?.[0]?.id
  ok(!!(await as(C, `select public.admin_decide_peer_group_request($1, true, $2)`, [REQ, G])).error, 'members cannot accept requests')
  ok(!(await as(ADMIN, `select public.admin_decide_peer_group_request($1, true, $2)`, [REQ, G])).error, 'admins accept a request into a group')
  ok((await as(C, `select name from public.peer_groups`)).rows?.length === 1, 'the requester is now in the group')
  ok((await as(C, `select id from public.peer_group_posts`)).rows?.length === 0, 'but sees no posts until accepting the agreement')
  ok(!!(await as(ADMIN, `select public.admin_decide_peer_group_request($1, false)`, [REQ])).error, 'a decided request cannot be decided again')
  await as(A, `insert into public.peer_group_requests (note) values ('Back again, would like a group.')`)
  const REQ2 = (await svc(`select id from public.peer_group_requests where user_id = '${A}'`))[0].id
  ok(!(await as(ADMIN, `select public.admin_decide_peer_group_request($1, false)`, [REQ2])).error, 'admins decline a request')
  ok((await svc(`select count(*)::int n from public.notifications where user_id = '${A}' and kind = 'peer_group_request'`))[0].n === 1, 'the member is told')

  ok(!(await as(ADMIN, `delete from public.peer_groups where id = $1`, [G])).error, 'admins delete a group')
  ok((await svc(`select count(*)::int n from public.peer_group_posts`))[0].n === 0, 'and its content goes with it')
}
