import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const auth = readFileSync(new URL('../../routes/auth.tsx', import.meta.url), 'utf8')
const panel = readFileSync(new URL('../linkedin-import-ui.tsx', import.meta.url), 'utf8')
const publicInfo = readFileSync(new URL('../public-info.ts', import.meta.url), 'utf8')

describe('LinkedIn and public-profile enrichment wiring', () => {
  it('offers LinkedIn OIDC with the minimal scopes', () => {
    expect(auth).toContain('LINKEDIN_OIDC_PROVIDER')
    expect(auth).toContain('LINKEDIN_OIDC_SCOPES')
    expect(auth).toContain('Continue with LinkedIn')
  })

  it('requires explicit selection before applying OIDC identity items', () => {
    expect(panel).toContain('applyOidcConsent')
    expect(panel).toContain('Choose at least one LinkedIn item first.')
    expect(panel).toContain('Apply selected LinkedIn items')
    expect(panel).toContain('Nothing is applied automatically.')
  })

  it('keeps public information own-profile, source-grounded and reviewed', () => {
    expect(panel).toContain('Search the public web for my own saved name and headline.')
    expect(panel).toContain('item.quote')
    expect(panel).toContain('item.sourceUrl')
    expect(panel).toContain('Apply selected public fields')
    expect(publicInfo).toContain('LinkedIn is never searched, read or scraped.')
    expect(publicInfo).toContain('Every suggestion needs "quote"')
  })

  it('does not silently map unsupported building suggestions', () => {
    expect(panel).toContain("const supported = item.field !== 'building'")
    expect(panel).toContain('Review only — there is not a matching profile field yet.')
  })
})
