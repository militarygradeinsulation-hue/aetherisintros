// 0035 admin-only network health
export default async ({ ok, as, svc, A, ADMIN }) => {
  ok(!!(await as(null, `select public.admin_network_health()`)).error, 'visitors cannot read network health')
  ok(!!(await as(A, `select public.admin_network_health()`)).error, 'members cannot read network health')
  const r = await as(ADMIN, `select public.admin_network_health() as h`)
  ok(!r.error && r.rows[0].h?.members?.total >= 4, 'admins get the report')
  ok(!!(await as(ADMIN, `select public.network_health()`)).error, 'the underlying function stays service-role only')
  ok((await svc(`select public.network_health() is not null as ok`))[0].ok, 'the service role still calls it directly')
}
