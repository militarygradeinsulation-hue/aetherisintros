// Protect the full discovery -> introduction -> workspace identity chain.
// Exercises the actual role, function grants, profile visibility, and participant boundaries.
export default async ({ ok, as, svc, A, B, C }) => {
  const acceptedId = '88888888-8888-4888-8888-888888888880'
  await svc(`insert into public.early_access_members(user_id,email,status) values
    ('${A}', 'member-a@example.test', 'approved'),
    ('${B}', 'member-b@example.test', 'approved'),
    ('${C}', 'member-c@example.test', 'pending')
    on conflict (user_id) do update set status=excluded.status`)
  await svc(`update public.profiles set name='Alpha Executive', onboarded=true,
    visibility='network', can_help_with='Partnerships' where id='${A}'`)
  await svc(`update public.profiles set name='Beta Founder', onboarded=true,
    visibility='network', can_help_with='Distribution' where id='${B}'`)
  await svc(`update public.profiles set name='Private Member', onboarded=true,
    visibility='private' where id='${C}'`)
  // Mirror production: clients do not have general profiles SELECT.
  await svc('revoke select on public.profiles from authenticated')
  const table = await as(A, `select name from public.profiles where id='${B}'`)
  ok(!!table.error, 'direct profile SELECT is denied')

  let r = await as(A, `select profile from public.visible_member_profiles(array['${B}'::uuid])`)
  ok(!r.error && r.rows?.[0]?.profile?.name === 'Beta Founder',
    'member directory returns an approved counterpart without direct profiles SELECT')
  ok(!('email' in (r.rows?.[0]?.profile ?? {})),
    'profile RPC never emits email or account-only fields')
  r = await as(A, `select profile from public.visible_member_profiles(array['${C}'::uuid])`)
  ok(!r.error && r.rows.length === 0, 'private/pending profiles are not searchable')
  r = await as(C, `select profile from public.visible_member_profiles(array['${A}'::uuid])`)
  ok(!r.error && r.rows.length === 0, 'nonapproved members cannot enumerate other profiles')
  r = await as(C, `select profile from public.visible_member_profiles(array['${C}'::uuid])`)
  ok(!r.error && r.rows?.[0]?.profile?.name === 'Private Member',
    'members may read their own private profile')
  r = await as(null, 'select * from public.visible_member_profiles()')
  ok(!!r.error, 'anonymous visitors cannot call the profile reader')

  await svc(`insert into public.intro_requests
    (id,user_id,member_id,target_user_id,requester_opt_in,member_opt_in,status)
    values ('${acceptedId}', '${A}', '${B}', '${B}', true, true, 'accepted')`)
  r = await as(A, `select * from public.my_intro_participant_names(array['${acceptedId}'::uuid])`)
  ok(!r.error && r.rows?.[0]?.other_name === 'Beta Founder',
    'requester can identify the accepted introduction counterpart')
  r = await as(B, `select * from public.my_intro_participant_names(array['${acceptedId}'::uuid])`)
  ok(!r.error && r.rows?.[0]?.other_name === 'Alpha Executive',
    'target can identify the requester before creating shared business work')
  r = await as(C, `select * from public.my_intro_participant_names(array['${acceptedId}'::uuid])`)
  ok(!!r.error || r.rows?.length === 0,
    'outsiders cannot enumerate introduction participants')
  r = await as(null, 'select * from public.my_intro_participant_names()')
  ok(!!r.error, 'anonymous callers cannot read introduction participant names')
}
