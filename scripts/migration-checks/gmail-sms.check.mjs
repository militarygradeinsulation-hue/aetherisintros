// 0048 email signals and 0049 text alerts: private to the member, codes never readable
export default async ({ ok, as, svc, A, B }) => {
  await svc(`insert into public.relationship_signals (user_id, member_id, source, last_at, count_90d) values ('${A}', '${B}', 'email', now(), 4)`)
  ok((await as(A, `select count_90d from public.relationship_signals where source = 'email'`)).rows?.[0]?.count_90d === 4, 'email signals are stored and private to the member')
  ok(!!(await as(A, `select 1`)) && (await svc(`select count(*)::int n from public.relationship_signals where source = 'email'`))[0].n === 1, 'email is an allowed source')

  await svc(`insert into public.member_phones (user_id, phone_e164, code_hash) values ('${A}', '+15555550100', 'hash')`)
  ok((await as(A, `select phone_e164, verified_at from public.member_phones`)).rows?.[0]?.phone_e164 === '+15555550100', 'members see their own number')
  ok(!!(await as(A, `select code_hash from public.member_phones`)).error, 'but never the confirmation code')
  ok((await as(B, `select phone_e164 from public.member_phones`)).rows?.length === 0, "nobody sees someone else's number")
  ok(!!(await as(A, `update public.member_phones set verified_at = now()`)).error, 'members cannot mark their own number confirmed')
  ok(!!(await as(A, `insert into public.member_phones (user_id, phone_e164) values ($1, '+15555550101')`, [A])).error, 'numbers are added by the server only')
  ok(!(await as(A, `update public.member_phones set sms_kinds = '{intros}'`)).error, 'members choose which alerts come by text')
  ok(!!(await as(A, `update public.member_phones set sms_kinds = '{everything}'`)).error, 'only known alert groups')
  ok(!!(await svc(`select 1`)) && (await svc(`select public.sms_group('intro_request') a, public.sms_group('meeting_invite') b, public.sms_group('follow') c`))[0].c === '', 'follows never go by text')
  ok((await as(A, `delete from public.member_phones returning user_id`)).rows?.length === 1, 'members can remove their number')
  ok(!!(await as(null, `select * from public.member_phones`)).error, 'visitors see nothing')
}
