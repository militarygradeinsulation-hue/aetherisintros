// 0062 business_diagnostics: AI-generated strategic analysis per member
export default async ({ ok, as, svc, A }) => {
  // Members can insert their own report.
  let r = await as(A, `
    insert into public.business_diagnostics
      (user_id, lead_leaks, cold_relationships, partner_needs, top_opportunities, health_score, summary)
    values ($1, '["Lost touch with early champion"]', '["Sarah K — no contact in 90d"]', '["Need a CFO intro"]', '[{"title":"Series B lead","rationale":"Two founders ready to invest","action":"Request intro via network"}]', 72, 'Strong operator with weak fundraising network.')
    returning id, health_score
  `, [A])
  ok(!r.error && r.rows?.length === 1, 'authenticated member can insert their own business diagnostic')
  ok(r.rows?.[0]?.health_score === 72, 'health_score is stored correctly')
  const reportId = r.rows?.[0]?.id

  // Members can read their own report.
  r = await as(A, `select id, health_score, summary from public.business_diagnostics where user_id = $1`, [A])
  ok(r.rows?.length === 1 && r.rows[0].summary === 'Strong operator with weak fundraising network.', 'member reads their own diagnostic')

  // RLS: member B cannot see member A's report.
  const B = '00000000-0000-4000-8000-000000000002'
  await svc(`insert into auth.users (id) values ('${B}') on conflict do nothing`)
  await svc(`insert into public.profiles (id, name) values ('${B}', 'Bee') on conflict do nothing`)
  r = await as(B, `select id from public.business_diagnostics where id = $1`, [reportId])
  ok(r.rows?.length === 0, 'another member cannot see a different member\'s diagnostic')

  // Members can update their own report.
  r = await as(A, `update public.business_diagnostics set health_score = 85 where id = $1 returning health_score`, [reportId])
  ok(r.rows?.[0]?.health_score === 85, 'member can update their own diagnostic')

  // Clean up.
  await svc(`delete from public.business_diagnostics where id = '${reportId}'`)
  ok((await svc(`select count(*)::int n from public.business_diagnostics where id = '${reportId}'`))[0].n === 0, 'report deleted successfully')
}
