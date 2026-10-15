// Business diagnostics are AI/server generated. Members can read their own history but cannot forge it.
export default async ({ ok, as, svc, A, B }) => {
  await svc(`insert into public.business_diagnostics
    (user_id, lead_leaks, cold_relationships, partner_needs, top_opportunities, health_score, summary)
    values ('${A}', '["Lost touch with early champion"]', '["Sarah K — no contact in 90d"]',
      '["Need a CFO intro"]', '[{"title":"Series B lead","rationale":"Two founders ready to invest","action":"Request intro via network"}]',
      72, 'Strong operator with weak fundraising network.')`)

  let r = await as(A, `select id, health_score, summary from public.business_diagnostics where user_id = $1`, [A])
  const reportId = r.rows?.[0]?.id
  ok(r.rows?.length === 1 && r.rows[0].health_score === 72, 'member reads their server-generated diagnostic')
  ok(r.rows?.[0]?.summary === 'Strong operator with weak fundraising network.', 'diagnostic content is preserved')

  r = await as(B, `select id from public.business_diagnostics where id = $1`, [reportId])
  ok(r.rows?.length === 0, 'another member cannot read a different member diagnostic')

  r = await as(A, `insert into public.business_diagnostics (user_id, health_score) values ($1, 99)`, [A])
  ok(!!r.error, 'members cannot forge AI diagnostics directly')

  r = await as(A, `update public.business_diagnostics set health_score = 99 where id = $1 returning id`, [reportId])
  ok(!!r.error || r.rows?.length === 0, 'members cannot edit server-owned diagnostic scores')

  await svc(`delete from public.business_diagnostics where id = '${reportId}'`)
  ok((await svc(`select count(*)::int n from public.business_diagnostics where id = '${reportId}'`))[0].n === 0, 'service role can retire a diagnostic')
}
