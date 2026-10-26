// OFFLINE ONLY. Builds a synthetic partially recovered catalog in disposable
// PGlite. No production client, credentials, environment or ledger writes.
import { PGlite } from '@electric-sql/pglite'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const read = name => readFileSync(new URL('../../' + name, import.meta.url), 'utf8')
const migrations = JSON.parse(read('drizzle/migrations/meta/_journal.json')).entries
const families = [
  { name: 'Private Library with export denial', numbers: [65, 66] },
  { name: 'Track Record entries', numbers: [69] },
  { name: 'Storefront and Proposals', numbers: [74] },
]
const missing = new Set(families.flatMap(family => family.numbers))
const filesFor = family => migrations.filter(entry => family.numbers.includes(Number(entry.tag.slice(0, 4)))).map(entry => entry.tag)
const statements = family => filesFor(family).map(tag => read('drizzle/migrations/' + tag + '.sql')).join('\n')
const tablesIn = source => [...source.matchAll(/CREATE\s+TABLE\s+public\.(\w+)/gi)].map(match => match[1])
async function assertEntireFamilyAbsent(db, family) {
  const source = statements(family)
  for (const table of tablesIn(source)) {
    assert.equal((await db.query('select to_regclass($1) as name', ['public.' + table])).rows[0].name, null, 'Refuse existing/partial family: ' + table)
  }
  for (const name of new Set([...source.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+public\.(\w+)/gi)].map(match => match[1]))) {
    const result = await db.query("select count(*)::int as n from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=$1", [name])
    assert.equal(result.rows[0].n, 0, 'Refuse existing routine requiring definition review: ' + name)
  }
}

const db = new PGlite()
const A = '00000000-0000-4000-8000-00000000000a'
const B = '00000000-0000-4000-8000-00000000000b'
const C = '00000000-0000-4000-8000-00000000000c'
const ADMIN = '00000000-0000-4000-8000-0000000000ad'
let checks = 0
const ok = (condition, message) => { assert.ok(condition, message); checks++ }
const as = async (uid, sql, params = []) => {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false); set role ${uid ? 'authenticated' : 'anon'}`)
  try { return { rows: (await db.query(sql, params)).rows } }
  catch (error) { return { error: error.message } }
  finally { await db.exec('reset role') }
}
const svc = async sql => {
  await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false)")
  return (await db.query(sql)).rows
}
try {
  // Reuse the canonical harness's frozen synthetic base without evaluating JS.
  const harness = read('scripts/migration-checks/run.mjs')
  const base = harness.split('const BASE = `')[1]?.split('`\n\n// Rows')[0]
  assert.ok(base && !base.includes('${'), 'Synthetic base must remain literal SQL')
  await db.exec(base)
  // Later evidence-loop migrations reference the canonical executive
  // recommendations table from 0001. Reproduce the historical prerequisite
  // in this disposable rehearsal just as the main migration harness does.
  // This does not touch production schemas or migration ledgers.
  const verificationHistory = read('supabase/migrations/20260916200912_3964645f-20d3-4e4d-8641-441afae91086.sql')
  const verifiedMemberFunction = verificationHistory.match(/create or replace function public\.is_verified_member\(\)[\s\S]*?\$\$;/i)?.[0]
  assert.ok(verifiedMemberFunction, 'Historical verified member helper must be present in the synthetic fixture')
  await db.exec(verifiedMemberFunction)
  await db.exec(read('drizzle/migrations/0001_unified_executive_profiles_and_recommendations.sql'))
  // Migration 0099 assumes the actual original Passport table/RLS from 0003,
  // which predates this deliberately minimal (0022+) synthetic baseline.
  // Load that frozen prerequisite; do not invent or replay any newer schema.
  const history = read('drizzle/migrations/0003_opportunity_graph_foundation.sql')
  const originalPassport = history.match(/-- Passports\s*([\s\S]*?)create or replace function public\.get_passport\(/i)?.[1]
  assert.ok(originalPassport, 'Historical Passport table/RLS must exist in the recovery fixture')
  await db.exec(originalPassport)
  for (const id of [A, B, C, ADMIN]) {
    await db.query('insert into auth.users(id,email_confirmed_at) values($1,now())', [id])
    await db.query('insert into public.profiles(id,name) values($1,$2)', [id, 'Synthetic member'])
  }
  await db.query("insert into public.user_roles(user_id,role) values($1,'admin')", [ADMIN])
  for (const entry of migrations.filter(entry => Number(entry.tag.slice(0, 4)) >= 22 && !missing.has(Number(entry.tag.slice(0, 4))))) {
    if (entry.tag === '0100_repair_warm_referrals_and_syndication_rooms')
      await db.exec(read('scripts/recovery/fixtures/0100_legacy_live_prerequisites.sql'))
    await db.exec(read('drizzle/migrations/' + entry.tag + '.sql'))
  }
  const before = await svc('select id,name from public.profiles order by id')
  for (const family of families) {
    await assertEntireFamilyAbsent(db, family)
    // Historical source stays unchanged; these are disposable compatibility
    // diagnostics, never a production migration executor or ledger repair.
    await db.exec('begin')
    try { await db.exec(statements(family)); await db.exec('commit') }
    catch (error) { await db.exec('rollback'); throw error }
    await assert.rejects(assertEntireFamilyAbsent(db, family), /Refuse existing/)
    for (const tag of filesFor(family)) console.log('Rehearsed', tag, createHash('sha256').update(read('drizzle/migrations/' + tag + '.sql')).digest('hex'))
  }
  assert.deepEqual(await svc('select id,name from public.profiles order by id'), before, 'Recovery preserves pre-existing synthetic profiles')
  // Explicit fixture ONLY: module tests do not stand in for real signup,
  // confirmation, onboarding or approved-member acceptance on the published API.
  await db.exec("create or replace function public.is_live_member() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from profiles where id=auth.uid()) $$")
  for (const suite of ['private-library', 'storefront-proposals']) {
    await (await import('../migration-checks/' + suite + '.check.mjs')).default({ db, ok, as, svc, A, B, C, ADMIN })
  }
  const created = await as(A, "insert into track_record_entries(kind,title,public,verified) values('milestone_delivered','Synthetic private milestone',false,true) returning id,verified")
  ok(created.rows?.[0]?.verified === false, 'Track-record inserts cannot self-verify')
  const id = created.rows[0].id
  ok((await as(B, 'select id from track_record_entries where id=$1', [id])).rows?.length === 0, 'Another member cannot read a private outcome')
  ok(!!(await as(A, 'update track_record_entries set verified=true where id=$1', [id])).error, 'Members cannot forge verified outcomes')
  ok((await as(C, "update track_record_entries set title='Forged milestone' where id=$1 returning id", [id])).rows?.length === 0, 'An outsider cannot edit an outcome')
  ok(!!(await as(null, 'select id from track_record_entries')).error, 'Anonymous access is denied')
  console.log(`${checks} synthetic access/workflow assertions passed; production compatibility, backup and activation remain unverified.`)
} finally { await db.close() }
