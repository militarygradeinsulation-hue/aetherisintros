// 0061 storefront proposals: member_storefronts (services, seeking, intake questions)
// and proposals with full status lifecycle (sent → viewed → accepted/declined/countered).
export default async ({ ok, as, svc, A, B, C }) => {
  // A creates a public storefront
  let r = await as(A, `insert into public.member_storefronts (user_id, headline, services, seeking, ideal_client, intake_questions) values ($1, 'Fractional CFO for Series A', $2, $3, 'SaaS founders past $1M ARR', $4) returning id`, [
    A,
    JSON.stringify([{ title: 'CFO Advisory', price: 5000, scope: 'monthly retainer' }]),
    JSON.stringify(['Board-ready finance', 'Intro to investors']),
    JSON.stringify([{ id: '1', label: 'What stage are you at?', required: true }]),
  ])
  ok(!r.error && r.rows?.length === 1, 'a member creates their storefront')
  const SF = r.rows?.[0]?.id

  // B can read it (is_public = true default)
  ok((await as(B, `select headline from public.member_storefronts where id = $1`, [SF])).rows?.[0]?.headline === 'Fractional CFO for Series A', 'other members can read a public storefront')

  // C cannot write to A's storefront
  ok(!!(await as(C, `update public.member_storefronts set headline = 'hacked' where id = $1`, [SF])).error || (await svc(`select headline from public.member_storefronts where id = '${SF}'`))[0].headline !== 'hacked', 'members cannot edit each other\'s storefronts')

  // A makes it private — only A and admins see it
  ok(!(await as(A, `update public.member_storefronts set is_public = false where id = $1`, [SF])).error, 'an owner can make their storefront private')
  ok((await as(B, `select id from public.member_storefronts where id = $1`, [SF])).rows?.length === 0, 'a private storefront is invisible to others')
  ok((await as(A, `select id from public.member_storefronts where id = $1`, [SF])).rows?.length === 1, 'the owner still sees their own private storefront')
  ok(!(await as(A, `update public.member_storefronts set is_public = true where id = $1`, [SF])).error, 'restore to public')

  // B sends a proposal to A
  r = await as(B, `insert into public.proposals (from_user_id, to_user_id, storefront_id, subject, message, answers) values ($1, $2, $3, $4, $5, $6) returning id, status`, [
    B, A, SF,
    'Interested in your CFO advisory',
    'Hi, I run a $2M ARR SaaS and need board-ready finance for our Series A.',
    JSON.stringify({ '1': 'Seed, approaching Series A' }),
  ])
  ok(!r.error && r.rows?.[0]?.status === 'sent', 'a member sends a proposal and it starts with status sent')
  const P = r.rows?.[0]?.id

  // C cannot see or touch the proposal
  ok((await as(C, `select id from public.proposals where id = $1`, [P])).rows?.length === 0, 'a third party cannot read the proposal')
  ok(!!(await as(C, `update public.proposals set status = 'accepted' where id = $1`, [P])).error || (await svc(`select status from public.proposals where id = '${P}'`))[0].status === 'sent', 'a third party cannot update the proposal')

  // Both parties can read it
  ok((await as(A, `select subject from public.proposals where id = $1`, [P])).rows?.[0]?.subject === 'Interested in your CFO advisory', 'the recipient reads the proposal')
  ok((await as(B, `select status from public.proposals where id = $1`, [P])).rows?.[0]?.status === 'sent', 'the sender reads their own proposal')

  // A marks it viewed
  ok(!(await as(A, `update public.proposals set status = 'viewed', viewed_at = now() where id = $1`, [P])).error, 'the recipient marks the proposal viewed')
  ok((await svc(`select status from public.proposals where id = '${P}'`))[0].status === 'viewed', 'status is now viewed')

  // A accepts the proposal
  ok(!(await as(A, `update public.proposals set status = 'accepted', responded_at = now() where id = $1`, [P])).error, 'the recipient accepts the proposal')
  ok((await svc(`select status from public.proposals where id = '${P}'`))[0].status === 'accepted', 'status is now accepted')

  // A sends a counter proposal
  r = await as(B, `insert into public.proposals (from_user_id, to_user_id, subject, message) values ($1, $2, 'Counter: advisory at reduced scope', 'Could we start with a 2-month pilot?') returning id`, [B, A])
  ok(!r.error, 'a member can send another proposal')
  const P2 = r.rows?.[0]?.id
  ok(!(await as(A, `update public.proposals set status = 'countered', counter_message = 'Happy to do 3 months at half rate instead', responded_at = now() where id = $1`, [P2])).error, 'the recipient can counter a proposal')
  ok((await svc(`select status, counter_message from public.proposals where id = '${P2}'`))[0].status === 'countered', 'status is now countered')

  // Status constraint: invalid status is rejected
  ok(!!(await as(A, `update public.proposals set status = 'negotiating' where id = $1`, [P])).error, 'invalid status values are rejected by the check constraint')
}
