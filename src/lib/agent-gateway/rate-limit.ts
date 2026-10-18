/**
 * Fixed-window rate limits for the agent gateway. The server computes the window here; the
 * database counts hits per (bucket, window) atomically (agent_rate_hit, migration 0054).
 */

export const HOUR = 3600
export const DAY = 86400

export const LIMITS = {
  /** Default calls per hour per assistant key (stored per key). */
  keyPerHour: 60,
  /** Default introduction requests per day per assistant key (stored per key). */
  introsPerDay: 10,
  /** Inbound agent requests per hour from one IP address. */
  inboundPerIpHour: 10,
  /** Inbound agent requests per day from one requester email domain. */
  inboundPerDomainDay: 30,
} as const

/** Start of the fixed window containing `nowMs`, aligned to the epoch. */
export function windowStart(nowMs: number, windowSeconds: number): Date {
  const size = windowSeconds * 1000
  return new Date(Math.floor(nowMs / size) * size)
}

/** Whole seconds until the window containing `nowMs` ends (at least 1). */
export function retryAfterSeconds(nowMs: number, windowSeconds: number): number {
  const end = windowStart(nowMs, windowSeconds).getTime() + windowSeconds * 1000
  return Math.max(1, Math.ceil((end - nowMs) / 1000))
}
