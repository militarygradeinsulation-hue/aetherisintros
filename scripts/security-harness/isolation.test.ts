// Isolation harness: loads the LIVE public schema (structure only, no data) into an
// in-memory Postgres, creates disposable identities and rows, and exercises the
// real policies/RPCs as the `authenticated` / `anon` roles. Nothing touches the live DB.
import { makeDb } from './load'

const A = '00000000-0000-4000-8000-00000000000a'
const B = '00000000-0000-4000-8000-00000000000b'
const D = '00000000-0000-4000-8000-00000000000d' // delegate of A
const cA = '10000000-0000-4000-8000-00000000000a'
const cA2 = '10000000-0000-4000-8000-0000000000a2'
const cB = '10000000-0000-4000-8000-00000000000b'
const delId = '20000000-0000-4000-8000-00000000000d'

const { db, fails } = await makeDb()
if (fails.length) { console.log('SCHEMA LOAD FAILED', fails); process.exit(1) }

await db.exec(`
  insert into auth.users(id,email) values ('${A}','a@test.local'),('${B}','b@test.local'),('${D}','d@test.local');
  insert into public.crm_companies(id, owner_id, name) values ('${cA}','${A}','A Co'),('${cA2}','${A}','A Co 2'),('${cB}','${B}','B Co');
  insert into public.delegates(id, principal_id, delegate_email, delegate_user_id, status, permissions) values ('${delId}','${A}','d@test.local','${D}','active','{}');
  insert into public.digital_you_rules(owner_id, rule_kind) values ('${A}','allow');
`)

let pass = 0, fail = 0
const results: string[] = []
async function as(uid: string | null, sql: string): Promise<{ ok: boolean; rows: any[]; err?: string }> {
  const role = uid ? 'authenticated' : 'anon'
  const claims = uid ? JSON.stringify({ sub: uid, role }) : JSON.stringify({ role })
  await db.exec('begin')
  try {
    await db.exec(`set local role ${role}; select set_config('request.jwt.claims', '${claims}', true);`)
    const r = await db.query(sql)
    await db.exec('commit')
    return { ok: true, rows: r.rows as any[] }
  } catch (e: any) {
    await db.exec('rollback')
    return { ok: false, rows: [], err: e.message }
  }
}
function check(name: string, cond: boolean, detail = '') {
  cond ? pass++ : fail++
  results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? '  — ' + detail : ''}`)
}
const denied = (r: { ok: boolean; rows: any[] }) => !r.ok
const empty = (r: { ok: boolean; rows: any[] }) => r.ok && r.rows.length === 0

// ---------- owner A happy path ----------
const run = await as(A, `select public.start_capability_run('system.noop_check','test','company','${cA}') id`)
check('A can start a run on own company', run.ok, run.err)
const runA = run.rows[0]?.id
for (const s of ['context_built', 'running']) await as(A, `select public.set_capability_run_status('${runA}','${s}')`)
const fA = await as(A, `select public.add_capability_finding('${runA}','risk','A private finding') id`)
check('A can add finding to own run', fA.ok, fA.err)
const findingA = fA.rows[0]?.id
const pA = await as(A, `select public.add_capability_proposal('${runA}','write','Update A Co','{}'::jsonb,'company','${cA}') id`)
check('A can add proposal to own run', pA.ok, pA.err)
const propA = pA.rows[0]?.id

// ---------- cross-account: B vs A ----------
check('B cannot read A runs', empty(await as(B, `select id from public.capability_runs where id='${runA}'`)))
check('B cannot read A findings', empty(await as(B, `select id from public.capability_findings where id='${findingA}'`)))
check('B cannot read A proposals', empty(await as(B, `select id from public.capability_proposals where id='${propA}'`)))
check('B cannot read A capability events', empty(await as(B, `select id from public.entity_events where owner_id='${A}'`)))
check('B cannot start a run on A company', denied(await as(B, `select public.start_capability_run('system.noop_check','test','company','${cA}')`)))
check('B cannot change A run status', denied(await as(B, `select public.set_capability_run_status('${runA}','result_ready')`)))
check('B cannot add finding to A run', denied(await as(B, `select public.add_capability_finding('${runA}','risk','x')`)))
check('B cannot resolve A finding', denied(await as(B, `select public.resolve_capability_finding('${findingA}','dismissed')`)))
check('B cannot add proposal to A run', denied(await as(B, `select public.add_capability_proposal('${runA}','read','x','{}'::jsonb,'company',null)`)))
check('B cannot decide A proposal', denied(await as(B, `select public.decide_capability_proposal('${propA}','apply')`)))
check('B cannot append event to A run', denied(await as(B, `select public.append_capability_event('${runA}','capability.running')`)))
check('B cannot insert capability rows directly', denied(await as(B, `insert into public.capability_runs(owner_id,actor_id,capability_id,verb,subject_type,subject_id) values ('${A}','${B}','system.noop_check','test','self','${A}')`)))
check('A cannot insert own capability rows directly (RPC only)', denied(await as(A, `insert into public.capability_findings(owner_id,run_id,capability_id,subject_type,subject_id,kind,claim) values ('${A}','${runA}','system.noop_check','company','${cA}','risk','forged')`)))
check('A cannot update own run directly', denied(await as(A, `update public.capability_runs set status='applied' where id='${runA}'`)))
check('A cannot forge capability-sourced events', denied(await as(A, `insert into public.entity_events(owner_id,entity_type,entity_id,event,summary,source) values ('${A}','company','${cA}','capability.applied','forged','capability')`)))
check('A cannot write events as B', denied(await as(A, `insert into public.entity_events(owner_id,entity_type,entity_id,event,summary,source) values ('${B}','company','${cB}','note','x','app')`)))
check('A can still write normal app events', (await as(A, `insert into public.entity_events(owner_id,entity_type,entity_id,event,summary,source) values ('${A}','company','${cA}','note.added','ok','app') returning id`)).ok)

// ---------- entity links ----------
check('A can link two own records (RPC)', (await as(A, `select public.link_entities('company','${cA}','company','${cA2}')`)).ok)
check('A cannot link to B company (RPC)', denied(await as(A, `select public.link_entities('company','${cA}','company','${cB}')`)))
check('A cannot link to B company (direct insert)', denied(await as(A, `insert into public.entity_links(owner_id,from_type,from_id,to_type,to_id,relation) values ('${A}','company','${cA}','company','${cB}','linked')`)))
check('A cannot link to B run', denied(await as(A, `select public.link_entities('company','${cA}','capability_run','${runA.replace(/.$/, '0')}')`)))
check('A cannot insert link owned by B', denied(await as(A, `insert into public.entity_links(owner_id,from_type,from_id,to_type,to_id,relation) values ('${B}','company','${cB}','company','${cB}','linked')`)))
check('Unknown link type rejected', denied(await as(A, `select public.link_entities('company','${cA}','spaceship','${cA2}')`)))
check('B cannot see A links', empty(await as(B, `select id from public.entity_links where owner_id='${A}'`)))

// ---------- approvals ----------
const q = await as(A, `select public.decide_capability_proposal('${propA}','apply')`)
check('A cannot auto-apply a write proposal (Level 1)', denied(q))
const queued = await as(A, `select public.decide_capability_proposal('${propA}','queue') id`)
check('A can queue write proposal for approval', queued.ok, queued.err)
const apprA = queued.rows[0]?.id
check('A cannot insert already-approved approval', denied(await as(A, `insert into public.approval_queue(user_id,action_type,summary,status) values ('${A}','crm_task','x','approved')`)))
check('A cannot insert capability_proposal approval directly', denied(await as(A, `insert into public.approval_queue(user_id,action_type,summary) values ('${A}','capability_proposal','x')`)))
check('A cannot execute pending approval', denied(await as(A, `select public.mark_approval_executed('${apprA}')`)))
check('A cannot set executed directly', empty(await as(A, `update public.approval_queue set status='executed' where id='${apprA}' returning id`)) || denied(await as(A, `update public.approval_queue set status='executed' where id='${apprA}' returning id`)))
check('B cannot see A approvals', empty(await as(B, `select id from public.approval_queue where id='${apprA}'`)))
check('B cannot approve A approval', empty(await as(B, `update public.approval_queue set status='approved' where id='${apprA}' returning id`)))
check('B cannot execute A approval', denied(await as(B, `select public.mark_approval_executed('${apprA}')`)))

// ---------- delegate D (no grants yet) ----------
check('Delegate without grant cannot start run for A', denied(await as(D, `select public.start_capability_run('system.noop_check','test','company','${cA}','{}'::jsonb,'','{}','light','${A}')`)))
check('Delegate without grant cannot read A findings', empty(await as(D, `select id from public.capability_findings where owner_id='${A}'`)))
check('Delegate cannot see A approvals', empty(await as(D, `select id from public.approval_queue where user_id='${A}'`)))
check('Delegate cannot approve A approval', empty(await as(D, `update public.approval_queue set status='approved' where id='${apprA}' returning id`)))
check('Delegate cannot execute A approval', denied(await as(D, `select public.mark_approval_executed('${apprA}')`)))
check('Delegate cannot grant itself access', denied(await as(D, `insert into public.delegate_capability_grants(principal_id,delegate_id,capability_id,access) values ('${A}','${delId}','*','run')`)))
check('Delegate cannot read A Digital You rules', empty(await as(D, `select id from public.digital_you_rules where owner_id='${A}'`)))

// ---------- A grants D a narrow run grant: one capability, one subject ----------
const g = await as(A, `insert into public.delegate_capability_grants(principal_id,delegate_id,capability_id,subject_type,subject_id,access) values ('${A}','${delId}','system.noop_check','company','${cA}','run') returning id`)
check('A can grant D run on one company', g.ok, g.err)
check('B cannot create grants on A delegate', denied(await as(B, `insert into public.delegate_capability_grants(principal_id,delegate_id,capability_id,access) values ('${B}','${delId}','*','run')`)))
const dRun = await as(D, `select public.start_capability_run('system.noop_check','test','company','${cA}','{}'::jsonb,'','{}','light','${A}') id`)
check('Delegate with grant can run on allowed subject', dRun.ok, dRun.err)
const runD = dRun.rows[0]?.id
check('Delegate run is owned by principal, marked delegate', (await as(A, `select 1 from public.capability_runs where id='${runD}' and owner_id='${A}' and actor_id='${D}' and actor_kind='delegate'`)).rows.length === 1)
check('Delegate cannot run on a different A company', denied(await as(D, `select public.start_capability_run('system.noop_check','test','company','${cA2}','{}'::jsonb,'','{}','light','${A}')`)))
check('Delegate cannot run a different capability', denied(await as(D, `select public.start_capability_run('diagnose.company','diagnose','company','${cA}','{}'::jsonb,'','{}','light','${A}')`)))
check('Delegate cannot run on B via A grant', denied(await as(D, `select public.start_capability_run('system.noop_check','test','company','${cB}','{}'::jsonb,'','{}','light','${A}')`)))
check('Delegate cannot act for B (no relationship)', denied(await as(D, `select public.start_capability_run('system.noop_check','test','company','${cB}','{}'::jsonb,'','{}','light','${B}')`)))
for (const s of ['context_built', 'running']) await as(D, `select public.set_capability_run_status('${runD}','${s}')`)
const dFind = await as(D, `select public.add_capability_finding('${runD}','risk','delegate finding') id`)
check('Delegate can add finding within its granted run', dFind.ok, dFind.err)
check('Delegate reads findings on granted subject', (await as(D, `select id from public.capability_findings where subject_id='${cA}'`)).rows.length >= 1)
check('Delegate still cannot read findings on other subject', empty(await as(D, `select id from public.capability_findings where subject_id='${cA2}'`)))
const dProp = await as(D, `select public.add_capability_proposal('${runD}','draft','Delegate draft','{}'::jsonb,'company','${cA}') id`)
check('Delegate can propose within granted run', dProp.ok, dProp.err)
const propD = dProp.rows[0]?.id
check('Delegate cannot decide its own proposal', denied(await as(D, `select public.decide_capability_proposal('${propD}','apply')`)))
check('Principal cannot auto-apply delegate draft (no inherited allow)', denied(await as(A, `select public.decide_capability_proposal('${propD}','apply')`)))
check('Delegate cannot mark its run applied', denied(await as(D, `select public.set_capability_run_status('${runD}','applied')`)))
check('Delegate cannot read A findings from A-only run', empty(await as(D, `select id from public.capability_findings where run_id='${runA}' and subject_id<>'${cA}'`)))

// ---------- revocation ----------
const rv = await as(A, `update public.delegates set status='revoked' where id='${delId}' returning status`); check('Unverified principal can still revoke delegate', rv.ok && rv.rows.length === 1, rv.err)
check('Revoked delegate cannot run', denied(await as(D, `select public.start_capability_run('system.noop_check','test','company','${cA}','{}'::jsonb,'','{}','light','${A}')`)))
check('Revoked delegate loses finding read', empty(await as(D, `select id from public.capability_findings where subject_id='${cA}'`)))

// ---------- A approves → executes ----------
check('A approves own approval', (await as(A, `update public.approval_queue set status='approved' where id='${apprA}' returning id`)).rows.length === 1)
check('A approved content is frozen', (r => denied(r) || empty(r))(await as(A, `update public.approval_queue set summary='changed' where id='${apprA}' returning id`)))
check('A executes via server RPC', (await as(A, `select public.mark_approval_executed('${apprA}')`)).ok)
check('Proposal applied after execution', (await as(A, `select 1 from public.capability_proposals where id='${propA}' and status='applied'`)).rows.length === 1)

// ---------- anonymous ----------
for (const t of ['capability_runs', 'capability_findings', 'capability_proposals', 'capability_usage', 'approval_queue', 'entity_links', 'entity_events', 'delegate_capability_grants', 'digital_you_rules'])
  check(`anon cannot read ${t}`, denied(await as(null, `select 1 from public.${t} limit 1`)))
for (const f of [`start_capability_run('system.noop_check','test','self','${A}')`, `link_entities('company','${cA}','company','${cA2}')`, `mark_approval_executed('${apprA}')`, `capability_usage_totals()`])
  check(`anon cannot call ${f.split('(')[0]}`, denied(await as(null, `select public.${f}`)))
check('Signed-in member cannot read usage ledger', denied(await as(A, `select 1 from public.capability_usage limit 1`)))
check('Non-admin cannot read usage totals', denied(await as(B, `select * from public.capability_usage_totals()`)))

// ---------- Diagnose: evidence rule, money, outcomes, web, memory ----------
const dr = await as(A, `select public.start_capability_run('company.diagnose','diagnose','company','${cA}','{}'::jsonb,'','{entity:read}','light') id`)
const runX = dr.rows[0]?.id
for (const s of ['context_built', 'running']) await as(A, `select public.set_capability_run_status('${runX}','${s}')`)
const ev1 = `[{"kind":"record","ref":"crm_opportunities:1"}]`
const ev2 = `[{"kind":"record","ref":"crm_opportunities:1"},{"kind":"record","ref":"crm_activities:2"}]`
check('Leak with one evidence ref is rejected', denied(await as(A, `select public.add_capability_finding_v2('${runX}', '{"kind":"leak","claim":"x","evidence":${ev1}}'::jsonb)`)))
check('Leak with duplicate refs is rejected', denied(await as(A, `select public.add_capability_finding_v2('${runX}', '{"kind":"leak","claim":"x","evidence":[{"kind":"record","ref":"a:1"},{"kind":"record","ref":"a:1"}]}'::jsonb)`)))
const leak = await as(A, `select public.add_capability_finding_v2('${runX}', '{"kind":"leak","claim":"stalled","evidence":${ev2},"financial_classification":"estimated_exposure","financial_low":10,"financial_high":100,"currency":"USD","overlap_group":"opportunity:1"}'::jsonb) id`)
check('Leak with two independent refs is accepted', leak.ok, leak.err)
const fX = leak.rows[0]?.id
check('Money without evidence is rejected', denied(await as(A, `select public.add_capability_finding_v2('${runX}', '{"kind":"risk","claim":"x","financial_classification":"risk_exposure","financial_high":5,"currency":"USD"}'::jsonb)`)))
check('Money without currency is rejected', denied(await as(A, `select public.add_capability_finding_v2('${runX}', '{"kind":"risk","claim":"x","evidence":${ev1},"financial_high":5}'::jsonb)`)))
check('Unverified "verified loss" is rejected', denied(await as(A, `select public.add_capability_finding_v2('${runX}', '{"kind":"risk","claim":"x","evidence":${ev1},"financial_classification":"verified_loss","financial_high":5,"currency":"USD"}'::jsonb)`)))
check('B cannot add findings to A run', denied(await as(B, `select public.add_capability_finding_v2('${runX}', '{"kind":"gap","claim":"x","evidence":${ev1}}'::jsonb)`)))
check('B cannot read A diagnose findings', empty(await as(B, `select id from public.capability_findings where run_id='${runX}'`)))
check('Owner cannot write findings directly', denied(await as(A, `update public.capability_findings set financial_high=999 where id='${fX}'`)) || empty(await as(A, `update public.capability_findings set financial_high=999 where id='${fX}' returning id`)))
check('Recovery refused before any applied action', denied(await as(A, `select public.record_finding_outcome('${fX}','{}'::jsonb, 100, '${ev1}'::jsonb)`)))
check('B cannot record outcome on A finding', denied(await as(B, `select public.record_finding_outcome('${fX}','{}'::jsonb, null, '[]'::jsonb)`)))
check('B cannot set A baseline', denied(await as(B, `select public.set_finding_baseline('${fX}','{}'::jsonb,'{}'::jsonb)`)))
check('Owner can set baseline', (await as(A, `select public.set_finding_baseline('${fX}','{"metric":"days_since_touch","value":30}'::jsonb,'{"metric":"days_since_touch","value":7}'::jsonb)`)).ok)
check('Web domain refused when public research not approved', denied(await as(A, `select public.record_capability_web_domain('${runX}','acme.com')`)))
const pX = await as(A, `select public.add_capability_proposal('${runX}','write','Create task','{"kind":"create_task"}'::jsonb,'company','${cA}','${fX}') id`)
const propX = pX.rows[0]?.id
check('Write proposal cannot be self-applied', denied(await as(A, `select public.decide_capability_proposal('${propX}','apply')`)))
const q = await as(A, `select public.decide_capability_proposal('${propX}','queue') id`); const apX = q.rows[0]?.id
check('B cannot approve A queued action', empty(await as(B, `update public.approval_queue set status='approved' where id='${apX}' returning id`)))
await as(A, `update public.approval_queue set status='approved' where id='${apX}'`)
await as(A, `select public.mark_approval_executed('${apX}')`)
check('Recovery refused without verification evidence', denied(await as(A, `select public.record_finding_outcome('${fX}','{}'::jsonb, 100, '[]'::jsonb)`)))
const rec = await as(A, `select public.record_finding_outcome('${fX}','{"metric":"days_since_touch","value":1}'::jsonb, 100, '${ev1}'::jsonb)`)
check('Verified recovery accepted after applied action with evidence', rec.ok, rec.err)
check('Memory event recorded on subject', (await as(A, `select public.append_capability_event('${runX}','memory.decision','Decided to re-engage')`)).ok)
check('Unknown event namespace rejected', denied(await as(A, `select public.append_capability_event('${runX}','admin.override','x')`)))
check('Link types extended for operating graph', (await as(A, `select public.link_entities('company','${cA}','company','${cA2}','vendor_of')`)).ok)
for (const f of [`add_capability_finding_v2('${runX}','{}'::jsonb)`, `record_finding_outcome('${fX}','{}'::jsonb,null,'[]'::jsonb)`, `set_finding_baseline('${fX}','{}'::jsonb,'{}'::jsonb)`, `record_capability_web_domain('${runX}','a.com')`])
  check(`anon cannot call ${f.split('(')[0]}`, denied(await as(null, `select public.${f}`)))

console.log(results.join('\n'))
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
