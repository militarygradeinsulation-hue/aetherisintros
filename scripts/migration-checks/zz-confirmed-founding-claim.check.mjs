// Real SQL regression: direct RPC calls must not reserve a founding place
// or consume an invitation before the Supabase account confirms its email.
export default async ({ ok, as, svc }) => {
  const U = '00000000-0000-4000-8000-0000000000f1'
  await svc(`insert into auth.users(id,email,email_confirmed_at)
    values ('${U}','unconfirmed-claim@test.invalid',null)`)

  const early = await as(U, 'select * from public.claim_early_access()')
  ok(!!early.error, 'unconfirmed user cannot call founding-claim RPC successfully')
  const before = await svc(`select id from public.early_access_members where user_id='${U}'`)
  ok(before.length === 0, 'rejected unconfirmed claim does not consume a membership slot')

  // A full confirmed signup is exercised in launch-signup.standalone.mjs, whose
  // fixture includes launch_settings, whitelist_entries and invitation tables.
}
