// 0025 founding cohorts
export default async ({ db, ok, as, svc, A, B, C, ADMIN }) => {
  console.log('founding cohorts')
  // A general invite created earlier for Sam, outside any cohort.
  await svc(`insert into public.invitations (code, email, max_uses) values ('legacy-sam', 'sam@contoso.com', 1)`)
  let r = await as(A, `insert into public.invite_cohorts (name, source_label) values ('Aetheris clients Q4', 'aetheris_client') returning id`)
  ok(!!r.error, 'non-admin cannot create a cohort')
  r = await as(ADMIN, `insert into public.invite_cohorts (name, source_label) values ('Aetheris clients Q4', 'aetheris_client') returning id`)
  const cohort = r.rows[0].id
  ok(!!cohort, 'admin creates a cohort')
  // B is already an approved member; one row has a bad email; two rows repeat the same person.
  await svc(`insert into public.early_access_members (user_id, email, status) values ('${B}', 'b@member.com', 'approved')`)
  const rows = [
    { email: 'Dana@Northwind.com ', name: 'Dana Ortiz', company: 'Northwind' },
    { email: 'sam@contoso.com', name: 'Sam Lee', company: 'Contoso' },
    { email: 'b@member.com', name: 'Existing' },
    { email: 'not-an-email', name: 'Typo' },
    { email: 'dana@northwind.com', name: 'Dana again' },
  ]
  r = await as(A, `select * from public.create_cohort_invites($1, $2::jsonb)`, [cohort, JSON.stringify(rows)])
  ok(!!r.error, 'non-admin cannot create cohort invites')
  r = await as(ADMIN, `select * from public.create_cohort_invites($1, $2::jsonb)`, [cohort, JSON.stringify(rows)])
  const out = r.rows.map(x => x.outcome)
  ok(JSON.stringify(out) === JSON.stringify(['created','already_invited','already_member','invalid_email','already_invited']), 'each row reports what happened: ' + JSON.stringify(out))
  const dana = r.rows[0]
  ok(r.rows[1].code === 'legacy-sam', 'an existing invite is reused, not duplicated')
  r = await svc(`select cohort_id, invitee_name from public.invitations where code = 'legacy-sam'`)
  ok(r[0].cohort_id === cohort && r[0].invitee_name === 'Sam Lee', 'an unassigned existing invite joins the cohort so it is tracked')
  r = await svc(`select email, max_uses, invitee_name, expires_at > now() + interval '59 days' as long from public.invitations where code = '${dana.code}'`)
  ok(r[0].email === 'dana@northwind.com' && r[0].max_uses === 1 && r[0].invitee_name === 'Dana Ortiz' && r[0].long, 'invites are email-locked, single-use and expire')
  r = await as(ADMIN, `select * from public.create_cohort_invites($1, $2::jsonb)`, [cohort, JSON.stringify(Array.from({ length: 501 }, (_, i) => ({ email: `x${i}@y.com` })))])
  ok(!!r.error, 'batches are capped at 500 rows')

  // Dana joins, onboards, asks, gets an accepted intro, and the counterpart reports an outcome.
  const DANA = '00000000-0000-4000-8000-0000000000da'
  await svc(`insert into auth.users values ('${DANA}')`)
  await svc(`insert into public.profiles(id) values ('${DANA}')`)
  const inv = (await svc(`select id from public.invitations where code = '${dana.code}'`))[0].id
  const stage = async () => (await as(ADMIN, `select email, stage from public.cohort_activation($1)`, [cohort])).rows.find(x => x.email === 'dana@northwind.com').stage
  ok(await stage() === 'invited', 'stage: invited')
  await svc(`insert into public.early_access_members (user_id, email, status, invite_id) values ('${DANA}', 'dana@northwind.com', 'approved', '${inv}')`)
  ok(await stage() === 'joined', 'stage: joined')
  await svc(`update public.profiles set onboarded = true where id = '${DANA}'`)
  ok(await stage() === 'onboarded', 'stage: onboarded')
  await svc(`insert into public.asks (id, author_id, ask) values ('ask-1', '${DANA}', 'Looking for a CFO')`)
  ok(await stage() === 'asked', 'stage: asked')
  const ir = (await svc(`insert into public.intro_requests (user_id, member_id, member_opt_in) values ('${DANA}', '${C}', true) returning id`))[0].id
  ok(await stage() === 'introduced', 'stage: introduced')
  await svc(`insert into public.intro_outcomes (intro_request_id, author_id, stage, outcome_category) values ('${ir}', '${DANA}', 'outcome', 'hire')`)
  ok(await stage() === 'introduced', 'a self-reported outcome does not count')
  await svc(`insert into public.intro_outcomes (intro_request_id, author_id, stage, outcome_category) values ('${ir}', '${C}', 'outcome', 'hire')`)
  ok(await stage() === 'outcome', 'stage: outcome (reported by the other side)')
  r = await as(A, `select * from public.cohort_activation($1)`, [cohort])
  ok(!!r.error, 'non-admin cannot read activation')
  const sam = (await svc(`select id from public.invitations where email = 'sam@contoso.com'`))[0].id
  await as(ADMIN, `select public.revoke_cohort_invite($1)`, [sam])
  r = await as(ADMIN, `select email from public.cohort_activation($1)`, [cohort])
  ok(!r.rows.some(x => x.email === 'sam@contoso.com'), 'revoked invites drop out of the cohort')
}
