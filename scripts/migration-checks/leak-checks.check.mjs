// 0036 leak check results: private to their owner, append-only
export default async ({ ok, as, A, B }) => {
  let r = await as(A, `insert into public.leak_checks (company_name, answers, leak_index) values ('Acme', '{"response":3}', 30) returning owner_id`)
  ok(r.rows?.[0]?.owner_id === A, 'members save a check as themselves')
  ok(!!(await as(A, `insert into public.leak_checks (owner_id, answers, leak_index) values ($1, '{}', 0)`, [B])).error, 'not as someone else')
  ok(!!(await as(A, `insert into public.leak_checks (answers, leak_index) values ('{}', 101)`)).error, 'the index stays within 0-100')
  ok(!!(await as(A, `insert into public.leak_checks (answers, leak_index) values ('[]', 10)`)).error, 'answers must be an object')
  ok((await as(B, `select id from public.leak_checks`)).rows.length === 0, "others cannot read someone's results")
  ok(!!(await as(null, `select id from public.leak_checks`)).error, 'visitors cannot either')
  ok(!!(await as(A, `update public.leak_checks set leak_index = 0`)).error, 'results cannot be rewritten')
  ok((await as(A, `delete from public.leak_checks returning id`)).rows.length === 1, 'owners can delete their results')
}
