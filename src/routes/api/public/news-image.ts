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

        let source: URL
        try {
          source = new URL(target)
        } catch {
          return new Response('Bad url', { status: 400 })
        }
        if (source.protocol !== 'http:' && source.protocol !== 'https:') {
          return new Response('Bad protocol', { status: 400 })
        }

        try {
          const upstream = await fetch(source.toString(), {
            headers: {
              'user-agent': 'Mozilla/5.0 (compatible; AskIntrosReader/1.0)',
              accept: 'image/avif,image/webp,image/*,*/*;q=0.8',
              referer: `${source.protocol}//${source.host}/`,
            },
            signal: AbortSignal.timeout(10_000),
            redirect: 'follow',
          })
          const type = upstream.headers.get('content-type') ?? ''
          if (!upstream.ok || !type.startsWith('image/')) {
            return new Response('No image', { status: 404 })
          }
          return new Response(upstream.body, {
            status: 200,
            headers: {
              'content-type': type,
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
