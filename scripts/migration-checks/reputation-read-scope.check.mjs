// Test the journaled 0095 read policy against disposable PGlite identities.
// This never touches the published database.
export default async ({ ok, as, svc, A, B, C }) => {
  await svc(`insert into public.reputation_scores (user_id, score)
    values ('${A}', 80), ('${B}', 70), ('${C}', 60)`)

  const read = (uid) => as(uid, 'select user_id, score from public.reputation_scores order by user_id')
  let result = await read(A)
  ok(!result.error && result.rows?.length === 1 && result.rows[0].user_id === A,
    'a live member can read only their own score without a reciprocal connection')

  result = await read(null)
  ok(!!result.error || result.rows?.length === 0, 'anonymous visitors cannot read reputation scores')

  await svc(`insert into public.follows (follower_id, followee_id, kind)
    values ('${A}', '${B}', 'follow')`)
  result = await read(A)
  ok(!result.error && result.rows?.length === 1,
    'a one-way follow is not enough to reveal a second member score')

  await svc(`insert into public.follows (follower_id, followee_id, kind)
    values ('${B}', '${A}', 'follow')`)
  result = await read(A)
  ok(!result.error && result.rows?.length === 2 &&
    result.rows.some(row => row.user_id === A) &&
    result.rows.some(row => row.user_id === B),
    'reciprocal non-saved follows permit viewing each other scores')

  await svc(`insert into public.follows (follower_id, followee_id, kind)
    values ('${A}', '${C}', 'saved'), ('${C}', '${A}', 'saved')`)
  result = await read(A)
  ok(!result.error && result.rows?.length === 2 && result.rows.every(row => row.user_id !== C),
    'mutual private bookmarks do not disclose reputation scores')

  const policies = await svc(`select policyname from pg_policies
    where schemaname = 'public' and tablename = 'reputation_scores'
    order by policyname`)
  ok(policies.length === 1 && policies[0].policyname === 'rep_scores_read',
    'the legacy permissive policy is replaced, not OR-combined with the scoped policy')

  result = await as(A, `update public.reputation_scores set score = 99 where user_id = '${A}' returning user_id`)
  ok(!!result.error || result.rows?.length === 0, 'members cannot edit their server-owned scores')
}
