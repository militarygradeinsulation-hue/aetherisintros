import { describe, expect, it } from 'vitest'
import { splitReadingPassages } from '../reading-utils'

describe('read aloud text segmentation', () => {
  it('preserves short text', () => {
    expect(splitReadingPassages(['The people. The work.', ' A useful reply. ']))
      .toEqual(['The people. The work.', 'A useful reply.'])
  })

  it('speaks the entire long document in mobile-friendly chunks', () => {
    const long = Array.from({ length: 100 }, (_, i) => 'Sentence ' + i + ' connects people.').join(' ')
    const segments = splitReadingPassages([long])
    expect(segments.length).toBeGreaterThan(4)
    expect(segments.every(part => part.length <= 240)).toBe(true)
    expect(segments.join(' ').replace(/\s+/g, ' ').replace(/\s+([.!?])/g, '$1'))
      .toBe(long)
  })

  it('ignores empty copy and breaks long unspaced words safely', () => {
    const segments = splitReadingPassages([' ', 'word', 'a'.repeat(610)])
    expect(segments[0]).toBe('word')
    expect(segments.slice(1).join('')).toBe('a'.repeat(610))
  })
})
