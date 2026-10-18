import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (relative: string) => readFileSync(new URL(relative, import.meta.url), 'utf8')
const live = read('../../intros-ui/views/LiveMessagesView.tsx')
const demo = read('../../intros-ui/views/MessagesView.tsx')
const css = read('../site-readability.css')

describe('selected Messages row colors', () => {
  it('marks the active real-member thread explicitly', () => {
    expect(live).toContain('data-selected={on}')
    expect(live).toContain("aria-current={on ? 'true' : undefined}")
    expect(live).toContain('msg-thread-tile w-full')
  })
  it('marks the selected demo thread without changing member identity', () => {
    expect(demo).toContain('data-selected={isSelected}')
    expect(demo).toContain('msg-thread-tile p-2.5')
  })
  it('pairs selected title ink and background in both themes', () => {
    expect(css).toContain('.msg-thread-tile[data-selected="true"]')
    expect(css).toContain('background-color:#eaeaea!important')
    expect(css).toContain('background-color:#202020!important')
    expect(css).toContain('-webkit-text-fill-color:#090909!important')
    expect(css).toContain('-webkit-text-fill-color:#fff!important')
  })
})
