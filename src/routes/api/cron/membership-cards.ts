import { createFileRoute } from '@tanstack/react-router'

import { secretMatches } from '@/lib/digest.server'
import { deliverDueMembershipCards } from '@/lib/membership-card.server'

/**
 * Sends membership cards still waiting for their email: a safety net behind the immediate
 * send when an admin verifies someone or the member next opens the app. Called by a scheduler
 * (.github/workflows/membership-cards.yml) with `Authorization: Bearer $CRON_SECRET`.
 */
export const Route = createFileRoute('/api/cron/membership-cards')({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env['CRON_SECRET'] ?? ''
        if (!secret) return Response.json({ error: 'Card sending is not configured.' }, { status: 503 })
        const given = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
        if (!secretMatches(given, secret)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
        const appUrl = process.env['APP_URL']?.replace(/\/$/, '') || new URL(request.url).origin
        try {
          return Response.json(await deliverDueMembershipCards({ appUrl }))
        } catch (error) {
          console.error('membership-cards failed', error)
          return Response.json({ error: 'Card run failed' }, { status: 500 })
        }
      },
    },
  },
})
