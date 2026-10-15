import { createFileRoute } from '@tanstack/react-router'
import { logServerError } from '@/lib/server-error-log'

/** Assistant key (search_members): search verified members, ?q=&limit=. */
export const Route = createFileRoute('/api/agent/members')({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { handleSearch } = await import('@/lib/agent-gateway/gateway.server')
          return await handleSearch(request)
        } catch (error) {
          await logServerError(error, request)
          return Response.json({ error: 'unavailable' }, { status: 500 })
        }
      },
    },
  },
})
