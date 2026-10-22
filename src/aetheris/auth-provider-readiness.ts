export type ProviderReadiness = 'enabled' | 'disabled' | 'unverified'

/** A denied/malformed settings response never proves a provider is disabled. */
export function linkedInReadiness(value: unknown): ProviderReadiness {
  if (!value || typeof value !== 'object') return 'unverified'
  const external = (value as Record<string, unknown>)['external']
  if (!external || typeof external !== 'object') return 'unverified'
  const enabled = (external as Record<string, unknown>)['linkedin_oidc']
  return enabled === true ? 'enabled' : enabled === false ? 'disabled' : 'unverified'
}

/** Public provider flags only; never retrieves client secrets or member records. */
export async function checkLinkedInReadiness(signal?: AbortSignal): Promise<ProviderReadiness> {
  const base = import.meta.env?.['VITE_SUPABASE_URL']
  const key = import.meta.env?.['VITE_SUPABASE_PUBLISHABLE_KEY']
  if (!base || !key) return 'unverified'
  try {
    const timeout = AbortSignal.timeout(8000)
    const response = await fetch(new URL('/auth/v1/settings', base), {
      headers: { apikey: key },
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    })
    if (!response.ok) return 'unverified'
    return linkedInReadiness(await response.json())
  } catch { return 'unverified' }
}
