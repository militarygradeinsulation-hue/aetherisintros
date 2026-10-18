import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../mobile-site.css', import.meta.url), 'utf8')

describe('member mobile overflow guard', () => {
  it('fits member cards and profile settings without hiding their content', () => {
    for (const token of ['.home-board-tile', '.member-tile', '.provider-card', '.profile-settings', '.executive-workbench-body']) {
      expect(css).toContain(token)
    }
    expect(css).toContain('overflow-wrap:anywhere')
    expect(css).toContain('box-sizing:border-box;min-width:0;max-width:100%')
  })
  it('keeps mobile tab options reachable with horizontal scrolling', () => {
    expect(css).toContain('@media (max-width:768px)')
    expect(css).toContain('.ops-tabs,.insight-tabs,[role="tablist"]')
    expect(css).toContain('overflow-x:auto;scroll-padding-inline:12px')
    expect(css).toContain('flex-shrink:0')
  })
  it('keeps text inputs, code and small-phone actions within their containers', () => {
    expect(css).toContain('[role="combobox"]')
    expect(css).toContain('max-width:100%;overflow-x:auto')
    expect(css).toContain('@media (max-width:380px)')
    expect(css).not.toContain('overflow-x:hidden!important')
  })
})
