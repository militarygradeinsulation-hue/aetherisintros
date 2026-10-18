// Isolated contract test for 0086: no production credentials or network writes.
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const db = new PGlite()
try {
  await db.exec(`
    create role authenticated; create role anon;
    create schema auth;
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}',email_confirmed_at timestamptz);
    create table public.launch_settings(id int primary key,mode text,capacity int);
    insert into public.launch_settings values(1,'first_1000',1000);
    create table public.invitations(id uuid primary key default gen_random_uuid(),code text,revoked boolean default false,uses int default 0,max_uses int default 10,expires_at timestamptz,email text);
    create table public.early_access_members(user_id uuid primary key,email text,status text,source text,founding_member_number int unique,approved_at timestamptz,invite_id uuid,updated_at timestamptz);
    create table public.whitelist_entries(email text,status text);
    create table public.waitlist_entries(email text unique,user_id uuid,source text);
    create table public.verification_calls(user_id uuid);
    create function public.auto_verify_invited(p_uid uuid,p_email text) returns void language sql as $$ insert into public.verification_calls values(p_uid) $$;
  `)
  await db.exec(readFileSync(new URL('../../drizzle/migrations/0086_restore_launch_mode_signup.sql',import.meta.url),'utf8'))
  await db.exec(readFileSync(new URL('../../drizzle/migrations/0091_confirmed_founding_claim.sql',import.meta.url),'utf8'))
  let n=0
  async function account(metadata={}, confirmed=true) {
    const id=`00000000-0000-4000-8000-${String(++n).padStart(12,'0')}`
    await db.query('insert into auth.users(id,email,raw_user_meta_data,email_confirmed_at) values($1,$2,$3,$4)',[id,`u${n}@test.invalid`,metadata,confirmed ? new Date().toISOString() : null])
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id])
    return id
  }
  const claim=async(code=null)=>(await db.query('select * from public.claim_early_access($1)',[code])).rows[0]
  await account()
  assert.equal((await claim()).status,'approved','open launch accepts public signup')
  assert.equal((await claim()).founding_member_number,1,'retries retain founding number')
  assert.equal((await db.query('select * from verification_calls')).rows.length,0,'public signup does not bypass verification')
  await db.exec("update launch_settings set mode='invite_only'")
  const pending=await account()
  assert.equal((await claim()).status,'pending','invite-only launch remains enforced')
  await db.exec("insert into invitations(code) values('member-code')")
  assert.equal((await claim('member-code')).status,'approved','pending member can claim invitation')
  await claim('member-code')
  assert.equal((await db.query('select uses from invitations')).rows[0].uses,1,'retry consumes invite once')
  await db.query("update early_access_members set status='suspended' where user_id=$1",[pending])
  assert.equal((await claim('member-code')).status,'suspended','invite cannot restore suspended membership')
  await account({invite_code:'member-code'})
  assert.equal((await claim()).status,'approved','email confirmation preserves metadata invitation')
  await db.exec("update launch_settings set mode='first_1000',capacity=0")
  await account()
  assert.equal((await claim()).status,'waitlisted','capacity is enforced')
  await db.exec("update launch_settings set mode='closed'")
  await account()
  assert.equal((await claim()).status,'denied','closed launch stays closed')
  await db.exec("insert into whitelist_entries values('u6@test.invalid','active')")
  await account()
  assert.equal((await claim()).status,'approved','whitelist access works without invite')
  // A direct RPC call must not reserve a founding slot before confirmation.
  await db.exec("update launch_settings set mode='first_1000',capacity=1000")
  const unconfirmed = await account({}, false)
  await assert.rejects(claim(), /Confirm your email before claiming membership/)
  assert.equal((await db.query('select * from early_access_members where user_id=$1',[unconfirmed])).rows.length,0,
    'unconfirmed claim creates no founding membership')
  await db.query('update auth.users set email_confirmed_at=now() where id=$1',[unconfirmed])
  assert.equal((await claim()).status,'approved', 'confirmed user can claim founding membership')

  await db.query("select set_config('request.jwt.claim.sub','',false)")
  await assert.rejects(claim(),/Not authenticated/)
  console.log('Launch signup: 14 membership, confirmation, invite, capacity and verification checks passed.')
} finally { await db.close() }
