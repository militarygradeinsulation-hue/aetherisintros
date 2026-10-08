import { describe, expect, it, vi } from 'vitest'

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }))

import { ageLabel, destinationFor } from '../notifications-bell'

describe('ageLabel', () => {
  const now = Date.parse('2026-10-08T12:00:00Z')
  it('compacts ages for the notification list', () => {
    expect(ageLabel('2026-10-08T11:59:30Z', now)).toBe('now')
    expect(ageLabel('2026-10-08T11:45:00Z', now)).toBe('15m')
    expect(ageLabel('2026-10-08T09:00:00Z', now)).toBe('3h')
    expect(ageLabel('2026-10-05T12:00:00Z', now)).toBe('3d')
  })
})

describe('destinationFor', () => {
  it('sends each notification to the screen it is about', () => {
    expect(destinationFor({ kind: 'intro_request' })).toBe('intros')
    expect(destinationFor({ kind: 'intro_accepted' })).toBe('intros')
    expect(destinationFor({ kind: 'message' })).toBe('messages')
    expect(destinationFor({ kind: 'connection' })).toBe('people')
  })
})
