import { createMiddleware } from '@tanstack/react-start'
import { setResponseStatus } from '@tanstack/react-start/server'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { authRequiredMessage } from './auth-contract'

/**
 * Wraps requireSupabaseAuth so every auth failure (missing header, bad or
 * expired token) becomes one typed contract: HTTP 401 + AUTH_REQUIRED error.
 * Other failures pass through untouched.
 */
export const requireAuthContract = createMiddleware({ type: 'function' })
  .middleware([
    createMiddleware({ type: 'function' }).server(async ({ next }) => {
      try {
        return await next()
      } catch (error) {
        const message = error instanceof Error ? error.message : ''
        if (message.startsWith('Unauthorized')) {
          setResponseStatus(401)
          throw new Error(authRequiredMessage(message.replace(/^Unauthorized:\s*/, '')))
        }
        throw error
      }
    }),
    requireSupabaseAuth,
  ])
  .server(({ next }) => next())
