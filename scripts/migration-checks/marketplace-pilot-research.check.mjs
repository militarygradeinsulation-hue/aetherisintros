// 0081: research demand is genuinely saved but remains private, with no
// implicit public listing, outreach, or access rights.
export default async ({ ok, as, svc, A, B, C, ADMIN }) => {
  await svc(`insert into public.early_access_members(user_id,email,status) values
    ('${A}','pilot-a@example.test','approved'),
    ('${B}','pilot-b@example.test','approved'),
    ('${C}','pilot-c@example.test','pending')
    on conflict (user_id) do update set status=excluded.status`)
  const payload = {
    intent: 'exploring', organization: 'Example Industries', role: 'CEO',
    industry: 'Manufacturing', location: { city: 'Indianapolis', remote: false },
    difficulty: 'Finding credible collaboration partners',
    optIns: { pilotContact: false, feedbackInterview: false, realPilotProject: false },
  }
  const sql = (p) => `select public.submit_marketplace_pilot_interest($$${JSON.stringify(p)}$$::jsonb) as id`
  let r = await as(null, sql(payload))
  ok(!!r.error, 'anonymous visitors cannot submit marketplace pilot interest')
  r = await as(C, sql(payload))
  ok(!!r.error, 'pending accounts cannot submit')
  r = await as(A, sql({ ...payload, email: 'someone@example.test' }))
  ok(!!r.error, 'unexpected contact-export fields are rejected')
  r = await as(A, sql({ ...payload, optIns: { pilotContact: true } }))
  ok(!!r.error, 'all research consent preferences must be explicit booleans')
  r = await as(A, sql({ ...payload, intent: 'buy' }))
  ok(!!r.error, 'a buyer cannot submit without a real need section')
  const first = await as(A, sql(payload))
  const id = first.rows?.[0]?.id
  ok(!first.error && typeof id === 'string', 'approved member can save private research interest')
  r = await as(B, 'select user_id from public.marketplace_pilot_interests')
  ok(!r.error && r.rows.length === 0, 'other members cannot read private pilot research')
  r = await as(A, 'select user_id, intent, response from public.marketplace_pilot_interests')
  ok(r.rows?.length === 1 && r.rows[0].intent === 'exploring'
     && r.rows[0].response.optIns.pilotContact === false,
     'owner sees saved intent and untouched contact opt-out')
  const updated = await as(A, sql({ ...payload, difficulty: 'Need better qualification' }))
  ok(!updated.error && updated.rows?.[0]?.id === id,
    'second submission updates the same private response rather than creating duplicates')
  r = await as(ADMIN, 'select count(*)::int as n from public.marketplace_pilot_interests')
  ok(!r.error && r.rows?.[0]?.n === 1, 'administrators can review qualified pilot demand')
  r = await as(B, "insert into public.marketplace_pilot_interests(user_id,intent,response) values ('" + B + "','offer','{}'::jsonb)")
  ok(!!r.error, 'client cannot bypass the validation RPC with a direct insert')
}
