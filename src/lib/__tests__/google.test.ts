import { describe, expect, it } from 'vitest'

import { decryptToken, encryptToken, signState, summarizeEvents, verifyState } from '../google.server'

describe('google calendar', () => {
  it('accepts only states this server signed for this browser, before they expire', async () => {
    const now = Date.UTC(2026, 9, 9)
    const state = await signState('user-1', 'nonce-1', 'secret-a', now)
    expect(await verifyState(state, 'nonce-1', 'secret-a', now + 60_000)).toBe('user-1')
    expect(await verifyState(state, 'nonce-2', 'secret-a', now)).toBeNull()
    expect(await verifyState(state, '', 'secret-a', now)).toBeNull()
    expect(await verifyState(state, 'nonce-1', 'secret-b', now)).toBeNull()
    expect(await verifyState(state, 'nonce-1', 'secret-a', now + 11 * 60_000)).toBeNull()
    const [body, sig] = state.split('.')
    expect(await verifyState(`${body}x.${sig}`, 'nonce-1', 'secret-a', now)).toBeNull()
    expect(await verifyState('garbage', 'nonce-1', 'secret-a', now)).toBeNull()
  })

  it('encrypts refresh tokens so only the same secret reads them', async () => {
    const sealed = await encryptToken('1//refresh-token', 'secret-a')
    expect(sealed).not.toContain('refresh-token')
    expect(await decryptToken(sealed, 'secret-a')).toBe('1//refresh-token')
    await expect(decryptToken(sealed, 'secret-b')).rejects.toThrow()
  })

  it('summarizes small meetings per attendee: last, next and 90-day count', () => {
    const now = Date.UTC(2026, 9, 9, 12)
    const at = (days: number) => ({ dateTime: new Date(now + days * 86_400_000).toISOString() })
    const bo = { email: 'Bo@Example.test' }
    const me = { email: 'me@example.test', self: true }
    const signals = summarizeEvents([
      { start: at(-100), attendees: [me, bo] },
      { start: at(-20), attendees: [me, bo] },
      { start: at(-5), attendees: [me, bo, { email: 'room@example.test', resource: true }] },
      { start: at(-3), status: 'cancelled', attendees: [me, bo] },
      { start: at(-2), attendees: [me, { ...bo, responseStatus: 'declined' }] },
      { start: at(7), attendees: [me, bo, { email: 'ME@example.test' }] },
      { start: at(9), attendees: [me, bo] },
      { start: at(-1), attendees: [me, ...Array.from({ length: 13 }, (_, i) => ({ email: `p${i}@example.test` }))] },
    ], ['me@example.test'], now)
    expect(signals).toEqual([{ email: 'bo@example.test', last_at: new Date(now - 5 * 86_400_000).toISOString(), next_at: new Date(now + 7 * 86_400_000).toISOString(), count_90d: 2 }])
  })
})

describe('gmail headers', () => {
  it('finds addresses in header values', async () => {
    const { addressesIn } = await import('../google.server')
    expect(addressesIn('Ana Diaz <Ana@Example.test>, "Bo, Jr" <bo@x.test>')).toEqual(['ana@example.test', 'bo@x.test'])
  })

  it('summarizes recent correspondence per person, skipping bulk mail and old mail', async () => {
    const { summarizeEmails } = await import('../google.server')
    const now = Date.UTC(2026, 9, 9, 12)
    const day = 86_400_000
    const msg = (daysAgo: number, from: string, to: string, cc = '') => ({ internalDate: String(now - daysAgo * day), payload: { headers: [{ name: 'From', value: from }, { name: 'To', value: to }, { name: 'Cc', value: cc }] } })
    const signals = summarizeEmails([
      msg(2, 'me@example.test', 'bo@example.test'),
      msg(10, 'Bo <BO@example.test>', 'me@example.test'),
      msg(100, 'bo@example.test', 'me@example.test'),
      msg(1, 'news@list.test', Array.from({ length: 13 }, (_, i) => `p${i}@x.test`).join(', ')),
    ], ['me@example.test'], now)
    expect(signals).toEqual([{ email: 'bo@example.test', last_at: new Date(now - 2 * day).toISOString(), next_at: null, count_90d: 2 }])
  })
})
