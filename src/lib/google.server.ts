/**
 * Google Calendar, read-only: a member connects their own calendar and the server sees which
 * members they met (attendee emails matched to confirmed member addresses) and when.
 * OAuth with no SDK; the refresh token is stored encrypted (drizzle/migrations/0043).
 */
import { b64url, fromB64url } from './webpush'

export const GOOGLE_SCOPES = ['openid', 'email', 'https://www.googleapis.com/auth/calendar.readonly']
const enc = new TextEncoder()

export const googleConfigured = () => !!(process.env['GOOGLE_CLIENT_ID'] && process.env['GOOGLE_CLIENT_SECRET'])

/**
 * Gmail, staged: headers only (gmail.metadata), offered once the site sets GOOGLE_GMAIL_ENABLED
 * after Google's restricted-scope review.
 */
export const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.metadata'
export const gmailEnabled = () => googleConfigured() && process.env['GOOGLE_GMAIL_ENABLED'] === 'true'

/* eslint-disable @typescript-eslint/no-explicit-any */
async function admin(): Promise<any> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  return supabaseAdmin
}

async function serverSecret(): Promise<string> {
  const { getSetting } = await import('./app-settings.server')
  const secret = (await getSetting('dispatch_secret')) || process.env['CRON_SECRET'] || ''
  if (!secret) throw new Error('Server secret is not set up yet.')
  return secret
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey('raw', enc.encode(`google-state:${secret}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

/**
 * Signed OAuth state: who started the connection, valid for 10 minutes. The nonce is also set
 * as a cookie in the starting browser, so a link someone else started cannot attach your
 * calendar to their account.
 */
export async function signState(userId: string, nonce: string, secret: string, now = Date.now()): Promise<string> {
  const body = b64url(enc.encode(JSON.stringify({ u: userId, n: nonce, e: now + 10 * 60_000 })))
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(body)))
  return `${body}.${b64url(sig)}`
}

/** The user id from a state this server signed for this browser, or null when forged, expired or foreign. */
export async function verifyState(state: string, nonce: string, secret: string, now = Date.now()): Promise<string | null> {
  const [body, sig] = state.split('.')
  if (!body || !sig) return null
  try {
    const valid = await crypto.subtle.verify('HMAC', await hmacKey(secret), fromB64url(sig) as BufferSource, enc.encode(body))
    if (!valid) return null
    const claims = JSON.parse(new TextDecoder().decode(fromB64url(body))) as { u?: string; n?: string; e?: number }
    if (!nonce || claims.n !== nonce) return null
    return typeof claims.u === 'string' && typeof claims.e === 'number' && claims.e > now ? claims.u : null
  } catch { return null }
}

async function aesKey(secret: string) {
  const raw = await crypto.subtle.digest('SHA-256', enc.encode(`google-token:${secret}`))
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

export async function encryptToken(token: string, secret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(secret), enc.encode(token)))
  return `v1.${b64url(iv)}.${b64url(cipher)}`
}

export async function decryptToken(value: string, secret: string): Promise<string> {
  const [v, iv, cipher] = value.split('.')
  if (v !== 'v1' || !iv || !cipher) throw new Error('Unreadable token')
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64url(iv) as BufferSource }, await aesKey(secret), fromB64url(cipher) as BufferSource)
  return new TextDecoder().decode(plain)
}

export function redirectUri(origin: string) { return `${origin}/api/google/callback` }
export const NONCE_COOKIE = 'ai_google_nonce'
export const newNonce = () => b64url(crypto.getRandomValues(new Uint8Array(16)))

export async function buildAuthUrl(userId: string, nonce: string, origin: string, withGmail = false): Promise<string> {
  const params = new URLSearchParams({
    client_id: process.env['GOOGLE_CLIENT_ID'] ?? '',
    redirect_uri: redirectUri(origin),
    response_type: 'code',
    scope: [...GOOGLE_SCOPES, ...(withGmail ? [GMAIL_SCOPE] : [])].join(' '),
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state: await signState(userId, nonce, await serverSecret()),
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

async function tokenRequest(params: Record<string, string>) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: process.env['GOOGLE_CLIENT_ID'] ?? '', client_secret: process.env['GOOGLE_CLIENT_SECRET'] ?? '', ...params }),
    signal: AbortSignal.timeout(15_000),
  })
  const json = await res.json().catch(() => ({})) as Record<string, any>
  if (!res.ok) throw new Error(json['error_description'] || json['error'] || `Google returned ${res.status}`)
  return json
}

/** The Google account email inside an ID token Google just handed us over TLS. */
function emailFromIdToken(idToken: string | undefined): string {
  try { return String(JSON.parse(new TextDecoder().decode(fromB64url(idToken!.split('.')[1]!))).email ?? '') } catch { return '' }
}

/** Finishes the OAuth round trip: stores the encrypted refresh token, then runs a first sync. */
export async function completeConnection(code: string, state: string, nonce: string, origin: string): Promise<string> {
  const secret = await serverSecret()
  const userId = await verifyState(state, nonce, secret)
  if (!userId) throw new Error('This connection link expired. Please try again.')
  const tokens = await tokenRequest({ code, grant_type: 'authorization_code', redirect_uri: redirectUri(origin) })
  const scopes = String(tokens['scope'] ?? '').split(' ').filter(Boolean)
  if (!scopes.includes('https://www.googleapis.com/auth/calendar.readonly')) throw new Error('Calendar access was not granted.')
  if (!tokens['refresh_token']) throw new Error('Google did not return offline access. Please try again.')
  const db = await admin()
  const { error } = await db.from('google_connections').upsert({
    user_id: userId,
    google_email: emailFromIdToken(tokens['id_token']),
    scopes,
    refresh_token_enc: await encryptToken(tokens['refresh_token'], secret),
    connected_at: new Date().toISOString(),
    last_error: '',
  }, { onConflict: 'user_id' })
  if (error) throw new Error('Could not save the connection.')
  await syncUser(userId).catch(() => undefined)
  return userId
}

export interface CalendarEvent { status?: string; start?: { dateTime?: string; date?: string }; attendees?: Array<{ email?: string; self?: boolean; responseStatus?: string; resource?: boolean }> }
export interface Signal { email: string; last_at: string | null; next_at: string | null; count_90d: number }

/** Per attendee email: last meeting before now, next one after, and how many in the past 90 days. */
export function summarizeEvents(events: CalendarEvent[], ownEmails: string[], now = Date.now()): Signal[] {
  const own = new Set(ownEmails.map(e => e.toLowerCase()))
  const out = new Map<string, Signal>()
  for (const event of events) {
    if (event.status === 'cancelled') continue
    const when = Date.parse(event.start?.dateTime ?? event.start?.date ?? '')
    if (!Number.isFinite(when)) continue
    const people = (event.attendees ?? []).filter(a => a.email && !a.self && !a.resource && a.responseStatus !== 'declined')
    // Large meetings say little about a relationship.
    if (people.length === 0 || people.length > 12) continue
    for (const a of people) {
      const email = a.email!.toLowerCase()
      if (own.has(email)) continue
      const s = out.get(email) ?? { email, last_at: null, next_at: null, count_90d: 0 }
      const iso = new Date(when).toISOString()
      if (when <= now) {
        if (!s.last_at || iso > s.last_at) s.last_at = iso
        if (when >= now - 90 * 86_400_000) s.count_90d++
      } else if (!s.next_at || iso < s.next_at) s.next_at = iso
      out.set(email, s)
    }
  }
  return [...out.values()]
}

export interface MailHeaders { internalDate?: string; payload?: { headers?: Array<{ name?: string; value?: string }> } }

/** Every address in a From/To/Cc header value ("Ana <ana@x.com>, bo@y.com"). */
export function addressesIn(value: string): string[] {
  return [...value.matchAll(/[A-Za-z0-9._%+'-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)].map(m => m[0].toLowerCase())
}

/** Per correspondent: last email either way and how many in the past 90 days. Bulk mail is skipped. */
export function summarizeEmails(messages: MailHeaders[], ownEmails: string[], now = Date.now()): Signal[] {
  const own = new Set(ownEmails.map(e => e.toLowerCase()))
  const out = new Map<string, Signal>()
  for (const m of messages) {
    const when = Number(m.internalDate)
    if (!Number.isFinite(when) || when > now || when < now - 90 * 86_400_000) continue
    const header = (name: string) => (m.payload?.headers ?? []).filter(h => h.name?.toLowerCase() === name).map(h => h.value ?? '').join(', ')
    const people = [...new Set([...addressesIn(header('from')), ...addressesIn(header('to')), ...addressesIn(header('cc'))])].filter(e => !own.has(e))
    if (people.length === 0 || people.length > 12) continue
    const iso = new Date(when).toISOString()
    for (const email of people) {
      const s = out.get(email) ?? { email, last_at: null, next_at: null, count_90d: 0 }
      if (!s.last_at || iso > s.last_at) s.last_at = iso
      s.count_90d++
      out.set(email, s)
    }
  }
  return [...out.values()]
}

/** Headers of the most recent mail (up to 300 messages), ten requests at a time. */
async function fetchMailHeaders(accessToken: string): Promise<MailHeaders[]> {
  const auth = { Authorization: `Bearer ${accessToken}` }
  const ids: string[] = []
  let pageToken = ''
  while (ids.length < 300) {
    const params = new URLSearchParams({ maxResults: '100', ...(pageToken ? { pageToken } : {}) })
    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`, { headers: auth, signal: AbortSignal.timeout(15_000) })
    if (!res.ok) throw new Error(`Gmail returned ${res.status}`)
    const json = await res.json() as { messages?: Array<{ id: string }>; nextPageToken?: string }
    ids.push(...(json.messages ?? []).map(m => m.id))
    if (!json.nextPageToken) break
    pageToken = json.nextPageToken
  }
  const out: MailHeaders[] = []
  const fields = 'metadataHeaders=From&metadataHeaders=To&metadataHeaders=Cc&format=metadata&fields=internalDate,payload/headers'
  for (let i = 0; i < ids.length; i += 10) {
    const batch = await Promise.all(ids.slice(i, i + 10).map(async id => {
      const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}?${fields}`, { headers: auth, signal: AbortSignal.timeout(15_000) })
      return res.ok ? await res.json() as MailHeaders : null
    }))
    out.push(...batch.filter((m): m is MailHeaders => !!m))
  }
  return out
}

async function fetchEvents(accessToken: string, now = Date.now()): Promise<CalendarEvent[]> {
  const events: CalendarEvent[] = []
  let pageToken = ''
  for (let page = 0; page < 10; page++) {
    const params = new URLSearchParams({
      singleEvents: 'true', orderBy: 'startTime', maxResults: '250',
      timeMin: new Date(now - 90 * 86_400_000).toISOString(),
      timeMax: new Date(now + 30 * 86_400_000).toISOString(),
      fields: 'nextPageToken,items(status,start,attendees(email,self,responseStatus,resource))',
      ...(pageToken ? { pageToken } : {}),
    })
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(15_000) })
    if (!res.ok) throw new Error(`Calendar returned ${res.status}`)
    const json = await res.json() as { items?: CalendarEvent[]; nextPageToken?: string }
    events.push(...(json.items ?? []))
    if (!json.nextPageToken) break
    pageToken = json.nextPageToken
  }
  return events
}

/** Replaces one source's signals for a member with those matching other members. */
async function storeSignals(db: any, userId: string, source: 'calendar' | 'email', signals: Signal[]): Promise<number> {
  const { data: matches } = signals.length ? await db.rpc('member_ids_for_emails', { p_emails: signals.map(s => s.email).slice(0, 500) }) : { data: [] }
  const byEmail = new Map<string, string>(((matches ?? []) as Array<{ email: string; user_id: string }>).map(m => [m.email, m.user_id]))
  const rows = signals
    .filter(s => byEmail.has(s.email) && byEmail.get(s.email) !== userId)
    .map(s => ({ user_id: userId, member_id: byEmail.get(s.email)!, source, last_at: s.last_at, next_at: s.next_at, count_90d: s.count_90d, updated_at: new Date().toISOString() }))
  await db.from('relationship_signals').delete().eq('user_id', userId).eq('source', source)
  if (rows.length) await db.from('relationship_signals').upsert(rows, { onConflict: 'user_id,member_id,source' })
  return rows.length
}

/** Re-reads one member's calendar (and Gmail headers, when granted and enabled) and replaces their signals. */
export async function syncUser(userId: string): Promise<{ matched: number; emailMatched?: number }> {
  const db = await admin()
  const { data: conn } = await db.from('google_connections').select('refresh_token_enc, google_email, scopes').eq('user_id', userId).maybeSingle()
  if (!conn) throw new Error('Google Calendar is not connected.')
  try {
    const secret = await serverSecret()
    const access = await tokenRequest({ grant_type: 'refresh_token', refresh_token: await decryptToken(conn.refresh_token_enc, secret) })
    const { data: me } = await db.auth.admin.getUserById(userId)
    const own = [conn.google_email, me?.user?.email ?? ''].filter(Boolean)
    const matched = await storeSignals(db, userId, 'calendar', summarizeEvents(await fetchEvents(access['access_token']), own))
    let emailMatched: number | undefined
    if (gmailEnabled() && (conn.scopes ?? []).includes(GMAIL_SCOPE)) {
      emailMatched = await storeSignals(db, userId, 'email', summarizeEmails(await fetchMailHeaders(access['access_token']), own))
    }
    await db.from('google_connections').update({ last_sync_at: new Date().toISOString(), last_error: '' }).eq('user_id', userId)
    return { matched, ...(emailMatched === undefined ? {} : { emailMatched }) }
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : 'Sync failed'
    await db.from('google_connections').update({ last_error: message }).eq('user_id', userId)
    throw error
  }
}

/** The daily run: the members synced longest ago first, a bounded number per call. */
export async function syncAll(limit = 50): Promise<{ synced: number; failed: number }> {
  const db = await admin()
  const { data } = await db.from('google_connections').select('user_id').order('last_sync_at', { ascending: true, nullsFirst: true }).limit(limit)
  let synced = 0, failed = 0
  for (const row of (data ?? []) as Array<{ user_id: string }>) {
    try { await syncUser(row.user_id); synced++ } catch { failed++ }
  }
  return { synced, failed }
}

/** Revokes Google's grant and removes the stored token and signals. */
export async function disconnect(userId: string): Promise<void> {
  const db = await admin()
  const { data: conn } = await db.from('google_connections').select('refresh_token_enc').eq('user_id', userId).maybeSingle()
  if (conn) {
    try {
      const token = await decryptToken(conn.refresh_token_enc, await serverSecret())
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: 'POST', signal: AbortSignal.timeout(10_000) })
    } catch { /* removing our copy matters more than the revoke */ }
  }
  await db.from('relationship_signals').delete().eq('user_id', userId).in('source', ['calendar', 'email'])
  await db.from('google_connections').delete().eq('user_id', userId)
}
