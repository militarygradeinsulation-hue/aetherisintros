import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const page = readFileSync(new URL('../pages/SecurityPage.tsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../site-readability.css', import.meta.url), 'utf8')

describe('Optional business-role verification entry', () => {
  it('links members without a verified role to the existing verification flow', () => {
    expect(page).toContain("!loading && verification.status !== 'verified'")
    expect(page).toContain('href="/verify"')
    expect(page).toContain('Request a verified business-role badge')
  })

  it('keeps the entry visible and keyboard-accessible in both appearances', () => {
    expect(css).toContain('html:root[data-theme] body .security-verify-link')
    expect(css).toContain('min-height:44px')
    expect(css).toContain('.security-verify-link:focus-visible')
  })
})
