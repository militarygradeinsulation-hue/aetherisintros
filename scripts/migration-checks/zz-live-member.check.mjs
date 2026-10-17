// 0087 — network access is email-confirmed, onboarded and permissioned.
// Business-role badge review is distinct and can remain pending. All rows here
// are synthetic inside PGlite; nothing is written to the live app.
export default async ({ ok, as, svc }) => {
  const D='00000000-0000-4000-8000-0000000000dd'
  await svc(`insert into auth.users(id,email,email_confirmed_at)
    values ('${D}','member@example.test',null)`)
  await svc(`insert into public.profiles(id,onboarded) values ('${D}',false)`)

  let r=await as(D,'select public.is_live_member() as allowed')
  ok(r.rows?.[0]?.allowed===false,'new account cannot read the live network yet')

  await svc(`insert into public.early_access_members(user_id,email,status)
    values ('${D}','member@example.test','approved')`)
  r=await as(D,'select public.is_live_member() as allowed')
  ok(r.rows?.[0]?.allowed===false,'unconfirmed email is not enough for network access')

  await svc(`update auth.users set email_confirmed_at=now() where id='${D}'`)
  r=await as(D,'select public.is_live_member() as allowed')
  ok(r.rows?.[0]?.allowed===false,'member must complete onboarding first')

  await svc(`update public.profiles set onboarded=true where id='${D}'`)
  r=await as(D,'select public.is_live_member() as allowed')
  ok(r.rows?.[0]?.allowed===true,'confirmed approved onboarded user can enter without a false business badge')

  await svc(`insert into public.member_verifications(user_id,status)
    values ('${D}','manual_review')
    on conflict (user_id) do update set status='manual_review'`)
  r=await as(D,'select public.is_live_member() as allowed')
  ok(r.rows?.[0]?.allowed===true,'optional business review can proceed while ordinary member works')

  await svc(`update public.member_verifications set status='rejected' where user_id='${D}'`)
  r=await as(D,'select public.is_live_member() as allowed')
  ok(r.rows?.[0]?.allowed===false,'rejected member verification removes network access')

  await svc(`update public.member_verifications set status='suspended' where user_id='${D}'`)
  r=await as(D,'select public.is_live_member() as allowed')
  ok(r.rows?.[0]?.allowed===false,'suspended member verification removes network access')

  await svc(`delete from public.member_verifications where user_id='${D}'`)
  await svc(`update public.early_access_members set status='suspended' where user_id='${D}'`)
  r=await as(D,'select public.is_live_member() as allowed')
  ok(r.rows?.[0]?.allowed===false,'suspended membership cannot reenter with an old login')

  r=await as(null,'select public.is_live_member() as allowed')
  ok(!!r.error,'anonymous visitors cannot invoke the member authorization function')
}
