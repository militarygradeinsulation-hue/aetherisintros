import { createFileRoute } from '@tanstack/react-router'

/** Where Google sends the member back after they approve (or decline) calendar access. */
export const Route = createFileRoute('/api/google/callback')({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const origin = process.env['APP_URL']?.replace(/\/$/, '') || url.origin
        // Clear the one-time nonce cookie whatever happens.
        const back = (result: string) => new Response(null, { status: 302, headers: {
          Location: `${origin}/app?google=${result}`,
          'Set-Cookie': 'ai_google_nonce=; Path=/api/google; Max-Age=0; HttpOnly; Secure; SameSite=Lax',
        } })
        const code = url.searchParams.get('code')
        const state = url.searchParams.get('state')
        if (!code || !state) return back('cancelled')
        try {
          const { completeConnection, NONCE_COOKIE } = await import('@/lib/google.server')
          const cookies = request.headers.get('cookie') ?? ''
          const nonce = cookies.split(/;\s*/).find(c => c.startsWith(`${NONCE_COOKIE}=`))?.slice(NONCE_COOKIE.length + 1) ?? ''
          await completeConnection(code, state, nonce, origin)
          return back('connected')
        } catch (error) {
          console.error('google connect failed', error)
          return back('failed')
        }
      },
    },
  },
})
