/** Presentation pagination only: never truncates stored posts or changes visibility rules. */
export const INITIAL_FEED_COUNT = 3
export function moreFeedCount(current: number): number {
  return current + INITIAL_FEED_COUNT
}