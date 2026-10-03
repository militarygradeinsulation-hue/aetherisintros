// Professional enrichment isolation tests against the live schema in disposable PGlite.
import { makeDb } from './load'

const A = '00000000-0000-4000-8000-00000000000a'
const B = '00000000-0000-4000-8000-00000000000b'
const pA = '30000000-0000-4000-8000-00000000000a'
const pA2 = '30000000-0000-4000-8000-0000000000a2'
const pB = '30000000-0000-4000-8000-00000000000b'

const { db, fails } = await makeDb()
if (fails.length) { console.log('SCHEMA LOAD FAILED', fails); process.exit(1) }
await db.exec(`
  insert into auth.users(id,email) values ('${A}','a@test.local'),('${B}','b@test.local');
  insert into public.crm_people(id, owner_id, full_name, title, company_name, location, notes, email)
    values ('${pA}','${A}','Mara Solis','COO','Northwind','Lisbon','private note','mara@private.test'),
           ('${pA2}','${A}','Mara S.','','','','',''),
           ('${pB}','${B}','Other Person','','','','','');
`)
let pass = 0, fail = 0; const results: string[] = []
async function as(uid: string | null, sql: string) {
  const role = uid ? 'authenticated' : 'anon'
  const claims = JSON.stringify(uid ? { sub: uid, role } : { role })
  await db.exec('begin')
  try {
    await db.exec(`set local role ${role}; select set_config('request.jwt.claims', '${claims}', true);`)
    const r = await db.query(sql); await db.exec('commit'); return { ok: true, rows: r.rows as any[], err: '' }
  } catch (e: any) { await db.exec('rollback'); return { ok: false, rows: [] as any[], err: e.message as string } }
}
const check = (n: string, c: boolean, d = '') => { c ? pass++ : fail++; results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${!c && d ? '  — ' + d : ''}`) }
const denied = (r: { ok: boolean }) => !r.ok

const run = (await as(A, `select public.start_capability_run('enrich.person.professional','find','person','${pA}') id`)).rows[0]?.id
for (const s of ['context_built', 'running', 'needs_input', 'running']) await as(A, `select public.set_capability_run_status('${run}','${s}')`)
const cand = (o: Record<string, unknown>) => `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`
const c1 = { full_name: 'Mara Solis', title: 'Chief Operating Officer', company: 'Northwind', location: 'Lisbon', follower_count: 1200, profile_url: 'https://www.linkedin.com/in/mara-solis', raw_html: '<x>', email: 'leak@x' }
const q = `'{"full_name":"Mara Solis","company":"Northwind","email":"mara@private.test","notes":"private note"}'::jsonb`

const r1 = await as(A, `select public.confirm_professional_profile('${run}','${pA}',${cand(c1)},${q},'manual',0.9,'{Exact name}') r`)
check('A confirms a candidate on own person', r1.ok && r1.rows[0].r.status === 'confirmed', r1.err)
const snap = await as(A, `select normalized, query from public.person_enrichment_snapshots where person_id='${pA}'`)
check('Snapshot stores only allowed fields (unknown keys stripped)', snap.rows.length === 1 && !('raw_html' in snap.rows[0].normalized) && !('email' in snap.rows[0].normalized), JSON.stringify(snap.rows[0]?.normalized))
check('Lookup query never stores email or notes', snap.rows.length === 1 && !('email' in snap.rows[0].query) && !('notes' in snap.rows[0].query), JSON.stringify(snap.rows[0]?.query))
check('CRM title untouched after confirm (proposal required)', (await as(A, `select title from public.crm_people where id='${pA}'`)).rows[0]?.title === 'COO')

const r2 = await as(A, `select public.confirm_professional_profile('${run}','${pA}',${cand(c1)},${q},'manual',0.9,'{}') r`)
check('Identical content dedupes (no new snapshot)', r2.ok && r2.rows[0].r.inserted === false && (await as(A, `select count(*)::int n from public.person_enrichment_snapshots where person_id='${pA}'`)).rows[0].n === 1, r2.err)

const c2 = { ...c1, title: 'CEO', company: 'Contoso' }
const r3 = await as(A, `select public.confirm_professional_profile('${run}','${pA}',${cand(c2)},${q},'manual',0.9,'{}') r`)
check('Changed content adds a snapshot', r3.ok && r3.rows[0].r.inserted === true, r3.err)
check('Role change emits an internal signal', (await as(A, `select count(*)::int n from public.entity_events where entity_id='${pA}' and event='enrichment.role_changed'`)).rows[0].n === 1)

const dup = await as(A, `select public.confirm_professional_profile(null,'${pA2}',${cand(c1)},'{}'::jsonb,'manual',0.5,'{}') r`)
check('Same handle on a second person returns conflict, no import', dup.ok && dup.rows[0].r.status === 'conflict' && (await as(A, `select count(*)::int n from public.person_external_profiles where person_id='${pA2}'`)).rows[0].n === 0, dup.err || JSON.stringify(dup.rows[0]))

check('B cannot read A external profiles', (await as(B, `select id from public.person_external_profiles where owner_id='${A}'`)).rows.length === 0)
check('B cannot read A snapshots', (await as(B, `select id from public.person_enrichment_snapshots where owner_id='${A}'`)).rows.length === 0)
check('B cannot confirm on A person', denied(await as(B, `select public.confirm_professional_profile(null,'${pA}',${cand(c1)},'{}'::jsonb,'manual',0.5,'{}')`)))
check('B cannot use A run', denied(await as(B, `select public.confirm_professional_profile('${run}','${pB}',${cand({ ...c1, profile_url: 'https://linkedin.com/in/other' })},'{}'::jsonb,'manual',0.5,'{}')`)))
check('B cannot reject on A person', denied(await as(B, `select public.reject_professional_candidate('${pA}','https://linkedin.com/in/zzz')`)))
check('Anon cannot read profiles', denied(await as(null, `select id from public.person_external_profiles`)))
check('Anon cannot confirm', denied(await as(null, `select public.confirm_professional_profile(null,'${pA}',${cand(c1)},'{}'::jsonb,'manual',0.5,'{}')`)))
check('A cannot insert snapshots directly', denied(await as(A, `insert into public.person_enrichment_snapshots(owner_id,person_id,source_channel,normalized,content_hash) values ('${A}','${pA}','manual','{}','x')`)))
check('A cannot update snapshots (append-only)', denied(await as(A, `update public.person_enrichment_snapshots set content_hash='y'`)) )
check('A cannot update profile directly', denied(await as(A, `update public.person_external_profiles set status='confirmed'`)))
check('A cannot delete snapshots', denied(await as(A, `delete from public.person_enrichment_snapshots`)))
check('Missing profile link is rejected', denied(await as(A, `select public.confirm_professional_profile(null,'${pA}','{"full_name":"Mara"}'::jsonb,'{}'::jsonb,'manual',0.5,'{}')`)))

// Field proposal requires approval (Level 1).
for (const s of ['result_ready']) await as(A, `select public.set_capability_run_status('${run}','${s}')`)
const prop = (await as(A, `select public.add_capability_proposal('${run}','write','Update title','{"kind":"update_person_field","personId":"${pA}","field":"title","to":"CEO"}'::jsonb,'person','${pA}') id`)).rows[0]?.id
check('Field proposal created', Boolean(prop))
check('Unapproved field proposal cannot be applied', denied(await as(A, `select public.apply_professional_field('${prop}')`)))
check('Direct apply is refused (write impact must queue)', denied(await as(A, `select public.decide_capability_proposal('${prop}','apply')`)))
const ap = (await as(A, `select public.decide_capability_proposal('${prop}','queue') id`)).rows[0]?.id
await as(A, `update public.approval_queue set status='approved', acted_at=now() where id='${ap}'`)
check('B cannot apply A approved proposal', denied(await as(B, `select public.apply_professional_field('${prop}')`)))
const app = await as(A, `select public.apply_professional_field('${prop}')`)
check('Approved proposal applies to canonical person', app.ok && (await as(A, `select title from public.crm_people where id='${pA}'`)).rows[0]?.title === 'CEO', app.err)
check('Applied change recorded with provenance', (await as(A, `select count(*)::int n from public.entity_events where entity_id='${pA}' and event='enrichment.field_applied'`)).rows[0].n === 1)
const bad = (await as(A, `select public.add_capability_proposal('${run}','write','x','{"kind":"update_person_field","personId":"${pA}","field":"notes","to":"x"}'::jsonb,'person','${pA}') id`)).rows[0]?.id
const apb = (await as(A, `select public.decide_capability_proposal('${bad}','queue') id`)).rows[0]?.id
await as(A, `update public.approval_queue set status='approved', acted_at=now() where id='${apb}'`)
check('Non-allow-listed field (notes) is refused even when approved', denied(await as(A, `select public.apply_professional_field('${bad}')`)))
check('Private notes unchanged', (await as(A, `select notes from public.crm_people where id='${pA}'`)).rows[0]?.notes === 'private note')
check('No member verification rows touched', (await as(A, `select count(*)::int n from public.member_verifications`)).rows[0]?.n === 0)

console.log(results.join('\n')); console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0)
