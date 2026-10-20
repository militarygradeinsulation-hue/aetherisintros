import { describe, expect, it } from 'vitest'
import { ACTIVATION_ORDER, activationProgress, activationView } from '../activation'

describe('connection-first activation', () => {
  it('puts the existing core journey before optional setup', () => {
    expect(ACTIVATION_ORDER.slice(0, 4)).toEqual(['profile', 'goals', 'ask', 'intro'])
  })
  it('does not let optional setup hold completed core activation open', () => {
    const core = new Set(['profile', 'goals', 'ask', 'intro'])
    const view = activationView(ACTIVATION_ORDER.map(id => ({ id, done: core.has(id) })), { calendarAvailable: true })
    expect(activationProgress(view)).toEqual({ done: 4, total: 4, complete: true })
  })
  it('never manufactures missing server steps or completion', () => {
    expect(activationView([], { calendarAvailable: true })).toEqual([])
    expect(activationProgress([]).complete).toBe(false)
    const view = activationView([{ id: 'ask', done: false }], { calendarAvailable: false })
    expect(view).toHaveLength(1)
    expect(view[0].done).toBe(false)
    expect(view[0].target).toBe('needs')
  })
  it('retains photo routing and hides an unavailable calendar', () => {
    const view = activationView([{ id: 'profile', done: false, photo: false, headline: false }, { id: 'calendar', done: false }], { calendarAvailable: false })
    expect(view).toHaveLength(1)
    expect(view[0].target).toBe('preferences')
  })
  it('keeps private goals distinct from published asks', () => {
    const view = activationView([{ id: 'goals', done: false }], { calendarAvailable: false })
    expect(view[0].target).toBe('goals')
    expect(view[0].detail).toContain('does not publish an ask')
  })
})
