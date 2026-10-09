// 0042 membership plans and memberships, concierge desk, deals from introductions
export default async ({ ok, as, svc, A, B, C, ADMIN }) => {
  const INTRO = '11111111-1111-4111-8111-111111111111' // accepted introduction between C and B (seed)

  // Plans: seeded off; only admins see inactive plans and edit them.
  ok((await as(A, `select id from public.membership_plans`)).rows?.length === 0, 'members see no plans until one is switched on')
  ok((await as(ADMIN, `select id from public.membership_plans order by sort`)).rows?.map(r => r.id).join() === 'founding,member', 'admins see the seeded plans')
  ok(!!(await as(A, `update public.membership_plans set active = true`)).error || (await svc(`select count(*)::int n from public.membership_plans where active`))[0].n === 0, 'members cannot switch plans on')
  ok(!(await as(ADMIN, `update public.membership_plans set active = true, amount_cents = 300000 where id = 'founding'`)).error, 'admins switch a plan on and set its price')
  ok((await as(A, `select id, amount_cents from public.membership_plans`)).rows?.[0]?.amount_cents === 300000, 'members then see it')
  ok(!!(await as(ADMIN, `update public.membership_plans set amount_cents = 5 where id = 'founding'`)).error, 'prices must be sensible')

  // Memberships: written only by the server; members read their own without Stripe ids.
  await svc(`insert into public.memberships (user_id, plan_id, status, amount_cents, stripe_customer_id, stripe_subscription_id) values ('${A}', 'founding', 'active', 300000, 'cus_1', 'sub_1')`)
  ok((await as(A, `select status from public.memberships`)).rows?.[0]?.status === 'active', 'members see their membership')
  ok(!!(await as(A, `select stripe_customer_id from public.memberships`)).error, 'but not the Stripe ids')
  ok((await as(B, `select user_id from public.memberships`)).rows?.length === 0, "nor anyone else's")
  ok(!!(await as(A, `update public.memberships set status = 'active'`)).error, 'members cannot change their membership')
  let r = await as(ADMIN, `select public.admin_revenue_summary() s`)
  ok(r.rows?.[0]?.s?.paying === 1 && Number(r.rows[0].s.arr_cents) === 300000, 'admins see paying members and recurring revenue')
  ok(!!(await as(A, `select public.admin_revenue_summary()`)).error, 'members cannot')

  // Concierge.
  ok(!!(await as(A, `select public.concierge_suggest($1, $2, 'You both run logistics firms.')`, [B, C])).error, 'only the team makes concierge suggestions')
  ok(!(await as(ADMIN, `select public.concierge_suggest($1, $2, 'You both run logistics firms in Texas.')`, [B, C])).error, 'the team suggests a match')
  r = await svc(`select user_id, text from public.notifications where kind = 'concierge' order by user_id`)
  ok(r.length === 2 && r.some(n => n.user_id === B && n.text.includes('suggests you meet')), 'both people are told')
  ok((await as(B, `select id from public.concierge_suggestions`)).rows?.length === 1 && (await as(A, `select id from public.concierge_suggestions`)).rows?.length === 0, 'the suggestion is visible to the two people only')
  ok(!(await as(ADMIN, `select public.admin_concierge_queue() q`)).error, 'admins see the concierge queue')
  ok(!!(await as(A, `select public.admin_concierge_queue()`)).error, 'members cannot')

  // Deals from introductions.
  ok(!(await as(C, `insert into public.intro_deals (intro_request_id, title, value_cents) values ($1, 'Fractional CFO engagement', 4800000)`, [INTRO])).error, 'a person in the introduction records a deal')
  ok(!!(await as(A, `insert into public.intro_deals (intro_request_id, title, value_cents) values ($1, 'Fake deal', 100)`, [INTRO])).error, 'outsiders cannot')
  ok((await as(B, `select title from public.intro_deals`)).rows?.length === 1, 'the other person sees it')
  ok((await as(A, `select title from public.intro_deals`)).rows?.length === 0, 'outsiders do not')
  ok(!!(await as(B, `update public.intro_deals set value_cents = 1`)).error, 'the other person cannot change the value')
  ok(!(await as(B, `update public.intro_deals set disputed = true`)).error, 'but can dispute it')
  r = await as(ADMIN, `select public.admin_revenue_summary() s`)
  ok(r.rows?.[0]?.s?.deals_won === 0, 'disputed deals are left out of the totals')
  await as(B, `update public.intro_deals set disputed = false`)
  r = await as(ADMIN, `select public.admin_revenue_summary() s`)
  ok(r.rows?.[0]?.s?.deals_won === 1 && Number(r.rows[0].s.deals_value_cents) === 4800000, 'deal value counts once undisputed')
}
