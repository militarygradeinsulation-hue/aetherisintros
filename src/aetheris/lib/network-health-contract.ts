/** Strict validation for the existing server-authorized admin_network_health() RPC.
 * A missing data field must not turn into a plausible "0 members" health report.
 * This contains no credentials and does not change database roles or permissions.
 */
export interface NetworkHealth {
  checked_at: string
  members: { total: number; onboarded: number; verified: number; blocked: number }
  marketplace: { live_asks: number; open_intros: number; demo_rows_still_present: number }
  incomplete_profiles: Array<{ name: string; email: string; strength: number | null; joined: string; last_sign_in: string | null; days_since_sign_in: number | null }>
  stalled_verifications: Array<{ name: string; status: string; days: number | null }>
  likely_duplicates: Array<{ name: string; accounts: Array<{ email: string }> }>
  suspect_field_values: Array<{ name: string; field: string; value: string; issue: string }>
  isolated_members: string[]
}
const invalid = (): never => { throw new Error('Network health returned an incomplete or invalid response. Retry; counts have not been verified.') }
const obj = (value: unknown): Record<string, unknown> => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return invalid()
  return value as Record<string, unknown>
}
const count = (value: unknown): number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : invalid()
const str = (value: unknown): string =>
  typeof value === 'string' ? value : invalid()
const nullableStr = (value: unknown): string | null =>
  value == null ? null : str(value)
const nullableCount = (value: unknown): number | null =>
  value == null ? null : count(value)
const array = (value: unknown): unknown[] => Array.isArray(value) ? value : invalid()

export function parseNetworkHealth(value: unknown): NetworkHealth {
  const v = obj(value)
  const members = obj(v['members'])
  const marketplace = obj(v['marketplace'])
  const checked_at = str(v['checked_at'])
  if (!checked_at || Number.isNaN(Date.parse(checked_at))) invalid()
  const m = {
    total: count(members['total']),
    onboarded: count(members['onboarded']),
    verified: count(members['verified']),
    blocked: count(members['blocked']),
  }
  const counts = {
    live_asks: count(marketplace['live_asks']),
    open_intros: count(marketplace['open_intros']),
    demo_rows_still_present: count(marketplace['demo_rows_still_present']),
  }
  if (m.onboarded > m.total || m.blocked > m.total) invalid()
  return {
    checked_at,
    members: m,
    marketplace: counts,
    incomplete_profiles: array(v['incomplete_profiles']).map(item => {
      const r = obj(item)
      const strength = nullableCount(r['strength'])
      if (strength !== null && strength > 100) invalid()
      return { name: nullableStr(r['name']) ?? '', email: nullableStr(r['email']) ?? '',
        strength, joined: nullableStr(r['joined']) ?? '', last_sign_in: nullableStr(r['last_sign_in']),
        days_since_sign_in: nullableCount(r['days_since_sign_in']) }
    }),
    stalled_verifications: array(v['stalled_verifications']).map(item => {
      const r = obj(item)
      return { name: nullableStr(r['name']) ?? '', status: str(r['status']), days: nullableCount(r['days']) }
    }),
    likely_duplicates: array(v['likely_duplicates']).map(item => {
      const r = obj(item)
      return { name: nullableStr(r['name']) ?? '', accounts: array(r['accounts']).map(a => {
        const x = obj(a)
        return { email: nullableStr(x['email']) ?? '' }
      }) }
    }),
    suspect_field_values: array(v['suspect_field_values']).map(item => {
      const r = obj(item)
      return { name: nullableStr(r['name']) ?? '', field: str(r['field']),
        value: nullableStr(r['value']) ?? '', issue: str(r['issue']) }
    }),
    isolated_members: array(v['isolated_members']).map(item => nullableStr(item) ?? ''),
  }
}

/** The browser error log is not an empty array when an RPC/permission layer
 * returns null or an incomplete response. Never claim "No errors" on failure.
 */
export interface AdminErrorReport {
  id: string
  created_at: string
  source: 'client' | 'server'
  message: string
  stack: string
  url: string
  user_agent: string
}
export function parseAdminErrorReports(value: unknown): AdminErrorReport[] {
  return array(value).map(item => {
    const r = obj(item)
    const id = str(r['id'])
    const created_at = str(r['created_at'])
    const message = str(r['message'])
    const source = r['source']
    if (!id || Number.isNaN(Date.parse(created_at)) || !message ||
        (source !== 'server' && source !== 'client')) invalid()
    return { id, created_at, message, source: source as 'client' | 'server',
      stack: nullableStr(r['stack']) ?? '', url: nullableStr(r['url']) ?? '',
      user_agent: nullableStr(r['user_agent']) ?? '' }
  })
}
