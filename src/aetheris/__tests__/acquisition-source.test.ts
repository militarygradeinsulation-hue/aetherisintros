import { describe, expect, it } from 'vitest'
import {
  captureInitialAcquisition, readInitialAcquisition, acquisitionSignupMetadata, ACQUISITION_SESSION_KEY,
} from '../lib/acquisition-source'

const storage = () => {
  const map = new Map<string,string>()
  return {
    getItem(key: string) { return map.get(key) ?? null },
    setItem(key: string, value: string) { map.set(key, value) },
  }
}
const location = (pathname = '/', search = '', hostname = 'askintros.vip') => ({ pathname, search, hostname })

describe('first party acquisition metadata', () => {
  it('retains the first public landing page for the current browser session', () => {
    const s = storage()
    const first = captureInitialAcquisition(location('/executive-networking', '?utm_source=linkedin&utm_medium=social&utm_campaign=founder_launch'), '', s)
    expect(first).toEqual({ version: 1, source: 'linkedin', medium: 'social', landing_path: '/executive-networking', campaign: 'founder_launch' })
    const second = captureInitialAcquisition(location('/auth', '?utm_source=google'), '', s)
    expect(second).toEqual(first)
    expect(acquisitionSignupMetadata(s)).toEqual({
      acquisition_source: 'linkedin', acquisition_medium: 'social',
      acquisition_landing_page: '/executive-networking', acquisition_campaign: 'founder_launch',
    })
  })
  it('maps a search referrer to coarse organic source without storing queries or URLs', () => {
    const s = storage()
    const first = captureInitialAcquisition(location('/warm-introduction-playbook', '?q=private', 'askintros.vip'),
      'https://www.google.com/search?q=private+health+question&session=secret', s)
    expect(first).toEqual({ version: 1, source: 'google', medium: 'organic', landing_path: '/warm-introduction-playbook' })
    const data = JSON.stringify(first)
    expect(data).not.toContain('private')
    expect(data).not.toContain('session')
    expect(data).not.toContain('https://')
  })
  it('does not classify host lookalikes as official search engines', () => {
    const s = storage()
    expect(captureInitialAcquisition(location(), 'https://evilgoogle.com/query?password=test', s)?.source).toBe('other-referral')
  })
  it('rejects private landing routes and does not create attribution when no public source is eligible', () => {
    const s = storage()
    expect(captureInitialAcquisition(location('/admin/early-access', '?utm_source=google'), '', s)).toBeNull()
    expect(readInitialAcquisition(s)).toBeNull()
  })
  it('does not store arbitrary UTM values or marketing search terms', () => {
    const s = storage()
    const v = captureInitialAcquisition(location('/auth',
      '?utm_source=some-unknown-platform&utm_medium=unknown&utm_campaign=valid_slug&utm_term=joseph%40private.com&utm_content=123456'), '', s)
    expect(v).toEqual({ version: 1, source: 'other-campaign', medium: 'campaign', landing_path: '/auth', campaign: 'valid_slug' })
    expect(JSON.stringify(v)).not.toContain('private.com')
    expect(JSON.stringify(v)).not.toContain('utm_term')
  })
  it('ignores malformed, forged or expired-format persisted values', () => {
    const s = storage()
    s.setItem(ACQUISITION_SESSION_KEY, JSON.stringify({ version: 1, source: 'google', medium: 'organic', landing_path: '/app' }))
    expect(readInitialAcquisition(s)).toBeNull()
    expect(acquisitionSignupMetadata(s)).toEqual({})
  })
  it('cannot interrupt the visitor experience when browser storage is blocked', () => {
    const blocked = { getItem(): string | null { throw Error('blocked') }, setItem(): void { throw Error('blocked') } }
    const result = captureInitialAcquisition(location('/warm-introductions'), '', blocked)
    expect(result?.source).toBe('direct')
    expect(acquisitionSignupMetadata(blocked)).toEqual({})
  })
})
