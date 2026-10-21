import { z } from 'zod'
import type { ScannedProfile } from './linkedin-scan'

/** Member-supplied documents only; references are labels, never fetch targets. */
export const AdditionalEvidenceSchema = z.object({
  label: z.string().trim().min(1).max(120),
  text: z.string().trim().min(1).max(20_000),
  authorized: z.literal(true),
}).strict()
export type AdditionalEvidence = z.infer<typeof AdditionalEvidenceSchema>
export interface ProfessionalClaim {
  field: string
  value: string
  kind: 'self_reported' | 'hypothesis'
  confidence: 'low' | 'medium'
  source: string
  quote: string
  explanation: string
}

const normalized = (text: string) => text.toLowerCase().replace(/\s+/g, ' ').trim()

/** Full-value grounding, not a matching opening followed by fabricated text. */
export function containsCompleteClaim(value: string, text: string): boolean {
  const needle = normalized(value)
  return Boolean(needle) && normalized(text).includes(needle)
}

export function professionalClaims(scan: ScannedProfile, sources: Array<{ label: string; text: string }>): ProfessionalClaim[] {
  const claims: ProfessionalClaim[] = []
  for (const [field, raw] of Object.entries(scan)) {
    const values = Array.isArray(raw) ? raw : [raw]
    for (const value of values) {
      if (typeof value !== 'string' || !value) continue
      const source = sources.find(item => containsCompleteClaim(value, item.text))
      if (!source) continue
      claims.push({ field, value, kind: 'self_reported', confidence: 'medium', source: source.label,
        quote: value, explanation: 'Stated in supplied evidence; not independently verified.' })
    }
  }
  for (const role of scan.experience) {
    for (const [part, value] of Object.entries(role)) {
      const source = sources.find(item => containsCompleteClaim(value, item.text))
      if (source) claims.push({ field: `experience.${part}`, value, kind: 'self_reported', confidence: 'medium',
        source: source.label, quote: value, explanation: 'Stated role detail; not independently verified.' })
    }
  }
  const skill = claims.find(item => item.field === 'expertise')
  if (skill) claims.push({ ...skill, field: 'professional_strength', kind: 'hypothesis', confidence: 'low',
    value: `Possible professional strength: ${skill.value}`,
    explanation: 'A listed skill suggests a strength, but does not establish proficiency or performance.' })
  const need = claims.find(item => item.field === 'looking_for')
  if (need) claims.push({ ...need, field: 'networking_opportunity', kind: 'hypothesis', confidence: 'low',
    value: `Possible introduction opportunity: ${need.value}`,
    explanation: 'Based on a stated need, not a member search, match, availability check or promised introduction.' })
  for (const source of sources) {
    const preference = source.text.split(/\n|(?<=[.!?])\s+/).find(line =>
      /\bI prefer\b.*\b(email|calls?|messages?|written|video)\b/i.test(line) && line.length <= 600)
    if (preference) claims.push({ field: 'communication_preference', value: preference.trim(), kind: 'hypothesis', confidence: 'low',
      source: source.label, quote: preference.trim(), explanation: 'Explicit preference suggests an approach; confirm that it still applies. No personality inference.' })
  }
  return claims.slice(0, 160)
}