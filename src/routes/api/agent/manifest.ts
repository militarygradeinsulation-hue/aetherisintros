import { createFileRoute } from '@tanstack/react-router'

import { agentManifest } from '@/lib/agent-gateway/manifest'

/** Public, machine-readable description of the Agent Trust Gateway. */
export const Route = createFileRoute('/api/agent/manifest')({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = process.env['APP_URL']?.replace(/\/$/, '') || new URL(request.url).origin
        return Response.json(agentManifest(origin), {
          headers: { 'cache-control': 'public, max-age=3600', 'access-control-allow-origin': '*' },
        })
      },
    },
  },
})
