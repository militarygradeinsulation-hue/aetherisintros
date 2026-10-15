// Migration 0085: restore minimum live-table privileges without demo-data leaks.
export default async ({ ok, as, svc, A, B }) => {
  const grants = (await svc("select " + [
    "has_table_privilege('authenticated','public.posts','SELECT') as read_posts",
    "has_table_privilege('authenticated','public.posts','INSERT') as write_posts",
    "has_table_privilege('authenticated','public.asks','SELECT') as read_asks",
    "has_table_privilege('authenticated','public.asks','INSERT') as write_asks",
    "has_function_privilege('authenticated','public.provider_directory()','EXECUTE') as providers",
    "has_function_privilege('authenticated','public.my_provider_requests()','EXECUTE') as my_requests",
    "has_function_privilege('authenticated','public.provider_inbox()','EXECUTE') as inbox",
    "has_function_privilege('authenticated','public.request_verified_intro(uuid,text)','EXECUTE') as intros"
  ].join(',')))[0]
  for (const [privilege, allowed] of Object.entries(grants)) {
    ok(allowed === true, 'authenticated privilege ' + privilege + ' is installed')
  }
  for (const name of ['posts','asks']) {
    const read = await as(A, 'select id from public.' + name + ' limit 1')
    ok(!read.error, 'authenticated member can read live ' + name)
    const anonymous = await as(null, 'select id from public.' + name + ' limit 1')
    ok(!!anonymous.error, 'anonymous user cannot read ' + name)
  }
  for (const name of ['provider_directory','my_provider_requests','provider_inbox']) {
    const approved = await as(A,'select public.' + name + '() as result')
    ok(!approved.error, 'member can invoke ' + name)
    const anonymous = await as(null,'select public.' + name + '() as result')
    ok(!!anonymous.error, 'anonymous cannot invoke ' + name)
  }
  const real = await as(A, "select public.request_verified_intro('" + B + "'::uuid,'A thoughtful reason to meet') as result")
  ok(!real.error && !!real.rows?.[0]?.result?.id, 'verified introduction persists with server receipt')
  for (const name of ['signals','seed_threads','seed_learnings']) {
    const denied = await as(A,'select id from public.' + name + ' limit 1')
    ok(!!denied.error, 'private demo ' + name + ' remains inaccessible')
  }
}
