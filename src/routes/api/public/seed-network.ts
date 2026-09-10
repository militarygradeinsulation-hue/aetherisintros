import { createFileRoute } from '@tanstack/react-router'

import { seedNetworkDirectory } from '@/lib/network-seed.server'

/**
 * Idempotent one-shot population of the shared, non-personal network
 * directory. It writes a fixed catalogue and refuses to run once the
 * directory holds rows, so it cannot alter or expose member data.
 */
export const Route = createFileRoute('/api/public/seed-network')({
  server: {
    handlers: {
      POST: async () => {
        try {
          const result = await seedNetworkDirectory()
          return Response.json(result)
        } catch (error) {
          console.error('seed-network failed', error)
          return Response.json({ error: 'Seeding failed' }, { status: 500 })
        }
      },
    },
  },
})
