import { describe, expect, it } from 'vitest'

import { hashCode, normalizePhone, smsBody, smsGroup } from '../sms.server'

describe('text alerts', () => {
  it('reads typed numbers as E.164', () => {
    expect(normalizePhone('(555) 555-0100')).toBe('+15555550100')
    expect(normalizePhone('1 555 555 0100')).toBe('+15555550100')
    expect(normalizePhone('+44 20 7946 0958')).toBe('+442079460958')
    expect(normalizePhone('0044 20 7946 0958')).toBe('+442079460958')
    expect(normalizePhone('555-0100')).toBeNull()
    expect(normalizePhone('+0123')).toBeNull()
    expect(normalizePhone('hello')).toBeNull()
  })

  it('texts only the alert groups members can choose', () => {
    expect(smsGroup('intro_request')).toBe('intros')
    expect(smsGroup('meeting_invite')).toBe('meetings')
    expect(smsGroup('concierge')).toBe('concierge')
    expect(smsGroup('message')).toBe('messages')
    expect(smsGroup('follow')).toBeNull()
    expect(smsGroup('connection')).toBeNull()
  })

  it('keeps texts short and points to the app', () => {
    const body = smsBody('Ana  accepted\nyour introduction.', 'https://aetherisintros.lovable.app/')
    expect(body).toBe('Ask Intros: Ana accepted your introduction. https://aetherisintros.lovable.app/app')
    expect(smsBody('x'.repeat(500), 'https://a.test').length).toBeLessThan(300)
  })

  it('binds confirmation codes to the member and the server secret', async () => {
    const a = await hashCode('123456', 'user-a', 'secret')
    expect(a).toMatch(/^[0-9a-f]{64}$/)
    expect(await hashCode('123456', 'user-a', 'secret')).toBe(a)
    expect(await hashCode('123456', 'user-b', 'secret')).not.toBe(a)
    expect(await hashCode('123456', 'user-a', 'other')).not.toBe(a)
  })
})
