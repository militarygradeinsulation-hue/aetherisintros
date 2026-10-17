// Open founding signup is atomic, bounded and independent of business badges.
export default async ({ ok, as, svc, A, B, C }) => {
  // The fixture reproduces the live pre-0022 access schema and adds the
  // pre-existing columns/tables needed by the latest membership procedure.
  await svc(`
    alter table public.early_access_members add column if not exists source text;
    alter table public.early_access_members add column if not exists founding_member_number integer;
    alter table public.early_access_members add column if not exists approved_at timestamptz;
    alter table public.early_access_members add column if not exists updated_at timestamptz default now();
    create table if not exists public.launch_settings
      (id integer primary key, mode text not null, capacity integer not null);
    create table if not exists public.waitlist_entries
      (email text, user_id uuid);
    insert into public.launch_settings(id,mode,capacity) values (1,'first_1000',2)
      on conflict(id) do update set mode='first_1000', capacity=2;
    update auth.users set email = 'founding-' || right(id::text, 2) || '@test.invalid'
      where id in ('${A}','${B}','${C}');
    delete from public.early_access_members
      where user_id in ('${A}','${B}','${C}');
  `);
  let r=await as(null,'select * from public.claim_early_access()');
  ok(!!r.error,'anonymous signup cannot claim an active membership');
  r=await as(A,'select * from public.claim_early_access()');
  ok(!r.error && r.rows?.[0]?.status==='approved' && r.rows?.[0]?.founding_member_number,
    'first confirmed signup claims a founding place without a code');
  const first=r.rows?.[0]?.founding_member_number;
  r=await as(A,'select * from public.claim_early_access()');
  ok(!r.error && r.rows?.[0]?.founding_member_number===first,'reloading does not claim a duplicate place');
  r=await as(B,'select * from public.claim_early_access()');
  ok(!r.error && r.rows?.[0]?.status==='approved' && r.rows?.[0]?.founding_member_number!==first,
    'second signup receives a unique founding number');
  r=await as(C,'select * from public.claim_early_access()');
  ok(!r.error && r.rows?.[0]?.status==='waitlisted','capacity overflow is safely waitlisted');
  r=await as(A,'select public.is_live_member() as live');
  ok(!r.error && r.rows?.[0]?.live===true,'approved founding member may use the network');
  r=await as(C,'select public.is_live_member() as live');
  ok(!r.error && r.rows?.[0]?.live===false,'waitlisted account cannot use the network');
  const trust=(await svc(`select status from public.member_verifications where user_id='${A}'`))[0];
  ok(trust?.status!=='verified','signup never grants an unearned verified business badge');
  await svc("update public.launch_settings set mode='invite_only' where id=1");
  await svc(`delete from public.early_access_members where user_id='${C}'`);
  r=await as(C,'select * from public.claim_early_access()');
  ok(!r.error && r.rows?.[0]?.status==='pending','invite-only mode still refuses code-free activation');
}
