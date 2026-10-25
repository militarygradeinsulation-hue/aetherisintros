// Disposable synthetic baseline: proves only resolver/guard behavior, not live compatibility.
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const db = new PGlite()
const basic='00000000-0000-4000-8000-000000000001'
const linked='00000000-0000-4000-8000-000000000002'
const paid='00000000-0000-4000-8000-000000000003'
const legacy='00000000-0000-4000-8000-000000000004'
try {
  await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO authenticated,anon;
    CREATE TABLE auth.identities(user_id uuid,provider text,provider_id text);
    CREATE TABLE early_access_members(user_id uuid,status text);
    CREATE TABLE member_tiers(user_id uuid,tier text);
    CREATE TABLE memberships(user_id uuid,status text,amount_cents integer,stripe_subscription_id text,current_period_end timestamptz);
    CREATE FUNCTION is_live_member() RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
      SELECT EXISTS(SELECT 1 FROM public.early_access_members WHERE user_id=auth.uid() AND status='approved') $$;`)
  await db.query("INSERT INTO early_access_members VALUES($1,'approved')",[legacy])
  await db.query("INSERT INTO member_tiers VALUES($1,'executive')",[legacy])
  await db.exec(readFileSync(new URL('../../docs/release-safety/member-entitlements.candidate.sql',import.meta.url),'utf8'))
  for (const id of [basic,linked,paid]) await db.query("INSERT INTO early_access_members VALUES($1,'approved')",[id])
  await db.query("INSERT INTO auth.identities VALUES($1,'linkedin_oidc','verified-subject')",[linked])
  await db.query("INSERT INTO memberships VALUES($1,'active',100,'sub_test',now()+interval '1 day')",[paid])
  const as = async(id,sql,args=[])=>{
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[id??''])
    await db.exec('SET ROLE authenticated')
    try { return await db.query(sql,args) } finally { await db.exec('RESET ROLE') }
  }
  const read = async id=>(await as(id,'SELECT my_member_entitlements() AS e')).rows[0].e
  assert.deepEqual(await read(basic),{level:'basic',networking:false,business:false,blackCard:false,linkedinVerified:false})
  assert.deepEqual(await read(linked),{level:'linkedin_verified',networking:true,business:false,blackCard:false,linkedinVerified:true})
  assert.deepEqual(await read(paid),{level:'paid',networking:true,business:true,blackCard:true,linkedinVerified:false})
  assert.deepEqual(await read(legacy),{level:'legacy',networking:true,business:true,blackCard:false,linkedinVerified:false})
  await assert.rejects(as(basic,"SELECT require_member_feature('networking')"),/Membership upgrade required/)
  await assert.rejects(as(linked,"SELECT require_member_feature('business')"),/Membership upgrade required/)
  await as(paid,"SELECT require_member_feature('blackCard')")
  await assert.rejects(as(basic,"INSERT INTO member_legacy_access(user_id,business) VALUES($1,true)",[basic]),/permission denied/)
  await assert.rejects(as(basic,"INSERT INTO auth.identities VALUES($1,'linkedin_oidc','forged')",[basic]),/permission denied/)
  await assert.rejects(as(basic,"UPDATE memberships SET status='active'"),/permission denied/)
  await assert.rejects(read(null),/Sign in first/)
  for(const status of ['trialing','past_due','unpaid','canceled','incomplete','paused']) {
    await db.query('UPDATE memberships SET status=$1 WHERE user_id=$2',[status,paid])
    assert.equal((await read(paid)).business,false,`${status} must not grant paid features`)
  }
  await db.query("UPDATE memberships SET status='active',current_period_end=now()-interval '1 second' WHERE user_id=$1",[paid])
  assert.equal((await read(paid)).blackCard,false,'expired payment must not grant a paid card')
  await db.query("UPDATE memberships SET current_period_end=now()+interval '1 day' WHERE user_id=$1",[paid])
  await db.query("UPDATE early_access_members SET status='suspended' WHERE user_id=$1",[paid])
  assert.equal((await read(paid)).networking,false,'payment cannot override suspended membership')
  await db.query('DELETE FROM auth.identities WHERE user_id=$1',[linked])
  assert.equal((await read(linked)).networking,false,'unlinked ownership removes networking')
  console.log('20 isolated entitlement checks passed; no live database changed. Feature cutover remains unapplied.')
} finally { await db.close() }