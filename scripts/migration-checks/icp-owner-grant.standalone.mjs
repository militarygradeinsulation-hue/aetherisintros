// Disposable PGlite only. Exercises the candidate 0095 ICP owner-grant migration.
// node scripts/migration-checks/icp-owner-grant.standalone.mjs
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const root = new URL('../../', import.meta.url)
const read = p => readFileSync(new URL(p, root), 'utf8')
const A = '00000000-0000-4000-8000-00000000000a' // admin + explicit grant
const B = '00000000-0000-4000-8000-00000000000b' // admin, no grant
const C = '00000000-0000-4000-8000-00000000000c' // member
const P = '00000000-0000-4000-8000-000000000001'
let passed = 0
const check = (c, m) => { assert.ok(c, m); passed++; console.log('PASS:', m) }
const db = new PGlite()
try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
    INSERT INTO auth.users VALUES('${A}'),('${B}'),('${C}');
    CREATE TABLE public.profiles(id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE);
    INSERT INTO public.profiles SELECT id FROM auth.users;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO authenticated,anon; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated,anon;
    CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
    CREATE TABLE public.user_roles(user_id uuid, role public.app_role);
    INSERT INTO public.user_roles VALUES('${A}','admin'),('${B}','admin');
    CREATE FUNCTION public.has_role(uuid,public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=$1 AND role=$2) $$;
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
  const denied = async (...a) => { try { await as(...a); return false } catch { return true } }
  const legacy = await as(A, 'SELECT * FROM save_workspace_state($1,$2::jsonb,0)', ['aetheris-pro-v1-live', '{"x":1}'])
  check(legacy.rows[0].saved, 'pre-candidate legacy row exists before migration')
  check(await denied(A, `SELECT public.has_private_owner_grant('prospect_intelligence')`), 'before rollout: grant function missing -> denied')
  const candidate = read('docs/release-safety/0095_icp_owner_grant.candidate.sql')
  await db.exec(candidate); await db.exec(candidate)
  check(true, 'candidate replays twice without errors')
  const key = `icp:person:${P}`
  const save = (uid, status, v, note = 'Hi Alex, I can share an operating checklist.', consent = true) =>
    as(uid, 'SELECT public.icp_save($1,$2::jsonb,$3) AS value', [key, JSON.stringify({ status, note, consent }), v])
  check(await denied(A, 'SELECT icp_save($1,$2::jsonb,0)', [key, '{"status":"draft","note":"x","consent":true}']), 'no grant row: admin owner fails closed')
  check(await denied(A, `INSERT INTO private_owner_grants VALUES($1,'prospect_intelligence','self')`, [A]), 'members cannot grant themselves')
  check((await as(A, 'SELECT * FROM private_owner_grants').catch(() => ({ rows: [] }))).rows.length === 0, 'members cannot read grants')
  await db.query(`INSERT INTO private_owner_grants VALUES($1,'prospect_intelligence','operator')`, [A])
  check(await denied(null, `INSERT INTO private_owner_grants VALUES($1,'prospect_intelligence','operator')`, [B]), 'anonymous cannot grant')
  let second = false; try { await db.query(`INSERT INTO private_owner_grants VALUES($1,'prospect_intelligence','operator')`, [B]); second = true } catch {}
  check(!second, 'a second owner grant cannot be created, even by the operator')
  check((await as(B, `SELECT public.has_private_owner_grant('prospect_intelligence') ok`)).rows[0].ok === false, 'admin with no grant -> false')
  check((await as(C, `SELECT public.has_private_owner_grant('prospect_intelligence') ok`)).rows[0].ok === false, 'wrong role -> false')
  check((await as(A, `SELECT public.has_private_owner_grant('prospect_intelligence') ok`)).rows[0].ok === true, 'granted founder -> true')
  await db.query('DELETE FROM user_roles WHERE user_id=$1', [A])
  check((await as(A, `SELECT public.has_private_owner_grant('prospect_intelligence') ok`)).rows[0].ok === false, 'grant without admin role -> false')
  await db.query(`INSERT INTO user_roles VALUES($1,'admin')`, [A])
  await save(A, 'draft', 0)
  check(true, 'explicitly granted admin can save a draft')
  check(await denied(B, 'SELECT icp_save($1,$2::jsonb,0)', ['icp:profiles', '{"profiles":[]}']), 'admin without grant is refused')
  check(await denied(C, 'SELECT icp_save($1,$2::jsonb,0)', ['icp:profiles', '{"profiles":[]}']), 'member is refused')
  check(await denied(null, 'SELECT icp_save($1,$2::jsonb,0)', ['icp:profiles', '{}']), 'anonymous is refused')
  check(await denied(A, 'SELECT icp_save($1,$2::jsonb,0)', ['icp:person:not-a-uuid', '{}']), 'malformed ICP key rejected')
  check(await denied(A, `INSERT INTO member_workspace_state(store_key,data) VALUES('icp:other','{}')`), 'constraint admits only validated ICP keys')
  check(await denied(A, 'SELECT * FROM save_workspace_state($1,$2::jsonb,1)', [key, '{"status":"accepted"}']), 'general RPC cannot write ICP keys')
  check(await denied(A, 'INSERT INTO member_workspace_state(store_key,data) VALUES($1,$2::jsonb)', ['icp:profiles', '{"profiles":[]}']), 'direct insert refused')
  check(await denied(A, `UPDATE member_workspace_state SET data='{"status":"accepted"}' WHERE store_key=$1`, [key]), 'direct update refused')
  check(await denied(A, 'DELETE FROM member_workspace_state WHERE store_key=$1', [key]) ||
    (await as(A, 'SELECT 1 FROM member_workspace_state WHERE store_key=$1', [key])).rows.length === 1, 'direct delete keeps review history')
  check(await denied(A, `SELECT set_config('app.icp_reviewed_write','${A}',false); UPDATE member_workspace_state SET data='{"status":"accepted"}' WHERE store_key='${key}'`) ||
    (await db.query(`SELECT data->>'status' s FROM member_workspace_state WHERE store_key=$1`, [key])).rows[0].s === 'draft', 'a forged flag cannot change reviewed status via multi-statement')
  await db.exec(`SELECT set_config('app.icp_reviewed_write','',false)`)
  check(await denied(A, 'SELECT icp_save($1,$2::jsonb,1)', [key, '{"status":"invited","note":"x","consent":true}']), 'invited cannot skip approval')
  check(await denied(A, 'SELECT icp_save($1,$2::jsonb,1)', [key, '{"status":"approved","note":"ok","consent":false}']), 'approval needs contact permission')
  await save(A, 'approved', 1); await save(A, 'invited', 2)
  const n = async () => Number((await db.query('SELECT count(*) n FROM crm_activities')).rows[0].n)
  check(await n() === 3, 'one history event per transition')
  const retry = await save(A, 'invited', 2)
  check(Number(retry.rows[0].value.version) === 3 && await n() === 3, 'lost-response retry is idempotent, no duplicate history')
  check(await denied(A, 'SELECT icp_save($1,$2::jsonb,3)', [key, '{"status":"invited","note":"changed","consent":true}']), 'same-status rewrite rejected')
  check((await as(B, 'SELECT * FROM member_workspace_state WHERE store_key LIKE $1', ['icp:%'])).rows.length === 0, 'ungranted admin reads no ICP rows')
  check((await as(A, 'SELECT * FROM member_workspace_state WHERE store_key LIKE $1', ['icp:%'])).rows.length === 1, 'granted owner reads own ICP rows')
  const leg2 = await as(A, 'SELECT * FROM save_workspace_state($1,$2::jsonb,1)', ['aetheris-pro-v1-live', '{"x":2}'])
  check(leg2.rows[0].saved && Number(leg2.rows[0].current_version) === 2, 'legacy workspace saves unchanged')
  check((await as(C, 'SELECT * FROM save_workspace_state($1,$2::jsonb,0)', ['aetheris-moat-v1-live', '{}'])).rows[0].saved, 'non-admin legacy saves unchanged')
  check((await as(C, 'DELETE FROM member_workspace_state WHERE store_key=$1 RETURNING 1', ['aetheris-moat-v1-live'])).rows.length === 1, 'legacy delete still allowed')
  check(await denied(A, `SELECT * FROM save_workspace_state('anything-else','{}'::jsonb,0)`), 'unknown keys still refused')
  await db.query(`INSERT INTO crm_people VALUES($1,$2,false,NULL)`, ['00000000-0000-4000-8000-000000000002', B])
  check(Number((await db.query('SELECT count(*) n FROM crm_people')).rows[0].n) === 2, 'other CRM records keep working')
  const P2 = '00000000-0000-4000-8000-000000000003'
  await db.query('INSERT INTO crm_people VALUES($1,$2,false,NULL)', [P2,A])
  const key2=`icp:person:${P2}`
  for (const uid of [A,B,C]) {
    await db.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${uid}',false); SELECT set_config('app.icp_reviewed_write','${uid}',false)`)
    let blocked=false
    try {await db.query('INSERT INTO member_workspace_state(store_key,data) VALUES($1,$2::jsonb)',[key2,'{"status":"accepted","note":"forged","consent":true}'])} catch {blocked=true} finally {await db.exec('RESET ROLE')}
    check(blocked, `forged marker direct INSERT rejected for ${uid===A?'founder':uid===B?'ungranted admin':'member'}`)
  }
  await db.exec(`SELECT set_config('app.icp_reviewed_write','',false)`)
  check((await db.query('SELECT 1 FROM member_workspace_state WHERE store_key=$1',[key2])).rows.length===0,'forged inserts leave no poisoned initial state')
  check(await denied(A,'SELECT icp_save($1,$2::jsonb,0)',[key2,'{"status":"new","note":"","consent":false}']),'initial new status is not a reviewed write')
  check(await denied(A,'SELECT icp_save($1,$2::jsonb,0)',[key2,'{"status":"draft","note":"x","consent":false,"extra":true}']),'extra review fields rejected')
  check(await denied(A,'SELECT icp_save(NULL,$1::jsonb,0)',['{}']),'NULL workspace key rejected')
  check(await denied(A,'SELECT icp_save($1,$2::jsonb,0)',['icp:profiles','{"profiles":"poison"}']),'non-array profile list rejected')
  check(await denied(A,'SELECT icp_save($1,$2::jsonb,0)',['icp:profiles','{"profiles":[]}']),'empty profile list rejected')
  const profile={id:'primary',label:'My clients',objective:'client',industries:'',employees:'',revenue:'',titles:'',locations:'',keywords:'',disqualifiers:'',excludeClients:true,excludeContacted:true,minimumFit:60,valueOffer:''}
  const profileSave=await as(A,'SELECT icp_save($1,$2::jsonb,0) value',['icp:profiles',JSON.stringify({profiles:[profile]})])
  check(Number(profileSave.rows[0].value.version)===1,'valid UI-shaped profiles accepted')
  check(await denied(A,'SELECT icp_save($1,$2::jsonb,1)',['icp:profiles',JSON.stringify({profiles:[profile,{...profile}]})]),'duplicate profile IDs rejected')
  check(await denied(A,'SELECT icp_save($1,$2::jsonb,1)',['icp:profiles',JSON.stringify({profiles:[{...profile,minimumFit:101}]})]),'out-of-range fit threshold rejected')
  await as(A,'SELECT icp_save($1,$2::jsonb,0)',[key2,'{"status":"draft","note":"x","consent":true}'])
  check(await denied(A,'SELECT icp_save($1,$2::jsonb,1)',[key2,'{"status":"approved","note":"https://example.com","consent":true}']),'direct RPC cannot approve promotional links')
  check(await denied(A,'SELECT icp_save($1,$2::jsonb,1)',[key2,'{"status":"approved","note":"We met before","consent":true}']),'direct RPC cannot approve unsupported familiarity')
  check(await denied(A,'SELECT icp_save($1,$2::jsonb,1)',[key2,JSON.stringify({status:'approved',note:'Hi Alex, I can share an operating checklist.',consent:true})]),'direct RPC cannot reuse a contacted person note')
  // Adversarial fixture only: grant TEMP locally so shadowing is actually exercised.
  await db.exec('GRANT TEMP ON DATABASE template1 TO authenticated')
  await db.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${A}',false); CREATE TEMP TABLE crm_people(id uuid,owner_id uuid,archived boolean); INSERT INTO crm_people VALUES('00000000-0000-4000-8000-000000000004','${A}',false)`)
  let shadowBlocked=false
  try {await db.query('SELECT public.icp_save($1,$2::jsonb,0)',['icp:person:00000000-0000-4000-8000-000000000004','{"status":"draft","note":"x","consent":false}'])} catch {shadowBlocked=true} finally {await db.exec('RESET ROLE; DROP TABLE pg_temp.crm_people')}
  check(shadowBlocked,'temporary CRM shadow cannot authorize an unknown person')
  await db.exec('ALTER TABLE member_workspace_state DISABLE TRIGGER icp_private_workspace_guard')
  await db.query("UPDATE member_workspace_state SET data=$1::jsonb WHERE store_key=$2",['{"status":"garbage","note":"x","consent":true}',key2])
  await db.exec('ALTER TABLE member_workspace_state ENABLE TRIGGER icp_private_workspace_guard')
  check(await denied(A,'SELECT icp_save($1,$2::jsonb,1)',[key2,'{"status":"accepted","note":"x","consent":true}']),'invalid legacy status cannot exploit NULL transition logic')
  const freshRetry=await as(A,'SELECT icp_save($1,$2::jsonb,0) value',['icp:profiles',JSON.stringify({profiles:[profile]})])
  check(Number(freshRetry.rows[0].value.version)===1,'identical initial profile retry stays at version one')
  await db.exec(`DELETE FROM auth.users WHERE id='${A}'`)
  check(Number((await db.query(`SELECT count(*) n FROM member_workspace_state WHERE user_id='${A}'`)).rows[0].n) === 0, 'account deletion still cascades')
  console.log(`${passed} candidate 0095 checks passed; no live database touched.`)
} finally { await db.close() }
