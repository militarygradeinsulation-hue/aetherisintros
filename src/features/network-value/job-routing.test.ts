import { describe, expect, it } from 'vitest'
import { prepareJobPost } from './job-routing'

const NOW = new Date('2026-10-25T19:00:00Z')
const draft = {
  mode: 'overflow' as const, kind: 'available' as const,
  title: 'Roof repair outside our service area',
  details: 'Commercial roofing, north county, 2-person crew, Thursday',
  starts: '2026-10-26T09:00:00Z', expires: '2026-10-26T20:00:00Z',
  radius: 30, privacyReviewed: true,
}

describe('job-to-network routing', () => {
  it('routes overflow as a needed capacity post without customer contact data', () => {
    const row = prepareJobPost(draft, NOW)
    expect(row.kind).toBe('needed')
    expect(row.title).toMatch(/^Overflow job:/)
    expect(row.radius).toBe(30)
    expect(row.starts_at).toBe(draft.starts)
  })
  it('expires urgent requests in two hours rather than implying an automatic alert', () => {
    const row = prepareJobPost({ ...draft, mode: 'urgent' }, NOW)
    expect(row.expires_at).toBe('2026-10-25T21:00:00.000Z')
    expect(row.starts_at).toBe(NOW.toISOString())
  })
  it('rejects unreviewed overflow summaries and private contact fields', () => {
    expect(() => prepareJobPost({ ...draft, privacyReviewed: false }, NOW)).toThrow(/Confirm/)
    for (const details of ['Call 317-555-0198', 'Email person@example.com', 'Go to 129 Main Street']) {
      expect(() => prepareJobPost({ ...draft, details }, NOW)).toThrow(/Remove/)
    }
  })
  it('rejects expired and oversized posts before invoking the backend', () => {
    expect(() => prepareJobPost({ ...draft, expires: '2026-10-25T17:00:00Z' }, NOW)).toThrow(/valid/)
    expect(() => prepareJobPost({ ...draft, title: 'x'.repeat(120) }, NOW)).toThrow(/Shorten/)
  })
  it('preserves the ordinary capacity workflow without changing its visibility', () => {
    const row = prepareJobPost({ ...draft, mode: 'standard', privacyReviewed: false }, NOW)
    expect(row.kind).toBe('available')
    expect(row.title).toBe(draft.title)
  })
})
