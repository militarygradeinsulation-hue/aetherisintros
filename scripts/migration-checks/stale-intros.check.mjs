// 0028 stale introduction requests: reminders, withdrawal, protected accepted intros
export default async ({ ok, as, svc, A, B, C }) => {
  // The seed already holds a C→A request, so this suite uses B → C with A as the outsider.
  const REQ = B, TGT = C, OUT = A
  let r = await as(REQ, `insert into public.intro_requests (user_id, member_id, reason) values ($1, $2, 'Hiring a CFO') returning id`, [REQ, TGT])
  const fresh = r.rows[0].id
  r = await as(REQ, `select * from public.my_pending_intro_requests()`)
  const mine = r.rows.find(x => x.id === fresh)
  ok(mine && mine.target_user_id === TGT && mine.days_waiting === 0 && mine.can_nudge === false, 'requester sees the pending request, too new to nudge')
  r = await as(TGT, `select * from public.my_pending_intro_requests()`)
  ok(!r.rows.some(x => x.id === fresh), "the target does not see it as their own pending request")
  r = await as(REQ, `select public.nudge_intro_request($1)`, [fresh])
  ok(!!r.error, 'no reminder before five days')

  await svc(`update public.intro_requests set created_at = now() - interval '9 days' where id = '${fresh}'`)
  r = await as(REQ, `select * from public.my_pending_intro_requests()`)
  ok(r.rows.find(x => x.id === fresh)?.can_nudge === true && r.rows.find(x => x.id === fresh)?.days_waiting === 9, 'after nine days a reminder is offered')
  r = await as(OUT, `select public.nudge_intro_request($1)`, [fresh])
  ok(!!r.error, 'only the requester can send the reminder')
  const before = (await svc(`select count(*)::int n from public.notifications where user_id = '${TGT}' and kind = 'intro_reminder'`))[0].n
  r = await as(REQ, `select public.nudge_intro_request($1)`, [fresh])
  ok(!r.error, 'requester sends one reminder')
  const after = (await svc(`select count(*)::int n from public.notifications where user_id = '${TGT}' and kind = 'intro_reminder'`))[0].n
  ok(after === before + 1, 'the target is notified once')
  r = await as(REQ, `select public.nudge_intro_request($1)`, [fresh])
  ok(!!r.error, 'a second reminder is refused')
  r = await as(REQ, `select * from public.intro_request_nudges`)
  ok(!!r.error, 'members cannot read or forge the reminder ledger')
  r = await as(REQ, `select * from public.my_pending_intro_requests()`)
  ok(r.rows.find(x => x.id === fresh)?.can_nudge === false, 'no further reminder is offered')

  r = await as(REQ, `delete from public.intro_requests where id = $1 returning id`, [fresh])
  ok(r.rows?.length === 1, 'requester can withdraw an unanswered request')
  r = await as(TGT, `select id from public.intro_requests where id = $1`, [fresh])
  ok(r.rows.length === 0, "a withdrawn request leaves the target's inbox")

  r = await as(REQ, `insert into public.intro_requests (user_id, member_id) values ($1, $2) returning id`, [REQ, TGT])
  const answered = r.rows[0].id
  await as(TGT, `update public.intro_requests set member_opt_in = true, status = 'accepted' where id = $1`, [answered])
  r = await as(REQ, `select * from public.my_pending_intro_requests()`)
  ok(!r.rows.some(x => x.id === answered), 'an accepted request is no longer pending')
  await svc(`update public.intro_requests set created_at = now() - interval '9 days' where id = '${answered}'`)
  r = await as(REQ, `select public.nudge_intro_request($1)`, [answered])
  ok(!!r.error, 'no reminder for an answered request')
  await as(TGT, `insert into public.intro_outcomes (intro_request_id, stage) values ($1, 'met')`, [answered])
  r = await as(REQ, `delete from public.intro_requests where id = $1 returning id`, [answered])
  ok(!!r.error, "requester cannot delete an accepted introduction and erase the other member's outcomes")
  r = await svc(`select count(*)::int n from public.intro_outcomes where intro_request_id = '${answered}'`)
  ok(r[0].n === 1, 'the outcome is still there')

  await svc(`delete from public.intro_requests where id = '${answered}'`)
}
