/**
 * Writes a server-side error to public.app_errors (server only, best effort, never throws).
 * Request bodies, headers and query strings are not recorded.
 */
export async function logServerError(error: unknown, request?: Request) {
  try {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    const stack = error instanceof Error ? error.stack ?? '' : ''
    await (supabaseAdmin as unknown as { from: (t: string) => { insert: (r: unknown) => Promise<unknown> } }).from('app_errors').insert({
      source: 'server', message: message.slice(0, 1000), stack: stack.slice(0, 4000),
      url: request ? new URL(request.url).pathname.slice(0, 500) : '',
    })
  } catch { /* logging must never break a response */ }
}
