import { createFileRoute } from '@tanstack/react-router'

import { membershipCardImage } from '@/lib/membership-card.server'

/**
 * The personalised strip of an emailed membership card (name, code, verification date).
 * Addressed by the card's unguessable image token; revoked cards are no longer served.
 */
export const Route = createFileRoute('/api/public/membership-card')({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const png = await membershipCardImage(new URL(request.url).searchParams.get('t') ?? '')
          if (!png) return new Response('Not found', { status: 404 })
          return new Response(png as BodyInit, {
            headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400', 'x-robots-tag': 'noindex' },
          })
        } catch (error) {
          console.error('membership-card image failed', error)
          return new Response('Unavailable', { status: 500 })
        }
      },
    },
  },
})
