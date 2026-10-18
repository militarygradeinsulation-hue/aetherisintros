import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
const page = readFileSync(new URL('../pages/OpportunitiesPage.tsx', import.meta.url), 'utf8')
describe('opportunity evidence transparency', () => {
  it('does not misrepresent poster evidence as independently verified', () => {
    expect(page).toContain('Evidence supplied by the poster (not independently verified).')
  })
  it('makes fit uncertainty and contact consent clear', () => {
    expect(page).toContain('Fit is an estimate, not a guarantee.')
    expect(page).toContain('ask permission before sharing private contact details.')
  })
})
