/**
 * Sends browser errors to the app's error log (public.app_errors, read by admins on the Launch
 * control page). Each distinct error is reported once per page load, at most 10 per load, so a
 * failing loop cannot flood the log. Reporting never throws.
 */
import { supabase } from '@/integrations/supabase/client'

const sent = new Set<string>()
let installed = false

function describe(error: unknown): { message: string; stack: string } {
  if (error instanceof Error) return { message: `${error.name}: ${error.message}`, stack: error.stack ?? '' }
  if (typeof error === 'string') return { message: error, stack: '' }
  try { return { message: JSON.stringify(error).slice(0, 1000), stack: '' } } catch { return { message: String(error), stack: '' } }
}

/** Errors from browser extensions and cross-origin scripts carry nothing useful. */
const NOISE = /^(Script error\.?|ResizeObserver loop|Non-Error promise rejection captured)/i

export function reportClientError(error: unknown, where = '') {
  if (typeof window === 'undefined') return
  const { message, stack } = describe(error)
  if (!message || NOISE.test(message)) return
  const key = `${message}|${stack.split('\n')[1] ?? ''}`
  if (sent.has(key) || sent.size >= 10) return
  sent.add(key)
  void (supabase.rpc as unknown as (fn: string, args: Record<string, string>) => Promise<unknown>)('log_app_error', {
    p_message: where ? `[${where}] ${message}` : message,
    p_stack: stack,
    p_url: location.pathname + location.search,
    p_user_agent: navigator.userAgent,
  }).catch(() => undefined)
}

/** Report uncaught errors and unhandled promise rejections from this page. */
export function installClientErrorReporting() {
  if (installed || typeof window === 'undefined') return
  installed = true
  window.addEventListener('error', e => reportClientError(e.error ?? e.message, 'window'))
  window.addEventListener('unhandledrejection', e => reportClientError(e.reason, 'promise'))
}
