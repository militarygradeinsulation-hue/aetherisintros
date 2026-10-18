import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const landing = readFileSync(new URL('../Landing.tsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../compact-homepage.css', import.meta.url), 'utf8')

describe('homepage platform thumbnail strip', () => {
  it('shows the requested brand names and +60 more message in the hero', () => {
    expect(landing).toContain('LinkedIn, Salesforce, Google Meet, ZoomInfo')
    expect(landing).toContain('and 60+ more, all rolled into one.')
    expect(landing).toContain('ael-platform-strip')
    expect(landing.indexOf('className="ael-platform-strip"')).toBeLessThan(landing.indexOf('<h1 id="ael-hero-title"'))
    expect(landing.indexOf('ael-platform-strip')).toBeLessThan(landing.indexOf('ael-hero-actions'))
  })
  it('uses brand-identifiable image thumbnails instead of generic icons', () => {
    expect(landing).toContain('src="/brands/linkedin.svg"')
    expect(landing).not.toContain('cdn.simpleicons.org/linkedin')
    expect(landing).toContain('cdn.simpleicons.org/salesforce')
    expect(landing).toContain('cdn.simpleicons.org/googlemeet')
    expect(landing).toContain('domain=zoominfo.com')
    const linkedinSvg = readFileSync(new URL('../../../public/brands/linkedin.svg', import.meta.url), 'utf8')
    expect(linkedinSvg).toContain('viewBox="0 0 24 24"')
    expect(linkedinSvg).toContain('#0A66C2')
    expect(landing).not.toContain('domain=linkedin.com')
    expect(landing).toContain('domain=salesforce.com')
    expect(landing).toContain('domain=meet.google.com')
  })
  it('avoids an unsubstantiated affiliation claim and supports mobile wraps', () => {
    expect(landing).toContain('No affiliation or live integration is implied.')
    expect(css).toContain('.ael-platform-marks{display:flex;align-items:center;flex-wrap:wrap')
    expect(css).toContain('@media(max-width:680px)')
    expect(css).toContain('.ael-platform-disclaimer')
  })
})
