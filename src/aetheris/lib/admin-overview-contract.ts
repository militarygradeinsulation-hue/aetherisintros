/** Validate administrator totals from the existing server-authorized RPC.
 * Missing, malformed and negative values must never display as plausible zeros.
 */
export const ADMIN_COUNT_KEYS = [
  'registered_accounts', 'confirmed_accounts', 'approved_members', 'pending_members',
  'onboarded_profiles', 'posts', 'asks', 'messages', 'introduction_requests',
] as const

export type AdminCountKey = (typeof ADMIN_COUNT_KEYS)[number]
export type AdminStats = Record<AdminCountKey, number> & { generated_at: string }

const invalid = () => new Error('The analytics service returned an invalid response. Please retry.')

export function parseAdminOverview(value: unknown): AdminStats {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid()
  const payload = value as Record<string, unknown>
  const totals = {} as Record<AdminCountKey, number>
  for (const key of ADMIN_COUNT_KEYS) {
    const count = payload[key]
    if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) throw invalid()
    totals[key] = count
  }
  if (typeof payload.generated_at !== 'string' || Number.isNaN(Date.parse(payload.generated_at))) {
    throw invalid()
  }
  return { ...totals, generated_at: payload.generated_at }
}
