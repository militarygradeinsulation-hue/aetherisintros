// 0027 ask response count
export default async ({ ok, as, svc, A, B, C }) => {
  let r = await svc(`select response_count from public.asks where id = 'ask-old'`)
  ok(r[0].response_count === 2, 'existing asks are corrected by the backfill')
  r = await as(A, `insert into public.asks (id, author_id, ask) values ('ask-new', $1, 'Need a COO') returning response_count`, [A])
  ok(r.rows?.[0]?.response_count === 0, 'a new ask starts at zero')
  await as(B, `insert into public.ask_responses (ask_id, user_id, text) values ('ask-new', $1, 'I know someone')`, [B])
  await as(C, `insert into public.ask_responses (ask_id, user_id, text) values ('ask-new', $1, 'Same')`, [C])
  r = await as(B, `select response_count from public.asks where id = 'ask-new'`)
  ok(r.rows[0].response_count === 2, 'each reply raises the count, including replies the replier cannot see the others of')
  await as(C, `delete from public.ask_responses where user_id = $1 and ask_id = 'ask-new'`, [C])
  r = await svc(`select response_count from public.asks where id = 'ask-new'`)
  ok(r[0].response_count === 1, 'withdrawing a reply lowers the count')
  r = await as(B, `delete from public.ask_responses where user_id = $1 and ask_id = 'ask-new' returning id`, [A])
  r = await svc(`select response_count from public.asks where id = 'ask-new'`)
  ok(r[0].response_count === 1, "a member cannot remove someone else's reply to change the count")
}
