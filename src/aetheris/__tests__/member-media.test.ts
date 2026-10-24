import { describe, expect, it } from 'vitest'
import { memberPhotoSource } from '../member-media'
import { NETWORK_MEMBERS } from '../../intros-ui/networkData'
import { INITIAL_PEOPLE } from '../../intros-ui/dataStore'

describe('member portrait provenance', () => {
  it('missing photos remain missing instead of assigning another person’s face', () => {
    expect(memberPhotoSource(undefined)).toBe('')
    expect(memberPhotoSource(null)).toBe('')
    expect(memberPhotoSource('  ')).toBe('')
  })
  it('rejects the known stock-avatar substitutions', () => {
    expect(memberPhotoSource('https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200')).toBe('')
    expect(memberPhotoSource('https://source.unsplash.com/random')).toBe('')
  })
  it('retains actual uploaded, private and explicitly supplied member photos', () => {
    for (const photo of ['member-id/avatar.jpg', '/assets/my-photo.jpg', 'https://example.com/member.jpg', 'blob:https://askintros.vip/photo', 'data:image/png;base64,AA==']) {
      expect(memberPhotoSource(photo)).toBe(photo)
    }
  })
  it('showcase uses explicit bundled portraits while unassigned contacts stay empty', () => {
    expect(NETWORK_MEMBERS.length).toBeGreaterThan(0)
    expect(NETWORK_MEMBERS.every(member => member.avatarUrl === `/portraits/demo-${member.id}.jpg`)).toBe(true)
    expect(INITIAL_PEOPLE.length).toBeGreaterThan(0)
    expect(INITIAL_PEOPLE.every(person => !person.avatar)).toBe(true)
  })
})