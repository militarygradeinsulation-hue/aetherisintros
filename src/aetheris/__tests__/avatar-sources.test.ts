import { describe, expect, it } from 'vitest'
import { isDirectAvatarUrl } from '../avatar'

describe('member image URLs', () => {
  it('treats Vite and Lovable portrait paths as browser assets, not private bucket keys', () => {
    for (const url of ['/assets/member-elliot.123.jpg', '/__l5e/assets-v1/image.jpg', './assets/avatar.webp', 'assets/portrait.png', '__l5e/assets/portrait.jpg']) {
      expect(isDirectAvatarUrl(url)).toBe(true)
    }
  })

  it('uses direct member-provided image URLs without requesting private storage', () => {
    for (const url of ['https://example.com/profile.jpg', 'http://example.test/photo.png', 'data:image/png;base64,AA==', 'blob:https://example.com/abc']) {
      expect(isDirectAvatarUrl(url)).toBe(true)
    }
  })

  it('preserves private storage lookup for signed-in member uploads', () => {
    for (const path of ['member-id/avatar.jpg', 'private/uuid/profile.webp', 'my-photo.png']) {
      expect(isDirectAvatarUrl(path)).toBe(false)
    }
  })
})
