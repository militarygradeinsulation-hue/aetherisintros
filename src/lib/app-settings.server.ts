/**
 * Server-held settings in public.app_settings (service role only, drizzle/migrations/0041):
 * the site address the database calls, the secret it sends with each call, and the
 * push-notification keys, which are generated on first use.
 */
import { generateVapidKeys, type VapidKeys } from './webpush'

/* eslint-disable @typescript-eslint/no-explicit-any */
async function db(): Promise<any> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  return supabaseAdmin
}

export async function getSetting(key: string): Promise<string> {
  const { data } = await (await db()).from('app_settings').select('value').eq('key', key).maybeSingle()
  return data?.value ?? ''
}

/** Constant-time string comparison. */
export function sameSecret(given: string, expected: string): boolean {
  if (!expected || given.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}

/** Is this request from the database (pg_net / pg_cron) or a scheduler holding CRON_SECRET? */
export async function isTrustedCaller(request: Request): Promise<boolean> {
  const dispatch = request.headers.get('x-dispatch-secret') ?? ''
  if (dispatch && sameSecret(dispatch, await getSetting('dispatch_secret'))) return true
  const bearer = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  const cron = process.env['CRON_SECRET'] ?? ''
  return !!bearer && sameSecret(bearer, cron)
}

let cachedVapid: VapidKeys | null = null

/** The push keys, created once and shared by every server instance. */
export async function getVapidKeys(): Promise<VapidKeys> {
  if (cachedVapid) return cachedVapid
  const admin = await db()
  const read = async () => {
    const { data } = await admin.from('app_settings').select('key, value').in('key', ['vapid_public', 'vapid_private'])
    const map = new Map<string, string>(((data ?? []) as Array<{ key: string; value: string }>).map(r => [r.key, r.value]))
    return map.get('vapid_public') && map.get('vapid_private')
      ? { publicKey: map.get('vapid_public')!, privateJwk: JSON.parse(map.get('vapid_private')!) as JsonWebKey }
      : null
  }
  let keys = await read()
  if (!keys) {
    const fresh = await generateVapidKeys()
    // First writer wins; everyone then reads the same pair.
    await admin.from('app_settings').upsert([
      { key: 'vapid_public', value: fresh.publicKey },
      { key: 'vapid_private', value: JSON.stringify(fresh.privateJwk) },
    ], { onConflict: 'key', ignoreDuplicates: true })
    keys = (await read()) ?? fresh
  }
  cachedVapid = keys
  return keys
}
