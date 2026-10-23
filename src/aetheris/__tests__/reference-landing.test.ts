import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const landing = readFileSync(new URL('../Landing.tsx', import.meta.url), 'utf8')
const reference = readFileSync(new URL('../reference-landing.css', import.meta.url), 'utf8')
const index = readFileSync(new URL('../../routes/index.tsx', import.meta.url), 'utf8')
const vision = readFileSync(new URL('../../routes/vision.tsx', import.meta.url), 'utf8')

describe('approved Ask Intros landing reference', () => {
  it('makes the editorial homepage the public entry, not the sample Vision dashboard', () => {
    expect(index).toContain("import Landing from '@/aetheris/Landing'")
    expect(index).toContain('component: Landing')
    expect(vision).toContain("createFileRoute('/vision')")
  })

  it('preserves real entry points and the screenshot headline', () => {
    expect(landing).toContain('THE ONLY SOCIAL')
    expect(landing).toContain('PLATFORM THAT')
    expect(landing).toContain('RUNS YOUR BUSINESS')
    expect(landing).toContain('The people who matter. A reason to meet. A place to make something happen.')
    expect(landing).toContain('Enter your network')
    expect(landing).toContain('Explore Ask Intros')
    expect(landing).toContain('to="/auth" search={{ mode: \'signup\' }}')
    expect(landing).toContain('to="/app"')
    expect(landing).toContain('to="/try"')
    expect(landing).toContain('to="/demo"')
  })

  it('keeps the approved visual treatment exclusively on the public homepage', () => {
    expect(landing).toContain('ael--reference')
    expect(landing).toContain("import './reference-landing.css'")
    expect(reference).toContain('.ael.ael-compact.ael--reference')
    expect(reference).toContain('--ref-orange: #e49047')
    expect(reference).toContain('--ref-blue: #315e7e')
    expect(reference).toContain('background: #050505 !important')
    expect(reference).toContain('@media (max-width: 440px)')
  })

  it('shows real capabilities without advertising invented third-party integrations', () => {
    expect(landing).toContain('Member network')
    expect(landing).toContain('Introductions')
    expect(landing).toContain('Meetings')
    expect(landing).toContain('Opportunities')
    expect(landing).not.toContain('60+ more')
    expect(landing).not.toContain('all rolled into one')
    expect(landing).not.toContain('LinkedIn, Salesforce, Google Meet, ZoomInfo')
    expect(landing).not.toContain('<img')
  })

  it('retains functional theme toggle and keyboard-visible focus', () => {
    expect(landing).toContain('<AppearanceToggle className="ael-appearance" />')
    expect(reference).toContain('.appearance-liquid-toggle[data-state="checked"]')
    expect(landing).toContain('className="ael-skip"')
    expect(landing).toContain('aria-labelledby="ael-hero-title"')
  })
})
