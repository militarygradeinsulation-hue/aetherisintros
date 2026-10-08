import { describe, expect, it, vi } from 'vitest'

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }))

import { bandLine, checkinPrompt, furthestStage, normaliseOutcome, rate, summariseOutcomes, type OutcomeEvent } from '../outcomes'

const ev = (introRequestId: string, stage: OutcomeEvent['stage'], outcomeCategory: OutcomeEvent['outcomeCategory'] = null): OutcomeEvent => ({
  id: `${introRequestId}-${stage}-${Math.random()}`, introRequestId, authorId: 'a', stage, outcomeCategory, attribution: 'direct',
  valueBand: 'undisclosed', shareable: false, occurredOn: '2026-10-01', createdAt: '2026-10-01T00:00:00Z',
})

describe('normaliseOutcome', () => {
  it('drops category and value band on non-outcome stages so the check constraints hold', () => {
    const row = normaliseOutcome({ introRequestId: 'i', stage: 'met', outcomeCategory: 'customer', valueBand: 'over_1m' })
    expect(row.outcome_category).toBeNull()
    expect(row.value_band).toBe('undisclosed')
  })
  it('always gives an outcome a category and never shares by default', () => {
    const row = normaliseOutcome({ introRequestId: 'i', stage: 'outcome' })
    expect(row.outcome_category).toBe('other')
    expect(row.shareable).toBe(false)
  })
  it('caps the private note at the column limit', () => {
    expect(normaliseOutcome({ introRequestId: 'i', stage: 'met', privateNote: 'x'.repeat(2000) }).private_note).toHaveLength(1000)
  })
})

describe('furthestStage', () => {
  it('ranks an outcome above a later "too early" update', () => {
    expect(furthestStage([ev('i', 'outcome', 'hire'), ev('i', 'too_early')])).toBe('outcome')
  })
  it('is null with no events', () => {
    expect(furthestStage([])).toBeNull()
  })
})

describe('summariseOutcomes', () => {
  it('counts each introduction once at its furthest stage', () => {
    const s = summariseOutcomes([
      ev('a', 'met'), ev('a', 'next_step'), ev('a', 'outcome', 'customer'), ev('a', 'outcome', 'customer'),
      ev('b', 'met'),
      ev('c', 'no_outcome'),
      ev('d', 'too_early'),
    ])
    expect(s).toEqual({ introductions: 4, met: 2, nextStep: 1, outcomes: 1, byCategory: { customer: 1 } })
  })
})

describe('checkinPrompt', () => {
  it('asks whether they met at the first checkpoint, and what came of it later', () => {
    expect(checkinPrompt({ checkpoint: 7, lastStage: null }, 'Dana')).toContain('Did you meet?')
    expect(checkinPrompt({ checkpoint: 30, lastStage: 'met' }, 'Dana')).toContain('Did it lead anywhere?')
    expect(checkinPrompt({ checkpoint: 90, lastStage: null }, 'Dana')).toContain('What came of it?')
  })
})

describe('rate', () => {
  it('returns null without a base instead of a fabricated 0%', () => {
    expect(rate(0, 0)).toBeNull()
    expect(rate(1, 3)).toBe(33)
  })
})

describe('bandLine', () => {
  it('reads as plain language and never shows a number', () => {
    expect(bandLine('most', 'accepted introductions led to a meeting')).toBe('Most accepted introductions led to a meeting.')
    expect(bandLine('none', 'introduction requests accepted')).toBe('No introduction requests accepted yet.')
    expect(bandLine('insufficient', 'x')).toMatch(/^Too few introductions/)
    expect(bandLine(undefined, 'x')).toMatch(/^Too few introductions/)
  })
})
