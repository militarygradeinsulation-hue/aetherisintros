import { describe, expect, it } from 'vitest'

import { coolingStatus, dedupeExchanges, giverBand, giverBoost, spanLabel, type Exchange } from '../reciprocity-core'
import { scoreMatch } from '../matching'
import type { Member } from '../social'
import type { MeProfile } from '../store'

const DAY = 86400000
const NOW = Date.UTC(2026, 9, 9)
const ago = (d: number) => NOW - d * DAY

describe('giverBand', () => {
  it('uses bands, never ranks', () => {
    expect(giverBand(0, 0, 0)).toBe('Emerging')
    expect(giverBand(4, 9, 3)).toBe('Emerging')
    expect(giverBand(5, 1, 0)).toBe('Emerging')
    expect(giverBand(5, 2, 0)).toBe('Contributor')
    expect(giverBand(30, 8, 0)).toBe('Contributor')
    expect(giverBand(15, 5, 1)).toBe('Pillar')
    expect(giverBand(14, 5, 1)).toBe('Contributor')
  })
  it('gives only a small matching boost, and none without a shown band', () => {
    expect(giverBoost(null)).toBe(0)
    expect(giverBoost(undefined)).toBe(0)
    expect(giverBoost('Emerging')).toBe(0)
    expect(giverBoost('Contributor')).toBeLessThan(giverBoost('Pillar'))
    expect(giverBoost('Pillar')).toBeLessThanOrEqual(3)
  })
})

describe('dedupeExchanges', () => {
  const ex = (direction: Exchange['direction'], counterpart: string, d: number, confirmed = false): Exchange => ({ direction, counterpart, at: ago(d), confirmed })
  it('counts back-and-forth with one person within 30 days once', () => {
    const out = dedupeExchanges([ex('give', 'b', 20), ex('get', 'b', 18), ex('give', 'b', 5)])
    expect(out).toHaveLength(1)
    expect(out[0]!.direction).toBe('give')
  })
  it('counts again after 30 days, and keeps people separate', () => {
    expect(dedupeExchanges([ex('give', 'b', 80), ex('give', 'b', 40), ex('give', 'c', 40)])).toHaveLength(3)
    expect(dedupeExchanges([ex('give', 'b', 40), ex('give', 'b', 11)])).toHaveLength(1)
    expect(dedupeExchanges([ex('give', 'b', 40), ex('give', 'b', 10)])).toHaveLength(2)
  })
  it('always keeps gives the other person confirmed', () => {
    const out = dedupeExchanges([ex('give', 'b', 20), ex('give', 'b', 19, true), ex('get', 'b', 18)])
    expect(out.filter(e => e.confirmed)).toHaveLength(1)
    expect(out).toHaveLength(2)
  })
})

describe('coolingStatus', () => {
  it('flags a frequent relationship quiet for 60+ days', () => {
    const s = coolingStatus([ago(100), ago(90), ago(80)], NOW)
    expect(s).toMatchObject({ cooling: true, cadenceDays: 10, quietDays: 80, touches: 3 })
  })
  it('needs 90 quiet days when contact was every few weeks', () => {
    expect(coolingStatus([ago(150), ago(120), ago(85)], NOW).cooling).toBe(false)
    expect(coolingStatus([ago(160), ago(130), ago(95)], NOW).cooling).toBe(true)
  })
  it('ignores occasional, recent, too-few or same-day touches', () => {
    expect(coolingStatus([ago(300), ago(200), ago(100)], NOW).cooling).toBe(false) // never frequent
    expect(coolingStatus([ago(40), ago(30), ago(20)], NOW).cooling).toBe(false) // still warm
    expect(coolingStatus([ago(100), ago(90)], NOW).cooling).toBe(false)
    expect(coolingStatus([ago(100), ago(100) + 1000, ago(100) + 2000], NOW).touches).toBe(1)
    expect(coolingStatus([ago(500), ago(490), ago(480)], NOW).touches).toBe(0) // older than a year
  })
  it('describes spans in plain words', () => {
    expect(spanLabel(1)).toBe('1 day')
    expect(spanLabel(10)).toBe('10 days')
    expect(spanLabel(21)).toBe('3 weeks')
    expect(spanLabel(90)).toBe('3 months')
  })
})

describe('matching boost', () => {
  const me = { name: 'Me', industries: [], expertise: [], lookingFor: '', canHelpWith: '' } as unknown as MeProfile
  const member = {
    id: 'm1', name: 'Sam', industry: 'Logistics', expertise: [], tags: [], offers: [], needs: [], mutuals: [], bestPath: [],
    lastInteractionDays: 30, availability: 'Open', whyNow: '',
  } as unknown as Member
  it('adds at most a few points for a shown band', () => {
    const base = scoreMatch(me, member, { connections: [], members: [] }).total
    const boosted = scoreMatch(me, { ...member, giverBand: 'Pillar' }, { connections: [], members: [] }).total
    expect(boosted - base).toBeGreaterThan(0)
    expect(boosted - base).toBeLessThanOrEqual(3)
  })
})
