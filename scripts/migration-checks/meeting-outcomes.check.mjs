// 0032 meetings from introductions: agenda, intro-only invites, "met" recorded when both join
export default async ({ ok, as, svc, A, B, C }) => {
  // Seed: C asked to meet B and both accepted (intro 1111…), from before 0022.
  const intro = '11111111-1111-4111-8111-111111111111'
  await svc(`delete from public.intro_outcomes where intro_request_id = '${intro}'`)

  ok(!!(await as(A, `select public.create_meeting('Crash', '{}'::uuid[], null, '', $1)`, [intro])).error, 'an outsider cannot start a meeting from someone else’s introduction')
  const pending = (await svc(`insert into public.intro_requests (user_id, member_id) values ('${A}', '${B}') on conflict (user_id, member_id) do update set reason = excluded.reason returning id`))[0].id
  ok(!!(await as(A, `select public.create_meeting('Too soon', '{}'::uuid[], null, '', $1)`, [pending])).error, 'no meeting from an introduction that is not accepted yet')

  let r = await as(C, `select public.create_meeting('First conversation', '{}'::uuid[], null, 'Why: CFO search. Goal: agree next step.', $1) as id`, [intro])
  const m = r.rows[0].id
  r = await svc(`select agenda, intro_request_id from public.meetings where id = '${m}'`)
  ok(r[0].agenda.startsWith('Why: CFO search') && r[0].intro_request_id === intro, 'the meeting carries the agenda and the introduction')
  r = await svc(`select user_id from public.meeting_participants where meeting_id = '${m}' order by role desc`)
  ok(r.length === 2 && r[1].user_id === B, 'the other person from the introduction is invited automatically')

  await as(C, `select public.mark_meeting_joined($1)`, [m])
  ok((await svc(`select count(*)::int n from public.intro_outcomes where intro_request_id = '${intro}'`))[0].n === 0, 'one person joining alone records nothing')
  await as(B, `select public.mark_meeting_joined($1)`, [m])
  r = await svc(`select author_id, stage from public.intro_outcomes where intro_request_id = '${intro}' order by author_id`)
  ok(r.length === 2 && r.every(o => o.stage === 'met') && r.map(o => o.author_id).sort().join() === [B, C].sort().join(), 'when both join, each gets a "met" outcome')
  await as(B, `select public.mark_meeting_joined($1)`, [m])
  ok((await svc(`select count(*)::int n from public.intro_outcomes where intro_request_id = '${intro}'`))[0].n === 2, 'rejoining does not duplicate the record')
  r = await as(C, `select stage from public.intro_outcomes where intro_request_id = $1 and author_id = $2`, [intro, C])
  ok(r.rows.length === 1, 'each person can read their own recorded outcome')

  // A later meeting does not overwrite progress already recorded.
  await svc(`delete from public.intro_outcomes where intro_request_id = '${intro}' and author_id = '${B}'`)
  await svc(`insert into public.intro_outcomes (intro_request_id, author_id, stage, outcome_category) values ('${intro}', '${B}', 'outcome', 'hire')`)
  const m2 = (await as(B, `select public.create_meeting('Check-in', '{}'::uuid[], null, '', $1) as id`, [intro])).rows[0].id
  await as(B, `select public.mark_meeting_joined($1)`, [m2]); await as(C, `select public.mark_meeting_joined($1)`, [m2])
  r = await svc(`select stage from public.intro_outcomes where intro_request_id = '${intro}' and author_id = '${B}'`)
  ok(r.length === 1 && r[0].stage === 'outcome', 'a later meeting adds nothing once someone recorded a further stage')

  const plain = (await as(A, `select public.create_meeting('Plain', array['${B}']::uuid[]) as id`)).rows[0].id
  await as(A, `select public.mark_meeting_joined($1)`, [plain]); await as(B, `select public.mark_meeting_joined($1)`, [plain])
  ok((await svc(`select count(*)::int n from public.intro_outcomes o join public.intro_requests r on r.id = o.intro_request_id where r.user_id = '${A}'`))[0].n === 0, 'meetings not started from an introduction record no outcomes')
  const long = (await as(A, `select public.create_meeting('Long', '{}'::uuid[], null, repeat('x', 2500), null) as id`)).rows[0].id
  ok((await svc(`select char_length(agenda) n from public.meetings where id = '${long}'`))[0].n === 2000, 'long agendas are trimmed to 2,000 characters')

  await svc(`delete from public.intro_outcomes where intro_request_id = '${intro}'`)
  await svc(`delete from public.intro_requests where id = '${pending}'`)
}
