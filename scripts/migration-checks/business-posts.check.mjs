// 0057 business posts: Need / Offer / Proof of work validated in the database, ownership and visibility unchanged
export default async ({ ok, as, svc, A, B, C }) => {
  const ins = (uid, id, kind, title, detail, business, visibility = 'network') =>
    as(uid, `insert into public.posts (id, author_id, kind, text, detail, business, visibility) values ($1, $2, $3, $4, $5, $6::jsonb, $7)`, [id, uid, kind, title, detail, business === null ? null : JSON.stringify(business), visibility])
  const d = 'Detail that is long enough.'
  await svc(`insert into public.posts (id, author_id, kind, text, detail) values ('old-1', '${A}', 'Insight', 'Existing post', 'Before 0057')`)
  ok((await svc(`select business from public.posts where id = 'old-1'`))[0].business === null, 'existing posts keep working with no business data')
  ok(!(await ins(A, 'ord', 'Insight', 'Ordinary', d, null)).error, 'ordinary posts are still accepted')
  ok(!!(await ins(A, 'ord2', 'Insight', 'Ordinary', d, { category: 'Other' })).error, 'ordinary posts cannot carry business data')

  const need = { category: 'Finance & capital', budgetMin: 5000, budgetMax: 9000, currency: 'USD', deadline: '2030-01-31', geography: 'Toronto' }
  ok(!(await ins(A, 'n1', 'Need', 'Need a CFO', d, need)).error, 'a valid Need is accepted')
  ok(!!(await ins(A, 'n2', 'Need', 'Need a CFO', d, { ...need, budgetMin: 9500 })).error, 'an inverted budget range is rejected')
  ok(!!(await ins(A, 'n3', 'Need', 'Need a CFO', d, { ...need, budgetMin: -1 })).error, 'a negative budget is rejected')
  ok(!!(await ins(A, 'n4', 'Need', 'Need a CFO', d, { ...need, currency: undefined })).error, 'an amount without a currency is rejected')
  ok(!!(await ins(A, 'n5', 'Need', 'Need a CFO', d, { ...need, currency: 'XXX' })).error, 'an unsupported currency is rejected')
  ok(!!(await ins(A, 'n6', 'Need', 'Need a CFO', d, { ...need, deadline: '2030-02-31' })).error, 'an impossible deadline is rejected')
  ok(!!(await ins(A, 'n7', 'Need', 'Need a CFO', d, { ...need, secretMemory: 'x' })).error, 'unknown keys (e.g. private memory) are rejected')
  ok(!!(await ins(A, 'n8', 'Need', 'Need a CFO', d, null)).error, 'a Need must carry its details')
  ok(!!(await ins(A, 'n9', 'Need', 'ab', d, need)).error, 'a too-short title is rejected')
  ok(!!(await ins(A, 'n10', 'Need', 'Need a CFO', d, { ...need, category: 'Weapons' })).error, 'an unsupported category is rejected')
  ok(!!(await ins(A, 'n11', 'Need', 'Need a CFO', d, { ...need, startingPrice: 5 })).error, 'a Need cannot carry an Offer price')

  ok(!(await ins(A, 'o1', 'Offer', 'Fractional CFO', d, { category: 'Finance & capital', startingPrice: 2500, currency: 'EUR', availability: 'From March' })).error, 'a valid Offer is accepted')
  ok(!!(await ins(A, 'o2', 'Offer', 'Fractional CFO', d, { category: 'Finance & capital', startingPrice: 2500 })).error, 'an Offer price needs a currency')

  const proof = { category: 'Design & creative', links: ['https://example.com/work'] }
  ok(!(await ins(A, 'p1', 'Proof of work', 'Rebrand shipped', d, proof)).error, 'valid Proof of work is accepted')
  ok(!!(await ins(A, 'p2', 'Proof of work', 'Rebrand shipped', d, { category: 'Other' })).error, 'Proof of work needs a portfolio link')
  ok(!!(await ins(A, 'p3', 'Proof of work', 'Rebrand shipped', d, { ...proof, links: ['http://example.com'] })).error, 'links must be https')
  ok(!!(await ins(A, 'p4', 'Proof of work', 'Rebrand shipped', d, { ...proof, links: ['https://' + 'u:p' + '@example.com'] })).error, 'links cannot carry credentials')
  ok(!!(await ins(A, 'p5', 'Proof of work', 'Rebrand shipped', d, { ...proof, links: ['javascript:alert(1)'] })).error, 'script links are rejected')

  ok((await as(B, `select id from public.posts where id = 'n1'`)).rows?.length === 1, 'another member reads a network Need')
  await ins(A, 'priv1', 'Need', 'Private need', d, need, 'private')
  ok((await as(B, `select id from public.posts where id = 'priv1'`)).rows?.length === 0, 'a private business post is hidden from other members')
  ok((await as(A, `select id from public.posts where id = 'priv1'`)).rows?.length === 1, 'but visible to its author')
  ok(!!(await as(B, `insert into public.posts (id, author_id, kind, text, detail, business) values ('spoof', $1, 'Need', 'Spoofed need', '${d}', $2::jsonb)`, [A, JSON.stringify(need)])).error, 'nobody can post a Need as someone else')
  ok((await as(B, `update public.posts set business = '{"category":"Other","budgetMin":1,"currency":"USD"}'::jsonb where id = 'n1' returning id`)).rows?.length === 0, 'nobody can edit another member’s Need')
  ok((await as(B, `delete from public.posts where id = 'n1' returning id`)).rows?.length === 0, 'nor delete it')
  ok(!!(await as(A, `update public.posts set business = '{"category":"Other","budgetMin":9,"budgetMax":1,"currency":"USD"}'::jsonb where id = 'n1'`)).error, 'the author cannot edit it into an invalid range')
  ok((await as(C, `select id from public.posts where kind = 'Need'`)).rows?.length === 1, 'a signed-in outsider sees only the network Need')
  ok((await as(null, `select id from public.posts`)).error !== undefined || (await as(null, `select id from public.posts`)).rows?.length === 0, 'visitors read no live business posts')
}
