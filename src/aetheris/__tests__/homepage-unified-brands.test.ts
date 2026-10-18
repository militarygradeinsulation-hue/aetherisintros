import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const landing = readFileSync(new URL('../Landing.tsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../compact-homepage.css', import.meta.url), 'utf8')

describe('homepage unified-platform brand marks', () => {
  it('keeps the unified-tool message visibly near the top of the hero', () => {
    const hero = landing.indexOf('className="ael-hero-content"')
    const brands = landing.indexOf('className="ael-platform-unified"')
    const headline = landing.indexOf('id="ael-hero-title"')
    expect(hero).toBeGreaterThan(-1)
    expect(brands).toBeGreaterThan(hero)
    expect(headline).toBeGreaterThan(brands)
    expect(landing).toContain('And 60+ more — all rolled into one.')
  })
  it('uses identifiable actual brand artwork with readable text fallbacks', () => {
    for (const name of ['LinkedIn', 'Salesforce', 'Google Meet', 'ZoomInfo']) {
      expect(landing).toContain('<span>' + name + '</span>')
    }
    for (const slug of ['linkedin', 'salesforce', 'googlemeet']) {
      expect(landing).toContain('https://cdn.simpleicons.org/' + slug + '/')
    }
    expect(landing).toContain('Special:FilePath/ZoomInfo_logo.svg')
  })
  it('discloses brands are examples and keeps the strip responsive', () => {
    expect(landing).toContain('no affiliation, endorsement, or specific integration is implied')
    expect(css).toContain('.ael.ael-compact .ael-platform-marks')
    expect(css).toContain('flex-wrap:wrap')
    expect(css).toContain('@media(max-width:650px)')
  })
})
