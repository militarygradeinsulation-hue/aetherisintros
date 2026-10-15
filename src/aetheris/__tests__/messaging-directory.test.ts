import { describe, expect, it } from 'vitest'
import { EMPTY_UNREAD, badgeLabel, seenUnderMessageId, shouldMarkRead, toSnapshot, withThreadRead } from '../messaging-state'
import { EMPTY_FILTERS, activeFilterCount, groupFacets, memberContext, searchArgs, totalOf, type MemberSearchRow } from '../directory-filters'

describe('unread counts', () => {
  const rows = [
    { thread_id: 't1', unread: 2, peer_read_at: null, seen_message_id: null },
    { thread_id: 't2', unread: 0, peer_read_at: '2026-10-01T10:00:00Z', seen_message_id: 'm9' },
    { thread_id: 't3', unread: -4, peer_read_at: null, seen_message_id: null },
  ]
  it('totals per-thread counts and ignores bad values', () => {
    const snap = toSnapshot(rows)
    expect(snap.loaded).toBe(true)
    expect(snap.total).toBe(2)
    expect(snap.threads['t3']?.unread).toBe(0)
    expect(snap.threads['t2']).toEqual({ unread: 0, peerReadAt: '2026-10-01T10:00:00Z', seenMessageId: 'm9' })
    expect(toSnapshot(null)).toEqual({ loaded: true, total: 0, threads: {} })
  })
  it('zeros a thread locally once it is read', () => {
    const snap = withThreadRead(toSnapshot(rows), 't1')
    expect(snap.total).toBe(0)
    expect(snap.threads['t1']?.unread).toBe(0)
    expect(withThreadRead(EMPTY_UNREAD, 'nope')).toBe(EMPTY_UNREAD)
  })
  it('formats badges', () => {
    expect(badgeLabel(0)).toBe('')
    expect(badgeLabel(-1)).toBe('')
    expect(badgeLabel(7)).toBe('7')
    expect(badgeLabel(100)).toBe('99+')
    expect(badgeLabel(Number.NaN)).toBe('')
  })
  it('marks read only when the thread is on screen with something unread', () => {
    expect(shouldMarkRead({ threadId: 't1', pageVisible: true, unread: 1 })).toBe(true)
    expect(shouldMarkRead({ threadId: 't1', pageVisible: false, unread: 3 })).toBe(false)
    expect(shouldMarkRead({ threadId: 't1', pageVisible: true, unread: 0 })).toBe(false)
    expect(shouldMarkRead({ threadId: 't1', pageVisible: true, unread: 0, fallbackUnread: true })).toBe(true)
    expect(shouldMarkRead({ threadId: '', pageVisible: true, unread: 5 })).toBe(false)
  })
})

describe('seen receipts', () => {
  const messages = [
    { id: 'a', from: 'me' as const },
    { id: 'b', from: 'them' as const },
    { id: 'c', from: 'me' as const },
  ]
  it('shows Seen under your latest message only when that one was read', () => {
    expect(seenUnderMessageId(messages, 'c')).toBe('c')
    expect(seenUnderMessageId(messages, 'a')).toBeNull()
    expect(seenUnderMessageId(messages, null)).toBeNull()
  })
  it('still marks your latest message when they replied after reading it', () => {
    expect(seenUnderMessageId([...messages, { id: 'd', from: 'them' }], 'c')).toBe('c')
  })
  it('shows nothing when you have not sent anything', () => {
    expect(seenUnderMessageId([{ id: 'x', from: 'them' }], 'x')).toBeNull()
  })
})

describe('directory filters', () => {
  it('sends blank filters as null', () => {
    expect(searchArgs(EMPTY_FILTERS)).toEqual({
      p_query: null, p_industries: null, p_location: null, p_expertise: null,
      p_verified_only: false, p_limit: 30, p_offset: 0, p_looking_for: null,
    })
  })
  it('trims, clips and pages', () => {
    const args = searchArgs({ query: '  ana ', industry: 'Logistics', location: ' Austin ', expertise: 'Pricing', lookingFor: 'x'.repeat(300), verifiedOnly: true }, 2, 10)
    expect(args.p_query).toBe('ana')
    expect(args.p_industries).toEqual(['Logistics'])
    expect(args.p_location).toBe('Austin')
    expect(args.p_expertise).toEqual(['Pricing'])
    expect(args.p_looking_for).toHaveLength(200)
    expect(args.p_offset).toBe(20)
    expect(args.p_verified_only).toBe(true)
    expect(searchArgs(EMPTY_FILTERS, -3).p_offset).toBe(0)
  })
  it('counts structured filters but not the search box', () => {
    expect(activeFilterCount({ ...EMPTY_FILTERS, query: 'ana' })).toBe(0)
    expect(activeFilterCount({ ...EMPTY_FILTERS, industry: 'SaaS', verifiedOnly: true, location: ' ' })).toBe(2)
  })
  it('groups facets and never shows a value fewer than three share', () => {
    const groups = groupFacets([
      { kind: 'industry', value: 'SaaS', members: 4 },
      { kind: 'industry', value: 'Logistics', members: 9 },
      { kind: 'industry', value: 'Rare', members: 2 },
      { kind: 'location', value: 'Austin, TX', members: 3 },
      { kind: 'expertise', value: ' ', members: 5 },
      { kind: 'email', value: 'x@y.z', members: 10 },
    ])
    expect(groups.industry.map(f => f.value)).toEqual(['Logistics', 'SaaS'])
    expect(groups.location).toEqual([{ value: 'Austin, TX', members: 3 }])
    expect(groups.expertise).toEqual([])
    expect(groupFacets(undefined)).toEqual({ industry: [], location: [], expertise: [] })
  })
  it('reads the total and builds the context line', () => {
    const row = { total_count: '42', industries: ['Logistics', 'SaaS', 'Retail'], location: 'Austin, TX' } as unknown as MemberSearchRow
    expect(totalOf([row])).toBe(42)
    expect(totalOf([])).toBe(0)
    expect(memberContext(row)).toBe('Logistics, SaaS · Austin, TX')
    expect(memberContext({ industries: [], location: '' })).toBe('')
  })
})
