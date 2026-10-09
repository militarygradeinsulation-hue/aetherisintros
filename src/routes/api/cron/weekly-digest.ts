import { createFileRoute } from '@tanstack/react-router'

import { isTrustedCaller } from '@/lib/app-settings.server'
import { sendWeeklyDigests } from '@/lib/digest.server'

/**
 * Sends the weekly digest to members who opted in. Called by a scheduler (see
 * .github/workflows/weekly-digest.yml) with `Authorization: Bearer $CRON_SECRET`.
 * `?dry=1` renders without sending, for checking the content.
 */
export const Route = createFileRoute('/api/cron/weekly-digest')({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        // The database's scheduler (pg_cron, 0041) or an outside scheduler holding CRON_SECRET.
        if (!(await isTrustedCaller(request))) return Response.json({ error: 'Unauthorized' }, { status: 401 })
        const url = new URL(request.url)
        const appUrl = process.env['APP_URL']?.replace(/\/$/, '') || url.origin
        try {
          const result = await sendWeeklyDigests({ appUrl, dryRun: url.searchParams.get('dry') === '1' })
          return Response.json(result)
        } catch (error) {
          console.error('weekly-digest failed', error)
          return Response.json({ error: 'Digest run failed' }, { status: 500 })
        }
      },
    },
  },
})
