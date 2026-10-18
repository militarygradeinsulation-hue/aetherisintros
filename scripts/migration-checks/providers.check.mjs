// 0045 trusted providers: nominations, admin approval, endorsements, referral requests,
// routing, engagement, success fees, notifications and who sees what
export default async ({ ok, as, svc, A, B, C, ADMIN }) => {
  await svc(`update public.profiles set name = 'Ana Avery', company = 'Avery Freight' where id = '${A}'`)
  await svc(`update public.profiles set name = 'Cal Cooper' where id = '${C}'`)
  const desc = 'Finds where a business leaks time, leads and revenue, then fixes it with automation.'

  // Nominations: any member nominates; it starts pending and only the nominator and admins see it.
  let r = await as(A, `insert into public.service_providers (name, category, description, website, regions, client_size, contact_user_id)
    values ('Leak Fixers', 'ai_automation', $1, 'https://leakfixers.example', '{US,UK}', '5m_50m', $2) returning id, status`, [desc, C])
  ok(!r.error && r.rows?.[0]?.status === 'pending', 'any member nominates a provider, which starts pending')
  const P1 = r.rows?.[0]?.id
  ok(!!(await as(A, `insert into public.service_providers (name, category, description, status) values ('Sneaky', 'legal', $1, 'approved')`, [desc])).error, 'members cannot nominate straight to approved')
  ok(!!(await as(A, `insert into public.service_providers (name, category, description) values ('Odd', 'astrology', $1)`, [desc])).error, 'category must be from the fixed list')
  ok(!!(await as(A, `insert into public.service_providers (name, category, description, website) values ('Bad site', 'legal', $1, 'javascript:alert(1)')`, [desc])).error, 'website must be an http(s) link')
  ok(!!(await as(A, `insert into public.service_providers (name, category, description) values ('Short', 'legal', 'too short')`)).error, 'description needs some substance')
  ok(!!(await as(A, `insert into public.service_providers (name, category, description, nominated_by) values ('Spoof', 'legal', $1, $2)`, [desc, B])).error, 'members cannot nominate in someone else\'s name')
  ok((await as(B, `select id from public.service_providers`)).rows?.length === 0, 'other members do not see pending nominations')
  ok((await as(A, `select id from public.service_providers`)).rows?.length === 1, 'the nominator sees their nomination')
  ok((await as(B, `select public.provider_directory() d`)).rows?.[0]?.d?.length === 0, 'the directory shows members approved providers only')
  ok(!!(await as(null, `select id from public.service_providers`)).error, 'visitors see nothing')

  // Only admins approve or suspend.
  await as(A, `update public.service_providers set status = 'approved' where id = $1`, [P1])
  ok((await svc(`select status from public.service_providers where id = '${P1}'`))[0].status === 'pending', 'members cannot approve')
  ok(!(await as(ADMIN, `update public.service_providers set status = 'approved' where id = $1`, [P1])).error, 'admins approve a nomination')
  ok((await svc(`select reviewed_by from public.service_providers where id = '${P1}'`))[0].reviewed_by === ADMIN, 'the reviewer is recorded')
  ok((await as(B, `select name from public.service_providers`)).rows?.[0]?.name === 'Leak Fixers', 'approved providers are visible to members')
  r = await as(ADMIN, `insert into public.service_providers (name, category, description) values ('Second Law LLP', 'legal', $1) returning id`, [desc])
  const P2 = r.rows?.[0]?.id
  await as(ADMIN, `update public.service_providers set status = 'approved' where id = $1`, [P2])
  r = await as(ADMIN, `insert into public.service_providers (name, category, description) values ('Third Books', 'accounting', $1) returning id`, [desc])
  const P3 = r.rows?.[0]?.id
  await as(ADMIN, `update public.service_providers set status = 'approved' where id = $1`, [P3])
  r = await as(ADMIN, `insert into public.service_providers (name, category, description) values ('Fourth Deals', 'm_and_a', $1) returning id`, [desc])
  const P4 = r.rows?.[0]?.id
  await as(ADMIN, `update public.service_providers set status = 'approved' where id = $1`, [P4])
  r = await as(ADMIN, `insert into public.service_providers (name, category, description) values ('Pending Co', 'sales', $1) returning id`, [desc])
  const PENDING = r.rows?.[0]?.id

  // Endorsements: one per member per provider, author edits/deletes, contact cannot self-endorse.
  ok(!(await as(B, `insert into public.provider_endorsements (provider_id, note) values ($1, 'Found three leaks in our funnel in a week.')`, [P1])).error, 'a member endorses an approved provider')
  ok(!!(await as(B, `insert into public.provider_endorsements (provider_id, note) values ($1, 'Second endorsement attempt here.')`, [P1])).error, 'one endorsement per member per provider')
  ok(!!(await as(C, `insert into public.provider_endorsements (provider_id, note) values ($1, 'I am great, honestly, trust me.')`, [P1])).error, "the provider's contact member cannot endorse it")
  ok(!!(await as(A, `insert into public.provider_endorsements (provider_id, note) values ($1, 'Not approved yet but good.')`, [PENDING])).error, 'pending providers cannot be endorsed')
  ok(!!(await as(A, `insert into public.provider_endorsements (provider_id, note) values ($1, 'short')`, [P1])).error, 'endorsement notes need a few words')
  ok(!!(await as(A, `insert into public.provider_endorsements (provider_id, user_id, note) values ($1, $2, 'Endorsing as somebody else.')`, [P1, B])).error, 'members cannot endorse in someone else\'s name')
  ok(!(await as(A, `insert into public.provider_endorsements (provider_id, note) values ($1, 'Automated our quoting, saved days.')`, [P1])).error, 'a second member endorses')
  await as(A, `update public.provider_endorsements set note = 'Hijacked endorsement text' where user_id = $1`, [B])
  ok((await svc(`select note from public.provider_endorsements where user_id = '${B}'`))[0].note.startsWith('Found three'), "members cannot edit someone else's endorsement")
  ok(!(await as(B, `update public.provider_endorsements set note = 'Found four leaks in our funnel in a week.' where user_id = $1`, [B])).error, 'the author edits their endorsement')
  ok((await as(A, `delete from public.provider_endorsements where user_id = $1 returning id`, [B])).rows?.length === 0, "members cannot delete someone else's endorsement")
  r = await as(C, `select public.provider_directory() d`)
  const leak = r.rows?.[0]?.d?.find(p => p.id === P1)
  ok(Number(leak?.endorsement_count) === 2 && leak.endorsements.map(e => e.name).sort().join() === 'Ana Avery,Bea Bramwell', 'the directory shows endorsement count and endorsers\' names')
  ok(leak?.fee_pct == null && leak?.nomination_note == null, 'members do not see fees or nomination notes in the directory')
  ok(!r.rows?.[0]?.d?.some(p => p.id === PENDING), 'pending providers stay out of the member directory')
  ok((await as(ADMIN, `select public.provider_directory() d`)).rows?.[0]?.d?.some(p => p.id === PENDING), 'admins see every provider')
  ok((await as(B, `delete from public.provider_endorsements where user_id = $1 returning id`, [B])).rows?.length === 1, 'the author deletes their endorsement')
  ok((await as(ADMIN, `delete from public.provider_endorsements where user_id = $1 returning id`, [A])).rows?.length === 1, 'admins can remove an endorsement')
  ok(!!(await as(A, `update public.provider_endorsements set provider_id = $1`, [P2])).error, 'an endorsement cannot be moved to another provider')
  await as(A, `update public.service_providers set description = 'Rewritten by a member who is not an admin.' where id = $1`, [P1])
  ok((await svc(`select description from public.service_providers where id = '${P1}'`))[0].description === desc, 'members cannot edit provider details')
  ok(!(await as(ADMIN, `update public.service_providers set regions = '{US,UK,EU}' where id = $1`, [P1])).error, 'admins edit provider details')

  // Success fees: admins only; none means no fee.
  ok(!!(await as(A, `select public.admin_set_provider_fee($1, 10)`, [P1])).error, 'members cannot set fees')
  ok(!(await as(ADMIN, `select public.admin_set_provider_fee($1, 10)`, [P1])).error, 'admins set a success fee %')
  ok(!!(await as(ADMIN, `select public.admin_set_provider_fee($1, 80)`, [P1])).error, 'fees must be sensible')
  ok((await as(A, `select * from public.provider_fees`)).rows?.length === 0, 'members cannot read fees')
  ok((await as(ADMIN, `select fee_pct from public.provider_fees`)).rows?.length === 1, 'admins read fees')
  ok(!!(await as(ADMIN, `insert into public.provider_fees (provider_id, fee_pct) values ($1, 5)`, [P2])).error, 'fees change only through the admin function')

  // Referral requests.
  r = await as(A, `insert into public.provider_requests (category, need, budget_range, urgency, private_notes) values ('ai_automation', 'Our sales team re-types every lead into three systems.', '10k_50k', 'this_month', 'Cash is tight until Q3') returning id, status`)
  ok(!r.error && r.rows?.[0]?.status === 'open', 'a member asks for help in a category')
  const REQ = r.rows?.[0]?.id
  ok(!!(await as(A, `insert into public.provider_requests (category, need, status) values ('legal', 'Need a contract reviewed quickly please.', 'engaged')`)).error, 'members cannot set the status themselves')
  ok(!!(await as(A, `insert into public.provider_requests (category, need, budget_range) values ('legal', 'Need a contract reviewed quickly please.', 'a lot')`)).error, 'budget range must be from the list')
  ok(!!(await as(A, `insert into public.provider_requests (category, need) values ('legal', 'help')`)).error, 'the need must be described')
  ok((await as(B, `select id from public.provider_requests`)).rows?.length === 0, "members do not see others' requests")
  ok((await as(ADMIN, `select id from public.provider_requests`)).rows?.length === 1, 'admins see every request')
  await as(A, `update public.provider_requests set status = 'completed' where id = $1`, [REQ])
  ok((await svc(`select status from public.provider_requests where id = '${REQ}'`))[0].status === 'open', 'members cannot change status directly')
  ok(!(await as(A, `update public.provider_requests set private_notes = 'Board approved budget' where id = $1`, [REQ])).error, 'members edit their private notes')

  // Routing.
  ok(!!(await as(A, `select public.provider_request_route($1, array[$2]::uuid[])`, [REQ, P1])).error, 'only admins route requests')
  ok(!!(await as(ADMIN, `select public.provider_request_route($1, array[$2]::uuid[])`, [REQ, PENDING])).error, 'requests route only to approved providers')
  ok(!!(await as(ADMIN, `select public.provider_request_route($1, array[$2,$3,$4,$5]::uuid[])`, [REQ, P1, P2, P3, P4])).error, 'at most 3 providers per request')
  ok(!(await as(ADMIN, `select public.provider_request_route($1, array[$2,$3]::uuid[], 'Both have fixed this for logistics firms.')`, [REQ, P1, P2])).error, 'admins route a request to approved providers')
  ok((await svc(`select status from public.provider_requests where id = '${REQ}'`))[0].status === 'matched', 'the request becomes matched')
  ok(!!(await as(ADMIN, `select public.provider_request_route($1, array[$2,$3]::uuid[])`, [REQ, P3, P4])).error, 'adding more cannot exceed 3 in total')
  r = await svc(`select user_id, kind, text from public.notifications where kind like 'provider%' order by kind`)
  ok(r.filter(n => n.kind === 'provider_matched' && n.user_id === A).length === 1, 'the member is notified once when matched')
  ok(r.filter(n => n.kind === 'provider_request' && n.user_id === C).length === 1 && r.filter(n => n.kind === 'provider_request').length === 1, "only the provider's contact member (if set) is notified")
  ok(!r.some(n => n.text.includes('Board approved')), 'notifications never carry private notes')
  r = await as(A, `select public.my_provider_requests() d`)
  ok(r.rows?.[0]?.d?.[0]?.matches?.length === 2, 'the member sees their matches')

  // Provider contact members: routed requests only, never private notes.
  ok((await as(C, `select id from public.provider_requests`)).rows?.length === 0, 'provider contacts cannot read the requests table')
  ok((await as(C, `select provider_id from public.provider_request_matches`)).rows?.length === 1, 'provider contacts see matches for their provider only')
  ok((await as(B, `select provider_id from public.provider_request_matches`)).rows?.length === 0, 'others see no matches')
  r = await as(C, `select public.provider_inbox() d`)
  const item = r.rows?.[0]?.d?.[0]
  ok(item?.need?.includes('re-types') && item.budget_range === '10k_50k' && item.urgency === 'this_month', 'provider contacts see need, budget and urgency')
  ok(!JSON.stringify(r.rows?.[0]?.d).includes('Board approved') && item?.member == null, 'but not private notes, nor who asked before engagement')
  ok((await as(B, `select public.provider_inbox() d`)).rows?.[0]?.d?.length === 0, 'members with no provider have an empty inbox')

  // Engagement and outcome.
  ok(!!(await as(B, `select public.provider_request_engage($1, $2)`, [REQ, P1])).error, "members cannot engage on someone else's request")
  ok(!!(await as(A, `select public.provider_request_engage($1, $2)`, [REQ, P3])).error, 'members engage only one of their matches')
  ok(!!(await as(A, `select public.provider_request_update($1, 'completed', 100)`, [REQ])).error, 'a request cannot complete before engagement')
  ok(!(await as(A, `select public.provider_request_engage($1, $2)`, [REQ, P1])).error, 'the member marks a match engaged')
  ok((await svc(`select status from public.provider_requests where id = '${REQ}'`))[0].status === 'engaged', 'the request becomes engaged')
  ok(!!(await as(A, `select public.provider_request_engage($1, $2)`, [REQ, P2])).error, 'only one provider is engaged')
  ok(!!(await as(ADMIN, `select public.provider_request_route($1, array[$2]::uuid[])`, [REQ, P3])).error, 'engaged requests are not re-routed')
  r = await as(C, `select public.provider_inbox() d`)
  ok(r.rows?.[0]?.d?.[0]?.member === 'Ana Avery', 'the engaged provider then sees who asked')
  ok(!!(await as(B, `select public.provider_request_update($1, 'completed', 5000000)`, [REQ])).error, 'outsiders cannot report outcomes')
  ok(!(await as(A, `select public.provider_request_update($1, 'engaged', 5000000)`, [REQ])).error, 'the member reports the deal value')
  r = await as(ADMIN, `select public.admin_provider_summary() s`)
  ok(Number(r.rows?.[0]?.s?.engaged_value_cents) === 5000000 && Number(r.rows[0].s.expected_fee_cents) === 500000, 'admins see engaged value and expected fees')
  ok(Number(r.rows?.[0]?.s?.by_status?.engaged) === 1 && Number(r.rows[0].s.pending_nominations) === 1, 'admins see requests by status and pending nominations')
  ok(!!(await as(A, `select public.admin_provider_summary()`)).error, 'members cannot see the revenue view')
  ok(!!(await as(A, `select public.admin_provider_requests()`)).error, 'members cannot see the admin request list')
  ok((await as(ADMIN, `select public.admin_provider_requests() d`)).rows?.[0]?.d?.[0]?.member === 'Ana Avery', 'admins see who asked')
  ok(!(await as(A, `select public.provider_request_update($1, 'completed')`, [REQ])).error, 'the member completes the request')
  ok(!!(await as(A, `select public.provider_request_update($1, 'closed')`, [REQ])).error, 'a completed request cannot be reopened or closed')
  ok(!!(await as(A, `select public.provider_request_update($1, 'open')`, [REQ])).error, 'requests never go back to open')
  ok(!(await as(ADMIN, `select public.admin_set_provider_fee($1, null)`, [P1])).error, 'admins remove a fee')
  r = await as(ADMIN, `select public.admin_provider_summary() s`)
  ok(Number(r.rows?.[0]?.s?.expected_fee_cents) === 0 && Number(r.rows[0].s.by_status.completed) === 1, 'no fee means no expected fee')

  // Closing, and suspension.
  r = await as(B, `insert into public.provider_requests (category, need) values ('legal', 'Need a shareholder agreement drafted.') returning id`)
  const REQ2 = r.rows?.[0]?.id
  ok(!!(await as(B, `select public.provider_request_update($1, 'engaged', 100)`, [REQ2])).error, 'deal value needs an engaged provider')
  ok(!(await as(B, `select public.provider_request_update($1, 'closed')`, [REQ2])).error, 'the member closes an open request')
  ok(!!(await as(ADMIN, `select public.provider_request_route($1, array[$2]::uuid[])`, [REQ2, P2])).error, 'closed requests are not routed')
  ok(!(await as(ADMIN, `update public.service_providers set status = 'suspended' where id = $1`, [P2])).error, 'admins suspend a provider')
  ok(!(await as(B, `select id from public.service_providers where id = $1`, [P2])).rows?.length, 'suspended providers disappear for members')
  ok((await as(A, `select public.my_provider_requests() d`)).rows?.[0]?.d?.[0]?.matches?.some(m => m.name === 'Second Law LLP'), 'past matches keep their names')
  ok(!!(await as(A, `delete from public.service_providers where id = $1 returning id`, [P1])).error || (await svc(`select count(*)::int n from public.service_providers where id = '${P1}'`))[0].n === 1, 'members cannot remove providers')
}
