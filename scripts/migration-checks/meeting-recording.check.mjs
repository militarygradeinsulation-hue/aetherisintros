// 0039 meeting recording state and in-call invites
export default async ({ ok, as, svc, A, B, C }) => {
  await svc(`update public.profiles set name = 'Ana' where id = '${A}'`)
  const D = '00000000-0000-4000-8000-0000000000dd'
  const E = '00000000-0000-4000-8000-0000000000de'
  for (const id of [D, E]) {
    await svc(`insert into auth.users (id) values ('${id}') on conflict do nothing`)
    await svc(`insert into public.profiles (id, name) values ('${id}', 'Extra') on conflict (id) do nothing`)
  }
  const m = (await as(A, `select public.create_meeting('Quick call', '{}'::uuid[]) as id`)).rows[0].id

  // Invites from inside the call.
  ok(!!(await as(B, `select public.invite_to_meeting($1, $2)`, [m, C])).error, 'only the host invites')
  ok(!(await as(A, `select public.invite_to_meeting($1, $2)`, [m, B])).error, 'the host invites a member')
  ok(!(await as(A, `select public.invite_to_meeting($1, $2)`, [m, B])).error, 'inviting twice is harmless')
  let r = await svc(`select count(*)::int n from public.meeting_participants where meeting_id = '${m}' and user_id = '${B}'`)
  ok(r[0].n === 1, 'the member is in the roster once')
  r = await svc(`select text from public.notifications where user_id = '${B}' and kind = 'meeting_invite'`)
  ok(r.length === 1 && r[0].text.startsWith('Ana invited you to a meeting'), 'the invitee is notified')
  ok(!!(await as(A, `select public.invite_to_meeting($1, $2)`, [m, '00000000-0000-4000-8000-00000000ffff'])).error, 'unknown people cannot be invited')
  await as(A, `select public.invite_to_meeting($1, $2)`, [m, C])
  await as(A, `select public.invite_to_meeting($1, $2)`, [m, D])
  ok(!!(await as(A, `select public.invite_to_meeting($1, $2)`, [m, E])).error, 'still at most four people')

  // Recording.
  ok(!!(await as(E, `select public.set_meeting_recording($1, true)`, [m])).error, 'outsiders cannot start recording')
  ok(!(await as(B, `select public.set_meeting_recording($1, true)`, [m])).error, 'any participant can start recording')
  r = await svc(`select recording_started_at is not null as on, recording_started_by from public.meetings where id = '${m}'`)
  ok(r[0].on && r[0].recording_started_by === B, 'the meeting shows who started recording')
  r = await svc(`select user_id, notes_consent from public.meeting_participants where meeting_id = '${m}' order by user_id`)
  ok(r.filter(p => p.notes_consent).map(p => p.user_id).join() === B, 'only the person who pressed Record is transcribed until others agree')
  ok(!!(await as(C, `insert into public.meeting_transcript_lines (meeting_id, text) values ($1, 'hi')`, [m])).error, 'others are not recorded without agreeing')
  ok(!(await as(C, `select public.set_meeting_notes_consent($1, true)`, [m])).error, 'others agree for themselves')
  ok(!(await as(C, `insert into public.meeting_transcript_lines (meeting_id, text) values ($1, 'hi')`, [m])).error, 'and are then transcribed')
  ok(!!(await as(C, `select public.set_meeting_recording($1, false)`, [m])).error, 'a guest who did not start it cannot stop it for everyone')
  ok(!(await as(A, `select public.set_meeting_recording($1, false)`, [m])).error, 'the host can stop it')
  r = await svc(`select (select recording_started_at from public.meetings where id = '${m}') is null as off, (select count(*)::int from public.meeting_participants where meeting_id = '${m}' and notes_consent) as consenting`)
  ok(r[0].off && r[0].consenting === 0, 'stopping turns note taking off for everyone')
  await as(B, `select public.set_meeting_recording($1, true)`, [m])
  ok(!(await as(B, `select public.set_meeting_recording($1, false)`, [m])).error, 'the person who started it can stop it')

  await as(A, `select public.set_meeting_recording($1, true)`, [m])
  await as(A, `select public.end_meeting($1)`, [m])
  r = await svc(`select recording_started_at is null as off from public.meetings where id = '${m}'`)
  ok(r[0].off, 'ending the meeting stops recording')
  ok(!!(await as(A, `select public.set_meeting_recording($1, true)`, [m])).error, 'an ended meeting cannot be recorded')
  ok(!!(await as(A, `select public.invite_to_meeting($1, $2)`, [m, E])).error, 'or have people added')
}
