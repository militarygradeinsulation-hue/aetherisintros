import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('../AppearanceMode.tsx', import.meta.url), 'utf8')

describe('Dark-first appearance for new members', () => {
  it('defaults to dark without overriding explicit saved choices', () => {
    expect(source).toContain("return 'dark';\n}")
    expect(source).toContain("useState<AppearanceMode>('dark')")
    expect(source).toContain("if (stored === 'light' || stored === 'dark') return stored")
    expect(source).toContain("if (previous === 'light' || previous === 'dark') return previous")
  })
  it('keeps the member-controlled toggle and persisted preference', () => {
    expect(source).toContain("setTheme(theme === 'dark' ? 'light' : 'dark')")
    expect(source).toContain("window.localStorage.setItem(STORAGE_KEY, next)")
  })
})
