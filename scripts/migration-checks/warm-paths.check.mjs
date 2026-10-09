// 0053 warm path finder: ranked paths use the caller's own signals, never another member's
// private ones; hidden members are left out; visitors are refused; results respect the limit.
const D = '00000000-0000-4000-8000-0000000000d1' // a second connector
const E = '00000000-0000-4000-8000-0000000000e1' // suspended connector
const F = '00000000-0000-4000-8000-0000000000f1' // opted out of being a connector
const G = '00000000-0000-4000-8000-0000000000a1' // works at Acme, declined A
const H = '00000000-0000-4000-8000-0000000000a2' // works at ACME LLC

export default async ({ ok, as, svc, A, B, C }) => {
  await svc(`insert into auth.users (id) values ('${D}'),('${E}'),('${F}'),('${G}'),('${H}')`)
  await svc(`insert into public.profiles (id, name, company) values ('${D}','Dana Diaz','Northwind'),('${E}','Eli Ek','Contoso'),('${F}','Fay Fox','Fabrikam'),('${G}','Gus Gray','Acme, Inc.'),('${H}','Hal Hunt',' ACME LLC ')`)
  await svc(`update public.profiles set name = 'Ana Alder' where id = '${A}'`)
  await svc(`update public.profiles set name = 'Cy Cole', title = 'CFO', company = 'Logistix' where id = '${C}'`)
  await svc(`update public.member_verifications set status = 'suspended' where user_id = '${E}'`)
  await svc(`insert into public.warm_path_optouts (user_id) values ('${F}')`)
  // A knows B, D, E, F. B, D, E, F know C. B and D know G and H.
  const edges = [[A, B], [A, D], [A, E], [A, F], [B, C], [D, C], [E, C], [F, C], [B, G], [D, H], [B, H]]
  for (const [x, y] of edges) await svc(`insert into public.follows (follower_id, followee_id, kind) values ('${x}','${y}','connection')`)

  const paths = async (uid, target, company, limit = 10) => as(uid, `select * from public.find_warm_paths($1, $2, $3)`, [target, company, limit])

  // Baseline: two connectors to C (B and D); E (suspended) and F (opted out) never appear.
  let r = await paths(A, C, null)
  ok(!r.error && r.rows.length === 2, 'two warm paths to the target')
  const ids = (r.rows ?? []).map(x => x.connector_id)
  ok(!ids.includes(E), 'suspended members are never suggested')
  ok(!ids.includes(F), 'members who opted out are never suggested as connectors')
  ok(r.rows.every(x => x.kind === 'via' && x.connector_reasons.includes('Connected to Cy')), 'each path says the connector knows the target')
  const scoreOf = rows => Object.fromEntries((rows ?? []).map(x => [x.connector_id, x.score]))
  const before = scoreOf(r.rows)

  // Another member's private calendar signals never influence or leak into A's results.
  await svc(`insert into public.relationship_signals (user_id, member_id, source, last_at, count_90d) values ('${B}','${C}','calendar', now(), 9), ('${B}','${A}','calendar', now(), 7), ('${D}','${C}','calendar', now(), 11)`)
  r = await paths(A, C, null)
  ok(JSON.stringify(scoreOf(r.rows)) === JSON.stringify(before), "another member's private signals do not change scores")
  ok(!JSON.stringify(r.rows).match(/calendar|9 meetings|7 meetings|11 meetings/i), "and never appear in reasons")

  // The caller's own signals do count.
  await svc(`insert into public.relationship_signals (user_id, member_id, source, last_at, count_90d) values ('${A}','${D}','calendar', now() - interval '3 days', 3)`)
  r = await paths(A, C, null)
  ok(r.rows?.[0]?.connector_id === D, "the caller's own calendar lifts that connector to the top")
  ok(r.rows?.[0]?.reasons.includes('Your calendar: 3 meetings in 90 days'), 'with a plain reason')
  ok(r.rows?.[0]?.score > before[D], 'and a higher score')

  // Meetings attended together and an accepted introduction explain the first hop.
  await svc(`insert into public.meetings (id, host_id, title, started_at) values ('33333333-3333-4333-8333-333333333333','${A}','Catch up', now() - interval '10 days')`)
  await svc(`insert into public.meeting_participants (meeting_id, user_id, role, joined_at) values ('33333333-3333-4333-8333-333333333333','${A}','host', now() - interval '10 days'), ('33333333-3333-4333-8333-333333333333','${B}','guest', now() - interval '10 days')`)
  await svc(`insert into public.intro_requests (user_id, member_id, target_user_id, member_opt_in, status) values ('${A}','${B}','${B}', true, 'accepted')`)
  r = await paths(A, C, null)
  const viaB = r.rows?.find(x => x.connector_id === B)
  ok(viaB?.reasons.includes('You met once in 90 days'), 'meetings together are counted')
  ok(viaB?.reasons.includes('You were introduced on Ask Intros'), 'accepted intros are counted')

  // Responsiveness is a band, never counts.
  for (const u of [D, G, H]) await svc(`insert into public.intro_requests (user_id, member_id, target_user_id, member_opt_in, status) values ('${u}','${B}','${B}', true, 'accepted')`)
  r = await paths(A, C, null)
  const b2 = r.rows?.find(x => x.connector_id === B)
  ok(b2?.connector_reasons.includes('Accepts most intro requests'), 'connector responsiveness shows as a band')
  ok(!JSON.stringify(r.rows).match(/\d+ of \d+/), 'never as exact counts')
  ok(['hot', 'warm', 'cool'].includes(b2?.band), 'every path has a warmth band')

  // Direct path once already connected.
  await svc(`insert into public.follows (follower_id, followee_id, kind) values ('${A}','${C}','connection')`)
  r = await paths(A, C, null)
  ok(r.rows?.some(x => x.kind === 'direct' && x.connector_id === null), 'a direct path appears when already connected')

  // Limit.
  r = await paths(A, C, null, 1)
  ok(r.rows?.length === 1, 'results never exceed the limit')
  r = await paths(A, C, null, 500)
  ok(r.rows?.length <= 25, 'the limit is capped')

  // Company targets: suffixes and case are ignored.
  ok((await svc(`select public.normalize_company_name('  Acme, Inc. ') as n`))[0].n === 'acme', 'company names drop Inc')
  ok((await svc(`select public.normalize_company_name('Acme Holdings L.L.C.') as n`))[0].n === 'acme holdings', 'and L.L.C.')
  ok((await svc(`select public.normalize_company_name('ACME Co Ltd') as n`))[0].n === 'acme', 'and stacked suffixes')
  ok((await svc(`select public.normalize_company_name('Company') as n`))[0].n === 'company', 'a bare suffix word is kept')
  await svc(`insert into public.crm_people (owner_id, full_name, title, company_name, last_activity_at) values ('${A}','Iris Ink','COO','ACME inc', now() - interval '5 days'), ('${B}','Secret Sam','CEO','Acme', now())`)
  r = await paths(A, null, 'acme corp')
  const targets = new Set((r.rows ?? []).filter(x => x.target_id).map(x => x.target_id))
  ok(targets.has(H), 'company search finds members at that company')
  ok(r.rows?.some(x => x.kind === 'own_contact' && x.target_name === 'Iris Ink'), "the caller's own CRM contacts there are included")
  ok(!JSON.stringify(r.rows).includes('Secret Sam'), "another member's CRM never is")

  // A member who declined the caller is not routed around.
  await svc(`insert into public.intro_requests (user_id, member_id, target_user_id, status) values ('${A}','${G}','${G}','declined')`)
  r = await paths(A, G, null)
  ok(!r.error && r.rows.length === 0, 'no paths to a member who declined you')
  r = await paths(A, null, 'acme')
  ok(!(r.rows ?? []).some(x => x.target_id === G), 'nor via company search')

  // Hidden members are never targets either.
  r = await paths(A, E, null)
  ok(!r.error && r.rows.length === 0, 'suspended members cannot be targeted')

  // Visitors and access.
  ok(!!(await paths(null, C, null)).error, 'visitors are refused')
  ok(!!(await as(A, `select public.wp_connected($1, $2)`, [B, C])).error, 'internal helpers are not callable by members')
  ok((await as(A, `select * from public.warm_path_optouts`)).rows?.length === 0, "members cannot see others' opt-outs")
  ok(!(await as(D, `insert into public.warm_path_optouts (user_id) values ($1)`, [D])).error, 'members can opt out themselves')
  ok(!!(await as(D, `insert into public.warm_path_optouts (user_id) values ($1)`, [B])).error, 'but not for someone else')
  r = await paths(A, C, null)
  ok(!(r.rows ?? []).some(x => x.connector_id === D), 'an opt-out takes effect at once')
}
