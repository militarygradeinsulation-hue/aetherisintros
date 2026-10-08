// 0037 membership cards: issued on verification by any route, unique codes, visible to
// members, written only by the database, revoked with verification.
export default async ({ ok, as, svc, A, B, C, ADMIN }) => {
  await svc(`insert into public.early_access_members (user_id, email, status) values ('${A}', 'a@x.test', 'approved'), ('${B}', 'b@x.test', 'approved')
    on conflict (user_id) do update set status = 'approved'`)
  // Signing up may already create a pending claim; verifying moves it to verified.
  const verify = id => svc(`insert into public.member_verifications (user_id, status, verified_at) values ('${id}', 'verified', now())
    on conflict (user_id) do update set status = 'verified', verified_at = now()`)
  // Backfill: B was verified before cards existed.
  let [b] = await svc(`select * from public.membership_cards where user_id = '${B}'`)
  ok(!!b && /^AI-BB-\d{5}$/.test(b.code), `members verified earlier get a card with their initials (${b?.code})`)
  ok(b && b.email_due === false, 'backfilled cards are not emailed automatically')
  ok(b && new Date(b.verified_at).toISOString() === '2026-03-02T10:00:00.000Z', 'the card carries the original verification date')

  // A new verification issues a card and queues its email.
  await svc(`update public.profiles set name = 'Ana Ölander-Quist' where id = '${A}'`)
  ok((await svc(`select 1 from public.membership_cards where user_id = '${A}'`)).length === 0, 'no card before verification')
  await svc(`insert into public.member_verifications (user_id, status) values ('${A}', 'pending')`)
  ok((await svc(`select 1 from public.membership_cards where user_id = '${A}'`)).length === 0, 'a pending claim gets no card')
  await svc(`update public.member_verifications set status = 'verified', verified_at = now() where user_id = '${A}'`)
  let [a] = await svc(`select * from public.membership_cards where user_id = '${A}'`)
  ok(!!a && /^AI-AO-\d{5}$/.test(a.code), `verification issues a card, accents folded in the initials (${a?.code})`)
  ok(a?.email_due === true && a?.status === 'active', 'and queues the welcome email')
  ok(a?.holder_name === 'Ana Ölander-Quist', 'the card shows the member name as written')

  // Invite-style verification (inserted straight as verified) issues one too.
  await svc(`update public.profiles set name = 'Cy' where id = '${C}'`)
  await verify(C)
  const [c] = await svc(`select code from public.membership_cards where user_id = '${C}'`)
  ok(/^AI-CY-\d{5}$/.test(c?.code ?? ''), `verified-on-insert members get a card; single names use two letters (${c?.code})`)

  // A verified member with no name yet gets the card once they add one.
  await svc(`insert into auth.users (id) values ('00000000-0000-4000-8000-0000000000ee')`)
  await svc(`insert into public.profiles (id) values ('00000000-0000-4000-8000-0000000000ee') on conflict do nothing`)
  await verify('00000000-0000-4000-8000-0000000000ee')
  ok((await svc(`select 1 from public.membership_cards where user_id = '00000000-0000-4000-8000-0000000000ee'`)).length === 0, 'no card while the member has no name')
  await svc(`update public.profiles set name = 'Eve Example' where id = '00000000-0000-4000-8000-0000000000ee'`)
  ok((await svc(`select 1 from public.membership_cards where user_id = '00000000-0000-4000-8000-0000000000ee'`)).length === 1, 'the card is issued when they add their name')

  // Codes are unique and stable.
  const codes = await svc(`select count(*)::int n, count(distinct code)::int d from public.membership_cards`)
  ok(codes[0].n === codes[0].d && codes[0].n === 4, 'every card has its own code')
  await svc(`update public.profiles set name = 'Ana Quist' where id = '${A}'`)
  ;[a] = await svc(`select code, holder_name from public.membership_cards where user_id = '${A}'`)
  ok(a.holder_name === 'Ana Quist', 'a name change updates the card')
  const codeA = a.code

  // Visibility: own card; other approved members' active cards; nothing for visitors.
  let r = await as(A, `select code, holder_name, verified_at, status from public.membership_cards where user_id = '${B}'`)
  ok(r.rows?.length === 1, "members see another approved member's card")
  ok(!!(await as(A, `select image_token from public.membership_cards`)).error, 'the image token is not readable')
  ok(!!(await as(A, `select email_due, emailed_at from public.membership_cards`)).error, 'delivery bookkeeping is not readable')
  ok(!!(await as(null, `select code from public.membership_cards`)).error, 'visitors see nothing')
  r = await as(B, `select code from public.membership_cards where user_id = '${C}'`)
  ok(r.rows?.length === 0, 'cards of members who are not approved stay hidden')

  // Only the database writes cards.
  ok(!!(await as(A, `update public.membership_cards set code = 'AI-ZZ-00000'`)).error, 'members cannot change a card')
  ok(!!(await as(A, `insert into public.membership_cards (user_id, code, holder_name, verified_at) values ('${A}', 'AI-ZZ-11111', 'x', now())`)).error, 'or mint one')
  ok(!!(await as(A, `delete from public.membership_cards`)).error, 'or delete one')
  ok(!!(await as(A, `select public.issue_membership_card('${A}')`)).error, 'or call the issuer')

  // Lookup by code.
  r = await as(B, `select holder_name, status from public.lookup_membership_code($1)`, [codeA.toLowerCase() + ' '])
  ok(r.rows?.[0]?.holder_name === 'Ana Quist' && r.rows[0].status === 'active', 'members can look up a code')
  ok((await as(C, `select * from public.lookup_membership_code($1)`, [codeA])).rows?.length === 0, 'unapproved accounts cannot')
  ok(!!(await as(null, `select * from public.lookup_membership_code($1)`, [codeA])).error, 'visitors cannot')

  // Losing verification revokes; regaining restores the same card.
  await svc(`update public.member_verifications set status = 'suspended' where user_id = '${A}'`)
  ;[a] = await svc(`select status, code from public.membership_cards where user_id = '${A}'`)
  ok(a.status === 'revoked', 'suspension revokes the card')
  ok((await as(B, `select 1 from public.membership_cards where user_id = '${A}'`)).rows.length === 0, 'a revoked card leaves the profile')
  ok((await as(A, `select status from public.membership_cards where user_id = '${A}'`)).rows?.[0]?.status === 'revoked', 'its owner still sees it, marked revoked')
  ok((await as(B, `select status from public.lookup_membership_code($1)`, [codeA])).rows?.[0]?.status === 'revoked', 'a lookup reports it revoked')
  await svc(`update public.member_verifications set status = 'verified' where user_id = '${A}'`)
  ;[a] = await svc(`select status, code from public.membership_cards where user_id = '${A}'`)
  ok(a.status === 'active' && a.code === codeA, 're-verification restores the same card and code')

  // Many cards with the same initials still get distinct codes.
  for (let i = 0; i < 40; i++) {
    const id = `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`
    await svc(`insert into auth.users (id) values ('${id}')`)
    await svc(`insert into public.profiles (id, name) values ('${id}', 'Ann Quill') on conflict (id) do update set name = excluded.name`)
    await verify(id)
  }
  const aq = await svc(`select count(*)::int n, count(distinct code)::int d from public.membership_cards where code like 'AI-AQ-%'`)
  ok(aq[0].n === 40 && aq[0].d === 40, 'cards sharing initials still get distinct codes')
  void ADMIN
}
