import { createFileRoute } from '@tanstack/react-router'

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
          console.error('agent gateway members failed', error)
          return Response.json({ error: 'unavailable' }, { status: 500 })
        }
      },
    },
  },
})
