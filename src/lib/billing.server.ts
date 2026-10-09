/**
 * Membership billing (server only): records Stripe subscription state in public.memberships.
 */
import { stripe } from './stripe.server'

/* eslint-disable @typescript-eslint/no-explicit-any */

const STATUSES = new Set(['active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused'])

/** The membership row for a Stripe subscription object. */
export function membershipFromSubscription(sub: any) {
  const item = sub?.items?.data?.[0]
  const price = item?.price ?? {}
  const periodEnd = sub?.current_period_end ?? item?.current_period_end
  const userId = sub?.metadata?.user_id
  if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) return null
  return {
    user_id: userId,
    plan_id: sub?.metadata?.plan_id || null,
    status: STATUSES.has(sub?.status) ? sub.status : 'incomplete',
    amount_cents: typeof price.unit_amount === 'number' ? price.unit_amount : 0,
    currency: price.currency ?? 'usd',
    billing_interval: price.recurring?.interval === 'month' ? 'month' : 'year',
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: !!sub?.cancel_at_period_end,
    stripe_customer_id: typeof sub?.customer === 'string' ? sub.customer : sub?.customer?.id ?? null,
    stripe_subscription_id: sub?.id ?? null,
    updated_at: new Date().toISOString(),
  }
}

/** Applies one webhook event. Returns what it did, for the response body. */
export async function applyStripeEvent(event: any): Promise<string> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const db = supabaseAdmin as any
  let sub: any = null
  if (event.type === 'checkout.session.completed' && event.data?.object?.subscription) {
    sub = await stripe('GET', `/subscriptions/${event.data.object.subscription}`)
  } else if (/^customer\.subscription\.(created|updated|deleted|paused|resumed)$/.test(event.type)) {
    sub = event.data?.object
  } else {
    return 'ignored'
  }
  const row = membershipFromSubscription(sub)
  if (!row) return 'no member on subscription'
  const { error } = await db.from('memberships').upsert(row, { onConflict: 'user_id' })
  if (error) throw new Error(error.message)
  return `membership ${row.status}`
}
