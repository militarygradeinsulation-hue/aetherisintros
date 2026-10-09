// 0046 Network Impact Report: admin-only live numbers, frozen published snapshots with
// small-number suppression, and each member's own impact card
export default async ({ ok, as, svc, A, B, C, ADMIN }) => {
  const INTRO = '11111111-1111-4111-8111-111111111111' // C → B, accepted 40 days ago (seed)
  const from = (await svc(`select (current_date - 60)::text d`))[0].d
  const to = (await svc(`select current_date::text d`))[0].d

  // Activity in the period: three new asks with replies, an outcome, a met record, one deal.
  await svc(`insert into public.asks (id, author_id, ask) values ('ask-1', '${A}', 'Need a CFO'), ('ask-2', '${A}', 'Need a lawyer'), ('ask-3', '${B}', 'Need a banker')`)
  await svc(`insert into public.asks (id, author_id, ask, is_demo) values ('ask-demo', '${A}', 'Demo ask', true)`)
  await svc(`insert into public.ask_responses (ask_id, user_id, text) values ('ask-1', '${B}', 'I know one'), ('ask-3', '${A}', 'Try mine')`)
  await svc(`insert into public.intro_outcomes (intro_request_id, author_id, stage) values ('${INTRO}', '${C}', 'met')`)
  await svc(`insert into public.intro_outcomes (intro_request_id, author_id, stage, outcome_category) values ('${INTRO}', '${C}', 'outcome', 'customer')`)
  await svc(`insert into public.intro_deals (intro_request_id, recorded_by, title, value_cents) values ('${INTRO}', '${C}', 'Fractional CFO engagement', 4800000)`)

  console.log('admin numbers')
  ok(!!(await as(A, `select public.admin_impact_report($1::date, $2::date)`, [from, to])).error, 'members cannot run the admin report')
  ok(!!(await as(null, `select public.admin_impact_report($1::date, $2::date)`, [from, to])).error, 'visitors cannot either')
  ok(!!(await as(A, `select public.impact_metrics($1::date, $2::date)`, [from, to])).error, 'nor the internal metrics function')
  let r = await as(ADMIN, `select public.admin_impact_report($1::date, $2::date) m`, [from, to])
  const m = r.rows?.[0]?.m
  ok(!!m, 'admins get the report')
  ok(m?.asks_posted === 4 && m?.asks_answered === 3, 'asks posted and answered are counted, demo asks left out')
  ok(m?.intros_requested === 2 && m?.intros_accepted === 1, 'requests to real members and acceptances in the period are counted')
  ok(m?.outcomes_reported === 1 && m?.outcomes_by_category?.customer === 1, 'outcomes are counted by category')
  ok(m?.deals_won === 1 && Number(m?.deals_value_usd_cents) === 4800000, 'won, undisputed deals and their value are counted')
  ok(m?.intros_met === 1 && Number(m?.median_days_intro_to_meeting) === 40, 'median days from acceptance to first meeting is derived')
  ok(m?.members_verified === 1 && m?.members_new === 4, 'verified and new members are counted')
  ok(!JSON.stringify(m).includes(C) && !JSON.stringify(m).includes('Bea'), 'the report holds no ids or names')
  ok(!!(await as(ADMIN, `select public.admin_impact_report($1::date, $2::date)`, [to, from])).error, 'a backwards period is refused')

  console.log('snapshots')
  ok(!!(await as(A, `select public.admin_save_impact_report($1::date, $2::date, 'Q3 2026', 'Hello')`, [from, to])).error, 'members cannot save a snapshot')
  r = await as(ADMIN, `select public.admin_save_impact_report($1::date, $2::date, 'Q3 2026', 'Deals came from introductions.') id`, [from, to])
  const id = r.rows?.[0]?.id
  ok(!!id, 'admins freeze a snapshot')
  ok((await svc(`select slug from public.impact_reports where id = '${id}'`))[0]?.slug === 'q3-2026', 'the slug comes from the label')
  ok((await as(null, `select id from public.impact_reports`)).rows?.length === 0, 'visitors cannot see an unpublished snapshot')
  ok((await as(A, `select id from public.impact_reports`)).rows?.length === 0, 'members cannot either')
  ok((await as(ADMIN, `select id from public.impact_reports`)).rows?.length === 1, 'admins can')
  ok(!!(await as(A, `select public.admin_set_impact_report_published($1, true)`, [id])).error, 'members cannot publish')
  ok(!!(await as(null, `select public.admin_set_impact_report_published($1, true)`, [id])).error, 'visitors cannot publish')
  ok(!!(await as(A, `update public.impact_reports set published = true`)).error, 'nobody writes the table directly')
  ok(!!(await as(null, `insert into public.impact_reports (slug, period_label, period_from, period_to, metrics) values ('fake-report', 'Fake', current_date, current_date, '{}')`)).error, 'visitors cannot insert a fake report')
  ok(!(await as(ADMIN, `select public.admin_set_impact_report_published($1, true)`, [id])).error, 'admins publish')

  r = await as(null, `select slug, headline, metrics, published_at from public.impact_reports where slug = 'q3-2026'`)
  const snap = r.rows?.[0]
  ok(!!snap && snap.headline === 'Deals came from introductions.' && !!snap.published_at, 'visitors read the published snapshot')
  ok(!!(await as(null, `select created_by from public.impact_reports`)).error, 'but not who made it')
  ok((await as(A, `select id from public.impact_reports`)).rows?.length === 1, 'members read it too')

  console.log('small numbers')
  const f = snap?.metrics ?? {}
  ok(f.asks_posted === 4 && f.members_new === 4, 'counts of 3 or more are kept')
  ok(f.intros_requested === 'fewer than 3' && f.deals_won === 'fewer than 3' && f.intros_accepted === 'fewer than 3', 'counts below 3 (including zero) become "fewer than 3"')
  ok(f.outcomes_by_category?.customer === 'fewer than 3', 'nested category counts are suppressed too')
  ok(f.deals_value_usd_cents === null, 'the deal total is withheld when it rests on fewer than 3 deals')
  ok(f.median_days_intro_to_meeting === null, 'the median wait is withheld when fewer than 3 introductions met')
  ok(!JSON.stringify(f).match(/:\s*[012](\.\d+)?[,}]/), 'no raw figure below 3 is stored anywhere in the snapshot')

  // With three undisputed deals the total is shown; disputed ones still do not count.
  await svc(`insert into public.intro_deals (intro_request_id, recorded_by, title, value_cents) values ('${INTRO}', '${B}', 'Board seat retainer', 1200000), ('${INTRO}', '${C}', 'Advisory work', 1000000)`)
  await svc(`insert into public.intro_deals (intro_request_id, recorded_by, title, value_cents, disputed) values ('${INTRO}', '${C}', 'Inflated claim', 99900000, true)`)
  await as(ADMIN, `select public.admin_save_impact_report($1::date, $2::date, 'Q3 2026', 'Updated')`, [from, to])
  r = await as(null, `select metrics from public.impact_reports where slug = 'q3-2026'`)
  ok(r.rows?.[0]?.metrics?.deals_won === 3 && Number(r.rows[0].metrics.deals_value_usd_cents) === 7000000, 're-freezing updates the snapshot; three undisputed deals show their total')

  ok(!(await as(ADMIN, `select public.admin_set_impact_report_published($1, false)`, [id])).error, 'admins unpublish')
  ok((await as(null, `select id from public.impact_reports`)).rows?.length === 0, 'an unpublished snapshot disappears for visitors')

  console.log('own impact card')
  ok(!!(await as(null, `select public.my_impact_card()`)).error, 'visitors have no card')
  const card = (await as(C, `select public.my_impact_card() c`)).rows?.[0]?.c
  ok(card?.intros_requested === 2 && card?.intros_accepted === 1 && card?.outcomes_reported === 1, 'a member sees their own introductions and outcomes')
  ok(card?.deals_recorded === 3 && card?.deals_won === 2 && Number(card?.deals_value_usd_cents) === 5800000, 'and the deals they recorded (disputed ones left out of the total)')
  const bcard = (await as(B, `select public.my_impact_card() c`)).rows?.[0]?.c
  ok(bcard?.intros_received === 1 && bcard?.deals_recorded === 1 && bcard?.outcomes_reported === 0, "another member sees only their own numbers, not C's")
  ok(!!(await as(B, `select public.my_impact_card($1)`, [C])).error, "there is no way to ask for someone else's card")
  console.log('meetings')
  const mt = (await as(C, `select public.create_meeting('Intro call', '{}'::uuid[], null, '', $1) id`, [INTRO])).rows?.[0]?.id
  await as(C, `select public.mark_meeting_joined($1)`, [mt])
  r = await as(ADMIN, `select public.admin_impact_report($1::date, $2::date) m`, [from, to])
  ok(r.rows?.[0]?.m?.meetings_held === 0, 'a meeting only one person joined is not counted as held')
  await as(B, `select public.mark_meeting_joined($1)`, [mt])
  r = await as(ADMIN, `select public.admin_impact_report($1::date, $2::date) m`, [from, to])
  ok(r.rows?.[0]?.m?.meetings_held === 1 && r.rows[0].m.meetings_from_intros === 1, 'a meeting both people joined is counted, and as coming from an introduction')
}
