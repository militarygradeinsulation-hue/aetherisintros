import { createServerFn } from '@tanstack/react-start'

import { requireAuthContract } from './auth-gate'

/** Whether text alerts can be offered on this site. */
export const smsStatus = createServerFn({ method: 'GET' })
  .middleware([requireAuthContract])
  .handler(async () => {
    const { smsConfigured } = await import('./sms.server')
    return { configured: smsConfigured() }
  })

/** Saves a mobile number and texts it a six-digit code. */
export const startPhoneVerification = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .inputValidator((data: { phone: string }) => {
    if (typeof data?.phone !== 'string' || data.phone.length > 40) throw new Error('Enter a mobile number.')
    return data
  })
  .handler(async ({ data, context }) => {
    const { startPhoneVerification: start } = await import('./sms.server')
    return start(context.userId, data.phone)
  })

export const confirmPhoneCode = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .inputValidator((data: { code: string }) => ({ code: String(data?.code ?? '').replace(/\s/g, '').slice(0, 6) }))
  .handler(async ({ data, context }) => {
    const { confirmPhone } = await import('./sms.server')
    return confirmPhone(context.userId, data.code)
  })
