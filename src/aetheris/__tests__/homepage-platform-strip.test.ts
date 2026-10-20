import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const landing = readFileSync(new URL('../Landing.tsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../compact-homepage.css', import.meta.url), 'utf8')

describe('homepage purpose strip', () => {
  it('keeps the connection-first message above the hero headline', () => {
    expect(landing).toContain('A real business need. A relevant person.')
    expect(landing).toContain('A reason to connect.')
    expect(landing).toContain('ael-platform-strip')
    expect(landing.indexOf('className="ael-platform-strip"')).toBeLessThan(landing.indexOf('<h1 id="ael-hero-title"'))
    expect(landing.indexOf('ael-platform-strip')).toBeLessThan(landing.indexOf('ael-hero-actions'))
  })

  it('does not advertise unsupported platform integrations or counts', () => {
    expect(landing).not.toContain('LinkedIn, Salesforce, Google Meet, ZoomInfo')
    expect(landing).not.toContain('60+ more')
    expect(landing).not.toContain('all rolled into one')
    expect(landing).not.toContain('src="/brands/linkedin.svg"')
  })

  it('keeps the strip readable and responsive', () => {
    expect(landing).toContain('The relationship network for CEOs. Who matters. Why they matter. Why now.')
    expect(css).toContain('@media(max-width:680px)')
    expect(css).toContain('.ael-platform-disclaimer')
  })
})
