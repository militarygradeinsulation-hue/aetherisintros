import { createFileRoute } from '@tanstack/react-router'

import { unsubscribeDigest } from '@/lib/digest.server'

const page = (message: string) => new Response(
  `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ask Intros</title>
  <body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#07090C;color:#F2EEE6;font:16px/1.5 -apple-system,Segoe UI,sans-serif;padding:24px">
  <main style="max-width:420px;text-align:center"><p style="letter-spacing:.14em;font-size:11px;color:#F5B027">ASK INTROS</p><h1 style="font:28px Georgia,serif">${message}</h1>
  <p style="color:#9CA3AF">You can turn the weekly email back on from the This week panel on Home.</p></main></body>`,
  { headers: { 'content-type': 'text/html; charset=utf-8' } },
)

/** One-click unsubscribe from the weekly digest (link and List-Unsubscribe header in every email). */
export const Route = createFileRoute('/api/public/digest-unsubscribe')({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async ({ request }) => {
        const ok = await unsubscribeDigest(new URL(request.url).searchParams.get('token') ?? '')
        return page(ok ? 'You will no longer get the weekly email.' : 'That link has expired or was already used.')
      },
      POST: async ({ request }) => {
        await unsubscribeDigest(new URL(request.url).searchParams.get('token') ?? '')
        return new Response(null, { status: 204 })
      },
    },
  },
})
