// 0056 quick menu: each member's right-click menu is theirs alone
export default async ({ ok, as, svc, A, B }) => {
  ok(!(await as(A, `insert into public.member_quick_menu (items) values ('{new-ask,people,warmpaths}')`)).error, 'members save their own quick menu')
  ok((await as(A, `select items from public.member_quick_menu`)).rows?.[0]?.items?.length === 3, 'and read it back')
  ok((await as(B, `select items from public.member_quick_menu`)).rows?.length === 0, "nobody else sees it")
  ok(!!(await as(B, `insert into public.member_quick_menu (user_id, items) values ($1, '{people}')`, [A])).error, "nobody can write someone else's menu")
  ok((await as(B, `update public.member_quick_menu set items = '{people}' returning user_id`)).rows?.length === 0, "nor change it")
  ok(!(await as(A, `update public.member_quick_menu set items = '{intros,messages}', updated_at = now()`)).error, 'members reorder their items')
  ok(!!(await as(A, `update public.member_quick_menu set items = '{a,b,c,d,e,f,g,h,i,j,k,l,m}'`)).error, 'at most 12 items')
  ok(!!(await as(A, `update public.member_quick_menu set items = '{"<script>"}'`)).error, 'item ids are short slugs only')
  ok(!(await as(A, `update public.member_quick_menu set items = '{}'`)).error, 'an empty menu is allowed')
  ok((await as(A, `delete from public.member_quick_menu returning user_id`)).rows?.length === 1, 'members can reset to the default')
  ok(!!(await as(null, `select items from public.member_quick_menu`)).error, 'visitors see nothing')
  ok((await svc(`select count(*)::int n from public.member_quick_menu`))[0].n === 0, 'nothing left behind')
}
