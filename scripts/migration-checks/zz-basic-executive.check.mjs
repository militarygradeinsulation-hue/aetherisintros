// Backend contract: public Basic signup, admin-only Executive promotion, and quota.
// Run against the real migration in PGlite; no production database is touched.
export default async ({ ok, as, svc, ADMIN }) => {
  const U = '00000000-0000-4000-8000-0000000000f1'
  const V = '00000000-0000-4000-8000-0000000000f2'
  await svc(`insert into auth.users(id,email,email_confirmed_at) values
    ('${U}','basic@test.invalid',null),('${V}','peer@test.invalid',now())`)
  await svc(`insert into public.profiles(id,name,onboarded,visibility) values
    ('${U}','Basic User',true,'network'),('${V}','Peer Member',true,'network')`)
  await svc(`insert into public.early_access_members(user_id,email,status) values
    ('${V}','peer@test.invalid','approved')`)
  let q = await as(U,'select public.claim_basic_membership()')
  ok(!!q.error,'unconfirmed email cannot claim Basic')
  await svc(`update auth.users set email_confirmed_at=now() where id='${U}'`)
  q = await as(U,'select public.claim_basic_membership() as tier')
  ok(q.rows?.[0]?.tier==='basic','confirmed account self-activates Basic: '+JSON.stringify(q))
  q = await as(U,'select public.claim_basic_membership() as tier')
  ok(q.rows?.[0]?.tier==='basic','repeated Basic claim is idempotent: '+JSON.stringify(q))
  q = await as(U,'select public.my_intro_allowance() as allowance')
  ok(!q.error && q.rows?.[0]?.allowance?.remaining===3 && q.rows?.[0]?.allowance?.limit===3,
    'Basic member sees their own three-request monthly allowance: '+JSON.stringify(q))
  const anonymousAllowance = await as(null,'select public.my_intro_allowance()')
  ok(!!anonymousAllowance.error,'anonymous visitors cannot read introduction allowance')
  q = await as(U,'select public.my_membership_tier() as tier')
  ok(q.rows?.[0]?.tier==='basic','tier is server-authoritative')
  q = await as(U,'select * from public.member_tiers')
  ok(!!q.error || !q.rows?.length,'clients cannot read private membership tier table')
  q = await as(U,'select public.admin_executive_applications()')
  ok(!!q.error,'Basic user cannot read Executive applications')
  q = await as(U,`select public.apply_for_executive('Basic User','Chief Technology Officer','Example Company',
    'https://example.org/profile','I lead technology strategy and want to publish verified collaboration opportunities.') as status`)
  ok(q.rows?.[0]?.status==='pending','Basic user may apply for Executive')
  q = await as(U,'select public.my_executive_application() as application')
  ok(q.rows?.[0]?.application?.status==='pending','applicant can see their own status')
  q = await as(U,`select public.review_executive_application('${U}'::uuid,true)`)
  ok(!!q.error,'applicant cannot approve themselves')
  q = await as(ADMIN,'select public.admin_executive_applications() as applications')
  ok(q.rows?.[0]?.applications?.some(x=>x.userId===U),'admin can review pending applications')
  q = await as(ADMIN,`select public.review_executive_application('${U}'::uuid,true)`)
  ok(!q.error,'admin can approve a pending Executive application')
  q = await as(U,'select public.my_membership_tier() as tier')
  ok(q.rows?.[0]?.tier==='executive','approved applicant gains Executive rights')
  q = await as(U,'select public.my_intro_allowance() as allowance')
  ok(!q.error && q.rows?.[0]?.allowance?.tier==='executive'
    && q.rows?.[0]?.allowance?.limit===null,
    'approved Executive members see an unlimited introduction allowance: '+JSON.stringify(q))
  await svc(`update public.early_access_members set status='suspended' where user_id='${V}'`)
  q = await as(V,'select public.claim_basic_membership()')
  ok(!!q.error,'suspended accounts cannot bypass restrictions by claiming Basic')
  q = await as(null,'select public.claim_basic_membership()')
  ok(!!q.error,'anonymous users cannot self-activate Basic')
}
