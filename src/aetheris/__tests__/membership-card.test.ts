import { describe, expect, it } from 'vitest'

import { cardDate, cardLettering, cardLines, fitName, type Measure } from '../membership-card-layout'
import { membershipCardEmail } from '../membership-email'

// About 0.6em per letter: a stand-in for font metrics.
const measure: Measure = (text, size, tracking) => text.length * ({ large: 38, medium: 30, small: 18 }[size]) * (0.6 + tracking)

describe('membership card layout', () => {
  it('prints engraved capitals with accents folded', () => {
    expect(cardLettering('  Ana  Ölander-Quist ')).toBe('ANA OLANDER-QUIST')
    expect(cardLettering('Łukasz Strauß')).toBe('LUKASZ STRAUSS')
    expect(cardLettering('李 Wei')).toBe('WEI')
  })

  it('dates the card in UTC', () => {
    expect(cardDate('2026-10-08T23:30:00-05:00')).toBe('09 OCT 2026')
    expect(cardDate('not a date')).toBe('')
  })

  it('keeps short names at full size', () => {
    expect(fitName('Adrian North', measure)).toEqual({ text: 'ADRIAN NORTH', size: 'large', tracking: 0.22 })
  })

  it('fits long names: tighter, smaller, then first and last name', () => {
    const fitted = fitName('Alexandra Montgomery-Whitfield Fitzgerald', measure)
    expect(fitted.text).toBe('ALEXANDRA FITZGERALD')
    expect(measure(fitted.text, fitted.size, fitted.tracking)).toBeLessThanOrEqual(628)
    const single = fitName('Bartholomew-Maximilian-Wolfeschlegelsteinhausen', measure)
    expect(measure(single.text, single.size, single.tracking)).toBeLessThanOrEqual(628)
  })

  it('lays out name, code and verification date', () => {
    const lines = cardLines({ name: 'Adrian North', code: 'AI-AN-59104', verifiedAt: '2026-10-08T12:00:00Z' }, measure)
    expect(lines.map(l => l.text)).toEqual(['ADRIAN NORTH', 'MEMBERSHIP CODE', 'AI-AN-59104', 'VERIFIED', '08 OCT 2026'])
  })

  it('leaves the name off rather than printing nothing legible', () => {
    const lines = cardLines({ name: '李伟', code: 'AI-XX-10000', verifiedAt: '2026-10-08T12:00:00Z' }, measure)
    expect(lines.map(l => l.text)).not.toContain('')
    expect(lines).toHaveLength(4)
  })
})

describe('membership card email', () => {
  const email = membershipCardEmail({
    name: 'Adrian <North>', code: 'AI-AN-59104', verifiedAt: '2026-10-08T12:00:00Z',
    appUrl: 'https://intros.example', bandUrl: 'https://intros.example/api/public/membership-card?t=abc&v=AI-AN-59104',
  })

  it('welcomes the member with their card details', () => {
    expect(email.subject).toBe('Your Ask Intros membership card')
    expect(email.text).toContain('Membership code: AI-AN-59104')
    expect(email.text).toContain('Verified: 08 OCT 2026')
    expect(email.text).toContain('https://intros.example/app')
  })

  it('shows the card as three stacked images', () => {
    expect(email.html).toContain('https://intros.example/membership/email-top.jpg')
    expect(email.html).toContain('https://intros.example/api/public/membership-card?t=abc&amp;v=AI-AN-59104')
    expect(email.html).toContain('https://intros.example/membership/email-bottom.jpg')
  })

  it('escapes member-supplied text', () => {
    expect(email.html).not.toContain('<North>')
    expect(email.html).toContain('Adrian &lt;North&gt;')
  })
})
