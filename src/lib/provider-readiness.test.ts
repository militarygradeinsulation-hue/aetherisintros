import { describe, it, expect } from 'vitest'
import { configuredSecret } from './providerSecrets.server'
import { createCharacterBudget } from './providerQuota'

describe('server secret readiness', () => {
  it('rejects sample placeholders and blank values', () => {
    expect(configuredSecret(undefined)).toBeUndefined()
    expect(configuredSecret('')).toBeUndefined()
    expect(configuredSecret('your_openai_api_key_here')).toBeUndefined()
    expect(configuredSecret('your_elevenlabs_api_key_here')).toBeUndefined()
    expect(configuredSecret('replace-with-key')).toBeUndefined()
    expect(configuredSecret('  <your-key>  ')).toBeUndefined()
    expect(configuredSecret('not_set')).toBeUndefined()
  })
  it('accepts a synthetic credential without publishing it', () => {
    expect(configuredSecret('  dummy-key-value-1234567  ')).toBe('dummy-key-value-1234567')
    expect(configuredSecret('dummy-key-value\n12345')).toBeUndefined()
  })
})
describe('best effort speech limits', () => {
  it('limits callers separately by calls and characters', () => {
    let now = 10000
    const reserve = createCharacterBudget(2, 12, 1000, () => now)
    expect(reserve('member-a', 7)).toBe(true)
    expect(reserve('member-a', 6)).toBe(false)
    expect(reserve('member-b', 7)).toBe(true)
    expect(reserve('member-a', 5)).toBe(true)
    expect(reserve('member-a', 1)).toBe(false)
    now += 1001
    expect(reserve('member-a', 11)).toBe(true)
  })
  it('rejects invalid consumption', () => {
    const reserve = createCharacterBudget(2, 100, 1000)
    expect(reserve('', 2)).toBe(false)
    expect(reserve('member', 0)).toBe(false)
    expect(reserve('member', -1)).toBe(false)
  })
})
