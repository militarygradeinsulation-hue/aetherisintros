import { describe, expect, it } from 'vitest'

import { membershipFromSubscription } from '../billing.server'
import { formEncode, verifyStripeSignature } from '../stripe.server'

const sign = async (payload: string, secret: string, t: number) => {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${payload}`)))
  return `t=${t},v1=${[...sig].map(b => b.toString(16).padStart(2, '0')).join('')}`
}

describe('stripe', () => {
  it('form-encodes nested parameters the way Stripe expects', () => {
    expect(decodeURIComponent(formEncode({
      mode: 'subscription',
      line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: 250000, recurring: { interval: 'year' } } }],
      metadata: { user_id: 'u1' },
      skip: undefined,
    }))).toBe('mode=subscription&line_items[0][quantity]=1&line_items[0][price_data][currency]=usd&line_items[0][price_data][unit_amount]=250000&line_items[0][price_data][recurring][interval]=year&metadata[user_id]=u1')
  })

  it('accepts only correctly signed, fresh webhooks', async () => {
    const payload = '{"type":"customer.subscription.updated"}'
    const now = Date.UTC(2026, 9, 9, 12)
    const t = now / 1000
    expect(await verifyStripeSignature(payload, await sign(payload, 'whsec_test', t), 'whsec_test', now)).toBe(true)
    expect(await verifyStripeSignature(payload, await sign(payload, 'whsec_other', t), 'whsec_test', now)).toBe(false)
    expect(await verifyStripeSignature(payload + ' ', await sign(payload, 'whsec_test', t), 'whsec_test', now)).toBe(false)
    expect(await verifyStripeSignature(payload, await sign(payload, 'whsec_test', t - 600), 'whsec_test', now)).toBe(false)
    expect(await verifyStripeSignature(payload, '', 'whsec_test', now)).toBe(false)
    expect(await verifyStripeSignature(payload, await sign(payload, 'whsec_test', t), '', now)).toBe(false)
  })

  it('maps a subscription to the membership row (old and new API shapes)', () => {
    const base = {
      id: 'sub_1', status: 'active', cancel_at_period_end: false, customer: 'cus_1',
      metadata: { user_id: '00000000-0000-4000-8000-00000000000a', plan_id: 'founding' },
      items: { data: [{ current_period_end: 1800000000, price: { unit_amount: 250000, currency: 'usd', recurring: { interval: 'year' } } }] },
    }
    const row = membershipFromSubscription(base)!
    expect(row).toMatchObject({ user_id: base.metadata.user_id, plan_id: 'founding', status: 'active', amount_cents: 250000, billing_interval: 'year', stripe_customer_id: 'cus_1', stripe_subscription_id: 'sub_1' })
    expect(row.current_period_end).toBe(new Date(1800000000 * 1000).toISOString())
    expect(membershipFromSubscription({ ...base, current_period_end: 1700000000 })!.current_period_end).toBe(new Date(1700000000 * 1000).toISOString())
    expect(membershipFromSubscription({ ...base, status: 'weird' })!.status).toBe('incomplete')
    expect(membershipFromSubscription({ ...base, metadata: {} })).toBeNull()
  })
})
