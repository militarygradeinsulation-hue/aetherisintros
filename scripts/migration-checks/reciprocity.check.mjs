// 0055 give-first reciprocity ledger and relationship decay nudges
export default async ({ ok, as, svc, A, B, C }) => {
  const INTRO = '11111111-1111-4111-8111-111111111111' // accepted introduction: C asked, B accepted (seed)
  const D = '00000000-0000-4000-8000-00000000000d'
  await svc(`insert into auth.users (id) values ('${D}')`)
  await svc(`insert into public.profiles (id, name) values ('${D}', 'Dara Doyle')`)
  await svc(`update public.profiles set name = 'Ava Archer' where id = '${A}'`)
  const mine = async uid => (await as(uid, `select public.my_reciprocity() r`)).rows?.[0]?.r

  // Visitors and direct access.
  for (const fn of ['public.my_reciprocity()', `public.member_giver_band('${B}')`, 'public.my_cooling_relationships(5)', 'public.ways_to_give()'])
    ok(!!(await as(null, `select ${fn}`)).error, `visitors cannot call ${fn.replace(/\(.*/, '')}`)
  ok(!!(await as(A, `select * from public.reciprocity_events('${B}')`)).error, "members cannot read anyone's raw ledger")
  ok(!!(await as(A, `select * from public.cooling_candidates('${B}')`)).error, "members cannot read anyone's cooling list")
  ok(!!(await as(A, `select public.send_cooling_nudges()`)).error, 'members cannot send nudges')

  // Gives are derived from real records. Seed: B and C answered A's ask; B accepted C's request.
  let r = await mine(B)
  ok(r?.gives?.answered_ask === 1 && r?.gives?.intro_accepted === 1, 'answering an ask and accepting a request count as gives')
  r = await mine(A)
  ok(r?.gets?.answered_ask === 2 && r?.helped_you?.some(p => p.name === 'Bea Bramwell'), 'the asker sees who helped them')
  ok(r?.band === 'Emerging' && r?.show_band === false && !('score' in r), 'a band, never a raw score, and hidden by default')

  // Self-reported outcomes stay activity; the other person's shareable report confirms.
  ok(!(await as(B, `insert into public.intro_outcomes (intro_request_id, stage, outcome_category, shareable) values ($1, 'outcome', 'customer', true)`, [INTRO])).error, 'the giver records an outcome')
  ok((await mine(B))?.gives?.intro_accepted === 1, 'a self-reported outcome does not raise the give')
  ok(!(await as(C, `insert into public.intro_outcomes (intro_request_id, stage, shareable) values ($1, 'met', false)`, [INTRO])).error, 'the other person records a private meeting')
  ok((await mine(B))?.gives?.intro_accepted === 1, 'a private report is not used as confirmation')
  await as(C, `insert into public.intro_outcomes (intro_request_id, stage, shareable) values ($1, 'met', true)`, [INTRO])
  r = await mine(B)
  ok(r?.gives?.intro_met === 1 && !r?.gives?.intro_accepted && r?.confirmed_gives === 1, 'a shared meeting reported by the other person counts once, confirmed')

  // Ping-pong: activity between the same two members within 30 days counts once.
  await svc(`insert into public.asks (id, author_id, ask) values ('ask-b', '${B}', 'Who knows a good board advisor')`)
  ok(!(await as(A, `insert into public.ask_responses (ask_id, user_id, text) values ('ask-b', $1, 'Yes')`, [A])).error, 'A answers B straight back')
  await as(B, `insert into public.ask_responses (ask_id, user_id, text) values ('ask-old', $1, 'One more thought')`, [B])
  r = await mine(A)
  ok(!r?.gives?.answered_ask && r?.gets?.answered_ask === 2, 'back-and-forth within 30 days counts once')
  ok((await mine(B))?.gives?.answered_ask === 1, 'and repeat replies to the same person count once')
  await svc(`insert into public.asks (id, author_id, ask, created_at) values ('ask-b-old', '${B}', 'Earlier question', now() - interval '70 days')`)
  await svc(`insert into public.ask_responses (ask_id, user_id, text, created_at) values ('ask-b-old', '${A}', 'Earlier answer', now() - interval '60 days')`)
  ok((await mine(A))?.gives?.answered_ask === 1, 'a give more than 30 days apart counts again')

  // Bands: shown to others only when opted in.
  ok((await as(A, `select public.member_giver_band($1) b`, [B])).rows?.[0]?.b === null, "another member's band is hidden by default")
  ok(typeof (await as(B, `select public.member_giver_band($1) b`, [B])).rows?.[0]?.b === 'string', 'members always see their own band')
  ok((await as(A, `select * from public.giver_bands($1)`, [[B, C]])).rows?.length === 0, 'matching sees no band unless opted in')
  ok(!!(await as(B, `insert into public.reciprocity_settings (user_id, show_band) values ($1, true)`, [B])).error, 'settings change only through the function')
  ok(!(await as(B, `select public.set_reciprocity_settings(true, null)`)).error, 'a member opts in')
  ok(['Emerging', 'Contributor', 'Pillar'].includes((await as(A, `select public.member_giver_band($1) b`, [B])).rows?.[0]?.b), 'then others see the band')
  ok((await as(A, `select * from public.giver_bands($1)`, [[B, C]])).rows?.map(x => x.member_id).join() === B, 'and matching sees it')
  ok((await as(A, `select public.member_giver_band($1) b`, [C])).rows?.[0]?.b === null, 'other members stay hidden')
  r = (await as(A, `select public.giver_band(15,5,1) p, public.giver_band(15,5,0) n, public.giver_band(5,2,0) c, public.giver_band(4,9,3) e`)).rows?.[0]
  ok(r?.p === 'Pillar' && r?.n === 'Contributor' && r?.c === 'Contributor' && r?.e === 'Emerging', 'band thresholds')

  // Ways to give: open asks with no replies that fit what the member helps with.
  await svc(`update public.profiles set can_help_with = 'Fundraising strategy, logistics operations' where id = '${A}'`)
  await svc(`insert into public.asks (id, author_id, ask) values ('ask-c', '${C}', 'Looking for fundraising strategy for a logistics expansion')`)
  r = (await as(A, `select public.ways_to_give() w`)).rows?.[0]?.w
  ok(r?.length === 1 && r[0].id === 'ask-c' && r[0].matched.includes('fundraising'), 'a matching unanswered ask is suggested')
  ok((await as(C, `select public.ways_to_give() w`)).rows?.[0]?.w?.length === 0, 'never your own ask, and nothing without stated help')
  await svc(`insert into public.ask_responses (ask_id, user_id, text) values ('ask-c', '${B}', 'I can help')`)
  ok((await as(A, `select public.ways_to_give() w`)).rows?.[0]?.w?.length === 0, 'answered asks drop off')

  // Cooling: A and D talked every ten days, then went quiet for 80 days.
  const [thread] = await svc(`insert into public.dm_threads (member_a, member_b, created_by) values ('${A}', '${D}', '${A}') returning id`)
  await svc(`insert into public.dm_messages (thread_id, sender_id, text, created_at) values ('${thread.id}', '${A}', 'hi', now() - interval '100 days'), ('${thread.id}', '${D}', 'hi', now() - interval '90 days'), ('${thread.id}', '${A}', 'hi', now() - interval '80 days')`)
  const [person] = await svc(`insert into public.crm_people (owner_id, full_name) values ('${A}', 'Pat Outside') returning id`)
  await svc(`insert into public.crm_activities (owner_id, person_id, subject, occurred_at) values ('${A}', '${person.id}', 'Quarterly call', now() - interval '200 days'), ('${A}', '${person.id}', 'Call', now() - interval '190 days'), ('${A}', '${person.id}', 'Lunch', now() - interval '180 days')`)
  const [warm] = await svc(`insert into public.crm_people (owner_id, full_name) values ('${A}', 'Still Warm') returning id`)
  await svc(`insert into public.crm_activities (owner_id, person_id, subject, occurred_at) values ('${A}', '${warm.id}', 'a', now() - interval '40 days'), ('${A}', '${warm.id}', 'b', now() - interval '30 days'), ('${A}', '${warm.id}', 'c', now() - interval '20 days')`)
  let list = (await as(A, `select public.my_cooling_relationships(10) c`)).rows?.[0]?.c
  ok(list?.some(x => x.id === D && x.cadence_days === 10 && x.quiet_days >= 80), 'a frequent relationship gone quiet is listed with its cadence')
  ok(list?.some(x => x.id === person.id && x.reason_kind === 'crm' && x.reason.includes('Lunch')), 'CRM contacts too, with the last logged touch')
  ok(!list?.some(x => x.id === warm.id), 'recent relationships are not cooling')
  ok(!(await as(C, `select public.my_cooling_relationships(10) c`)).rows?.[0]?.c?.some(x => x.id === D || x.id === person.id), "only the caller's own relationships")
  await svc(`insert into public.posts (id, author_id, text) values ('post-d', '${D}', 'We just opened a Denver office')`)
  list = (await as(A, `select public.my_cooling_relationships(10) c`)).rows?.[0]?.c
  ok(list?.find(x => x.id === D)?.reason_kind === 'post', 'the reason to reach out comes from their recent post')

  // Snooze and "not important".
  ok(!!(await as(A, `insert into public.relationship_snoozes (user_id, subject_kind, subject_id, mode, until) values ($1, 'member', $2, 'snooze', now() + interval '1 day')`, [A, D])).error, 'snoozes are set only through the function')
  ok(!!(await as(C, `select public.set_relationship_snooze('person', $1, 'dismiss')`, [person.id])).error, "members cannot snooze someone else's contact")
  ok(!(await as(A, `select public.set_relationship_snooze('member', $1, 'snooze')`, [D])).error, 'a member snoozes for 30 days')
  ok(!(await as(A, `select public.my_cooling_relationships(10) c`)).rows?.[0]?.c?.some(x => x.id === D), 'snoozed relationships are hidden')
  await svc(`update public.relationship_snoozes set until = now() - interval '1 minute'`)
  ok((await as(A, `select public.my_cooling_relationships(10) c`)).rows?.[0]?.c?.some(x => x.id === D), 'and return when the snooze ends')
  await as(A, `select public.set_relationship_snooze('person', $1, 'dismiss')`, [person.id])
  ok(!(await as(A, `select public.my_cooling_relationships(10) c`)).rows?.[0]?.c?.some(x => x.id === person.id), '"not important" hides it for good')

  // Weekly nudge: only with something cooling, at most weekly, never when switched off.
  ok(!(await as(D, `select public.set_reciprocity_settings(null, false)`)).error, 'a member switches nudges off')
  ok((await svc(`select public.send_cooling_nudges() n`))[0].n === 1, 'one member is nudged')
  const nudges = async uid => (await svc(`select count(*)::int n from public.notifications where kind = 'cooling' and user_id = '${uid}'`))[0].n
  ok(await nudges(A) === 1 && (await svc(`select text from public.notifications where kind = 'cooling'`))[0].text.includes('Dara Doyle'), 'the member with a cooling relationship gets one')
  ok(await nudges(D) === 0, 'members who switched it off get none')
  ok(await nudges(C) === 0, 'members with nothing cooling get none')
  await svc(`select public.send_cooling_nudges()`)
  ok(await nudges(A) === 1, 'never more than once a week')
  await svc(`update public.reciprocity_settings set last_nudge_at = now() - interval '7 days' where user_id = '${A}'`)
  await svc(`select public.send_cooling_nudges()`)
  ok(await nudges(A) === 2, 'again the next week')
  ok(!!(await as(A, `update public.reciprocity_settings set last_nudge_at = null`)).error || (await svc(`select last_nudge_at from public.reciprocity_settings where user_id = '${A}'`))[0].last_nudge_at !== null, 'members cannot reset the weekly limit')
  ok((await as(A, `select user_id from public.reciprocity_settings`)).rows?.every(x => x.user_id === A), 'members read only their own settings')
}
