import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

describe('inbox contrast wiring', () => {
  const live = read('../../intros-ui/views/LiveMessagesView.tsx')
  const classic = read('../../intros-ui/views/MessagesView.tsx')
  const css = read('../../intros-ui/message-thread-contrast.css')
  for (const view of [live, classic]) {
    it('marks selected tiles and imports the contrast stylesheet', () => {
      expect(view).toContain("import '../message-thread-contrast.css'")
      expect(view).toContain('msg-thread-tile')
      expect(view).toContain('msg-thread-name')
      expect(view).toContain('data-selected=')
    })
  }
  it('sets explicit readable row backgrounds for both themes', () => {
    expect(css).toContain('background-color:#111111')
    expect(css).toContain('background-color:#ffffff')
    expect(css).toContain('background-color:#252525')
    expect(css).toContain('background-color:#e9e9e9')
  })
})
