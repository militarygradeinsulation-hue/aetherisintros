import { boundedBody, publisherImage, publisherImageUrl } from '@/lib/public-fetch.server'
import { createFileRoute } from '@tanstack/react-router'

/**
 * Serves publisher artwork through Ask Intros so readers never leave the site
 * and hotlink-protected images still render.
 */
export const Route = createFileRoute('/api/public/news-image')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const target = new URL(request.url).searchParams.get('url')
        if (!target) return new Response('Missing url', { status: 400 })

        try { publisherImageUrl(target) } catch {
          return new Response('Unsupported image origin', { status: 400 })
        }

        try {
          const upstream = await publisherImage(target)
          const type = upstream.headers.get('content-type') ?? ''
          if (!upstream.ok || !/^image\/(avif|webp|png|jpeg|gif)(?:;|$)/i.test(type)) {
            return new Response('No image', { status: 404 })
          }
          return new Response((await boundedBody(upstream, 5 * 1024 * 1024)).buffer as ArrayBuffer, {
            status: 200,
            headers: {
              'content-type': type,
              'x-content-type-options': 'nosniff',
              'cache-control': 'public, max-age=86400, s-maxage=604800',
            },
          })
        } catch {
          return new Response('Upstream failed', { status: 502 })
        }
      },
    },
  },
})
