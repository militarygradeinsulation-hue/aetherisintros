import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'

const A = '00000000-0000-4000-8000-00000000000a'
const B = '00000000-0000-4000-8000-00000000000b'
const C = '00000000-0000-4000-8000-00000000000c'
const MID = '10000000-0000-4000-8000-000000000001'
const db = new PGlite()
try {
  await db.exec(`
    create role authenticated nologin; create role anon nologin;
    create schema auth;
    grant usage on schema auth, public to authenticated;
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create table auth.users(id uuid primary key);
    create table public.meetings(id uuid primary key, host_id uuid);
    create table public.meeting_participants(
      meeting_id uuid not null references public.meetings(id),
      user_id uuid not null references auth.users(id),
      primary key(meeting_id,user_id)
    );
    grant select on public.meeting_participants to authenticated;
    create table public.meeting_briefs(meeting_id uuid not null, content text not null);
    create function public.is_meeting_participant(p_meeting uuid)
    returns boolean language sql stable security definer set search_path=''
    as $$ select exists (
      select 1 from public.meeting_participants p
      where p.meeting_id=p_meeting and p.user_id=auth.uid()
    ) $$;
    insert into auth.users(id) values ('${A}'),('${B}'),('${C}');
    insert into public.meetings(id,host_id) values ('${MID}','${A}');
    insert into public.meeting_participants(meeting_id,user_id) values ('${MID}','${A}'),('${MID}','${B}');
    insert into public.meeting_briefs(meeting_id,content) values ('${MID}','Shared history stays intact');
  `)
  await db.exec(readFileSync(new URL('../../drizzle/migrations/0111_meeting_personal_briefs.sql',import.meta.url),'utf8'))
  const as = async (user,sql,params=[]) => {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub','${user??''}',false); set role ${user?'authenticated':'anon'};`)
    try { return {rows:(await db.query(sql,params)).rows} }
    catch(error) {return {error:error.message}}
    finally {await db.exec('reset role')}
  }
  const insert = 'insert into public.meeting_personal_briefs(user_id,meeting_id,other_user_id,summary) values ($1,$2,$3,$4) returning id'
  const own = await as(A,insert,[A,MID,B,'A private preparation'])
  assert.equal(own.rows?.length,1,'host can create a personal brief for another attendee: '+(own.error??''))
  assert.equal((await as(B,"select id from public.meeting_personal_briefs")).rows?.length,0,'other attendee cannot see private brief')
  assert.equal((await as(C,"select id from public.meeting_personal_briefs")).rows?.length,0,'outsider cannot read private brief')
  assert.ok((await as(C,insert,[C,MID,A,'Intrusion'])).error,'outsider cannot create brief')
  assert.ok((await as(A,insert,[A,MID,C,'Wrong attendee'])).error,'nonattendee cannot be target')
  assert.ok((await as(A,insert,[B,MID,A,'Fake owner'])).error,'client cannot spoof another owner')
  const ownId=own.rows[0].id
  assert.ok((await as(B,'update public.meeting_personal_briefs set summary=$1 where id=$2 returning id',['Wrong',ownId])).rows?.length===0,'attendee cannot update host brief')
  const changed=await as(A,'update public.meeting_personal_briefs set summary=$1 where id=$2 returning summary',['My updated preparation',ownId])
  assert.equal(changed.rows?.[0]?.summary,'My updated preparation','host can update own brief')
  assert.ok((await as(B,'delete from public.meeting_personal_briefs where id=$1 returning id',[ownId])).rows?.length===0,'attendee cannot delete host brief')
  const theirs=await as(B,insert,[B,MID,A,'B private preparation'])
  assert.equal(theirs.rows?.length,1,'other attendee can have independent brief')
  assert.equal((await as(A,'select count(*)::int as total from public.meeting_personal_briefs')).rows?.[0]?.total,1,'host sees only own brief')
  assert.equal((await db.query('select content from public.meeting_briefs')).rows[0].content,'Shared history stays intact','no rewrite of existing shared meeting_briefs data')
  assert.ok((await as(A,'delete from public.meeting_personal_briefs where id=$1 returning id',[ownId])).rows?.length===1,'owner may delete own brief')
  console.log('Meeting personal briefs: 13 owner/attendee privacy and compatibility assertions passed')
} finally { await db.close() }
