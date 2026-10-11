import { createFileRoute } from '@tanstack/react-router'
import { logServerError } from '@/lib/server-error-log'

/** Assistant key (create_ask): post an ask for the key owner. */
export const Route = createFileRoute('/api/agent/asks')({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { handleCreateAsk } = await import('@/lib/agent-gateway/gateway.server')
          return await handleCreateAsk(request)
        } catch (error) {
          await logServerError(error, request)
          return Response.json({ error: 'unavailable' }, { status: 500 })
        }
      },
    },
  },
})
