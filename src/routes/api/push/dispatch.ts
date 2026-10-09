import { createFileRoute } from '@tanstack/react-router'

import { isTrustedCaller } from '@/lib/app-settings.server'
import { dispatchNotification } from '@/lib/push.server'

/** Called by the database when a notification is created for someone with push on. */
export const Route = createFileRoute('/api/push/dispatch')({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!(await isTrustedCaller(request))) return Response.json({ error: 'Unauthorized' }, { status: 401 })
        const body = await request.json().catch(() => ({})) as { notification_id?: string }
        if (!/^[0-9a-f-]{36}$/i.test(body.notification_id ?? '')) return Response.json({ error: 'Bad request' }, { status: 400 })
        try {
          return Response.json(await dispatchNotification(body.notification_id!))
        } catch (error) {
          console.error('push dispatch failed', error)
          return Response.json({ error: 'Dispatch failed' }, { status: 500 })
        }
      },
    },
  },
})
