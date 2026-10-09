import { createFileRoute } from '@tanstack/react-router'

/** Assistant key (read_profile_public): the key owner's public profile. */
export const Route = createFileRoute('/api/agent/profile')({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { handleProfile } = await import('@/lib/agent-gateway/gateway.server')
          return await handleProfile(request)
        } catch (error) {
          console.error('agent gateway profile failed', error)
          return Response.json({ error: 'unavailable' }, { status: 500 })
        }
      },
    },
  },
})
