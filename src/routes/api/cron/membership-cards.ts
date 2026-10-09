import { createFileRoute } from '@tanstack/react-router'

import { isTrustedCaller } from '@/lib/app-settings.server'
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
        // The database's scheduler (pg_cron, 0041) or an outside scheduler holding CRON_SECRET.
        if (!(await isTrustedCaller(request))) return Response.json({ error: 'Unauthorized' }, { status: 401 })
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
