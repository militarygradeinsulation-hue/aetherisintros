// Production membership-gate contract for open signups. The other database
// suites use an intentionally permissive profile-only fixture to test their
// unrelated SQL features; ONLY this suite uses the real 0086 member gate.
export default async ({ ok, as, svc, A, B, C }) => {
  let r = await as(A, 'select public.is_live_member() as member')
  ok(r.rows?.[0]?.member === false, 'a created account alone is not a live member')

  await svc(`insert into public.early_access_members (user_id,email,status)
    values ('${A}','alpha@example.test','approved'),
           ('${B}','beta@example.test','approved'),
           ('${C}','gamma@example.test','suspended')`)
  r = await as(A, 'select public.is_live_member() as member')
  ok(r.rows?.[0]?.member === false, 'approved without email confirmation and onboarding is blocked')

  await svc(`update auth.users set email_confirmed_at=now()
    where id in ('${A}','${B}','${C}')`)
  r = await as(A, 'select public.is_live_member() as member')
  ok(r.rows?.[0]?.member === false, 'confirmed email alone cannot bypass profile onboarding')

  await svc(`update public.profiles set onboarded=true where id in ('${A}','${B}','${C}')`)
  r = await as(A, 'select public.is_live_member() as member')
  ok(r.rows?.[0]?.member === true, 'approved confirmed-email onboarded member gains full tool access')
  r = await as(B, 'select public.is_live_member() as member')
  ok(r.rows?.[0]?.member === true, 'second approved onboarded account can use the live network')
  r = await as(C, 'select public.is_live_member() as member')
  ok(r.rows?.[0]?.member === false, 'suspended accounts stay blocked despite confirmed email')

  await svc(`update public.early_access_members set status='denied' where user_id='${B}'`)
  r = await as(B, 'select public.is_live_member() as member')
  ok(r.rows?.[0]?.member === false, 'denied members never gain access')

  await svc(`update auth.users set email_confirmed_at=null where id='${A}'`)
  r = await as(A, 'select public.is_live_member() as member')
  ok(r.rows?.[0]?.member === false, 'removing email confirmation revokes live access')
  r = await as(null, 'select public.is_live_member() as member')
  ok(r.error !== undefined || r.rows?.[0]?.member === false, 'anonymous callers are not members')
}
