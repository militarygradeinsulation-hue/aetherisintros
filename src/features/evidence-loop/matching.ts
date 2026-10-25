export type MatchEvidence = {
  confirmedPartners: number;
  successfulPartners: number;
  newcomerUntil: string | null;
  approvedVouches: number;
};
export function outcomeWeight(e?: MatchEvidence) {
  const n = e?.confirmedPartners ?? 0,
    s = e?.successfulPartners ?? 0;
  if (!Number.isInteger(n) || !Number.isInteger(s) || n < 3 || s < 0 || s > n) return 0;
  return Math.min(0.12, (0.12 * n) / (n + 5));
}
export function outcomeScore(e: MatchEvidence) {
  return (100 * (e.successfulPartners + 2)) / (e.confirmedPartners + 4);
}
export function newcomerEligible(
  e: MatchEvidence | undefined,
  relevance: number,
  availability: number,
  now = Date.now(),
) {
  const until = e?.newcomerUntil ? Date.parse(e.newcomerUntil) : NaN;
  return (
    Number.isFinite(until) &&
    until > now &&
    until <= now + 30 * 86400000 &&
    relevance >= 30 &&
    availability > 0
  );
}
/** Stable daily rotation, preserves filtering and scores. One eligible newcomer
 * occupies the third position in every five; never duplicates a candidate.
 * This is an exposure allocation, not a suitability or trust score. */
export function newcomerLane<T>(
  items: T[],
  id: (v: T) => string,
  eligible: (v: T) => boolean,
  day = Math.floor(Date.now() / 86400000),
): T[] {
  const candidates = items.filter(eligible).sort((a, b) => id(a).localeCompare(id(b)));
  if (!candidates.length) return items;
  const offset = ((day % candidates.length) + candidates.length) % candidates.length;
  const rotated = [...candidates.slice(offset), ...candidates.slice(0, offset)];
  const quota = Math.min(rotated.length, Math.ceil(items.length / 5));
  const chosen = rotated.slice(0, quota),
    selected = new Set(chosen.map(id)),
    rest = items.filter((v) => !selected.has(id(v)));
  const result: T[] = [];
  for (let i = 0; i < items.length; i++) {
    if (chosen.length && (i % 5 === 2 || !rest.length)) result.push(chosen.shift()!);
    else if (rest.length) result.push(rest.shift()!);
  }
  return result;
}
