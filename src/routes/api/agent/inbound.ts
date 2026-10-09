import { createFileRoute } from '@tanstack/react-router'

/** Public: an outside agent asks to reach a member by handle, screened against their Agent Policy. */
export const Route = createFileRoute('/api/agent/inbound')({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { handleInbound } = await import('@/lib/agent-gateway/gateway.server')
          return await handleInbound(request)
        } catch (error) {
          console.error('agent gateway inbound failed', error)
          return Response.json({ error: 'unavailable' }, { status: 500 })
        }
      },
    },
  },
})
