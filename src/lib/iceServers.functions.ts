import { createServerFn } from '@tanstack/react-start'

import { requireAuthContract } from './auth-gate'

/**
 * Connection servers for video calls. Public STUN always, plus a TURN relay when one is
 * configured, so calls also connect on strict company and mobile networks that block direct
 * connections (without one, roughly one call in five on such networks never connects).
 *
 * Either:
 * - Cloudflare Realtime TURN (free tier): CLOUDFLARE_TURN_KEY_ID and CLOUDFLARE_TURN_API_TOKEN.
 *   Short-lived credentials are generated per call.
 * - Any TURN server: TURN_URLS (comma-separated), TURN_USERNAME, TURN_CREDENTIAL.
 *
 * Only signed-in members receive relay credentials.
 */
const STUN: RTCIceServer = { urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] }

async function cloudflareTurn(): Promise<RTCIceServer[]> {
  const keyId = process.env['CLOUDFLARE_TURN_KEY_ID']
  const token = process.env['CLOUDFLARE_TURN_API_TOKEN']
  if (!keyId || !token) return []
  try {
    const res = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ ttl: 6 * 60 * 60 }),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) { console.error('cloudflare turn credentials failed', res.status); return [] }
    const body = (await res.json()) as { iceServers?: RTCIceServer | RTCIceServer[] }
    const list = Array.isArray(body.iceServers) ? body.iceServers : body.iceServers ? [body.iceServers] : []
    return list.filter(s => s && s.urls)
  } catch (error) {
    console.error('cloudflare turn credentials failed', error)
    return []
  }
}

function staticTurn(): RTCIceServer[] {
  const urls = (process.env['TURN_URLS'] ?? '').split(',').map(u => u.trim()).filter(u => /^turns?:/.test(u))
  const username = process.env['TURN_USERNAME']
  const credential = process.env['TURN_CREDENTIAL']
  return urls.length && username && credential ? [{ urls, username, credential }] : []
}

export const getIceServers = createServerFn({ method: 'GET' })
  .middleware([requireAuthContract])
  .handler(async (): Promise<{ iceServers: RTCIceServer[]; relay: boolean }> => {
    const relays = [...(await cloudflareTurn()), ...staticTurn()]
    return { iceServers: [STUN, ...relays], relay: relays.length > 0 }
  })
