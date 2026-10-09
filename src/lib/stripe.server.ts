/**
 * Minimal Stripe client for Workers (no SDK): form-encoded API calls and webhook signature
 * checks with Web Crypto. Needs STRIPE_SECRET_KEY; webhooks need STRIPE_WEBHOOK_SECRET.
 */

type Params = Record<string, unknown>

/** Stripe's form encoding: nested objects and arrays as key[sub][0]=value. */
export function formEncode(params: Params, prefix = ''): string {
  const parts: string[] = []
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue
    const key = prefix ? `${prefix}[${k}]` : k
    if (Array.isArray(v)) v.forEach((item, i) => parts.push(typeof item === 'object' ? formEncode(item as Params, `${key}[${i}]`) : `${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(String(item))}`))
    else if (typeof v === 'object') parts.push(formEncode(v as Params, key))
    else parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`)
  }
  return parts.filter(Boolean).join('&')
}

export const stripeConfigured = () => !!process.env['STRIPE_SECRET_KEY']

export async function stripe<T = any>(method: 'GET' | 'POST', path: string, params: Params = {}): Promise<T> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const key = process.env['STRIPE_SECRET_KEY']
  if (!key) throw new Error('Payments are not set up yet.')
  const body = formEncode(params)
  const url = `https://api.stripe.com/v1${path}${method === 'GET' && body ? `?${body}` : ''}`
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${key}`, ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
    ...(method === 'POST' ? { body } : {}),
    signal: AbortSignal.timeout(15_000),
  })
  const json = await res.json() as { error?: { message?: string } }
  if (!res.ok) throw new Error(json.error?.message ?? `Stripe error ${res.status}`)
  return json as T
}

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')

/** Checks a Stripe-Signature header (v1 HMAC-SHA256 over "timestamp.payload", 5-minute window). */
export async function verifyStripeSignature(payload: string, header: string, secret: string, now = Date.now()): Promise<boolean> {
  if (!secret || !header) return false
  const fields = header.split(',').map(p => p.split('=') as [string, string])
  const t = Number(fields.find(([k]) => k === 't')?.[1])
  const signatures = fields.filter(([k]) => k === 'v1').map(([, v]) => v)
  if (!t || !signatures.length || Math.abs(now / 1000 - t) > 300) return false
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const expected = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${payload}`)))
  return signatures.some(sig => sig.length === expected.length && [...sig].reduce((d, c, i) => d | (c.charCodeAt(0) ^ expected.charCodeAt(i)), 0) === 0)
}
