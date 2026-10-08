// 0023 follow-through record
export default async ({ db, ok, as, svc, A, B, C, ADMIN }) => {
  const D = '00000000-0000-4000-8000-00000000000d'
  await svc(`insert into auth.users values ('${D}')`)
  await svc(`insert into public.profiles(id) values ('${D}')`)
  // D received 6 requests from distinct users, accepted 5; each accepted intro: 4 met, 2 outcomes.
  const ids = []
  for (let i = 0; i < 6; i++) {
    const u = `00000000-0000-4000-8000-0000000001${String(i).padStart(2, '0')}`
    await svc(`insert into auth.users values ('${u}')`)
    await svc(`insert into public.profiles(id) values ('${u}')`) // every account has a profile, as in production
    const r = await svc(`insert into public.intro_requests (user_id, member_id, member_opt_in, created_at) values ('${u}', '${D}', ${i < 5}, now() - interval '30 days') returning id`)
    ids.push([u, r[0].id])
  }
  for (let i = 0; i < 4; i++) await svc(`insert into public.intro_outcomes (intro_request_id, author_id, stage) values ('${ids[i][1]}', '${ids[i][0]}', 'met')`)
  // Counterparts report 2 outcomes; D also self-reports outcomes on every intro, which must not count.
  for (let i = 0; i < 2; i++) await svc(`insert into public.intro_outcomes (intro_request_id, author_id, stage, outcome_category) values ('${ids[i][1]}', '${ids[i][0]}', 'outcome', 'customer')`)
  for (let i = 0; i < 5; i++) await svc(`insert into public.intro_outcomes (intro_request_id, author_id, stage, outcome_category) values ('${ids[i][1]}', '${D}', 'outcome', 'customer')`)

  console.log('track record')
  let r = await as(A, `select public.member_track_record($1) as t`, [D])
  ok(r.rows[0].t.visible === false, 'hidden from others until the member opts in')
  r = await as(D, `select public.member_track_record($1) as t`, [D])
  let t = r.rows[0].t
  ok(t.visible && t.is_self, 'member always sees their own record')
  ok(t.accepts_introductions === 'most' && t.introductions_lead_to_meetings === 'most' && t.introductions_lead_to_outcomes === 'many', 'banded: ' + JSON.stringify(t))
  ok(t.introductions_lead_to_outcomes !== 'most', 'self-reported outcomes do not inflate the record')
  ok(!JSON.stringify(t).match(/"\w+":\s*[0-9]/), 'no exact counts or rates returned')
  r = await as(A, `insert into public.track_record_settings (user_id, show_on_profile) values ($1, true)`, [D])
  ok(!!r.error, 'cannot opt someone else in')
  r = await as(D, `insert into public.track_record_settings (show_on_profile) values (true)`)
  ok(!r.error, 'member opts in: ' + (r.error ?? 'ok'))
  r = await as(A, `select public.member_track_record($1) as t`, [D])
  ok(r.rows[0].t.visible === true && r.rows[0].t.sample === '5+', 'visible to members after opt-in')
  r = await as(A, `select * from public.track_record_settings`)
  ok(r.rows.length === 0, 'settings rows are private to their owner')
  r = await as(B, `select public.member_track_record($1) as t`, [B])
  ok(r.rows[0].t.introductions_lead_to_meetings === 'insufficient', 'small samples are withheld (insufficient)')
  r = await as('', `select public.member_track_record($1) as t`, [D])
  ok(!!r.error, 'anon refused')
  r = await as(D, `update public.track_record_settings set user_id = $1`, [A])
  ok(!!r.error, 'owner column frozen')
}
