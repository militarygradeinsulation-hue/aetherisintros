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

  // A may request an intro but may never impersonate E's decision.
  let decision = await as(D,`update public.intro_requests
    set member_opt_in=true,status='accepted' where id='${firstId}'
    returning member_opt_in,status`)
  const afterForgery = await svc(`select member_opt_in from public.intro_requests where id='${firstId}'`)
  ok(afterForgery[0]?.member_opt_in===false,
    'requester cannot self-accept an introduction')
  ok(!!decision.error || !decision.rows?.some(x=>x.member_opt_in===true),
    'forged requester consent is not acknowledged')

  const pendingForTarget=await as(E,`select id,member_opt_in from public.intro_requests where id='${firstId}'`)
  ok(!pendingForTarget.error && pendingForTarget.rows?.length===1
    && pendingForTarget.rows[0].member_opt_in===false,
    'target sees exactly one pending introduction request')
  const anonymousIntro=await as(null,`select id from public.intro_requests where id='${firstId}'`)
  ok(!!anonymousIntro.error || !anonymousIntro.rows?.length,
    'anonymous visitors cannot read the private introduction')

  decision=await as(E,`update public.intro_requests
    set member_opt_in=true,status='accepted' where id='${firstId}'
    returning member_opt_in,status`)
  ok(!decision.error && decision.rows?.[0]?.member_opt_in===true
    && decision.rows?.[0]?.status==='accepted',
    'only the target confirms mutual consent and accepts the introduction')
  const storedAccepted=await svc(`select requester_opt_in,member_opt_in,status
    from public.intro_requests where id='${firstId}'`)
  ok(storedAccepted.length===1 && storedAccepted[0].requester_opt_in===true
    && storedAccepted[0].member_opt_in===true
    && storedAccepted[0].status==='accepted',
    'both-sided consent persists on reload')

  const opened=await as(D,`insert into public.dm_threads(member_a,member_b,created_by)
    values('${D}','${E}','${D}') returning id`)
  const threadId=opened.rows?.[0]?.id
  ok(!opened.error && !!threadId,
    'confirmed member can open a private conversation with the consenting member')
  if (threadId) {
    const firstMessage=await as(D,`insert into public.dm_messages(thread_id,sender_id,text)
      values('${threadId}','${D}','Hello after our introduction') returning id`)
    ok(!firstMessage.error && !!firstMessage.rows?.[0]?.id,
      'requester message is persisted to the real conversation table')
    const received=await as(E,`select text from public.dm_messages where thread_id='${threadId}'`)
    ok(!received.error && received.rows?.some(x=>x.text==='Hello after our introduction'),
      'receiving member can read the persisted message')
    const reply=await as(E,`insert into public.dm_messages(thread_id,sender_id,text)
      values('${threadId}','${E}','Thank you for connecting') returning id`)
    ok(!reply.error && !!reply.rows?.[0]?.id,
      'recipient can reply and the message is persisted')
    const visitorThread=await as(null,`select text from public.dm_messages where thread_id='${threadId}'`)
    ok(!!visitorThread.error || !visitorThread.rows?.length,
      'anonymous visitor cannot inspect member conversation')
  }

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
