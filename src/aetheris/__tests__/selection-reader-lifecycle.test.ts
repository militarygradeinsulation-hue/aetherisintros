import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('../SelectionReader.tsx', import.meta.url), 'utf8')

describe('selection read-aloud lifecycle', () => {
  it('removes the same capture-phase scroll listener that it registered', () => {
    expect(source).toContain("window.addEventListener('scroll', clearOnScroll, true)")
    expect(source).toContain("window.removeEventListener('scroll', clearOnScroll, true)")
    expect(source).not.toContain("window.addEventListener('scroll', () => setSpot(null), true)")
  })
  it('retains member-initiated read-aloud from the selection button', () => {
    expect(source).toContain("readAloud([spot.text], 'Reading what you highlighted')")
  })
})
