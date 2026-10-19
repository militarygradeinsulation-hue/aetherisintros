import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const banner = readFileSync(new URL('../ConnectionBanner.tsx', import.meta.url), 'utf8')
const route = readFileSync(new URL('../../routes/_authenticated/app.tsx', import.meta.url), 'utf8')

describe('live connection warning', () => {
  it('reacts to offline and online events and removes listeners', () => {
    expect(banner).toContain("window.addEventListener('offline', sync)")
    expect(banner).toContain("window.addEventListener('online', sync)")
    expect(banner).toContain("window.removeEventListener('offline', sync)")
    expect(banner).toContain("window.removeEventListener('online', sync)")
  })
  it('is visible to assistive technology but does not impersonate a save confirmation', () => {
    expect(banner).toContain('role="status"')
    expect(banner).toContain('may not save')
    expect(route).toContain('<ConnectionBanner />')
  })
})
