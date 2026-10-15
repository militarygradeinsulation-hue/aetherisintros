import { createFileRoute } from '@tanstack/react-router'
import { logServerError } from '@/lib/server-error-log'

import { isTrustedCaller } from '@/lib/app-settings.server'

/** Daily calendar sync for connected members, called by the database's scheduler (0043). */
export const Route = createFileRoute('/api/cron/google-sync')({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!(await isTrustedCaller(request))) return Response.json({ error: 'Unauthorized' }, { status: 401 })
        try {
          const { googleConfigured, syncAll } = await import('@/lib/google.server')
          if (!googleConfigured()) return Response.json({ synced: 0, failed: 0, skipped: 'not configured' })
          return Response.json(await syncAll())
        } catch (error) {
          await logServerError(error, request)
          return Response.json({ error: 'Sync failed' }, { status: 500 })
        }
      },
    },
  },
})
