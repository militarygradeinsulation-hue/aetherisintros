// 0067 warm referral engine: AI-generated suggestion paths and referral requests; RLS enforced
export default async ({ ok, as, svc, A, B, C, ADMIN }) => {
  // Seed a target and connector
  const TARGET = '00000000-0000-4000-8000-0000000000e1'
  const CONNECTOR = B
  await svc(`insert into auth.users (id) values ('${TARGET}')`)
  await svc(`insert into public.profiles (id, name) values ('${TARGET}', 'Taylor Target')`)

  // A creates a suggestion for themselves
  let r = await as(ADMIN, `
    insert into public.referral_suggestions
      (for_user_id, target_user_id, connector_user_id, path_explanation, shared_context, strength_score)
    values ($1, $2, $3, 'You share a focus on B2B SaaS with Taylor, and ${CONNECTOR} knows both of you.', 'B2B SaaS, enterprise sales', 82)
    returning id, status, strength_score
  `, [A, TARGET, CONNECTOR])
  ok(!r.error && r.rows?.length === 1, 'admin inserts a suggestion for a member')
  const SID = r.rows?.[0]?.id
  ok(r.rows?.[0]?.status === 'active', 'new suggestions default to active')
  ok(r.rows?.[0]?.strength_score === 82, 'strength score is stored')

  // A sees their own suggestion; C cannot see it
  ok((await as(A, `select id from public.referral_suggestions where id = '${SID}'`)).rows?.length === 1, 'member sees their own suggestion')
  ok((await as(C, `select id from public.referral_suggestions where id = '${SID}'`)).rows?.length === 0, 'other members cannot see it')
  ok(!!(await as(null, `select id from public.referral_suggestions`)).error, 'visitors are refused')

  // A dismisses the suggestion
  ok(!(await as(A, `update public.referral_suggestions set status = 'dismissed' where id = '${SID}' returning id`)).error, 'member dismisses suggestion')
  ok((await svc(`select status from public.referral_suggestions where id = '${SID}'`))[0].status === 'dismissed', 'status updated to dismissed')

  // A snoozes a second suggestion
  r = await as(ADMIN, `
    insert into public.referral_suggestions
      (for_user_id, target_user_id, connector_user_id, path_explanation, strength_score)
    values ($1, $2, $3, 'Second warm path for testing snooze.', 60)
    returning id
  `, [A, TARGET, CONNECTOR])
  const SID2 = r.rows?.[0]?.id
  ok(!(await as(A, `
    update public.referral_suggestions
    set status = 'snoozed', snoozed_until = now() + interval '7 days'
    where id = '${SID2}' returning id
  `)).error, 'member snoozes a suggestion for 7 days')
  const snoozeRow = (await svc(`select status, snoozed_until from public.referral_suggestions where id = '${SID2}'`))[0]
  ok(snoozeRow.status === 'snoozed', 'status is snoozed')
  ok(snoozeRow.snoozed_until !== null, 'snoozed_until is set')

  // Referral request: A asks B to intro them to TARGET
  r = await as(A, `
    insert into public.referral_requests
      (suggestion_id, requester_id, connector_id, target_id, message)
    values ($1, $2, $3, $4, 'Hi B, would you be able to introduce me to Taylor? We are both focused on enterprise SaaS and I think it could be a great conversation.')
    returning id, status
  `, [SID, A, CONNECTOR, TARGET])
  ok(!r.error && r.rows?.length === 1, 'requester creates a referral request')
  const RID = r.rows?.[0]?.id
  ok(r.rows?.[0]?.status === 'pending', 'new requests default to pending')

  // Both requester and connector see the request; outsiders cannot
  ok((await as(A, `select id from public.referral_requests where id = '${RID}'`)).rows?.length === 1, 'requester sees their request')
  ok((await as(CONNECTOR, `select id from public.referral_requests where id = '${RID}'`)).rows?.length === 1, 'connector sees their request')
  ok((await as(C, `select id from public.referral_requests where id = '${RID}'`)).rows?.length === 0, 'outsider cannot see the request')

  // Connector responds
  ok(!(await as(CONNECTOR, `
    update public.referral_requests set status = 'accepted', responded_at = now() where id = '${RID}' returning id
  `)).error, 'connector accepts the request')
  ok((await svc(`select status from public.referral_requests where id = '${RID}'`))[0].status === 'accepted', 'status updated to accepted')

  // Strength score constraint
  r = await as(ADMIN, `
    insert into public.referral_suggestions
      (for_user_id, target_user_id, path_explanation, strength_score)
    values ($1, $2, 'bad score', 150)
  `, [A, TARGET])
  ok(!!r.error, 'strength_score above 100 is rejected')
  r = await as(ADMIN, `
    insert into public.referral_suggestions
      (for_user_id, target_user_id, path_explanation, strength_score)
    values ($1, $2, 'bad score', -1)
  `, [A, TARGET])
  ok(!!r.error, 'strength_score below 0 is rejected')

  // Status constraint
  r = await as(ADMIN, `
    insert into public.referral_suggestions
      (for_user_id, target_user_id, path_explanation, status)
    values ($1, $2, 'bad status', 'archived')
  `, [A, TARGET])
  ok(!!r.error, 'invalid suggestion status is rejected')
  r = await as(ADMIN, `
    insert into public.referral_requests
      (requester_id, connector_id, target_id, message, status)
    values ($1, $2, $3, 'msg', 'invalid')
  `, [A, CONNECTOR, TARGET])
  ok(!!r.error, 'invalid request status is rejected')
}
