import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8')
const social = readFileSync(new URL('../social.ts', import.meta.url), 'utf8')
const landing = readFileSync(new URL('../Landing.tsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8')
const editorialCss = readFileSync(new URL('../editorial-landing.css', import.meta.url), 'utf8')
const bentoCss = readFileSync(new URL('../../intros-ui/views/workspace-burnt-orange-bento.css', import.meta.url), 'utf8')
const widgets = readFileSync(new URL('../../components/ui/widget-board.tsx', import.meta.url), 'utf8')

describe('recovered demo and tile polish', () => {
  it('keeps demo identity generic and labels the showcase shell', () => {
    expect(social).toContain("name: 'Demo Account'")
    expect(social).toContain("company: 'Meridian Advisory'")
    expect(app).toContain("demo-flag")
    expect(app).toContain("Ask Intros Home — Demo")
  })

  it('keeps member login ahead of the access CTA with real navigation destinations', () => {
    const header = landing.split('<div className="ael-header-actions">')[1]?.split('</div>')[0] ?? ''
    expect(header).toContain('to="/auth"')
    expect(header).toContain('<JoinAction')
    expect(header.indexOf('to="/auth"')).toBeLessThan(header.indexOf('<JoinAction'))
    expect(landing).toContain('search={{ mode: \'signup\' }}')
    expect(landing).toContain('Enter your network')
    expect(landing).toContain('to="/demo"')
  })

  it('keeps the photo-free public landing, real navigation and reduced-motion support', () => {
    expect(landing).toContain("import './editorial-landing.css'")
    expect(landing).toContain("import './editorial-media.css'")
    expect(landing).toContain("import './public-burnt-orange.css'")
    expect(landing).toContain('The Only social platform that runs your business.')
    expect(landing).toContain('ael--text')
    expect(landing).not.toContain('Editorial imagery is illustrative')
    expect(landing).not.toContain('ael-hero-image')
    expect(editorialCss).toContain('.ael-hero')
    expect(editorialCss).toContain('prefers-reduced-motion')
  })

  it('never embeds tool truncation warnings in executable source or styles', () => {
    for (const source of [app, css, editorialCss, landing]) {
      expect(source).not.toMatch(/Warning: truncated output|Total output lines:|[0-9]+ tokens truncated/)
    }
  })

  it('keeps the burnt-orange tile hover treatment on real board and feature tiles', () => {
    expect(bentoCss).toContain('--tile-hover: var(--ix-accent)')
    expect(css).toContain('.board-tile-shell:hover::before')
    expect(css).toContain('.board-tile-shell:hover .board-tile::after')
    expect(widgets).toContain('board-tile-shell')
    expect(widgets).toContain('board-tile relative isolate')
  })
})
