// 0086 — public first-1000 registration, conditional invitations and business-role honesty.
// Entirely local PGlite: no production data or external email is sent.
export default async ({ ok, as, svc }) => {
  const D='00000000-0000-4000-8000-00000000000d'
  const E='00000000-0000-4000-8000-00000000000e'
  const F='00000000-0000-4000-8000-00000000000f'
  const G='00000000-0000-4000-8000-000000000010'
  await svc(`insert into auth.users(id,email,email_confirmed_at) values
    ('${D}','public@example.test',now()),
    ('${E}','pending-email@example.test',null),
    ('${F}','invited@example.test',now()),
    ('${G}','blocked@example.test',now())`)
  let result=await as(null,'select * from public.claim_early_access()')
  ok(!!result.error,'anonymous visitor cannot claim a founding place')
  result=await as(E,'select * from public.claim_early_access()')
  ok(!!result.error,'unconfirmed email cannot claim a founding place')
  await svc(`update public.launch_settings set mode='first_1000',capacity=1000 where id=1`)
  result=await as(D,'select * from public.claim_early_access()')
  const number=result.rows?.[0]?.founding_member_number
  ok(!result.error && result.rows?.[0]?.status==='approved' && Number(number)>0,
    'confirmed-email new member obtains an actual founding place in open mode')
  const identity=(await svc(`select status,verification_level,verified_role from public.member_verifications where user_id='${D}'`))[0]
  ok(identity?.status==='verified' && Number(identity.verification_level)===0 && identity.verified_role===null,
    'member can enter without falsely obtaining a verified executive-role badge')
  result=await as(D,'select * from public.claim_early_access()')
  ok(!result.error && result.rows?.[0]?.founding_member_number===number,
    'repeat login retains the original founding number and does not duplicate a claim')
  const counts=(await svc(`select count(*)::int as total from public.early_access_members where user_id='${D}'`))[0]
  ok(Number(counts?.total)===1,'repeat claim is idempotent')
  const existing=(await svc(`select count(*)::int as total from public.early_access_members where status='approved'`))[0]
  await svc(`update public.launch_settings set capacity=${existing.total} where id=1`)
  result=await as(F,'select * from public.claim_early_access()')
  ok(!result.error && result.rows?.[0]?.status==='waitlisted',
    'capacity is honored for registrations without an invite')
  await svc(`update public.launch_settings set mode='invite_only',capacity=1000 where id=1`)
  result=await as(G,'select * from public.claim_early_access()')
  ok(!result.error && result.rows?.[0]?.status==='pending',
    'invite-only launch mode denies automatic public membership')
  await svc(`insert into public.invitations(code,email,max_uses,uses,revoked)
    values ('test-founding-invite','invited@example.test',1,0,false)`)
  result=await as(F,"select * from public.claim_early_access('test-founding-invite')")
  ok(!result.error && result.rows?.[0]?.status==='approved',
    'real member invitation still grants membership in invite-only mode')
  const invitation=(await svc(`select uses from public.invitations where code='test-founding-invite'`))[0]
  ok(Number(invitation?.uses)===1,'consumed invite cannot be reused')
  await svc(`insert into public.member_verifications(user_id,status) values ('${G}','rejected')`)
  await svc(`update public.launch_settings set mode='first_1000' where id=1`)
  result=await as(G,'select * from public.claim_early_access()')
  ok(!result.error && result.rows?.[0]?.status==='pending',
    'rejected verification cannot bypass restrictions through public registration')
  const mode=(await svc(`select mode from public.launch_settings where id=1`))[0]
  ok(mode?.mode==='first_1000','launch mode remains under owner control')
}
