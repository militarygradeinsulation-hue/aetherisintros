import type { ProfessionalProfileProvider } from '@/aetheris/capabilities/enrichment'
import { buildLookupQuery, withinLookupWindow } from '@/aetheris/capabilities/enrichment'

/**
 * Provider seam. Intros has no runtime people-search API today, so:
 * - assistant_connector / manual: real results are handed in through the workspace (never generated here)
 * - direct_api: reserved for a licensed provider; unavailable until one is connected.
 */
export const PROVIDERS: Record<string, ProfessionalProfileProvider> = {
  assistant_connector: {
    id: 'assistant_connector', available: true,
    search: async () => { throw new Error('Results arrive by hand-off from the assistant lookup.') },
  },
  manual: {
    id: 'manual', available: true,
    search: async () => { throw new Error('Results are pasted in by the member.') },
  },
  direct_api: {
    id: 'direct_api', available: false,
    unavailableReason: 'No licensed people-search provider is connected to Intros yet.',
    search: async () => { throw new Error('Direct LinkedIn search is not connected.') },
  },
}

export async function loadPerson(db: any, personId: string) {
  const { data, error } = await db.from('crm_people')
    .select('id,full_name,title,company_name,location,linkedin_url').eq('id', personId).maybeSingle()
  if (error || !data) throw new Error('Person not found')
  return data as { id: string; full_name: string; title: string; company_name: string; location: string; linkedin_url: string }
}

/** Builds the privacy-safe query and pauses for real results. */
export async function beginEnrichment(db: any, personId: string, step: (s: string, e?: Record<string, unknown>) => PromiseLike<any>) {
  const person = await loadPerson(db, personId)
  const query = buildLookupQuery({ fullName: person.full_name, companyName: person.company_name, title: person.title, location: person.location })
  const { data: prof } = await db.from('person_external_profiles').select('last_checked_at,status')
    .eq('person_id', personId).eq('status', 'confirmed').maybeSingle()
  const cached = withinLookupWindow(prof?.last_checked_at)
  const result = {
    status: 'needs_input', engine: 'deterministic',
    output: {
      kind: 'professional_enrichment', query, candidates: [], cachedUntilNextLookup: cached, lastCheckedAt: prof?.last_checked_at ?? null,
      providers: Object.values(PROVIDERS).map(p => ({ id: p.id, available: p.available, reason: p.unavailableReason ?? null })),
    },
    items: [], provenance: { inputs: [{ type: 'person', id: personId }], sources: [] },
  }
  const r = await step('needs_input', { p_progress: 60, p_step_label: 'Waiting for lookup results', p_result: result })
  if (r?.error) throw new Error(r.error.message)
}
