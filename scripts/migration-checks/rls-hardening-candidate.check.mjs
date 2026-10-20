// CANDIDATE docs/release-safety/0096_rls_hardening.candidate.sql (not journaled, not applied).
// First reproduces each gap on the journaled schema, then applies the candidate twice and
// asserts the gap is closed without breaking the existing member paths.
import { readFileSync } from 'node:fs'

const candidate = readFileSync(new URL('../../docs/release-safety/0096_rls_hardening.candidate.sql', import.meta.url), 'utf8')

export default async ({ db, ok, as, svc, A, B, C }) => {
  const [req] = await svc(`insert into public.intro_requests (user_id, member_id, target_user_id, requester_opt_in, member_opt_in)
    values ('${A}', '${B}', '${B}', true, true) returning id`)
  const [oA] = await svc(`insert into public.intro_outcomes (intro_request_id, author_id, stage, shareable) values ('${req.id}', '${A}', 'met', true) returning id`)
  const [oB] = await svc(`insert into public.intro_outcomes (intro_request_id, author_id, stage, shareable) values ('${req.id}', '${B}', 'met', true) returning id`)
  const upsert = (uid, outcome, reaction) => as(uid, `insert into public.outcome_reactions (outcome_id, reactor_id, reaction) values ($1, $2, $3)
    on conflict (outcome_id, reactor_id) do update set outcome_id = excluded.outcome_id, reactor_id = excluded.reactor_id, reaction = excluded.reaction`, [outcome, uid, reaction])

  console.log('before candidate (reproduces the gaps)')
  let r = await as(null, `select public.is_approved_member($1) as v`, [A])
  ok(!r.error, 'gap: anon can call SECURITY DEFINER is_approved_member(any user id)')
  r = await upsert(B, oA.id, 'verified')
  ok(!r.error, 'B reacts to A\'s shared outcome ' + (r.error ?? ''))
  r = await as(B, `update public.outcome_reactions set outcome_id = $1 where reactor_id = $2 returning id`, [oB.id, B])
  ok(!r.error && r.rows.length === 1, 'gap: B can re-point the reaction at B\'s own outcome (self-endorsement)')
  await svc(`update public.outcome_reactions set outcome_id = '${oA.id}' where reactor_id = '${B}'`)

  await db.exec(candidate)
  await db.exec(candidate)
  ok(true, 'candidate applies twice (idempotent)')

  console.log('after candidate')
  r = await as(null, `select public.is_approved_member($1) as v`, [A])
  ok(!!r.error, 'anon can no longer call is_approved_member')
  r = await as(A, `select public.is_approved_member($1) as v`, [B])
  ok(!r.error, 'members keep EXECUTE (used by member RLS and RPCs)')
  r = await as(C, `select count(*)::int n from public.membership_cards`)
  ok(!r.error, 'membership card policy (calls is_approved_member) still evaluates for members ' + (r.error ?? ''))

  r = await upsert(B, oA.id, 'amazing')
  ok(!r.error, 'existing reactToOutcome upsert path still works ' + (r.error ?? ''))
  r = await as(B, `select reaction from public.outcome_reactions where reactor_id = $1`, [B])
  ok(r.rows?.[0]?.reaction === 'amazing', 'upsert updated the reaction')
  r = await as(B, `update public.outcome_reactions set outcome_id = $1 where reactor_id = $2 returning id`, [oB.id, B])
  ok(!!r.error || r.rows.length === 0, 'B cannot re-point the reaction at another outcome')
  const before = (await svc(`select created_at from public.outcome_reactions where reactor_id = '${B}'`))[0].created_at
  await as(B, `update public.outcome_reactions set created_at = now() - interval '400 days' where reactor_id = $1`, [B])
  const after = (await svc(`select created_at from public.outcome_reactions where reactor_id = '${B}'`))[0].created_at
  ok(String(before) === String(after), 'reaction created_at cannot be backdated')
  r = await upsert(A, oA.id, 'verified')
  ok(!!r.error, 'members still cannot react to their own outcome')
  r = await upsert(C, oA.id, 'verified')
  ok(!!r.error, 'outsiders cannot react to an outcome they cannot see')

  const [cm] = await svc(`select obj_description('public.member_tiers'::regclass, 'pg_class') as c`)
  ok(/deny-all by design/.test(cm.c ?? ''), 'deny-all tables carry an explanatory catalog comment')
  const nopol = await svc(`select count(*)::int n from pg_policy where polrelid = 'public.member_tiers'::regclass`)
  ok(nopol[0].n === 0, 'candidate adds no client policy to RPC-only tables')
}
