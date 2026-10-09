import { createFileRoute } from '@tanstack/react-router'

/** Assistant key (request_intro): request a double opt-in introduction with a context capsule. */
export const Route = createFileRoute('/api/agent/intros')({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { handleRequestIntro } = await import('@/lib/agent-gateway/gateway.server')
          return await handleRequestIntro(request)
        } catch (error) {
          console.error('agent gateway intros failed', error)
          return Response.json({ error: 'unavailable' }, { status: 500 })
        }
      },
    },
  },
})
