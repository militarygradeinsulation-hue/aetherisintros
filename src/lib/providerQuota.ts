/**
 * Best-effort, per-worker usage brakes. These do not replace provider account
 * spending limits or durable distributed per-member quotas for production.
 */
export function createCharacterBudget(
  maxCalls: number,
  maxCharacters: number,
  windowMs: number,
  now: () => number = Date.now,
) {
  const buckets = new Map<string, Array<{ time: number; characters: number }>>()
  return (accountId: string, characters: number): boolean => {
    if (!accountId || !Number.isInteger(characters) || characters < 1) return false
    const at = now()
    const recent = (buckets.get(accountId) ?? []).filter(hit => hit.time > at - windowMs)
    if (recent.length >= maxCalls ||
        recent.reduce((total, hit) => total + hit.characters, 0) + characters > maxCharacters) {
      buckets.set(accountId, recent)
      return false
    }
    recent.push({ time: at, characters })
    buckets.set(accountId, recent)
    if (buckets.size > 2000) {
      for (const [id, values] of buckets) {
        if (!values.some(hit => hit.time > at - windowMs)) buckets.delete(id)
      }
    }
    return true
  }
}
