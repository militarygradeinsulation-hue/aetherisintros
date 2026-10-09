import { describe, expect, it } from 'vitest'

import {
  companyFromQuery, connectorHop, fromRow, matchPeople, meterWidth, mergePaths, myHop, normalizeCompanyName,
  pathScore, queryTerms, responseBand, sameCompany, warmth, type WarmPath,
} from '../warm-paths'

const now = new Date('2026-10-09T12:00:00Z')
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000)
const none = { connected: false, acceptedIntro: false, meetings90d: 0, calendarLastAt: null, calendarCount90d: 0 }

describe('normalizeCompanyName', () => {
  it('ignores case, spacing, punctuation and legal suffixes', () => {
    expect(normalizeCompanyName('  Acme, Inc. ')).toBe('acme')
    expect(normalizeCompanyName('ACME LLC')).toBe('acme')
    expect(normalizeCompanyName('Acme Holdings L.L.C.')).toBe('acme holdings')
    expect(normalizeCompanyName('Acme Co Ltd')).toBe('acme')
    expect(normalizeCompanyName('Smith & Sons GmbH')).toBe('smith sons')
    expect(normalizeCompanyName('Company')).toBe('company')
    expect(normalizeCompanyName(null)).toBe('')
  })
  it('matches companies across spellings, never on empty names', () => {
    expect(sameCompany('Acme, Inc.', 'acme corporation')).toBe(true)
    expect(sameCompany('Acme', 'Acme Labs')).toBe(false)
    expect(sameCompany('', ' ')).toBe(false)
  })
})

describe('warmth model', () => {
  it('bands acceptance rates and hides small samples', () => {
    expect(responseBand(2, 2)).toBe('unknown')
    expect(responseBand(4, 5)).toBe('high')
    expect(responseBand(2, 4)).toBe('medium')
    expect(responseBand(1, 5)).toBe('low')
  })
  it('bands scores into Hot, Warm and Cool', () => {
    expect(warmth(60)).toBe('hot')
    expect(warmth(35)).toBe('warm')
    expect(warmth(34)).toBe('cool')
  })
  it('explains the first hop in plain words', () => {
    const r = myHop({ connected: true, acceptedIntro: true, meetings90d: 3, calendarLastAt: daysAgo(3), calendarCount90d: 2 }, now)
    expect(r.points).toBe(95)
    expect(r.reasons).toEqual(['You were introduced on Ask Intros', 'You met 3 times in 90 days', 'Your calendar: 2 meetings in 90 days', "You're connected"])
    expect(myHop({ ...none, meetings90d: 1 }, now).reasons).toEqual(['You met once in 90 days'])
    expect(myHop({ ...none, calendarLastAt: daysAgo(60) }, now)).toEqual({ points: 10, reasons: ['On your calendar recently'] })
    expect(myHop({ ...none, calendarLastAt: daysAgo(200) }, now)).toEqual({ points: 0, reasons: [] })
    expect(myHop({ ...none, meetings90d: 9 }, now).points).toBe(30)
  })
  it('explains the second hop with public facts only', () => {
    expect(connectorHop({ verified: true, response: 'high', targetFirstName: 'Cy' })).toEqual({ points: 100, reasons: ['Connected to Cy', 'Verified member', 'Accepts most intro requests'] })
    expect(connectorHop({ verified: false, response: 'low', targetFirstName: 'Cy' })).toEqual({ points: 40, reasons: ['Connected to Cy'] })
  })
  it('scores direct paths above an equal two-hop path', () => {
    expect(pathScore('direct', 15)).toBe(25)
    expect(pathScore('via', 15, 50)).toBe(24)
    expect(pathScore('via', 95, 100)).toBe(87)
    expect(pathScore('direct', 95)).toBe(100)
    expect(meterWidth(0)).toBe(6)
    expect(meterWidth(140)).toBe(100)
  })
})

const path = (p: Partial<WarmPath>): WarmPath => ({
  kind: 'via', targetId: 't', targetName: 'Cy Cole', targetTitle: '', targetCompany: '', connectorId: 'c', connectorName: 'Bea',
  score: 40, band: 'warm', reasons: [], connectorReasons: [], ...p,
})

describe('results', () => {
  it('reads database rows defensively', () => {
    const p = fromRow({ kind: 'weird', target_id: null, target_name: null, target_title: null, target_company: null, connector_id: null, connector_name: null, score: 12, band: 'x', reasons: null, connector_reasons: null })
    expect(p).toMatchObject({ kind: 'via', band: 'cool', targetName: 'A member', reasons: [], connectorReasons: [] })
  })
  it('merges searches, keeps the best copy of each path and respects the limit', () => {
    const merged = mergePaths([[path({ score: 30 }), path({ connectorId: 'd', score: 50 })], [path({ score: 45 }), path({ kind: 'direct', connectorId: null, score: 50 })]], 3)
    expect(merged.map(p => [p.kind, p.connectorId, p.score])).toEqual([['direct', null, 50], ['via', 'd', 50], ['via', 'c', 45]])
    expect(mergePaths([[path({}), path({ connectorId: 'd' })]], 1)).toHaveLength(1)
  })
})

describe('free-text targets', () => {
  const people = [
    { id: '1', name: 'Cy Cole', title: 'CFO', company: 'Haulworks', location: 'Austin, Texas', industry: 'Logistics' },
    { id: '2', name: 'Di Doe', title: 'Chief Financial Officer', company: 'Shipfast Inc.', location: 'Denver', industry: 'Logistics' },
    { id: '3', name: 'Ed Eng', title: 'CTO', company: 'Bytes', location: 'Texas', industry: 'Software' },
  ]
  it('drops filler words', () => {
    expect(queryTerms('CFO at a logistics company in Texas')).toEqual(['cfo', 'logistics', 'texas'])
  })
  it('ranks title, industry and location matches', () => {
    expect(matchPeople('CFO at a logistics company in Texas', people).map(p => p.id)).toEqual(['1', '2', '3'])
    expect(matchPeople('the a of', people)).toEqual([])
  })
  it('recognises a company name', () => {
    expect(companyFromQuery('shipfast', people)).toBe('Shipfast Inc.')
    expect(companyFromQuery('CFO in Texas', people)).toBeNull()
  })
})
