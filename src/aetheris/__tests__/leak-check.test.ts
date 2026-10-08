import { describe, expect, it } from 'vitest'

import { PROBLEM_AREAS } from '../capabilities/route'
import { LEAK_QUESTIONS, leakIndexLabel, scoreLeakCheck } from '../leak-check'

const all = (i: number) => Object.fromEntries(LEAK_QUESTIONS.map(q => [q.id, i]))

describe('scoreLeakCheck', () => {
  it('finds nothing when every answer is the best one', () => {
    const r = scoreLeakCheck(all(0))
    expect(r).toMatchObject({ leakIndex: 0, answered: 10, findings: [] })
    expect(r.strengths).toHaveLength(10)
  })
  it('scores the worst answers as 100 with a major leak for each', () => {
    const r = scoreLeakCheck(all(3))
    expect(r.leakIndex).toBe(100)
    expect(r.findings).toHaveLength(10)
    expect(r.findings.every(f => f.severity === 'high')).toBe(true)
  })
  it('only reports answers scoring 2 or 3, major leaks first, then question order', () => {
    const r = scoreLeakCheck({ response: 2, followup: 1, tracking: 3, website: 0 })
    expect(r.answered).toBe(4)
    expect(r.findings.map(f => [f.id, f.severity])).toEqual([['leak-tracking', 'high'], ['leak-response', 'medium']])
    expect(r.leakIndex).toBe(Math.round((6 / 12) * 100))
    expect(r.strengths).toEqual(['Website'])
  })
  it('ignores unanswered and out-of-range answers', () => {
    expect(scoreLeakCheck({ response: 9 }).answered).toBe(0)
    expect(scoreLeakCheck({}).leakIndex).toBe(0)
  })
  it('maps every question to a problem area the network router knows', () => {
    for (const q of LEAK_QUESTIONS) expect(PROBLEM_AREAS[q.area]).toBeDefined()
    expect(new Set(LEAK_QUESTIONS.map(q => q.id)).size).toBe(LEAK_QUESTIONS.length)
    for (const q of LEAK_QUESTIONS) expect(q.options.map(o => o.score)).toEqual([0, 1, 2, 3])
  })
})

describe('leakIndexLabel', () => {
  it('describes the size of the problem', () => {
    expect(leakIndexLabel(10)).toBe('Tight. Few leaks.')
    expect(leakIndexLabel(30)).toBe('Some leaks worth fixing.')
    expect(leakIndexLabel(60)).toBe('Significant leaks.')
    expect(leakIndexLabel(90)).toBe('Leaking badly. Start with the top two.')
  })
})
