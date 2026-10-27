import { describe, expect, it } from 'vitest'
import { validateProspectGrid } from '../prospect/upload'

const grid = (n: number) => [['name'], ...Array.from({ length: n }, (_, i) => [`Person ${i}`])]

describe('contact import limit', () => {
  it('accepts 2,000 people in one file', () => {
    expect(() => validateProspectGrid(grid(2000), 2000)).not.toThrow()
  })
  it('rejects 2,001 people', () => {
    expect(() => validateProspectGrid(grid(2001), 2000)).toThrow('2,000')
  })
})
