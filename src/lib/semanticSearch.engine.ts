/** The semantic layer may only select and label fields returned by the existing gated directory RPC. */
export const SEMANTIC_EVIDENCE_KEYS = ['title', 'company', 'location', 'industries', 'expertise', 'can_help_with', 'looking_for'] as const
export type SemanticEvidenceKey = typeof SEMANTIC_EVIDENCE_KEYS[number]

export interface SemanticCandidate {
  id: string
  title: string
  company: string
  location: string
  industries: string[]
  expertise: string[]
  can_help_with: string
  looking_for: string
}

export interface SemanticMatch {
  id: string
  insight: string
  evidence: { field: SemanticEvidenceKey; value: string }[]
}

const labels: Record<SemanticEvidenceKey, string> = {
  title: 'Role', company: 'Company', location: 'Location',
  industries: 'Industry', expertise: 'Expertise',
  can_help_with: 'Can help with', looking_for: 'Looking for',
}
const keys = new Set<string>(SEMANTIC_EVIDENCE_KEYS)

export function groundSemanticMatches(
  raw: unknown,
  candidates: readonly SemanticCandidate[],
  limit = 12,
): SemanticMatch[] {
  if (!raw || typeof raw !== 'object') return []
  const rows = (raw as { matches?: unknown }).matches
  if (!Array.isArray(rows)) return []
  const byId = new Map(candidates.map(p => [p.id, p]))
  const used = new Set<string>()
  const result: SemanticMatch[] = []
  for (const item of rows.slice(0, 40)) {
    if (!item || typeof item !== 'object') continue
    const match = item as { id?: unknown; fields?: unknown }
    if (typeof match.id !== 'string' || used.has(match.id)) continue
    const candidate = byId.get(match.id)
    if (!candidate || !Array.isArray(match.fields)) continue
    const evidence: SemanticMatch['evidence'] = []
    for (const key of match.fields.slice(0, 4)) {
      if (typeof key !== 'string' || !keys.has(key) || evidence.some(row => row.field === key)) continue
      const field = key as SemanticEvidenceKey
      const rawValue = candidate[field]
      const value = (Array.isArray(rawValue) ? rawValue.slice(0, 3).join(', ') : rawValue).trim().slice(0, 120)
      if (value) evidence.push({ field, value })
      if (evidence.length >= 2) break
    }
    // An AI-generated rationale is never trusted as evidence. Build it entirely from
    // fields that the authenticated database has already returned.
    if (!evidence.length) continue
    result.push({
      id: candidate.id,
      evidence,
      insight: 'Profile alignment: ' + evidence.map(entry => labels[entry.field] + ': ' + entry.value).join(' · '),
    })
    used.add(candidate.id)
    if (result.length >= limit) break
  }
  return result
}
