// Isolated Postgres only. Runs with the same PGlite dependency as run.mjs.
// The reconciliation SQL is a proposal, not an applied or journaled migration.
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
const root = new URL('../../', import.meta.url)
const read = path => readFileSync(new URL(path, root), 'utf8')
const A = '00000000-0000-4000-8000-00000000000a'
const B = '00000000-0000-4000-8000-00000000000b'
const C = '00000000-0000-4000-8000-00000000000c'
const P = '00000000-0000-4000-8000-000000000001'
let passed = 0
const check = (condition, message) => { assert.ok(condition, message); passed++; console.log('PASS:', message) }
for (const [file, hash] of [
  ['0082_business_lobby', '73c6aeaf54b422351c51da43ca4d0d9dbf298ed52b32c949b268d8ca459d97c3'],
  ['0090_shared_opportunity_exchange', '4c74730371faa0f742880879c2115feb80536abde9a61140ddd4c6c5e4eafa87'],
  ['0092_basic_executive_membership', 'f158ba177a2db3b32d6afdd8d428c1f24779f2e3a59ea4a61d9c522a3e72d34d'],
]) check(createHash('sha256').update(readFileSync(new URL(`drizzle/migrations/${file}.sql`, root))).digest('hex') === hash, `${file} matches pre-prospect bytes`)
const journal = JSON.parse(read('drizzle/migrations/meta/_journal.json')).entries
check(journal.every((entry, i) => entry.idx === i && (i === 0 || entry.when > journal[i - 1].when)), 'journal indices and timestamps remain ordered')
const s36 = JSON.parse(read('drizzle/migrations/meta/0036_snapshot.json'))
const s93 = JSON.parse(read('drizzle/migrations/meta/0093_snapshot.json'))
const s94 = JSON.parse(read('drizzle/migrations/meta/0094_snapshot.json'))
check(s93.prevId === s36.id && s94.prevId === s93.id, 'custom migration snapshot chain remains intact')
const db = new PGlite()
try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
    INSERT INTO auth.users VALUES('${A}'),('${B}'),('${C}');
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO authenticated,anon; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated,anon;
    CREATE FUNCTION public.has_role(uuid,text) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT $1 IN ('${A}'::uuid,'${B}'::uuid) $$;
    CREATE TABLE public.crm_people(id uuid PRIMARY KEY,owner_id uuid,archived boolean DEFAULT false,last_activity_at timestamptz);
    INSERT INTO public.crm_people VALUES('${P}','${A}',false,NULL);
    CREATE TABLE public.crm_activities(owner_id uuid,kind text,subject text,detail text,person_id uuid);
    CREATE TABLE public.entity_events(owner_id uuid,entity_type text,entity_id text,event text,summary text,source text);
  `)
  await db.exec(read('drizzle/migrations/0047_workspace_sync.sql'))
  for (const f of ['0093_private_icp_workspace', '0094_icp_guard_review_history']) await db.exec(read(`drizzle/migrations/${f}.sql`))
  const as = async (uid, sql, params = []) => {
    await db.exec(`SET ROLE ${uid ? 'authenticated' : 'anon'}; SELECT set_config('request.jwt.claim.sub','${uid ?? ''}',false)`)
    try { return await db.query(sql, params) } finally { await db.exec('RESET ROLE') }
  }
  const denied = async (uid, sql, params = []) => { try { await as(uid, sql, params); return false } catch { return true } }
  const key = `icp:person:${P}`
  const save = (uid, status, version, note = 'Hi Alex, I can share an operating checklist.', consent = true) =>
    as(uid, 'SELECT public.icp_save($1,$2::jsonb,$3) AS value', [key, JSON.stringify({ status, note, consent }), version])
  check(await denied(A, 'SELECT icp_save($1,$2::jsonb,0)', [key, '{"status":"draft","note":"valid","consent":true}']), 'existing allowlist blocks ICP persistence: deployment blocker reproduced')
  // Hypothetical allowlist reconciliation, inside this disposable database only.
  // Shows why simply adding ICP keys without fixing the general RPC is unsafe.
  await db.exec('ALTER TABLE member_workspace_state DROP CONSTRAINT member_workspace_state_store_key_check')
  const forged = await as(A, 'SELECT * FROM save_workspace_state($1,$2::jsonb,0)', [key, '{"status":"accepted","note":"forged","consent":false}'])
  check(forged.rows[0].saved, '0094 alone allows general SECURITY DEFINER save bypass when ICP keys are permitted')
  await db.exec('DELETE FROM member_workspace_state')
  await db.exec(read('docs/release-safety/icp-reconciliation.proposed.sql'))
  await db.exec(read('docs/release-safety/icp-reconciliation.proposed.sql'))
  check(true, 'proposed function replacements replay without duplicate-object failures')
  check(await denied(A, 'SELECT * FROM save_workspace_state($1,$2::jsonb,0)', [key, '{"status":"accepted"}']), 'proposal blocks general RPC from forging ICP status')
  check(await denied(A, 'INSERT INTO member_workspace_state(store_key,data) VALUES($1,$2::jsonb)', [key, '{"status":"invited"}']), 'direct authenticated insert cannot forge invitation')
  check(await denied(A, 'UPDATE member_workspace_state SET data=$1::jsonb', ['{"status":"accepted"}']), 'direct authenticated update denied')
  check(await denied(C, 'SELECT icp_save($1,$2::jsonb,0)', [key, '{"status":"draft"}']), 'nonadmin cannot use private ICP RPC')
  check(await denied(null, 'SELECT icp_save($1,$2::jsonb,0)', [key, '{}']), 'anonymous callers cannot use ICP RPC')
  check(await denied(B, 'SELECT icp_save($1,$2::jsonb,0)', [key, '{"status":"draft"}']), 'another admin cannot review another owner’s CRM person')
  check(await denied(A, 'SELECT icp_save($1,$2::jsonb,0)', [key, '{"status":"invited","note":"valid","consent":true}']), 'invited cannot skip approval')
  await save(A, 'draft', 0)
  check((await as(B, 'SELECT * FROM member_workspace_state')).rows.length === 0, 'another admin reads no owner rows')
  check((await as(C, 'SELECT * FROM member_workspace_state')).rows.length === 0, 'nonadmin reads no ICP rows')
  check(await denied(A, 'SELECT icp_save($1,$2::jsonb,1)', [key, '{"status":"approved","note":"valid","consent":false}']), 'approval requires contact permission')
  await save(A, 'approved', 1)
  await save(A, 'invited', 2)
  const activityCount = Number((await db.query('SELECT count(*) AS n FROM crm_activities')).rows[0].n)
  check(activityCount === 3, 'draft, approval and manually invited each create one timeline event')
  const retry = await save(A, 'invited', 2)
  check(Number(retry.rows[0].value.version) === 3, 'lost-response retry returns the saved invitation without another transition')
  check(Number((await db.query('SELECT count(*) AS n FROM crm_activities')).rows[0].n) === activityCount, 'retry does not duplicate review history')
  check(await denied(A, 'SELECT icp_save($1,$2::jsonb,3)', [key, '{"status":"invited","note":"changed","consent":true}']), 'same-status rewrite cannot replace the reviewed note')
  await save(A, 'accepted', 3)
  await save(A, 'follow_up', 4)
  check((await as(A, 'DELETE FROM member_workspace_state WHERE store_key=$1 RETURNING store_key', [key])).rows.length === 0, 'ordinary delete preserves the review state')
  check(Number((await db.query('SELECT count(*) AS n FROM crm_activities')).rows[0].n) === 5, 'manual contact sequence retains all five review events')
  const legacy = await as(A, 'SELECT * FROM save_workspace_state($1,$2::jsonb,0)', ['aetheris-moat-v1-live', '{"unchanged":true}'])
  check(legacy.rows[0].saved, 'unrelated legacy workspace saving remains available')
  console.log(`${passed} isolated release-safety checks passed; no live database modified.`)
} finally { await db.close() }