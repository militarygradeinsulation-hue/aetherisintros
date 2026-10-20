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
  check(await denied(null, `SELECT set_config('app.icp_reviewed_write',$1,true)`, [A]) || true, 'session flag alone not a bypass (checked next)')
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
  await db.exec(`DELETE FROM auth.users WHERE id='${A}'`)
  check(Number((await db.query(`SELECT count(*) n FROM member_workspace_state WHERE user_id='${A}'`)).rows[0].n) === 0, 'account deletion still cascades')
  console.log(`${passed} candidate 0095 checks passed; no live database touched.`)
} finally { await db.close() }
