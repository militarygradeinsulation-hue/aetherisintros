import { createServerFn } from '@tanstack/react-start'
import { getRequest, setCookie } from '@tanstack/react-start/server'

import { requireAuthContract } from './auth-gate'

const origin = () => process.env['APP_URL']?.replace(/\/$/, '') || new URL(getRequest().url).origin

export interface GoogleStatus {
  configured: boolean
  connected: boolean
  email: string
  lastSyncAt: string | null
  lastError: string
}

/** Whether Google can be connected, and this member's connection if any. */
export const googleStatus = createServerFn({ method: 'GET' })
  .middleware([requireAuthContract])
  .handler(async ({ context }): Promise<GoogleStatus> => {
    const { googleConfigured } = await import('./google.server')
    const db = context.supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any
    const { data } = await db.from('google_connections').select('google_email, last_sync_at, last_error').eq('user_id', context.userId).maybeSingle()
    return { configured: googleConfigured(), connected: !!data, email: data?.google_email ?? '', lastSyncAt: data?.last_sync_at ?? null, lastError: data?.last_error ?? '' }
  })

/** The Google consent page to send the member to. */
export const startGoogleConnect = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .handler(async ({ context }): Promise<{ url: string }> => {
    const { buildAuthUrl, googleConfigured, newNonce, NONCE_COOKIE } = await import('./google.server')
    if (!googleConfigured()) throw new Error('Google is not set up for this site yet.')
    const nonce = newNonce()
    setCookie(NONCE_COOKIE, nonce, { httpOnly: true, secure: true, sameSite: 'lax', path: '/api/google', maxAge: 600 })
    return { url: await buildAuthUrl(context.userId, nonce, origin()) }
  })

export const syncGoogleNow = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .handler(async ({ context }): Promise<{ matched: number }> => {
    const { syncUser } = await import('./google.server')
    return syncUser(context.userId)
  })

export const disconnectGoogle = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .handler(async ({ context }): Promise<{ ok: true }> => {
    const { disconnect } = await import('./google.server')
    await disconnect(context.userId)
    return { ok: true }
  })
