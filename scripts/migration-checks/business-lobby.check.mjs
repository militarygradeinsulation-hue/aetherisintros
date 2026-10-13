// 0082: no passive presence; approved accepted connections must request a call,
// recipient alone can accept; existing meeting/outcome engine is reused.
export default async ({ ok, as, svc, A, B, C }) => {
  await svc(`insert into public.early_access_members(user_id,email,status) values
    ('${A}','lobby-a@example.test','approved'),
    ('${B}','lobby-b@example.test','approved'),
    ('${C}','lobby-c@example.test','pending')
    on conflict(user_id) do update set status=excluded.status`)
  const intro = (await svc(`insert into public.intro_requests
    (user_id,member_id,target_user_id,requester_opt_in,member_opt_in,status)
    values('${A}','${B}','${B}',true,true,'accepted')
    on conflict(user_id,member_id) do update set
      member_opt_in=true, requester_opt_in=true, status='accepted'
    returning id`))[0].id

  let r = await as(A, 'select * from public.my_business_lobby_contacts()')
  ok(!r.error && r.rows.length === 0, 'lobby is closed by default')
  r = await as(null, `select public.set_business_lobby(30,'Interested in projects')`)
  ok(!!r.error, 'anonymous callers cannot enable availability')
  r = await as(C, `select public.set_business_lobby(30,'Interested in projects')`)
  ok(!!r.error, 'pending members cannot enable availability')
  r = await as(B, `select public.set_business_lobby(30,'Partnership discussions') as until`)
  ok(!r.error && r.rows?.[0]?.until, 'approved member enables a short-lived opt-in lobby')
  r = await as(A, 'select * from public.my_business_lobby_contacts()')
  ok(!r.error && r.rows.some(x => x.intro_request_id === intro && x.other_id === B &&
    x.other_name && x.headline === 'Partnership discussions'),
    'accepted counterpart sees opt-in availability and the authorized name')
  r = await as(C, 'select * from public.my_business_lobby_contacts()')
  ok(!!r.error || r.rows.length === 0, 'unapproved counterpart cannot enumerate presence')
  r = await as(A, 'select * from public.business_lobby_windows')
  ok(!r.error && r.rows.length === 0, 'lobby database presence remains owner-only')
  r = await as(A, `select public.knock_business_lobby('${intro}','Can we talk about the project?') as id`)
  const knock = r.rows?.[0]?.id
  ok(!r.error && knock, 'approved accepted counterpart sends a knock without starting a call')
  r = await svc(`select status,meeting_id from public.business_lobby_knocks where id='${knock}'`)
  ok(r[0].status === 'pending' && r[0].meeting_id === null, 'knock never auto-starts a meeting')
  r = await as(A, `select public.knock_business_lobby('${intro}','Can we talk about the project?') as id`)
  ok(!r.error && r.rows?.[0]?.id === knock, 'duplicate knocks are idempotent')
  r = await as(C, `select id from public.business_lobby_knocks where id='${knock}'`)
  ok(!r.error && r.rows.length === 0, 'outsider cannot read private knock')
  r = await as(A, `select public.answer_business_lobby('${knock}',true)`)
  ok(!!r.error, 'requester cannot accept their own knock')
  r = await as(C, `select public.answer_business_lobby('${knock}',true)`)
  ok(!!r.error, 'outsider cannot accept someone else’s knock')

  r = await as(B, `select public.answer_business_lobby('${knock}',true) as id`)
  const meeting = r.rows?.[0]?.id
  ok(!r.error && meeting, 'only recipient accepts and creates authorized meeting')
  const roster = await svc(`select user_id,notes_consent from public.meeting_participants where meeting_id='${meeting}'`)
  ok(roster.length === 2 && roster.every(x => x.notes_consent === false) &&
    roster.map(x => x.user_id).sort().join() === [A,B].sort().join(),
    'existing meeting engine invites both people with recording disabled by default')
  const link = (await svc(`select intro_request_id from public.meetings where id='${meeting}'`))[0]
  ok(link.intro_request_id === intro, 'meeting preserves original intro for outcomes')
  r = await as(B, `select public.answer_business_lobby('${knock}',true)`)
  ok(!!r.error, 'cannot approve same knock twice and create duplicate rooms')

  await as(B, 'select public.set_business_lobby(0)')
  r = await as(A, 'select * from public.my_business_lobby_contacts()')
  ok(!r.error && r.rows.length === 0, 'closing availability removes presence immediately')
  r = await as(A, `select public.knock_business_lobby('${intro}','Second attempt')`)
  ok(!!r.error, 'closed lobby cannot receive a new knock')
  r = await as(B, 'select public.set_business_lobby(120)')
  ok(!r.error, 'approved member can re-open a bounded window')
  r = await as(A, `select public.knock_business_lobby('${intro}','${'x'.repeat(241)}')`)
  ok(!!r.error, 'oversized context is rejected')
}
