// 0079: Lovable scan regression. Each query runs as the actual JWT role under RLS.
// The demo page reads the in-code fictional catalogue, not these protected tables.
export default async ({ ok, as, svc, A, B, C }) => {
  await svc(`
    insert into public.early_access_members(user_id,email,status) values
      ('${A}','security-a@example.test','approved'),
      ('${B}','security-b@example.test','approved'),
      ('${C}','security-c@example.test','pending')
    on conflict (user_id) do update set status=excluded.status;
    update public.profiles set visibility='network' where id in ('${A}','${B}','${C}');
    insert into storage.objects(bucket_id,name,owner) values
      ('avatars','${A}/headshot-a.jpg','${A}'),
      ('avatars','${B}/headshot-b.jpg','${B}'),
      ('avatars','${C}/headshot-c.jpg','${C}');
  `)
  const names = async (who) => {
    const result = await as(who,`select name from storage.objects where bucket_id='avatars' order by name`)
    return result.error ? [] : result.rows.map(row => row.name)
  }
  const a = await names(A)
  ok(a.includes(`${A}/headshot-a.jpg`), 'a member can see their own private-bucket avatar')
  ok(a.includes(`${B}/headshot-b.jpg`), 'approved members can see each other\'s network-visible photos')
  ok(!a.includes(`${C}/headshot-c.jpg`), 'approved members cannot read pending members\' avatars')

  const c = await names(C)
  ok(c.length === 1 && c[0] === `${C}/headshot-c.jpg`, 'pending users see only their own avatar, not the network')
  ok(!!(await as(null, "select name from storage.objects where bucket_id='avatars'")).error, 'anonymous visitors cannot enumerate member photos')

  await svc(`update public.profiles set visibility='private' where id='${B}'`)
  const after = await names(A)
  ok(!after.includes(`${B}/headshot-b.jpg`), 'private visibility stops other members downloading the photo')
  const owner = await names(B)
  ok(owner.includes(`${B}/headshot-b.jpg`), 'owners retain access to private photos')

  const policy = (await svc(`select qual from pg_policies where schemaname='storage' and tablename='objects'
    and policyname='Owner or visible approved member reads avatars'`))[0]
  ok(Boolean(policy?.qual), 'avatar storage protection exists in the applied migration')
}
