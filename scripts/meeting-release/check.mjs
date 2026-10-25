import {PGlite} from '@electric-sql/pglite'
import {readFile} from 'node:fs/promises'
import assert from 'node:assert/strict'
const db=new PGlite()
await db.exec(`
create role anon;create role authenticated;create role service_role;
create schema auth;create schema realtime;create schema storage;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table auth.users(id uuid primary key);
create table public.profiles(id uuid primary key,name text);
create table public.notifications(user_id uuid,kind text,text text,actor_id uuid,link text);
create function public.touch_updated_at() returns trigger language plpgsql as $$begin return new;end$$;
create function public.freeze_columns() returns trigger language plpgsql as $$begin return new;end$$;
create table realtime.messages(extension text);
alter table realtime.messages enable row level security;
create function realtime.topic() returns text language sql stable as $$select ''::text$$;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
alter table storage.objects enable row level security;
grant usage on schema public,auth,storage,realtime to authenticated;
grant select,insert,delete on storage.objects to authenticated;
`)
for(const f of ['drizzle/migrations/0031_video_meetings.sql','drizzle/migrations/0039_meeting_recording.sql'])await db.exec(await readFile(f,'utf8'))
await db.exec("alter table public.meetings add column agenda text not null default '';")
await db.exec(await readFile('supabase/migrations/20261025182108_meeting_guest_links_records.sql','utf8'))
const ids=Array.from({length:5},(_,i)=>'00000000-0000-4000-8000-'+String(i+1).padStart(12,'0'))
for(const id of ids)await db.query('insert into auth.users values($1);',[id])
const as=async(user,sql,args=[])=>{await db.exec('begin;set local role authenticated');try{await db.query("select set_config('request.jwt.claim.sub',$1,true)",[user]);const r=await db.query(sql,args);await db.exec('commit');return r.rows}catch(e){await db.exec('rollback');throw e}}
const [host,guest,outsider,d,e]=ids
const [{id}]=await as(host,"select public.create_meeting('Test','{}') id")
const [{invite}]=await as(host,"select public.rotate_meeting_invite($1) invite",[id])
await assert.rejects(()=>as(guest,'select public.rotate_meeting_invite($1)',[id]))
await assert.rejects(()=>as(guest,'select public.redeem_meeting_invite($1)',['not-a-code']))
assert.equal((await as(guest,'select public.redeem_meeting_invite($1) id',[invite.code]))[0].id,id)
assert.equal((await as(guest,'select public.redeem_meeting_invite($1) id',[invite.code]))[0].id,id)
await assert.rejects(()=>as(guest,"select public.manage_meeting_record($1,'save','Changed','',null)",[id]))
await as(host,"select public.manage_meeting_record($1,'save','Saved title','Agenda',null)",[id])
assert.equal((await as(guest,'select title from meetings where id=$1',[id]))[0].title,'Saved title')
assert.equal((await as(outsider,'select * from meetings where id=$1',[id])).length,0)
const path=id+'/'+guest+'/123.webm'
await assert.rejects(()=>as(guest,"insert into storage.objects(bucket_id,name) values('meeting-audio',$1)",[path]))
await as(guest,'select public.set_meeting_recording($1,true)',[id])
await as(guest,"insert into storage.objects(bucket_id,name) values('meeting-audio',$1)",[path])
assert.equal((await as(host,"select * from storage.objects")).length,1)
assert.equal((await as(outsider,"select * from storage.objects")).length,0)
await assert.rejects(()=>as(guest,"insert into storage.objects(bucket_id,name) values('meeting-audio',$1)",[id+'/'+host+'/forged.webm']))
await as(host,"select public.revoke_meeting_invite($1)",[id])
await assert.rejects(()=>as(outsider,'select public.redeem_meeting_invite($1)',[invite.code]))
await as(host,"select public.manage_meeting_record($1,'archive')",[id])
await assert.rejects(()=>as(host,"select public.rotate_meeting_invite($1)",[id]))
await as(host,"select public.manage_meeting_record($1,'restore')",[id])
const [{invite:fresh}]=await as(host,'select public.rotate_meeting_invite($1) invite',[id])
await as(outsider,'select public.redeem_meeting_invite($1)',[fresh.code]);await as(d,'select public.redeem_meeting_invite($1)',[fresh.code])
await assert.rejects(()=>as(e,'select public.redeem_meeting_invite($1)',[fresh.code]))
await as(host,"select public.manage_meeting_record($1,'delete')",[id])
assert.equal((await as(guest,'select * from meetings where id=$1',[id])).length,0)
assert.equal((await as(guest,"select * from storage.objects")).length,0)
assert.equal((await as(host,'select deleted_at from meetings where id=$1',[id])).length,1)
await as(host,"select public.manage_meeting_record($1,'restore')",[id])
assert.equal((await as(guest,'select * from meetings where id=$1',[id])).length,1)
console.log('PASS invitation ownership, admission, revocation, room capacity, host editing, trash/restore and consented private audio RLS.')
await db.close()
