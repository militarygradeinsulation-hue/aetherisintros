// 0063 syndication rooms: private group rooms for co-invest, co-sponsor, co-refer decisions;
// members vote In/Out/Need More Info with notes, discuss in a thread, and see a decision summary.
export default async ({ ok, as, svc, A, B, C, ADMIN }) => {
  // Only authenticated users can create a room.
  ok(!!(await as(null, `insert into public.syndication_rooms (created_by, title) values ('${A}', 'Anon room')`)).error, 'visitors cannot create a room')

  // A creates a room and invites B.
  let r = await as(A, `insert into public.syndication_rooms (created_by, title, room_type, description, opportunity_size) values ('${A}', 'Series B co-invest', 'co-invest', 'Fintech SaaS, $8M round at $40M post', '$500k each') returning id`)
  ok(!r.error && r.rows?.length === 1, 'a member creates a room')
  const RID = r.rows?.[0]?.id

  // Creator is also added as a member so they can vote.
  r = await as(A, `insert into public.syndication_members (room_id, user_id) values ('${RID}', '${A}') returning id`)
  ok(!r.error, 'creator adds themselves as a member')
  r = await as(A, `insert into public.syndication_members (room_id, user_id) values ('${RID}', '${B}') returning id`)
  ok(!r.error, 'creator invites another member')

  // Privacy: outsiders cannot see the room.
  ok((await as(C, `select id from public.syndication_rooms`)).rows?.length === 0, 'outsiders cannot see the room')
  ok((await as(C, `select id from public.syndication_members`)).rows?.length === 0, 'outsiders cannot see members')
  ok((await as(null, `select id from public.syndication_rooms`)).error !== undefined, 'visitors see nothing')

  // Members see the room.
  ok((await as(A, `select id from public.syndication_rooms`)).rows?.length === 1, 'creator sees the room')
  ok((await as(B, `select id from public.syndication_rooms`)).rows?.length === 1, 'invited member sees the room')
  ok((await as(A, `select user_id from public.syndication_members where room_id = '${RID}'`)).rows?.length === 2, 'creator sees the member list')

  // Voting: each member casts their vote.
  r = await as(A, `update public.syndication_members set vote = 'in', vote_note = 'Strong team', voted_at = now() where room_id = '${RID}' and user_id = '${A}' returning vote`)
  ok(!r.error && r.rows?.[0]?.vote === 'in', 'a member votes in')
  r = await as(B, `update public.syndication_members set vote = 'need_more_info', vote_note = 'Need cap table', voted_at = now() where room_id = '${RID}' and user_id = '${B}' returning vote`)
  ok(!r.error && r.rows?.[0]?.vote === 'need_more_info', 'another member votes need more info')

  // Members cannot change each other's votes.
  ok((await as(A, `update public.syndication_members set vote = 'out' where room_id = '${RID}' and user_id = '${B}' returning id`)).rows?.length === 0, 'a member cannot change another member\'s vote')

  // Vote constraint: invalid vote value is rejected.
  ok(!!(await as(A, `update public.syndication_members set vote = 'maybe' where room_id = '${RID}' and user_id = '${A}'`)).error, 'invalid vote values are rejected')

  // Discussion thread.
  r = await as(A, `insert into public.syndication_messages (room_id, user_id, body) values ('${RID}', '${A}', 'I reviewed the deck — team is excellent.') returning id`)
  ok(!r.error, 'a member posts a message')
  r = await as(B, `insert into public.syndication_messages (room_id, user_id, body) values ('${RID}', '${B}', 'Can we get the cap table before deciding?') returning id`)
  ok(!r.error, 'another member replies')

  // Outsiders cannot post or read messages.
  ok(!!(await as(C, `insert into public.syndication_messages (room_id, user_id, body) values ('${RID}', '${C}', 'Sneaky message')`)).error, 'outsiders cannot post messages')
  ok((await as(C, `select id from public.syndication_messages`)).rows?.length === 0, 'outsiders cannot read messages')
  ok((await as(null, `select id from public.syndication_messages`)).error !== undefined, 'visitors see no messages')

  // Members can read all messages in their room.
  ok((await as(A, `select id from public.syndication_messages where room_id = '${RID}'`)).rows?.length === 2, 'members read all messages')
  ok((await as(B, `select id from public.syndication_messages where room_id = '${RID}'`)).rows?.length === 2, 'all members read all messages')

  // Message authorship: user_id must match auth.uid().
  ok(!!(await as(A, `insert into public.syndication_messages (room_id, user_id, body) values ('${RID}', '${B}', 'Forged')`)).error, 'cannot post as another user')

  // Room status transitions.
  r = await as(A, `update public.syndication_rooms set status = 'decided', decision = 'Going in — all committed $500k' where id = '${RID}' returning status`)
  ok(!r.error && r.rows?.[0]?.status === 'decided', 'creator updates room to decided with a decision summary')

  // Room type constraint.
  ok(!!(await as(A, `insert into public.syndication_rooms (created_by, title, room_type) values ('${A}', 'Bad type', 'invalid_type')`)).error, 'invalid room types are rejected')

  // Status constraint.
  ok(!!(await as(A, `update public.syndication_rooms set status = 'unknown' where id = '${RID}'`)).error, 'invalid status values are rejected')

  // Duplicate member is rejected.
  ok(!!(await as(A, `insert into public.syndication_members (room_id, user_id) values ('${RID}', '${A}')`)).error, 'duplicate membership is rejected')

  // Cascading deletes: deleting the room removes members and messages.
  ok(!(await as(A, `delete from public.syndication_rooms where id = '${RID}' and created_by = '${A}'`)).error, 'creator can delete the room')
  ok((await svc(`select count(*)::int n from public.syndication_members where room_id = '${RID}'`))[0].n === 0, 'members are removed on room delete')
  ok((await svc(`select count(*)::int n from public.syndication_messages where room_id = '${RID}'`))[0].n === 0, 'messages are removed on room delete')
}
