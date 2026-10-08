import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { z } from 'zod'

import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { deliverMembershipCard } from './membership-card.server'

const appUrl = () => process.env['APP_URL']?.replace(/\/$/, '') || new URL(getRequest().url).origin

/**
 * Sends the signed-in member their membership card if it is still waiting to be emailed.
 * Called when the app opens, so a member verified by any route gets their card promptly.
 * Does nothing when the card was already sent.
 */
export const sendMyMembershipCard = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => ({ result: await deliverMembershipCard(context.userId, { appUrl: appUrl() }) }))

const adminInput = z.object({ userId: z.string().uuid(), resend: z.boolean().optional() })

/** Admins send (or resend) a member's card, e.g. right after verifying them. */
export const sendMembershipCardAsAdmin = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => adminInput.parse(data))
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc('is_admin')
    if (isAdmin !== true) throw new Error('Not authorised')
    return { result: await deliverMembershipCard(data.userId, { appUrl: appUrl(), force: data.resend === true }) }
  })
