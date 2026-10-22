import { describe, expect, it } from 'vitest'
import { INITIAL_FEED_COUNT, moreFeedCount } from '../feed-window'

describe('focused Dashboard feed', () => {
  it('starts with at most three updates', () => {
    expect(INITIAL_FEED_COUNT).toBe(3)
  })
  it('makes every additional update reachable without modifying the original feed', () => {
    const posts = Array.from({ length: 10 }, (_, index) => index)
    let count = INITIAL_FEED_COUNT
    expect(posts.slice(0, count)).toEqual([0, 1, 2])
    count = moreFeedCount(count)
    expect(count).toBe(6)
    count = moreFeedCount(moreFeedCount(count))
    expect(posts.slice(0, count)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(posts.length).toBe(10)
  })
})