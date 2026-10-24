import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
const landing = read('../Landing.tsx')
const hero = read('../../components/ui/cinematic-landing-hero.tsx')
const entrance = read('../../components/ui/cinematic-entrance.tsx')
const shell = read('../../intros-ui/components/layout/LedgerBridgeShell.tsx')
const section = read('../../intros-ui/components/layout/LedgerSectionNavigation.tsx')

describe('Ask Intros cinematic UX integration', () => {
  it('plays the current branded intro before the homepage without person credits', () => {
    expect(landing).toContain('CinematicEntrance videoSrc={introFilmAsset.url}')
    expect(landing).toContain('CinematicHero')
    expect(landing).toContain('Each Connection')
    expect(landing).toContain('Matters.')
    expect(entrance).toContain('autoPlay playsInline muted')
    expect(entrance).toContain('Skip intro')
    expect(entrance).not.toContain('sessionStorage')
    expect(entrance).not.toContain('Roman Vasnev')
  })
  it('uses actual Ask Intros routes and no foreign personal-finance or recovery demo content', () => {
    expect(landing).toContain("primaryHref={signedIn ? '/app' : '/auth?mode=signup'}")
    expect(landing).toContain('secondaryHref="/demo"')
    expect(hero).toContain('Illustrative experience')
    expect(hero).not.toContain('Sobers')
    expect(hero).not.toContain('Download on the')
    expect(hero).not.toContain('Days Sober')
  })
  it('preserves purpose copy and connects real navigation actions', () => {
    expect(landing).toContain('A real business need. A relevant person.')
    expect(landing).toContain('The relationship network for CEOs.')
    expect(section).toContain('<ExpandingTabs')
    expect(shell).toContain('<MacOsDock')
    expect(shell).toContain('const dockTargets = WORKSPACE_DESTINATIONS.filter')
    expect(shell).toContain("onSelect={app =>")
    expect(shell).toContain("window.dispatchEvent(new CustomEvent('aetheris:open-assistant'))")
  })
  it('uses reduced-motion safeguards and avoids multi-thousand pixel scroll pinning', () => {
    expect(hero).toContain('prefers-reduced-motion: reduce')
    expect(entrance).toContain('prefers-reduced-motion: reduce')
    expect(hero).not.toContain('pin: true')
    expect(hero).not.toContain('+=7000')
  })
})
