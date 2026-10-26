import { beforeAll, afterAll, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'

const A = '10000000-0000-4000-8000-000000000001'
const B = '10000000-0000-4000-8000-000000000002'
let db: PGlite
async function as(uid: string | null, sql: string) {
  await db.exec('begin')
  try {
    await db.exec(`set local role ${uid ? 'authenticated' : 'anon'}`)
    await db.query("select set_config('request.jwt.claim.sub',$1,true)", [uid ?? ''])
    const result = await db.query(sql)
    await db.exec('commit')
    return result.rows
  } catch (error) {
    await db.exec('rollback')
    throw error
  }
}
beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth,public to anon,authenticated,service_role;
    create table public.test_verification(user_id uuid primary key, verified boolean);
    insert into public.test_verification values ('${A}',false),('${B}',true);
    create function public.is_verified_member() returns boolean language sql stable security definer as $$select coalesce((select verified from public.test_verification where user_id=auth.uid()),false)$$;
    create table public.passports(id integer primary key,owner_id uuid not null,label text not null,token text not null,revoked boolean not null default false);
    alter table public.passports enable row level security;
    create policy "own passports" on public.passports for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid() and is_verified_member());
    insert into public.passports values (1,'${A}','Original','test-token',false),(2,'${B}','Verified','verified-token',false);
  `)
  await db.exec(readFileSync('docs/release-safety/passport-owner-revocation.apply.sql', 'utf8'))
}, 30000)
afterAll(async () => { await db?.close() })
it('does not let another member revoke an owner passport', async () => {
  expect(await as(B, 'update passports set revoked=true where id=1 returning id')).toEqual([])
})
it('does not let anonymous visitors update passports', async () => {
  await expect(as(null, 'update passports set revoked=true where id=1')).rejects.toThrow()
})
it('does not let an unverified owner change other fields while revoking', async () => {
  await expect(as(A, "update passports set revoked=true,label='Changed' where id=1")).rejects.toThrow('only revoke')
})
it('lets an unverified owner revoke their own link and confirms the row', async () => {
  expect(await as(A, 'update passports set revoked=true where id=1 returning id')).toEqual([{ id: 1 }])
  expect((await db.query('select id from passports where token=\'test-token\' and revoked=false')).rows).toEqual([])
})
it('preserves verified owner editing', async () => {
  expect(await as(B, "update passports set label='Updated' where id=2 returning label")).toEqual([{ label: 'Updated' }])
})
it('prevents even a newly verified owner reactivating a revoked link', async () => {
  await db.exec(`update test_verification set verified=true where user_id='${A}'`)
  await expect(as(A, 'update passports set revoked=false where id=1')).rejects.toThrow('cannot be reactivated')
})