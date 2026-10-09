// 0054 Agent Trust Gateway: assistant keys, activity log, agent policy, Agent Inbox, rate limits
const H = c => c.repeat(64)
export default async ({ ok, as, svc, A, B, C }) => {
  console.log('assistant keys')
  ok(!!(await as(B, `select public.create_agent_key($1, 'Mine', array['search_members'], $2, 'ai_abcd1234')`, [B, H('1')])).error, 'members cannot mint keys directly (the server hashes the secret)')
  const kb = (await svc(`select public.create_agent_key('${B}', 'Claude desktop', array['search_members','request_intro','search_members'], '${H('a')}', 'ai_abcd1234') as id`))[0].id
  ok(!!kb, 'the server mints a key for a verified member')
  let failed = false
  try { await svc(`select public.create_agent_key('${A}', 'Mine', array['search_members'], '${H('b')}', 'ai_abcd1234')`) } catch { failed = true }
  ok(failed, 'unverified members cannot get keys')
  failed = false
  try { await svc(`select public.create_agent_key('${B}', 'Bad', array['send_email'], '${H('c')}', 'ai_abcd1234')`) } catch { failed = true }
  ok(failed, 'unknown scopes are refused')
  await svc(`insert into public.member_verifications (user_id, status) values ('${A}', 'verified')`)
  await svc(`select public.create_agent_key('${A}', 'A key', array['create_ask'], '${H('d')}', 'ai_zzzz9999')`)
  let r = await as(B, `select id, name, key_prefix, scopes from public.agent_keys`)
  ok(r.rows?.length === 1 && r.rows[0].name === 'Claude desktop' && r.rows[0].scopes.join() === 'request_intro,search_members', 'members see only their own keys, scopes de-duplicated')
  ok(!!(await as(B, `select key_hash from public.agent_keys`)).error, 'the key hash is never readable by the member')
  ok(!!(await as(B, `select * from public.agent_keys`)).error, 'not even through select *')
  ok(!!(await as(B, `update public.agent_keys set scopes = array['create_ask'] where id = $1`, [kb])).error, 'members cannot widen scopes')
  ok(!!(await as(B, `select public.agent_key_lookup($1)`, [H('a')])).error, 'members cannot look keys up')
  const look = (await svc(`select public.agent_key_lookup('${H('a')}') as k`))[0].k
  ok(look?.user_id === B && look.verified === true && look.rate_per_hour === 60, 'the server resolves a key to its verified owner and limits')
  ok((await svc(`select last_used_at from public.agent_keys where id = '${kb}'`))[0].last_used_at !== null, 'lookup records last use')
  ok((await as(A, `select public.revoke_agent_key($1) as done`, [kb])).rows?.[0]?.done === false, "a member cannot revoke someone else's key")
  ok((await as(B, `select public.revoke_agent_key($1) as done`, [kb])).rows?.[0]?.done === true, 'the owner revokes their key')
  ok((await svc(`select public.agent_key_lookup('${H('a')}') as k`))[0].k === null, 'a revoked key no longer authenticates')

  console.log('activity log')
  await svc(`insert into public.agent_actions (key_id, user_id, action, target, result) values ('${kb}', '${B}', 'search_members', 'cfo', 'ok')`)
  ok((await as(B, `select action from public.agent_actions`)).rows?.length === 1, 'the owner sees their assistant activity')
  ok((await as(A, `select action from public.agent_actions`)).rows?.length === 0, 'other members do not')
  ok(!!(await as(B, `insert into public.agent_actions (user_id, action, result) values ($1, 'create_ask', 'ok')`, [B])).error, 'the log is written by the server only')

  console.log('rate limits')
  const w = `'2026-10-09T10:00:00Z'`
  const hit = async () => (await svc(`select public.agent_rate_hit('ip:x', ${w}, 2) as ok`))[0].ok
  ok(await hit() === true && await hit() === true && await hit() === false, 'a window allows exactly its limit')
  ok((await svc(`select public.agent_rate_hit('ip:x', '2026-10-09T11:00:00Z', 2) as ok`))[0].ok === true, 'the next window starts fresh')
  ok(!!(await as(B, `select public.agent_rate_hit('ip:x', now(), 1000)`)).error, 'members cannot touch counters')

  console.log('agent policy')
  ok(!(await as(B, `insert into public.agent_policies (user_id, handle, mode) values ($1, 'bea', 'off')`, [B])).error, 'members set their own policy')
  ok(!!(await as(A, `insert into public.agent_policies (user_id, handle, mode) values ($1, 'bea2', 'everyone')`, [B])).error, 'but never for someone else')
  ok(!!(await as(A, `insert into public.agent_policies (user_id, mode) values ($1, 'everyone')`, [A])).error, 'accepting requests needs a public handle')
  ok((await as(A, `select * from public.agent_policies`)).rows?.length === 0, "members cannot read another member's policy")
  ok(!!(await as(B, `update public.agent_policies set min_context = 5`)).error, 'limits are bounded')

  const payload = (email, reason) => JSON.stringify({ requester_name: 'Sam Seller', requester_company: 'Acme', requester_email: email, requester_domain: email.split('@')[1], reason, offer: 'A pilot', links: ['https://acme.test'], text_hash: H('e') })
  const prep = async (handle, domain = 'acme.test', hash = H('e')) => (await svc(`select public.agent_inbound_prepare('${handle}', '${domain}', '${hash}') as p`))[0].p
  const record = async (status = 'delivered', email = 'sam@acme.test') => (await svc(`select public.agent_inbound_record('${B}', '${status}', 10, array['ok'], '${payload(email, 'We help logistics CEOs cut freight costs')}'::jsonb) as id`))[0].id

  console.log('policy off: nothing stored, nothing revealed')
  const off = await prep('bea')
  ok(off.found === false && off.member_id === undefined, 'an off policy looks exactly like an unknown handle')
  ok(JSON.stringify(Object.keys(off).sort()) === JSON.stringify(Object.keys(await prep('nobody-here')).sort()), 'same shape as a handle that does not exist')
  ok(await record() === null, 'the server cannot store a request for a member whose policy is off')
  ok((await svc(`select count(*)::int as n from public.agent_inbound_requests`))[0].n === 0, 'so nothing is stored for the member')

  console.log('policy on: screened requests reach the inbox')
  await as(B, `update public.agent_policies set mode = 'everyone', welcome_topics = array['logistics'], refuse_topics = array['crypto']`)
  const on = await prep('BEA')
  ok(on.found === true && on.member_id === B && on.mode === 'everyone' && on.duplicates === 2 && on.domain_blocked === false, 'handles are case-insensitive and duplicates are counted')
  await as(A, `insert into public.agent_policies (user_id, handle, mode) values ($1, 'alex', 'everyone')`, [A])
  await svc(`update public.member_verifications set status = 'pending' where user_id = '${A}'`)
  ok((await prep('alex')).found === false, 'unverified members are never reachable')
  const id = await record()
  ok(!!id, 'a delivered request is stored')
  ok((await as(B, `select requester_name, status from public.agent_inbound_requests`)).rows?.[0]?.status === 'delivered', 'the member sees it in their Agent Inbox')
  ok(!!(await as(B, `select requester_email from public.agent_inbound_requests`)).error, 'but not the email before accepting')
  ok((await as(B, `select public.agent_request_contact($1) as e`, [id])).rows?.[0]?.e === null, 'nor through the contact lookup')
  ok((await as(A, `select id from public.agent_inbound_requests`)).rows?.length === 0, "other members never see someone's inbox")
  ok((await as(B, `select count(*)::int as n from public.notifications where kind = 'agent_request'`)).rows?.[0]?.n === 1, 'a delivered request notifies the member')
  await record('held', 'pat@acme.test')
  ok((await as(B, `select count(*)::int as n from public.notifications where kind = 'agent_request'`)).rows?.[0]?.n === 1, 'a held request does not notify')
  ok(!!(await as(A, `select public.decide_agent_request($1, 'accept')`, [id])).error, "members cannot decide another member's request")
  ok(!!(await as(B, `update public.agent_inbound_requests set status = 'accepted' where id = $1`, [id])).error, 'decisions go through the decision function')

  r = await as(B, `select public.decide_agent_request($1, 'accept') as d`, [id])
  ok(r.rows?.[0]?.d?.email === 'sam@acme.test', 'accepting reveals the email to the member')
  ok((await as(B, `select public.agent_request_contact($1) as e`, [id])).rows?.[0]?.e === 'sam@acme.test', 'and keeps it available to them')
  ok((await svc(`select full_name, source from public.crm_people where owner_id = '${B}'`))[0]?.source === 'Agent Inbox', 'and adds the requester to their CRM')
  ok(!!(await as(B, `select public.decide_agent_request($1, 'decline')`, [id])).error, 'a decided request cannot be decided again')

  console.log('blocked domains')
  const spam = await record('delivered', 'bot@spam.test')
  r = await as(B, `select public.decide_agent_request($1, 'block') as d`, [spam])
  ok(r.rows?.[0]?.d?.domain === 'spam.test', 'members can block a sender domain')
  ok((await as(B, `select domain from public.agent_blocked_domains`)).rows?.[0]?.domain === 'spam.test', 'and see their block list')
  ok((await as(A, `select domain from public.agent_blocked_domains`)).rows?.length === 0, "but not anyone else's")
  ok((await prep('bea', 'spam.test', H('f'))).domain_blocked === true, 'screening sees the block')
  ok(await record('delivered', 'other@spam.test') === null, 'and a blocked domain is never stored')
  ok(!!(await as(B, `insert into public.agent_blocked_domains (user_id, domain) values ($1, 'x.test')`, [B])).error, 'blocks are added by deciding a request')

  console.log('visitors')
  for (const t of ['agent_keys', 'agent_actions', 'agent_policies', 'agent_inbound_requests', 'agent_blocked_domains', 'agent_rate_counters', 'agent_inbound_hashes'])
    ok(!!(await as(null, `select 1 from public.${t}`)).error, `anon cannot read ${t}`)
  ok(!!(await as(null, `select public.agent_inbound_prepare('bea', 'acme.test', $1)`, [H('e')])).error, 'anon cannot call screening functions')
  ok(!!(await as(C, `select public.agent_inbound_prepare('bea', 'acme.test', $1)`, [H('e')])).error, 'nor can members')
}
