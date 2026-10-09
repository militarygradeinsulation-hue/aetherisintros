import { createFileRoute } from '@tanstack/react-router'

import { applyStripeEvent } from '@/lib/billing.server'
import { verifyStripeSignature } from '@/lib/stripe.server'

/**
 * Stripe webhook: keeps memberships in step with subscriptions. Point a Stripe webhook at
 * https://<site>/api/stripe/webhook for checkout.session.completed and
 * customer.subscription.created/updated/deleted, and set STRIPE_WEBHOOK_SECRET.
 */
export const Route = createFileRoute('/api/stripe/webhook')({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const payload = await request.text()
        const ok = await verifyStripeSignature(payload, request.headers.get('stripe-signature') ?? '', process.env['STRIPE_WEBHOOK_SECRET'] ?? '')
        if (!ok) return Response.json({ error: 'Invalid signature' }, { status: 400 })
        try {
          return Response.json({ received: true, result: await applyStripeEvent(JSON.parse(payload)) })
        } catch (error) {
          console.error('stripe webhook failed', error)
          // Stripe retries on 5xx.
          return Response.json({ error: 'Webhook failed' }, { status: 500 })
        }
      },
    },
  },
})
