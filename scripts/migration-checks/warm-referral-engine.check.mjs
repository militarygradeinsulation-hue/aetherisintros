// Warm referral suggestions and requests are private; consequential writes are server-owned.
export default async ({ ok, as, svc, A, B, C }) => {
  const TARGET = '00000000-0000-4000-8000-0000000000e1'
  const CONNECTOR = B
  await svc(`insert into auth.users (id) values ('${TARGET}') on conflict do nothing`)
  await svc(`insert into public.profiles (id, name) values ('${TARGET}', 'Taylor Target') on conflict do nothing`)

  const suggestion = (await svc(`insert into public.referral_suggestions
    (for_user_id, target_user_id, connector_user_id, path_explanation, shared_context, strength_score)
    values ('${A}', '${TARGET}', '${CONNECTOR}',
      'You share a focus on B2B SaaS with Taylor, and the connector knows both of you.',
      'B2B SaaS, enterprise sales', 82)
    returning id, status, strength_score`))[0]
  const SID = suggestion?.id
  ok(Boolean(SID), 'server creates a warm referral suggestion')
  ok(suggestion?.status === 'active', 'new suggestions default to active')
  ok(suggestion?.strength_score === 82, 'strength score is stored')

  ok((await as(A, `select id from public.referral_suggestions where id = $1`, [SID])).rows?.length === 1, 'member sees their own suggestion')
  ok((await as(C, `select id from public.referral_suggestions where id = $1`, [SID])).rows?.length === 0, 'other members cannot see the suggestion')
  ok(!!(await as(null, `select id from public.referral_suggestions`)).error, 'visitors cannot read suggestions')

  const forgedDismiss = await as(A, `update public.referral_suggestions set status = 'dismissed' where id = $1 returning id`, [SID])
  ok(!!forgedDismiss.error || forgedDismiss.rows?.length === 0, 'members cannot bypass the server when dismissing suggestions')
  await svc(`update public.referral_suggestions set status='dismissed' where id='${SID}'`)
  ok((await svc(`select status from public.referral_suggestions where id='${SID}'`))[0]?.status === 'dismissed', 'server records dismissal')

  const suggestion2 = (await svc(`insert into public.referral_suggestions
    (for_user_id, target_user_id, connector_user_id, path_explanation, strength_score)
    values ('${A}', '${TARGET}', '${CONNECTOR}', 'Second warm path for testing snooze.', 60)
    returning id`))[0]
  const SID2 = suggestion2?.id
  await svc(`update public.referral_suggestions set status='snoozed', snoozed_until=now()+interval '7 days' where id='${SID2}'`)
  const snoozeRow = (await svc(`select status, snoozed_until from public.referral_suggestions where id='${SID2}'`))[0]
  ok(snoozeRow?.status === 'snoozed' && snoozeRow?.snoozed_until !== null, 'server can snooze a suggestion for the member')

  const request = (await svc(`insert into public.referral_requests
    (suggestion_id, requester_id, connector_id, target_id, message)
    values ('${SID}', '${A}', '${CONNECTOR}', '${TARGET}',
      'Would you be able to introduce me to Taylor?')
    returning id, status`))[0]
  const RID = request?.id
  ok(Boolean(RID) && request?.status === 'pending', 'server creates a pending referral request')
  ok((await as(A, `select id from public.referral_requests where id=$1`, [RID])).rows?.length === 1, 'requester sees their request')
  ok((await as(CONNECTOR, `select id from public.referral_requests where id=$1`, [RID])).rows?.length === 1, 'connector sees their request')
  ok((await as(C, `select id from public.referral_requests where id=$1`, [RID])).rows?.length === 0, 'outsider cannot see the request')

  const forgedResponse = await as(CONNECTOR, `update public.referral_requests set status='accepted' where id=$1 returning id`, [RID])
  ok(!!forgedResponse.error || forgedResponse.rows?.length === 0, 'connector cannot bypass the response server action')
  await svc(`update public.referral_requests set status='accepted', responded_at=now() where id='${RID}'`)
  ok((await svc(`select status from public.referral_requests where id='${RID}'`))[0]?.status === 'accepted', 'server records connector acceptance')

  const high = await svc(`insert into public.referral_suggestions (for_user_id,target_user_id,path_explanation,strength_score)
    values ('${A}','${TARGET}','bad score',150)`).then(() => null, e => e)
  ok(Boolean(high), 'strength score above 100 is rejected')
  const badStatus = await svc(`insert into public.referral_suggestions (for_user_id,target_user_id,path_explanation,status)
    values ('${A}','${TARGET}','bad status','archived')`).then(() => null, e => e)
  ok(Boolean(badStatus), 'invalid suggestion status is rejected')
}
