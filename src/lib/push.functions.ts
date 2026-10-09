import { createServerFn } from '@tanstack/react-start'

import { requireAuthContract } from './auth-gate'

/** The public key browsers need to subscribe to this app's push notifications. */
export const getPushPublicKey = createServerFn({ method: 'GET' })
  .middleware([requireAuthContract])
  .handler(async (): Promise<{ publicKey: string }> => {
    const { getVapidKeys } = await import('./app-settings.server')
    return { publicKey: (await getVapidKeys()).publicKey }
  })
