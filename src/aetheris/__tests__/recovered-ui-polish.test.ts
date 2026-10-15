import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8')
const social = readFileSync(new URL('../social.ts', import.meta.url), 'utf8')
const landing = readFileSync(new URL('../Landing.tsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8')
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
    expect(landing).toContain('to="/early-access"')
    expect(landing).toContain('Apply for access')
    expect(landing).toContain('to="/demo"')
  })

  it('keeps the yellow tile hover treatment on board and feature tiles', () => {
    expect(css).toContain('--tile-hover:#F5B027')
    expect(css).toContain('.board-tile-shell:hover::before')
    expect(css).toContain('.board-tile-shell:hover .board-tile::after')
    expect(widgets).toContain('board-tile-shell')
    expect(widgets).toContain('board-tile relative isolate')
  })
})
