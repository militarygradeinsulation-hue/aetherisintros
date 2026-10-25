import { createFileRoute } from '@tanstack/react-router'

/**
 * Retired legacy directory bootstrap. Demo records come from bundled source;
 * public HTTP requests cannot initialize or overwrite production tables.
 */
export const Route = createFileRoute('/api/public/seed-network')({
  staticData: { sitemap: false },
  server: {
    handlers: {
      // The demo uses its bundled catalogue. This legacy public entry point
      // must never invoke a service-role writer on production tables.
      POST: async () => Response.json({ error: 'Endpoint retired.' }, {
        status: 410, headers: { 'cache-control': 'no-store' },
      }),
    },
  },
})
