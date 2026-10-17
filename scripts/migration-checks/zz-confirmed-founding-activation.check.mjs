// 0087: public founding admission is email-confirmed, not an executive badge.
// These are isolated real SQL trigger checks running inside PGlite.
export default async ({ svc, ok }) => {
  const verified='00000000-0000-4000-8000-00000000001a'
  const unconfirmed='00000000-0000-4000-8000-00000000001b'
  const invited='00000000-0000-4000-8000-00000000001c'
  const rejected='00000000-0000-4000-8000-00000000001d'
  await svc(`insert into auth.users(id,email,email_confirmed_at) values
     ('${verified}','open@example.test',now()),
     ('${unconfirmed}','unconfirmed@example.test',null),
     ('${invited}','invited@example.test',now()),
     ('${rejected}','rejected@example.test',now())`)
  await svc(`insert into public.early_access_members(user_id,email,status,source)
     values ('${verified}','open@example.test','approved','first_1000')`)
  let proof=(await svc(`select status,verification_level from public.member_verifications where user_id='${verified}'`))[0]
  ok(proof?.status==='verified' && Number(proof.verification_level)===0,
     'email-confirmed founder is admitted at level 0, never business-role verified')
  let error=''
  try { await svc(`insert into public.early_access_members(user_id,email,status,source)
    values ('${unconfirmed}','unconfirmed@example.test','approved','first_1000')`) }
  catch(e){error=String(e.message)}
  ok(error.includes('Confirm your email'),'unconfirmed signup cannot enter the network')
  const missing=(await svc(`select count(*)::int as n from public.early_access_members where user_id='${unconfirmed}'`))[0]
  ok(Number(missing.n)===0,'failed unconfirmed signup creates no approved member record')
  await svc(`insert into public.early_access_members(user_id,email,status,source)
    values ('${invited}','invited@example.test','approved','invite')`)
  const other=(await svc(`select count(*)::int as n from public.member_verifications where user_id='${invited}'`))[0]
  ok(Number(other.n)===0,'invited members continue through their separate vouch/verification logic')
  await svc(`insert into public.member_verifications(user_id,status) values ('${rejected}','rejected')`)
  await svc(`insert into public.early_access_members(user_id,email,status,source)
    values ('${rejected}','rejected@example.test','approved','first_1000')`)
  const denied=(await svc(`select status from public.member_verifications where user_id='${rejected}'`))[0]
  ok(denied.status==='rejected','existing reviewer rejection is never overwritten by public signup')
  await svc(`update public.early_access_members set status='approved' where user_id='${verified}'`)
  const double=(await svc(`select count(*)::int as n from public.member_verifications where user_id='${verified}'`))[0]
  ok(Number(double.n)===1,'repeat activation does not duplicate verification entries')
}
