import { describe, expect, it, vi } from 'vitest'

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }))

import { buildBrief, suggestGoal } from '../meeting-brief'
import { agendaFromCapsule, ownedBy, parseDue } from '../meetings'

const person = (over: Partial<Parameters<typeof buildBrief>[0]['people'][number]> = {}) => ({
  userId: 'b', profile: { name: 'Ben Ortiz', title: 'CFO', company: 'Northwind', looking_for: 'A COO', can_help_with: 'Fundraising' },
  reasoning: { why_them: 'Ben can help with: Fundraising', why_now: 'Shared industry: SaaS.' },
  messages: [], asks: [], notes: [], lastMeetingSummary: '', ...over,
})

describe('buildBrief', () => {
  it('summarises who they are, why they matter and where you left off', () => {
    const b = buildBrief({ agenda: '', intro: null, people: [person({
      messages: [
        { sender_id: 'b', text: 'Third', created_at: '2026-10-03' }, { sender_id: 'me', text: 'First', created_at: '2026-10-01' },
        { sender_id: 'b', text: 'Second', created_at: '2026-10-02' }, { sender_id: 'me', text: 'Fourth', created_at: '2026-10-04' },
      ],
      notes: [{ text: 'Prefers mornings' }],
    })] }, 'me')
    const p = b.people[0]!
    expect(p).toMatchObject({ name: 'Ben Ortiz', role: 'CFO · Northwind', whyTheyMatter: 'Ben can help with: Fundraising', common: 'Shared industry: SaaS.', yourNotes: ['Prefers mornings'] })
    expect(p.lastConversation.map(m => `${m.fromMe ? 'me' : 'them'}:${m.text}`)).toEqual(['them:Second', 'them:Third', 'me:Fourth'])
  })
  it('falls back gracefully when little is known', () => {
    const p = buildBrief({ agenda: '', intro: null, people: [{ userId: 'x', profile: null, reasoning: null, messages: [], asks: [], notes: [], lastMeetingSummary: '' }] }, 'me').people[0]!
    expect(p.name).toBe('A member')
    expect(p.role).toBe('')
  })
})

describe('suggestGoal', () => {
  const people = [{ name: 'Ben', lookingFor: 'A COO', theirAsks: [] as string[] }]
  it('prefers the introduction first goal, then an open ask, then a stated need', () => {
    expect(suggestGoal({ agenda: '', intro: { why: '', whyNow: '', firstGoal: 'Agree a pilot' } }, people)).toBe('Agree a pilot')
    expect(suggestGoal({ agenda: '', intro: null }, [{ ...people[0]!, theirAsks: ['Need a CFO'] }])).toBe('Find out whether you can help Ben with “Need a CFO”.')
    expect(suggestGoal({ agenda: '', intro: null }, people)).toBe('Learn what Ben needs most right now: A COO.')
    expect(suggestGoal({ agenda: '', intro: null }, [{ name: 'Ben', lookingFor: '', theirAsks: [] }])).toBe('Leave with one specific next step and who owns it.')
  })
})

describe('action items', () => {
  it('treats unnamed, "me" and my own name as mine', () => {
    expect(ownedBy('', 'Ana Silva')).toBe(true)
    expect(ownedBy('me', 'Ana Silva')).toBe(true)
    expect(ownedBy('Ana', 'Ana Silva')).toBe(true)
    expect(ownedBy('ana silva', 'Ana Silva')).toBe(true)
    expect(ownedBy('Ben', 'Ana Silva')).toBe(false)
  })
  it('only turns real dates into due dates', () => {
    expect(parseDue('2026-10-16')).toBe('2026-10-16T00:00:00.000Z')
    expect(parseDue('Friday')).toBeNull()
    expect(parseDue('')).toBeNull()
  })
})

describe('agendaFromCapsule', () => {
  it('builds the agenda from the introduction capsule', () => {
    expect(agendaFromCapsule({ whyExists: 'CFO search', whyNow: '', firstGoal: 'Agree next step' })).toBe('Why this introduction: CFO search\nFirst goal: Agree next step')
  })
})
