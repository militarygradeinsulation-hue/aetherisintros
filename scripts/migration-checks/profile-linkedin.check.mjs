// 0038 profiles.linkedin_url: members set their own canonical LinkedIn link; others read it.
export default async ({ ok, as, A, B }) => {
  // Who may update which profile row is the live table's existing policy, not this migration's.
  const r = await as(A, `update public.profiles set linkedin_url = 'https://www.linkedin.com/in/ana-quist' where id = $1 returning linkedin_url`, [A])
  ok(r.rows?.[0]?.linkedin_url === 'https://www.linkedin.com/in/ana-quist', 'members save their LinkedIn link')
  ok(!!(await as(A, `update public.profiles set linkedin_url = 'https://evil.example/in/x' where id = $1`, [A])).error, 'only LinkedIn profile links are accepted')
  ok(!!(await as(A, `update public.profiles set linkedin_url = 'https://www.linkedin.com/in/x"><script>' where id = $1`, [A])).error, 'no markup in the link')
  ok((await as(A, `update public.profiles set linkedin_url = '' where id = $1 returning id`, [A])).rows?.length === 1, 'the link can be cleared')
  ok(!(await as(B, `select linkedin_url from public.profiles where id = $1`, [B])).error, 'the column is readable')
}
