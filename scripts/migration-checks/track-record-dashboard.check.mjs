// Reputation scores are derived/server-owned; 0095 limits member reads to self or reciprocal connections.
export default async ({ ok, as, svc, A, B }) => {
  await svc(`insert into public.reputation_scores (user_id, score, total_intros, intro_success_rate)
    values ('${A}', 85, 10, 80.00)
    on conflict (user_id) do update set score = 85, total_intros = 10`)
  const scores = await svc(`select score, total_intros from public.reputation_scores where user_id = '${A}'`)
  ok(scores[0]?.score === 85, 'reputation score stored by the server')
  ok(scores[0]?.total_intros === 10, 'derived intro count is stored')

  const bad = await svc(`insert into public.reputation_scores (user_id, score) values ('${B}', 150)`).then(() => null, e => e)
  ok(Boolean(bad), 'score above 100 is rejected by the database')

  const memberRead = await as(B, `select score from public.reputation_scores where user_id = $1`, [A])
  ok(!memberRead.error && memberRead.rows?.length === 0, 'unrelated members cannot read other members\' reputation scores')

  const anonRead = await as(null, `select score from public.reputation_scores where user_id = $1`, [A])
  ok(!!anonRead.error || anonRead.rows?.length === 0, 'anonymous visitors cannot read reputation scores')

  const ownerWrite = await as(A, `update public.reputation_scores set score = 90 where user_id = $1 returning score`, [A])
  ok(!!ownerWrite.error || ownerWrite.rows?.length === 0, 'members cannot edit their own derived reputation score')

  const otherWrite = await as(B, `update public.reputation_scores set score = 1 where user_id = $1 returning score`, [A])
  ok(!!otherWrite.error || otherWrite.rows?.length === 0, 'other members cannot alter a reputation score')
}
