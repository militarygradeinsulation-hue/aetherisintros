import { createServerFn } from '@tanstack/react-start'

import { requireAuthContract } from './auth-gate'

/**
 * Connection servers for video calls. Public STUN always; a TURN relay too when configured
 * (TURN_URLS comma-separated, TURN_USERNAME, TURN_CREDENTIAL), so calls also work on strict
 * corporate networks that block direct connections. Only signed-in members receive the relay
 * credentials.
 */
export const getIceServers = createServerFn({ method: 'GET' })
  .middleware([requireAuthContract])
  .handler(async (): Promise<{ iceServers: RTCIceServer[]; relay: boolean }> => {
    const iceServers: RTCIceServer[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }]
    const urls = (process.env['TURN_URLS'] ?? '').split(',').map(u => u.trim()).filter(u => /^turns?:/.test(u))
    const username = process.env['TURN_USERNAME']
    const credential = process.env['TURN_CREDENTIAL']
    if (urls.length && username && credential) iceServers.push({ urls, username, credential })
    return { iceServers, relay: iceServers.length > 1 }
  })
