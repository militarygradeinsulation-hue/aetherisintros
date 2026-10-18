import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const landing = readFileSync(new URL('../Landing.tsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../compact-homepage.css', import.meta.url), 'utf8')

describe('top homepage platform banner', () => {
  it('displays all four brand images above the main hero headline', () => {
    for (const [brand, domain] of [
      ['LinkedIn', 'linkedin.com'],
      ['Salesforce', 'salesforce.com'],
      ['Google Meet', 'meet.google.com'],
      ['ZoomInfo', 'zoominfo.com'],
    ]) {
      expect(landing).toContain('domain=' + domain + '&sz=128')
      expect(landing).toContain('alt="' + brand + ' logo"')
    }
    expect(landing.indexOf('ael-platform-unified')).toBeLessThan(landing.indexOf('<h1 id="ael-hero-title"'))
  })

  it('includes requested message and is explicit about third-party branding', () => {
    expect(landing).toContain('LinkedIn, Salesforce, Google Meet, ZoomInfo and 60 more.')
    expect(landing).toContain('All rolled into one.')
    expect(landing).toContain('Connection availability varies.')
  })

  it('keeps logos readable and responsive in narrow viewports', () => {
    expect(css).toContain('.ael-platform-brand img')
    expect(css).toContain('grid-template-columns:repeat(2,minmax(0,1fr))')
    expect(css).toContain('color:#fff!important')
  })
})
