import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../../routes/_authenticated/onboarding.tsx', import.meta.url), 'utf8')

describe('onboarding progress transparency', () => {
  it('counts the actual ten questions instead of promising nine', () => {
    expect((source.match(/\{ key: '/g) ?? []).length).toBe(10)
    expect(source).toContain('Answer ten questions')
  })
  it('calculates progress from answered fields and supports assistive technology', () => {
    expect(source).toContain('questions.filter(q =>')
    expect(source).toContain('role="progressbar"')
    expect(source).toContain('aria-valuenow={completion}')
  })
  it('does not make optional answers mandatory', () => {
    expect(source).toContain("if (!get('name'))")
    expect(source).toContain('Only your name is required to continue.')
  })
})
