import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const landing = readFileSync(new URL('../Landing.tsx', import.meta.url), 'utf8')

describe('compact homepage content boundaries', () => {
  it('does not advertise unsupported platform integrations or counts', () => {
    expect(landing).not.toContain('LinkedIn, Salesforce, Google Meet, ZoomInfo')
    expect(landing).not.toContain('60+ more')
    expect(landing).not.toContain('all rolled into one')
    expect(landing).not.toContain('src="/brands/linkedin.svg"')
  })

  it('keeps the removed explanation sections off the compact homepage', () => {
    for (const id of ['experience', 'approach', 'intelligence', 'ael-intelligence-title']) {
      expect(landing).not.toContain(`id="${id}"`)
    }
  })
})
