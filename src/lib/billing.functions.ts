import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'

import { requireAuthContract } from './auth-gate'
import { stripe, stripeConfigured } from './stripe.server'

const origin = () => process.env['APP_URL']?.replace(/\/$/, '') || new URL(getRequest().url).origin

/** Whether checkout can be offered (the Stripe key is set). */
export const billingStatus = createServerFn({ method: 'GET' })
  .middleware([requireAuthContract])
  .handler(async () => ({ configured: stripeConfigured() }))

/** Starts Stripe Checkout for an active plan; returns the page to send the member to. */
export const startMembershipCheckout = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .inputValidator((data: { planId: string }) => {
    if (!/^[a-z0-9-]{2,40}$/.test(data?.planId ?? '')) throw new Error('Unknown plan')
    return data
  })
  .handler(async ({ data, context }): Promise<{ url: string }> => {
    const db = context.supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any
    const { data: plan } = await db.from('membership_plans').select('id, name, description, amount_cents, currency, billing_interval, active').eq('id', data.planId).maybeSingle()
    if (!plan?.active) throw new Error('That plan is not available.')
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { data: existing } = await (supabaseAdmin as any).from('memberships').select('stripe_customer_id, status').eq('user_id', context.userId).maybeSingle() // eslint-disable-line @typescript-eslint/no-explicit-any
    if (existing && ['active', 'trialing', 'past_due'].includes(existing.status)) throw new Error('You already have a membership. Use Manage billing to change it.')
    const { data: user } = await (supabaseAdmin as any).auth.admin.getUserById(context.userId) // eslint-disable-line @typescript-eslint/no-explicit-any
    const base = origin()
    const session = await stripe<{ url: string }>('POST', '/checkout/sessions', {
      mode: 'subscription',
      client_reference_id: context.userId,
      ...(existing?.stripe_customer_id ? { customer: existing.stripe_customer_id } : { customer_email: user?.user?.email }),
      line_items: [{
        quantity: 1,
        price_data: {
          currency: plan.currency, unit_amount: plan.amount_cents, recurring: { interval: plan.billing_interval },
          product_data: { name: `Ask Intros: ${plan.name}`, ...(plan.description ? { description: plan.description.slice(0, 500) } : {}) },
        },
      }],
      subscription_data: { metadata: { user_id: context.userId, plan_id: plan.id } },
      metadata: { user_id: context.userId, plan_id: plan.id },
      allow_promotion_codes: true,
      success_url: `${base}/app?membership=welcome`,
      cancel_url: `${base}/app?membership=cancelled`,
    })
    return { url: session.url }
  })

/** Opens Stripe's billing portal (change card, cancel, invoices). */
export const openBillingPortal = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .handler(async ({ context }): Promise<{ url: string }> => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { data } = await (supabaseAdmin as any).from('memberships').select('stripe_customer_id').eq('user_id', context.userId).maybeSingle() // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!data?.stripe_customer_id) throw new Error('No billing account yet.')
    const portal = await stripe<{ url: string }>('POST', '/billing_portal/sessions', { customer: data.stripe_customer_id, return_url: `${origin()}/app` })
    return { url: portal.url }
  })
