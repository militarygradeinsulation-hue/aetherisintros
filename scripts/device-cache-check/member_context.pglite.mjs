// Run against disposable embedded PostgreSQL, never production.
// node scripts/device-cache-check/member_context.pglite.mjs
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
const db = new PGlite();
await db.exec([
  'create role anon; create role authenticated;',
  'create schema auth;',
  'create table auth.users(id uuid primary key);',
  "create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.uid',true),'')::uuid $$;",
  'grant usage on schema auth to anon,authenticated;',
  'grant execute on function auth.uid() to anon,authenticated;',
  'grant usage on schema public to anon,authenticated;',
].join('\n'));
await db.exec(`create function public.freeze_columns() returns trigger language plpgsql as $
declare c text; begin
  foreach c in array tg_argv loop
    if (to_jsonb(new)->c) is distinct from (to_jsonb(old)->c) then
      raise exception 'identity changed' using errcode='42501';
    end if;
  end loop;
  return new;
end $;`);
await db.exec(readFileSync(new URL('../../drizzle/migrations/0100_member_context_sync.sql',import.meta.url),'utf8'));
const A='00000000-0000-4000-8000-00000000000a',B='00000000-0000-4000-8000-00000000000b';
await db.exec("insert into auth.users(id) values ('"+A+"'),('"+B+"')");
let failed=0;
function check(ok,msg) { console.log((ok?'PASS ':'FAIL ')+msg);if(!ok)failed++; }
const as=async (id,sql) => {
  await db.exec("set role authenticated; select set_config('request.uid','"+id+"',false);");
  try {return await db.query(sql);} finally {await db.exec('reset role;');}
};
const mutation='11111111-1111-4111-8111-111111111111';
await as(A,"select public.ask_context_upsert('drafts','{\"text\":\"first\"}'::jsonb,'"+mutation+"')");
await as(A,"select public.ask_context_upsert('drafts','{\"text\":\"retry\"}'::jsonb,'"+mutation+"')");
const mine=(await as(A,"select payload from public.member_context where slice='drafts'")).rows[0];
check(mine?.payload?.text==='first','same mutation id cannot overwrite saved data');
check((await as(B,'select count(*)::int as n from public.member_context')).rows[0].n===0,'RLS isolates B from A');
const rows=(await as(A,"select * from public.ask_context_since(null)")).rows;
check(rows.some(row=>row.slice==='drafts')&&rows.some(row=>row.slice===null),'changes include data and cursor');
const since=rows.find(row=>row.slice===null)?.server_time?.toISOString();
check(Boolean(since),'cursor comes from server time');
await as(A,"select public.ask_context_upsert('drafts',null,gen_random_uuid(),true)");
const deleted=(await as(A,"select * from public.ask_context_since('"+since+"')")).rows.find(row=>row.slice==='drafts');
check(deleted?.deleted===true&&deleted.payload===null,'tombstone propagates');
try {await as(A,"insert into public.member_context(member_id,slice,payload) values('"+A+"','profile','{}')");check(false,'no direct inserts');}
catch {check(true,'no direct inserts');}
try {await as(A,"select public.ask_context_upsert('unknown','{}',gen_random_uuid())");check(false,'unknown slices rejected');}
catch {check(true,'unknown slices rejected');}
await db.exec('set role anon');
try {await db.query('select * from public.ask_context_since(null)');check(false,'anon cannot call sync');}
catch {check(true,'anon cannot call sync');}
await db.exec('reset role');
if(failed) process.exitCode=1;
