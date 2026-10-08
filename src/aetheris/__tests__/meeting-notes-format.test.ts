import { describe, expect, it } from 'vitest'

import { meetingStatus, notesFromRow, parseNotesAnswer, transcriptForPrompt } from '../meeting-notes-format'

describe('meetingStatus', () => {
  it('is scheduled, then live, then ended', () => {
    expect(meetingStatus({ startedAt: null, endedAt: null })).toBe('scheduled')
    expect(meetingStatus({ startedAt: '2026-10-08T10:00:00Z', endedAt: null })).toBe('live')
    expect(meetingStatus({ startedAt: '2026-10-08T10:00:00Z', endedAt: '2026-10-08T11:00:00Z' })).toBe('ended')
  })
})

describe('transcriptForPrompt', () => {
  it('writes one "Name: words" line per phrase and drops empty ones', () => {
    expect(transcriptForPrompt([
      { speaker: 'Ana', text: 'We should  hire\na CFO' },
      { speaker: 'Ben: (admin)', text: 'Agreed' },
      { speaker: '', text: 'Who said this' },
      { speaker: 'Ana', text: '   ' },
    ])).toBe('Ana: We should hire a CFO\nBen (admin): Agreed\nSomeone: Who said this')
  })
  it('keeps the most recent lines when the transcript is too long', () => {
    const lines = Array.from({ length: 50 }, (_, i) => ({ speaker: 'A', text: `line ${i}` }))
    const out = transcriptForPrompt(lines, 40).split('\n')
    expect(out[out.length - 1]).toBe('A: line 49')
    expect(out.join('\n').length).toBeLessThanOrEqual(40)
  })
})

describe('parseNotesAnswer', () => {
  it('reads the JSON answer, inside a code fence or not', () => {
    const n = parseNotesAnswer('```json\n{"summary":"Agreed on a CFO search.","decisions":["Hire a fractional CFO"],"action_items":[{"task":"Draft the role","owner":"Ana","due":"Friday"},"Share the budget",{"owner":"x"}]}\n```')
    expect(n.summary).toBe('Agreed on a CFO search.')
    expect(n.decisions).toEqual(['Hire a fractional CFO'])
    expect(n.actionItems).toEqual([{ task: 'Draft the role', owner: 'Ana', due: 'Friday' }, { task: 'Share the budget', owner: '', due: '' }])
  })
  it('falls back to plain text when the model ignores the format', () => {
    expect(parseNotesAnswer('They talked about hiring.')).toEqual({ summary: 'They talked about hiring.', decisions: [], actionItems: [] })
    expect(parseNotesAnswer('{not json}').summary).toBe('{not json}')
  })
  it('caps lengths and counts', () => {
    const n = parseNotesAnswer(JSON.stringify({ summary: 'x'.repeat(9000), decisions: Array(40).fill('d') }))
    expect(n.summary.length).toBe(6000)
    expect(n.decisions.length).toBe(20)
  })
})

describe('notesFromRow', () => {
  it('reads stored columns back', () => {
    expect(notesFromRow({ summary: 'S', decisions: ['D'], action_items: [{ task: 'T', owner: 'O', due: '' }] }))
      .toEqual({ summary: 'S', decisions: ['D'], actionItems: [{ task: 'T', owner: 'O', due: '' }] })
  })
})
