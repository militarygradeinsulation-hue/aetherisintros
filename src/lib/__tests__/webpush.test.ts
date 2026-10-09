import { describe, expect, it } from 'vitest'

import { b64url, encryptPayload, fromB64url, generateVapidKeys, vapidAuthorization } from '../webpush'

const enc = new TextEncoder()
const concat = (...p: Uint8Array[]) => { const o = new Uint8Array(p.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of p) { o.set(x, i); i += x.length } return o }
const hmac = async (k: Uint8Array, d: Uint8Array) => new Uint8Array(await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', k as BufferSource, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), d as BufferSource))

/** What a browser does with an incoming push (RFC 8291 §3, from the receiving side). */
async function decryptAsBrowser(body: Uint8Array, ua: CryptoKeyPair, uaPublic: Uint8Array, auth: Uint8Array) {
  const salt = body.slice(0, 16)
  const rs = new DataView(body.buffer, body.byteOffset + 16, 4).getUint32(0)
  const idlen = body[20]!
  const asPublic = body.slice(21, 21 + idlen)
  const cipher = body.slice(21 + idlen)
  const asKey = await crypto.subtle.importKey('raw', asPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: asKey } as EcdhKeyDeriveParams, ua.privateKey, 256))
  const ikm = await hmac(await hmac(auth, ecdh), concat(enc.encode('WebPush: info\0'), uaPublic, asPublic, new Uint8Array([1])))
  const prk = await hmac(salt, ikm)
  const cek = (await hmac(prk, concat(enc.encode('Content-Encoding: aes128gcm\0'), new Uint8Array([1])))).slice(0, 16)
  const nonce = (await hmac(prk, concat(enc.encode('Content-Encoding: nonce\0'), new Uint8Array([1])))).slice(0, 12)
  const key = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['decrypt'])
  const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, cipher))
  return { rs, idlen, delimiter: plain[plain.length - 1], text: new TextDecoder().decode(plain.slice(0, -1)) }
}

describe('web push', () => {
  it('encrypts so that the subscribing browser can decrypt (RFC 8291)', async () => {
    const ua = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) as CryptoKeyPair
    const uaPublic = new Uint8Array(await crypto.subtle.exportKey('raw', ua.publicKey))
    const auth = crypto.getRandomValues(new Uint8Array(16))
    const message = JSON.stringify({ title: 'Ask Intros', body: 'Ana accepted your introduction.', url: '/app' })
    const body = await encryptPayload({ p256dh: b64url(uaPublic), auth: b64url(auth) }, enc.encode(message))
    const out = await decryptAsBrowser(body, ua, uaPublic, auth)
    expect(out).toEqual({ rs: 4096, idlen: 65, delimiter: 2, text: message })
  })

  it('signs a VAPID token push services can verify', async () => {
    const keys = await generateVapidKeys()
    expect(fromB64url(keys.publicKey)).toHaveLength(65)
    const header = await vapidAuthorization('https://fcm.googleapis.com/fcm/send/abc', keys, 'mailto:team@example.com', Date.UTC(2026, 0, 1))
    const [, token, k] = header.match(/^vapid t=([^,]+), k=(.+)$/)!
    expect(k).toBe(keys.publicKey)
    const [h, c, s] = token!.split('.')
    expect(JSON.parse(new TextDecoder().decode(fromB64url(c!)))).toEqual({ aud: 'https://fcm.googleapis.com', exp: Date.UTC(2026, 0, 1) / 1000 + 43200, sub: 'mailto:team@example.com' })
    const pub = await crypto.subtle.importKey('raw', fromB64url(keys.publicKey) as BufferSource, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
    expect(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pub, fromB64url(s!) as BufferSource, enc.encode(`${h}.${c}`))).toBe(true)
  })
})
