import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireAuthContract } from './auth-gate'

/** All HubSpot paths live here so a version bump is a one-line change. */
const HUBSPOT_VERSION = '2026-09'
const GATEWAY_URL = 'https://connector-gateway.lovable.dev/hubspot'
const hubspotPath = (objectType: string) => `/crm/objects/${HUBSPOT_VERSION}/${objectType}`

const input = z.object({
  fullName: z.string().max(300),
  email: z.string().max(320).optional().default(''),
  phone: z.string().max(60).optional().default(''),
  title: z.string().max(300).optional().default(''),
  companyName: z.string().max(300).optional().default(''),
})

/**
 * Copies a newly added CRM person into the company HubSpot portal.
 * Only admin accounts sync, so ordinary members' private contacts never reach the shared portal.
 */
export const syncPersonToHubspot = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .inputValidator((data: unknown) => input.parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' })
    if (!isAdmin) return { synced: false as const, reason: 'not-admin' }
    const lovableKey = process.env.LOVABLE_API_KEY
    const hubspotKey = process.env.HUBSPOT_API_KEY
    if (!lovableKey || !hubspotKey) return { synced: false as const, reason: 'not-configured' }

    const [firstname, ...rest] = data.fullName.trim().split(/\s+/)
    const properties: Record<string, string> = { firstname: firstname ?? '', lastname: rest.join(' ') }
    if (data.email) properties.email = data.email
    if (data.phone) properties.phone = data.phone
    if (data.title) properties.jobtitle = data.title
    if (data.companyName) properties.company = data.companyName

    const res = await fetch(GATEWAY_URL + hubspotPath('contacts'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${lovableKey}`, 'X-Connection-Api-Key': hubspotKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ properties }),
    })
    if (!res.ok) {
      const body = await res.text()
      // 409 = contact with this email already exists in HubSpot; treat as already synced.
      if (res.status === 409) return { synced: true as const, existing: true }
      console.error(`HubSpot contact create failed [${res.status}]: ${body}`)
      return { synced: false as const, reason: `hubspot ${res.status}: ${body.slice(0, 300)}` }
    }
    const created = (await res.json()) as { id?: string }
    return { synced: true as const, hubspotId: created.id ?? null }
  })
