// End-to-end RLS contract against the ACTUAL production-style 0087 function.
// No override of is_live_member, no network traffic, no real user data.
export default async ({ ok, as, svc }) => {
  const D='00000000-0000-4000-8000-0000000000dd'
  const E='00000000-0000-4000-8000-0000000000ee'
  await svc(`insert into auth.users(id,email,email_confirmed_at) values
    ('${D}','newmember@test.invalid',null),
    ('${E}','othermember@test.invalid',now())`)
  await svc(`insert into public.profiles(id,name,onboarded,visibility) values
    ('${D}','New Member',false,'network'),
    ('${E}','Other Member',true,'network')`)
  let q=await as(D,'select public.is_live_member() as allowed')
  ok(q.rows?.[0]?.allowed===false,'registered account alone cannot access network')

  await svc(`insert into public.early_access_members(user_id,email,status) values
    ('${D}','newmember@test.invalid','approved'),
    ('${E}','othermember@test.invalid','approved')`)
  q=await as(D,'select public.is_live_member() as allowed')
  ok(q.rows?.[0]?.allowed===false,'approval without email confirmation is not enough')

  await svc(`update auth.users set email_confirmed_at=now() where id='${D}'`)
  q=await as(D,'select public.is_live_member() as allowed')
  ok(q.rows?.[0]?.allowed===false,'confirmed applicant needs profile onboarding')

  await svc(`update public.profiles set onboarded=true where id='${D}'`)
  q=await as(D,'select public.is_live_member() as allowed')
  ok(q.rows?.[0]?.allowed===true,'confirmed, approved, onboarded account gains live access')
  const proofs=await svc(`select status,verification_level from public.member_verifications where user_id='${D}'`)
  ok(proofs.every(p=>p.status!=='verified' && Number(p.verification_level)===0),
    'membership never fabricates professional-role verification')
  q=await as(E,'select public.is_live_member() as allowed')
  ok(q.rows?.[0]?.allowed===true,'second fully onboarded member has access')

  q=await as(D,`select profile from public.visible_member_profiles(array['${E}'::uuid])`)
  ok(!q.error && q.rows?.[0]?.profile?.name==='Other Member',
    'new member can discover an actual approved counterpart without demo content')

  q=await as(D,`select public.request_verified_intro('${E}'::uuid,'Mutual partnerships for next quarter') AS receipt`)
  ok(!q.error && q.rows?.[0]?.receipt?.state==='created','new member can create a real introduction receipt')
  const firstId=q.rows?.[0]?.receipt?.id
  const second=await as(D,`select public.request_verified_intro('${E}'::uuid,'Mutual partnerships for next quarter') AS receipt`)
  ok(!second.error && second.rows?.[0]?.receipt?.state==='existing'
    && second.rows?.[0]?.receipt?.id===firstId,'repeated introduction is idempotent')
  const stored=await svc(`select requester_opt_in,member_opt_in from public.intro_requests
    where user_id='${D}' and target_user_id='${E}'`)
  ok(stored.length===1 && stored[0].requester_opt_in===true
    && stored[0].member_opt_in===false,'new intro remains pending until target consents')

  await svc(`insert into public.member_verifications(user_id,status)
    values ('${D}','manual_review')
    on conflict (user_id) do update set status=excluded.status`)
  q=await as(D,'select public.is_live_member() as allowed')
  ok(q.rows?.[0]?.allowed===true,'pending role review does not block ordinary membership')
  await svc(`update public.member_verifications set status='rejected' where user_id='${D}'`)
  q=await as(D,'select public.is_live_member() as allowed')
  ok(q.rows?.[0]?.allowed===false,'rejected member is blocked')
  await svc(`update public.member_verifications set status='suspended' where user_id='${D}'`)
  q=await as(D,'select public.is_live_member() as allowed')
  ok(q.rows?.[0]?.allowed===false,'suspended member is blocked')
  await svc(`update public.member_verifications set status='manual_review' where user_id='${D}'`)
  await svc(`update public.early_access_members set status='denied' where user_id='${D}'`)
  q=await as(D,'select public.is_live_member() as allowed')
  ok(q.rows?.[0]?.allowed===false,'denied membership is blocked')
  q=await as(null,'select public.is_live_member() as allowed')
  ok(!!q.error || q.rows?.[0]?.allowed===false,'anonymous callers never count as live members')
}
