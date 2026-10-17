// Tests the real SQL claim function: open registration, confirmation, referrals, and denial.
// Uses fresh identities so other migration suites retain their original test fixtures.
export default async ({ ok, as, svc }) => {
  const D = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  const E = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  const F = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
  const G = '99999999-9999-4999-8999-999999999999';
  await svc(`insert into auth.users (id,email,email_confirmed_at) values
    ('${D}','public@example.test',null),
    ('${E}','invite@example.test',now()),
    ('${F}','denied@example.test',now()),
    ('${G}','noinvite@example.test',now())`);
  let r = await as(null, 'select * from public.claim_early_access()');
  ok(!!r.error, 'anonymous users cannot claim live membership');

  r = await as(D, 'select * from public.claim_early_access()');
  ok(!!r.error && /confirm/i.test(r.error), 'email must be confirmed before an open claim');

  await svc(`update auth.users set email_confirmed_at=now() where id='${D}'`);
  r = await as(D, 'select * from public.claim_early_access()');
  ok(!r.error && r.rows[0]?.status === 'approved', 'confirmed public signup is approved without an invite');
  const number = r.rows?.[0]?.founding_member_number;
  ok(number == null || number > 0, 'founding number is positive or exhausted, never a fake number');
  r = await as(D, 'select * from public.claim_early_access()');
  ok(!r.error && r.rows[0]?.founding_member_number === number, 'repeated claim is idempotent');
  const verified = await svc(`select status from public.member_verifications where user_id='${D}'`);
  ok(verified.length === 0, 'public signup does not bypass business identity verification');

  await svc(`insert into public.invitations(code,max_uses) values ('vouch-test',1)`);
  r = await as(E, "select * from public.claim_early_access('vouch-test')");
  ok(!r.error && r.rows[0]?.status === 'approved', 'valid invited signup is approved');
  const inviteVerification = await svc(`select status from public.member_verifications where user_id='${E}'`);
  ok(inviteVerification[0]?.status === 'verified', 'valid invite retains explicit member-vouch verification');
  const inviteUses = await svc("select uses from public.invitations where code='vouch-test'");
  ok(inviteUses[0]?.uses === 1, 'invite is consumed exactly once');

  await svc(`insert into public.early_access_members(user_id,email,status) values
    ('${F}','denied@example.test','denied')`);
  r = await as(F, 'select * from public.claim_early_access()');
  ok(!r.error && r.rows[0]?.status === 'denied', 'rejected accounts cannot be self-approved');

  await svc("update public.launch_settings set mode='invite_only' where id=1");
  r = await as(G, 'select * from public.claim_early_access()');
  ok(!r.error && r.rows[0]?.status === 'pending', 'invite-only configuration still enforces invitation');
  await svc("update public.launch_settings set mode='first_1000' where id=1");
};
