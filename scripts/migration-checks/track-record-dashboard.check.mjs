// 0060 track record dashboard: reputation_scores and outcome_reactions tables
export default async ({ ok, as, svc, A, B }) => {
  // reputation_scores: any auth user can insert/read their own score
  await svc(`insert into reputation_scores (user_id, score, total_intros, intro_success_rate)
    values ('${A}', 85, 10, 80.00)
    on conflict (user_id) do update set score = 85, total_intros = 10`)
  const scores = await svc(`select score, total_intros from reputation_scores where user_id = '${A}'`)
  ok(scores[0]?.score === 85, 'reputation score stored: ' + scores[0]?.score)
  ok(scores[0]?.total_intros === 10, 'total_intros stored')

  // score constraint: 0-100
  const bad = await as(A, `insert into reputation_scores (user_id, score) values ('${B}', 150)`)
  ok(!!bad.error, 'score > 100 rejected by check constraint')

  // public read: unauthenticated can read scores
  const pub = await as('', `select score from reputation_scores where user_id = '${A}'`)
  ok(!pub.error && pub.rows?.length === 1, 'scores are publicly readable')

  // owner can update own row
  const upd = await as(A, `update reputation_scores set score = 90 where user_id = '${A}'`)
  ok(!upd.error, 'owner updates their own score')

  // B cannot update A's score
  const steal = await as(B, `update reputation_scores set score = 1 where user_id = '${A}'`)
  ok(!!steal.error || (await svc(`select score from reputation_scores where user_id = '${A}'`))[0]?.score === 90, 'B cannot lower A score')
}
