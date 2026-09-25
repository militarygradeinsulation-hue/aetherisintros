import { createMiddleware } from '@tanstack/react-start'
import { setResponseStatus } from '@tanstack/react-start/server'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { authRequiredMessage } from './auth-contract'

/**
 * Wraps requireSupabaseAuth so every auth failure (missing header, malformed,
 * forged or expired token) becomes one typed contract: HTTP 401 + AUTH_REQUIRED.
 * Errors raised after authentication succeeded pass through untouched.
 */
const authProbe = createMiddleware({ type: 'function' }).server(async ({ next }) => {
  const probe = { authenticated: false }
  try {
    return await next({ context: { authProbe: probe } })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    const configError = message.startsWith('Missing Supabase environment')
    if (!probe.authenticated && !configError) {
      setResponseStatus(401)
      throw new Error(authRequiredMessage(message.startsWith('Unauthorized') ? message.replace(/^Unauthorized:\s*/, '') : 'Invalid session'))
    }
    throw error
  }
})

const markAuthenticated = createMiddleware({ type: 'function' }).server(({ next, context }) => {
  ;(context as { authProbe?: { authenticated: boolean } }).authProbe!.authenticated = true
  return next()
})

export const requireAuthContract = createMiddleware({ type: 'function' })
  .middleware([authProbe, requireSupabaseAuth, markAuthenticated])
  .server(({ next }) => next())
