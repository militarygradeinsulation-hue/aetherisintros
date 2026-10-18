import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { boundedJourneyIndex, JOURNEY_STEPS } from '../demo-journey'
import { InteractiveRelationshipTour } from '../InteractiveRelationshipTour'

describe('public interactive Ask Intros journey', () => {
  it('follows the real introduction-to-outcome product sequence', () => {
    expect(JOURNEY_STEPS.map(s => s.id)).toEqual([
      'need', 'fit', 'consent', 'lobby', 'meeting', 'workspace', 'outcome',
    ])
    expect(new Set(JOURNEY_STEPS.map(s => s.id)).size).toBe(JOURNEY_STEPS.length)
  })
  it('does not assert invented revenue, live performance, or verified customer results', () => {
    const text = JOURNEY_STEPS.map(s => [s.explanation, s.evidence, s.outcome].join(' ')).join(' ')
    expect(text).toContain('fictional')
    expect(text).not.toMatch(/\$[0-9,]+|[0-9]+% (?:higher|increase|growth)/)
    expect(JOURNEY_STEPS.find(s => s.id === 'outcome')?.evidence).toContain('pending counterpart confirmation')
  })
  it('has bounded navigation and an accessible, initially collapsed launcher', () => {
    expect(boundedJourneyIndex(-1)).toBe(0)
    expect(boundedJourneyIndex(999)).toBe(JOURNEY_STEPS.length - 1)
    expect(boundedJourneyIndex(NaN)).toBe(0)
    const html = renderToStaticMarkup(<InteractiveRelationshipTour />)
    expect(html).toContain('Explore the business journey')
    expect(html).toContain('aria-expanded="false"')
    expect(html).not.toContain('Harborline Manufacturing')
  })
})
