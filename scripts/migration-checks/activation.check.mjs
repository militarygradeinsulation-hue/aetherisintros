// 0051 activation checklist, quarterly goals, daily activity and admin growth metrics
export default async ({ ok, as, svc, A, B, C, ADMIN }) => {
  const steps = async uid => {
    const r = await as(uid, `select public.my_activation() as a`)
    return Object.fromEntries((r.rows?.[0]?.a?.steps ?? []).map(s => [s.id, s]))
  }

  // Goals: own only, at most three, written through set_my_goals().
  ok((await as(A, `select public.set_my_goals(array['Hire a CFO', '  ', 'Close Series B'])`)).rows?.[0]?.set_my_goals === 2, 'members set their goals (blanks dropped)')
  ok((await as(A, `select goal from public.member_goals order by position`)).rows?.map(r => r.goal).join('|') === 'Hire a CFO|Close Series B', 'members read their own goals in order')
  ok((await as(B, `select * from public.member_goals`)).rows?.length === 0, "members never see another member's goals")
  ok(!!(await as(A, `select public.set_my_goals(array['a', 'b', 'c', 'd'])`)).error, 'more than three goals is refused')
  ok((await svc(`select count(*)::int as n from public.member_goals where user_id = '${A}'`))[0].n === 2, 'a refused update leaves goals unchanged')
  ok(!!(await as(A, `insert into public.member_goals (user_id, position, goal) values ($1, 3, 'x')`, [A])).error, 'goals cannot be inserted directly')
  ok(!!(await as(B, `insert into public.member_goals (user_id, position, goal) values ($1, 3, 'x')`, [A])).error, "nor written into someone else's list")
  ok(!!(await svc(`insert into public.member_goals (user_id, position, goal) values ('${A}', 4, 'x')`).then(() => null, e => e)), 'the table itself allows only positions 1 to 3')
  ok(!!(await as(A, `select public.set_my_goals(array[repeat('x', 141)])`)).error, 'goals are short (140 characters)')
  ok((await as(B, `delete from public.member_goals returning goal`)).rows?.length === 0, "members cannot delete others' goals")
  ok((await as(A, `select public.set_my_goals(array['Hire a CFO'])`)).rows?.[0]?.set_my_goals === 1, 'setting again replaces the list')

  // my_activation reflects real rows.
  let a = await steps(A)
  ok(a.goals?.done === true && a.goals?.count === 1, 'goals step done once a goal is set')
  ok(a.ask?.done === true, 'ask step done from a real (non-demo) ask')
  ok(a.intro?.done === false, 'a request to a demo member or an unanswered incoming request does not count')
  ok(a.verified?.done === false && a.push?.done === false && a.profile?.done === false, 'undone steps stay undone')
  ok(a.calendar?.optional === true && a.calendar?.done === false, 'calendar step is optional')
  const b = await steps(B)
  ok(b.verified?.done === true && b.goals?.done === false && b.ask?.done === false, "another member's checklist reflects only their own rows")
  ok((await steps(C)).intro?.done === true, 'requesting an introduction to a member counts')
  await as(A, `update public.intro_requests set status = 'accepted' where id = '22222222-2222-4222-8222-222222222222'`)
  await svc(`update public.profiles set avatar_url = 'https://x.test/a.jpg', title = 'CEO', verified_at = now() where id = '${A}'`)
  await svc(`insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values ('${A}', 'https://push.test/1', '${'p'.repeat(60)}', '${'a'.repeat(20)}')`)
  a = await steps(A)
  ok(a.intro?.done && a.profile?.done && a.verified?.done && a.push?.done, 'accepting an intro, photo + headline, verification and push all register')
  ok((await as(A, `select public.my_activation() as a`)).rows[0].a.dismissed === false, 'not dismissed by default')
  ok(!(await as(A, `select public.dismiss_activation()`)).error, 'members can dismiss the checklist')
  ok((await as(A, `select public.my_activation() as a`)).rows[0].a.dismissed === true, 'dismissal is remembered')
  ok((await as(B, `select public.my_activation() as a`)).rows[0].a.dismissed === false, 'dismissal is per member')
  ok(!!(await as(A, `select * from public.member_activation`)).error, 'dismissal rows are not readable directly')
  ok(!!(await as(A, `select public.activation_flags($1)`, [B])).error, "members cannot read another member's flags")

  // Daily activity: idempotent per day, invisible to members.
  ok(!(await as(A, `select public.touch_activity()`)).error, 'members record a visit')
  await as(A, `select public.touch_activity()`)
  await as(A, `select public.touch_activity()`)
  ok((await svc(`select count(*)::int as n from public.member_activity_days where user_id = '${A}'`))[0].n === 1, 'one row per member per day however often they open the app')
  ok(!!(await as(A, `select * from public.member_activity_days`)).error, 'members cannot read activity, not even their own')
  ok(!!(await as(A, `insert into public.member_activity_days values ($1, current_date - 3)`, [A])).error, 'members cannot write activity directly')
  ok(!!(await as(null, `select public.touch_activity()`)).error, 'visitors cannot record activity')

  // Admin growth metrics.
  ok(!!(await as(A, `select public.admin_growth_metrics()`)).error, 'members cannot read growth metrics')
  ok(!!(await as(null, `select public.admin_growth_metrics()`)).error, 'visitors cannot read growth metrics')
  ok(!!(await as(null, `select public.my_activation()`)).error, 'visitors have no checklist')
  // B joined three weeks ago (Monday-aligned) and was active in week 1 and week 2 after joining.
  await svc(`update public.profiles set created_at = date_trunc('week', now()) - interval '21 days' + interval '1 day' where id = '${B}'`)
  await svc(`insert into public.member_activity_days values ('${B}', (date_trunc('week', now()) - interval '14 days')::date), ('${B}', (date_trunc('week', now()) - interval '7 days')::date + 2)`)
  await as(C, `select public.touch_activity()`)
  const r = await as(ADMIN, `select public.admin_growth_metrics(4) as m`)
  const m = r.rows?.[0]?.m
  ok(!r.error && m?.weeks?.length === 4, 'admins get one row per week')
  ok(m?.weeks?.[3]?.active === 2, 'weekly active counts distinct members this week')
  ok(m?.weeks?.[0]?.new_members === 1 && m?.weeks?.[0]?.active === 0, 'new members are counted in their signup week')
  const cohort = m?.retention?.[0]
  ok(cohort?.size === 1 && cohort?.weeks?.[0] === 100 && cohort?.weeks?.[1] === 100 && cohort?.weeks?.[2] === 0, 'retention: share of the cohort active in weeks 1–3 after joining')
  ok(cohort?.weeks?.[3] === null, 'weeks that have not started are blank, not zero')
  ok(m?.funnel?.members === 4 && m?.funnel?.ask >= 1 && m?.funnel?.goals === 1 && m?.funnel?.push === 1, 'activation funnel counts members who did each step')
  ok(m?.last_7_days?.wau >= 2 && m?.last_7_days?.dau_wau > 0, 'DAU/WAU over the last 7 days')
  ok((await as(ADMIN, `select public.admin_growth_metrics(500) as m`)).rows?.[0]?.m?.weeks?.length === 52, 'the range is capped at a year')
}
