import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const demo = readFileSync(new URL('../views/MessagesView.tsx', import.meta.url), 'utf8')
const live = readFileSync(new URL('../views/LiveMessagesView.tsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../messages-readability.css', import.meta.url), 'utf8')
const app = readFileSync(new URL('../IntrosApp.tsx', import.meta.url), 'utf8')

// Contrast ratios of the actual semantic colors used by both messaging implementations.
const palette = Object.fromEntries(
  [...styles.matchAll(/--(msg-[\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map(([, token, color]) => [token, color]),
)
function luminance(hex: string) {
  const channels = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
  return channels.map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
    .reduce((value, part, i) => value + part * [0.2126, 0.7152, 0.0722][i]!, 0)
}
function ratio(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}

describe('readable messaging surfaces in demo and live', () => {
  it('loads after the architectural theme without changing the rest of the application', () => {
    const architecture = app.indexOf("import '@/aetheris/architectural-system.css'")
    const messaging = app.indexOf("import './messages-readability.css'")
    expect(architecture).toBeGreaterThan(0)
    expect(messaging).toBeGreaterThan(architecture)
    expect(styles).toContain(':is(.ix-messages,.ix-live-messages)')
  })
  it('both modes use semantic message colors instead of near-black hardcoded cards', () => {
    expect(demo).toContain('ix-messages')
    expect(live).toContain('ix-live-messages')
    for (const source of [demo, live]) {
      expect(source).toContain('msg-outgoing')
      expect(source).toContain('msg-incoming')
      expect(source).toContain('var(--msg-ink)')
      expect(source).toContain('var(--msg-muted)')
      expect(source).not.toMatch(/bg-\[#(?:07090C|0E121A|0B0D0F|0D1117|151923|1A1F25)\]/i)
    }
    expect(live).toContain('onSend={text => sendText(active.id, text)}')
    expect(demo).toContain('onSubmit={handleSend}')
  })
  it.each([
    ['body on main panels', 'msg-ink', 'msg-panel'],
    ['muted text on panels', 'msg-muted', 'msg-panel'],
    ['muted text on selected threads', 'msg-muted', 'msg-selected'],
    ['text in my bubble', 'msg-ink', 'msg-outgoing'],
    ['text in received bubble', 'msg-ink', 'msg-incoming'],
    ['AI suggestion detail', 'msg-body', 'msg-note'],
    ['buttons', 'msg-accent-ink', 'msg-accent'],
    ['copper links on white', 'msg-copper', 'msg-panel'],
  ])('%s reaches WCAG AA contrast', (_name, fg, bg) => {
    expect(palette[fg]).toBeTruthy()
    expect(palette[bg]).toBeTruthy()
    expect(ratio(palette[fg]!, palette[bg]!)).toBeGreaterThanOrEqual(4.5)
  })
})
