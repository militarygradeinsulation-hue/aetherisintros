import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
const css = readFileSync(new URL('../robot-launcher.css', import.meta.url), 'utf8')

describe('stable Butler launcher hit target', () => {
  it('never animates the clickable launcher geometry', () => {
    expect(css).toMatch(/\.ask-dock-fab\.ask-dock-fab--robot:not\(\.active\)[\s\S]*?animation: none !important;/)
  })
  it('applies the float to the artwork and honors reduced motion', () => {
    expect(css).toMatch(/\.ask-dock-fab--robot:not\(\.active\) > \.butler-fab-robot\s*\{[\s\S]*?animation: robot-launcher-float/)
    expect(css).toContain('.ask-dock-fab--robot > .butler-fab-robot { animation: none !important; }')
  })
})
