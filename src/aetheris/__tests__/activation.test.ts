import { describe, expect, it } from 'vitest'

import { activationProgress, activationView, barPct, cleanGoals, pctText, quarterStart, shouldTouch, utcDay, type ActivationStepState } from '../activation'

const all = (done: boolean): ActivationStepState[] => [
  { id: 'profile', done, photo: done, headline: done }, { id: 'verified', done }, { id: 'goals', done, count: done ? 3 : 0 },
  { id: 'ask', done }, { id: 'intro', done }, { id: 'push', done }, { id: 'calendar', done: false, optional: true },
]

describe('activationView', () => {
  it('keeps the server order and drops the calendar step when Google is not set up', () => {
    expect(activationView(all(false), { calendarAvailable: false }).map(s => s.id)).toEqual(['profile', 'verified', 'goals', 'ask', 'intro', 'push'])
    expect(activationView(all(false), { calendarAvailable: true }).map(s => s.id)).toContain('calendar')
  })
  it('sends a member without a photo to Settings and one without a title to My profile', () => {
    const noPhoto = activationView([{ id: 'profile', done: false, photo: false, headline: true }], { calendarAvailable: false })[0]!
    expect(noPhoto.target).toBe('preferences')
    expect(noPhoto.detail).toMatch(/photo/)
    const noTitle = activationView([{ id: 'profile', done: false, photo: true, headline: false }], { calendarAvailable: false })[0]!
    expect(noTitle.target).toBe('profile')
    expect(noTitle.detail).toMatch(/title/)
  })
  it('maps every step to a destination', () => {
    const targets = Object.fromEntries(activationView(all(false), { calendarAvailable: true }).map(s => [s.id, s.target]))
    expect(targets).toMatchObject({ verified: 'verify', goals: 'goals', ask: 'needs', intro: 'intros', push: 'preferences', calendar: 'preferences' })
  })
})

describe('activationProgress', () => {
  it('counts required steps only, so the optional calendar never holds the checklist open', () => {
    const view = activationView(all(true), { calendarAvailable: true })
    expect(activationProgress(view)).toEqual({ done: 6, total: 6, complete: true })
    expect(activationProgress(activationView(all(false), { calendarAvailable: true }))).toEqual({ done: 0, total: 6, complete: false })
  })
  it('is never complete with no steps', () => {
    expect(activationProgress([]).complete).toBe(false)
  })
})

describe('cleanGoals', () => {
  it('trims, drops blanks and duplicates, caps length and count', () => {
    expect(cleanGoals(['  Hire a  CFO ', '', 'hire a cfo', 'Close B', 'x'.repeat(200), 'Fourth'])).toEqual(['Hire a CFO', 'Close B', 'x'.repeat(140)])
  })
})

describe('daily activity guard', () => {
  it('touches once per UTC day', () => {
    const now = new Date('2026-10-09T23:30:00Z')
    expect(utcDay(now)).toBe('2026-10-09')
    expect(shouldTouch(null, now)).toBe(true)
    expect(shouldTouch('2026-10-09', now)).toBe(false)
    expect(shouldTouch('2026-10-08', now)).toBe(true)
  })
})

describe('formatting', () => {
  it('quarter start in UTC', () => {
    expect(quarterStart(new Date('2026-10-09T12:00:00Z'))).toBe('2026-10-01')
    expect(quarterStart(new Date('2026-03-31T23:59:00Z'))).toBe('2026-01-01')
    expect(quarterStart(new Date('2026-06-15T00:00:00Z'))).toBe('2026-04-01')
  })
  it('percentages and bars', () => {
    expect(pctText(null)).toBe('—')
    expect(pctText(33.4)).toBe('33%')
    expect(barPct(0, 10)).toBe(0)
    expect(barPct(1, 1000)).toBe(2)
    expect(barPct(5, 10)).toBe(50)
    expect(barPct(3, 0)).toBe(0)
  })
})

describe('goals feed matching', () => {
  it('a member whose offer matches my goals scores higher on "They can help you"', async () => {
    const { scoreMatch } = await import('../matching')
    const member = { id: 'm1', name: 'Pat', industry: 'Finance', expertise: [], tags: [], offers: ['Recruiting finance executives'], needs: [], mutuals: [], bestPath: [], lastInteractionDays: 10, availability: 'open', whyNow: '' }
    const me = { lookingFor: '', wantToMeet: '', focus: '', canHelpWith: '', industries: [], expertise: [] }
    const help = (goals?: string[]) => scoreMatch({ ...me, goals } as never, member as never, { connections: [], members: [] }).components.find(c => c.label === 'They can help you')!.score
    expect(help()).toBe(0)
    expect(help(['Recruiting a finance chief'])).toBeGreaterThan(0)
  })
})
