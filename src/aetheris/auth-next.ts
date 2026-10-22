/**
 * A login return destination is always a relative path on this application.
 * An absolute URL, protocol-relative URL, backslash, or control character must
 * never become a post-authentication redirect. Keep this independent of the
 * browser origin so validation works during SSR and client hydration.
 */
const AUTH_ORIGIN = 'https://askintros.vip'

export function safeAuthNext(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.length > 2048) return ''
  if (value.startsWith('//') || value.includes('\\') || /[\u0000-\u001f\u007f]/.test(value)) return ''
  try {
    const parsed = new URL(value, AUTH_ORIGIN)
    if (parsed.origin !== AUTH_ORIGIN) return ''
    return parsed.pathname + parsed.search + parsed.hash
  } catch {
    return ''
  }
}
