// 0046 peer group agendas: AI-generated discussion questions and member commitment tracking
export default async ({ ok, as, svc, A, B, C, ADMIN }) => {
  // Create a group with A as facilitator so we have a real group to test against.
  let r = await as(ADMIN, `insert into public.peer_groups (name, description, cadence, facilitator_id, max_size) values ('Agenda Test Group', 'Testing agendas', 'Monthly', $1, 6) returning id`, [A])
  ok(!r.error && r.rows?.length === 1, 'admins create a group for agenda testing')
  const G = r.rows?.[0]?.id

  // Add B as a member and have both accept the agreement.
  ok(!(await as(ADMIN, `insert into public.peer_group_members (group_id, user_id) values ($1, $2)`, [G, B])).error, 'admins add B to the group')
  ok(!(await as(A, `select public.accept_peer_group_agreement($1)`, [G])).error, 'A accepts the agreement')
  ok(!(await as(B, `select public.accept_peer_group_agreement($1)`, [G])).error, 'B accepts the agreement')

  // ── peer_group_agendas ────────────────────────────────────────────────────────
  // Only the facilitator (A) can insert an agenda.
  ok(!!(await as(B, `insert into public.peer_group_agendas (group_id, session_number, focus_theme, discussion_questions) values ($1, 1, 'Q4 planning', '["What is your biggest lever?"]') returning id`, [G])).error, 'non-facilitator members cannot create agendas')
  ok(!!(await as(C, `insert into public.peer_group_agendas (group_id, session_number, focus_theme, discussion_questions) values ($1, 1, 'Q4 planning', '["What is your biggest lever?"]') returning id`, [G])).error, 'outsiders cannot create agendas')

  r = await as(A, `insert into public.peer_group_agendas (group_id, session_number, focus_theme, discussion_questions) values ($1, 1, 'Q4 planning', '["What is your biggest lever?","What would you stop doing?"]') returning id`, [G])
  ok(!r.error && r.rows?.length === 1, 'the facilitator creates an agenda')
  const AG = r.rows?.[0]?.id

  // Agreed members read agendas; outsiders cannot.
  ok((await as(A, `select id from public.peer_group_agendas where group_id = $1`, [G])).rows?.length === 1, 'facilitator reads agendas')
  ok((await as(B, `select id from public.peer_group_agendas where group_id = $1`, [G])).rows?.length === 1, 'agreed member reads agendas')
  ok((await as(C, `select id from public.peer_group_agendas where group_id = $1`, [G])).rows?.length === 0, 'outsiders see no agendas')

  // discussion_questions is valid jsonb.
  r = await svc(`select discussion_questions from public.peer_group_agendas where id = '${AG}'`)
  ok(Array.isArray(r[0]?.discussion_questions) && r[0]?.discussion_questions.length === 2, 'discussion questions stored as jsonb array')

  // ── peer_group_commitments ────────────────────────────────────────────────────
  // Members add their own commitments.
  ok(!!(await as(C, `insert into public.peer_group_commitments (group_id, commitment) values ($1, 'Hire a VP Sales')`, [G])).error, 'outsiders cannot add commitments')

  r = await as(A, `insert into public.peer_group_commitments (group_id, commitment, due_date, session_number) values ($1, 'Close Series A term sheet', '2026-12-31', 1) returning id, user_id, status`, [G])
  ok(!r.error && r.rows?.length === 1, 'A adds a commitment')
  ok(r.rows?.[0]?.user_id === A, 'user_id is set to the caller by the trigger')
  ok(r.rows?.[0]?.status === 'active', 'commitment starts active')
  const COM_A = r.rows?.[0]?.id

  r = await as(B, `insert into public.peer_group_commitments (group_id, commitment) values ($1, 'Finish Q4 roadmap') returning id`, [G])
  ok(!r.error, 'B adds a commitment')
  const COM_B = r.rows?.[0]?.id

  // Both agreed members see all commitments.
  ok((await as(A, `select id from public.peer_group_commitments where group_id = $1`, [G])).rows?.length === 2, 'agreed members see all group commitments')
  ok((await as(C, `select id from public.peer_group_commitments where group_id = $1`, [G])).rows?.length === 0, 'outsiders see no commitments')

  // Members can only update their own.
  r = await as(B, `update public.peer_group_commitments set status = 'completed' where id = $1 returning id`, [COM_A])
  ok(r.rows?.length === 0, 'B cannot complete A\'s commitment')

  r = await as(A, `update public.peer_group_commitments set status = 'completed' where id = $1 returning id, completed_at`, [COM_A])
  ok(!r.error && r.rows?.length === 1, 'A completes their own commitment')
  ok(!!r.rows?.[0]?.completed_at, 'completed_at is set by the trigger')

  r = await as(A, `update public.peer_group_commitments set status = 'active' where id = $1 returning completed_at`, [COM_A])
  ok(r.rows?.[0]?.completed_at === null, 'reverting to active clears completed_at')

  ok(!!(await as(B, `delete from public.peer_group_commitments where id = $1`, [COM_A])).error || (await svc(`select id from public.peer_group_commitments where id = '${COM_A}'`)).length === 1, 'B cannot delete A\'s commitment')
  ok(!(await as(B, `delete from public.peer_group_commitments where id = $1`, [COM_B])).error, 'B deletes their own commitment')
  ok((await svc(`select id from public.peer_group_commitments where id = '${COM_B}'`)).length === 0, 'commitment is gone')

  // status check constraint.
  ok(!!(await as(A, `update public.peer_group_commitments set status = 'unknown' where id = $1`, [COM_A])).error, 'invalid status is rejected')

  // Cascade on group delete.
  ok(!(await as(ADMIN, `delete from public.peer_groups where id = $1`, [G])).error, 'admins delete the group')
  ok((await svc(`select id from public.peer_group_agendas where group_id = '${G}'`)).length === 0, 'agendas cascade-deleted')
  ok((await svc(`select id from public.peer_group_commitments where group_id = '${G}'`)).length === 0, 'commitments cascade-deleted')
}
