/**
 * Persistence abstraction for the moat layer collections.
 *
 * Mirrors ./repository.ts and ./os-repository.ts. The preview runs on the
 * local adapter (localStorage + seeded demo content). When a database is
 * wired, implement `TableGateway` and pass it to `createRemoteMoatLayer` —
 * no surface changes required. Tables are declared in ./schema.sql.
 */
import type { ID } from './models'
import type { Repository, TableGateway } from './repository'
import type {
  AdvisoryBoard, ConsentLedgerEntry, DigitalRepresentativePolicy, IntroductionAvailability,
  KnowledgePost, LiveEvent, NetworkConstitutionRule, NetworkQuestion, NetworkSnapshot,
  OrganizationRelationshipPassport, OutcomeAttributionEdge, OutreachQualityReview,
  OutreachStrikeLedger, PortableIdentity, ProfessionalPassport, ReciprocitySignal,
  RelationshipContextAdapter, RelationshipContextQuery, RelationshipDecayRisk,
  RelationshipGap, SerendipityMatch,
} from './moat-models'
import {
  seedAdapters, seedAttribution, seedAvailability, seedBoards, seedConsent, seedConstitution,
  seedDecay, seedEvents, seedGaps, seedIdentity, seedKnowledge, seedOrgPassports, seedPassports,
  seedQuestions, seedReciprocity, seedRepresentative, seedSerendipity, seedSnapshots, seedStrikes,
} from './moat-seed'

export interface MoatCollections {
  passports: ProfessionalPassport[]
  constitution: NetworkConstitutionRule[]
  reviews: OutreachQualityReview[]
  strikes: OutreachStrikeLedger[]
  questions: NetworkQuestion[]
  serendipity: SerendipityMatch[]
  orgPassports: OrganizationRelationshipPassport[]
  events: LiveEvent[]
  gaps: RelationshipGap[]
  identities: PortableIdentity[]
  consent: ConsentLedgerEntry[]
  reciprocity: ReciprocitySignal[]
  decay: RelationshipDecayRisk[]
  representatives: DigitalRepresentativePolicy[]
  availability: IntroductionAvailability[]
  snapshots: NetworkSnapshot[]
  attribution: OutcomeAttributionEdge[]
  knowledge: KnowledgePost[]
  boards: AdvisoryBoard[]
  adapters: RelationshipContextAdapter[]
  contextQueries: RelationshipContextQuery[]
}

export type MoatCollectionName = keyof MoatCollections

export const moatTableNames: Record<MoatCollectionName, string> = {
  passports: 'professional_passports',
  constitution: 'network_constitution_rules',
  reviews: 'outreach_quality_reviews',
  strikes: 'outreach_strike_ledgers',
  questions: 'network_questions',
  serendipity: 'serendipity_matches',
  orgPassports: 'organization_relationship_passports',
  events: 'live_events',
  gaps: 'relationship_gaps',
  identities: 'portable_identities',
  consent: 'consent_ledger_entries',
  reciprocity: 'reciprocity_signals',
  decay: 'relationship_decay_risks',
  representatives: 'digital_representative_policies',
  availability: 'introduction_availability_windows',
  snapshots: 'network_snapshots',
  attribution: 'outcome_attribution_edges',
  knowledge: 'knowledge_posts',
  boards: 'advisory_boards',
  adapters: 'relationship_context_adapters',
  contextQueries: 'relationship_context_queries',
}

export function seedMoatCollections(): MoatCollections {
  return {
    passports: seedPassports, constitution: seedConstitution, reviews: [], strikes: seedStrikes,
    questions: seedQuestions, serendipity: seedSerendipity, orgPassports: seedOrgPassports,
    events: seedEvents, gaps: seedGaps, identities: seedIdentity, consent: seedConsent,
    reciprocity: seedReciprocity, decay: seedDecay, representatives: seedRepresentative,
    availability: seedAvailability, snapshots: seedSnapshots, attribution: seedAttribution,
    knowledge: seedKnowledge, boards: seedBoards, adapters: seedAdapters, contextQueries: [],
  }
}

export interface MoatDataLayer {
  readonly mode: 'local' | 'remote'
  snapshot(): MoatCollections
  repo<K extends MoatCollectionName>(name: K): Repository<MoatCollections[K][number]>
  subscribe(listener: (next: MoatCollections) => void): () => void
}

const KEY = 'aetheris-moat-v1'

export function createLocalMoatLayer(): MoatDataLayer {
  const seeded = seedMoatCollections()
  let state: MoatCollections = (() => {
    if (typeof window === 'undefined') return seeded
    try {
      const raw = localStorage.getItem(KEY)
      if (!raw) return seeded
      const parsed = JSON.parse(raw) as Partial<MoatCollections>
      const merged = { ...seeded } as MoatCollections
      for (const key of Object.keys(seeded) as MoatCollectionName[]) {
        const stored = parsed[key]
        if (Array.isArray(stored)) (merged[key] as unknown[]) = stored
      }
      return merged
    } catch {
      return seeded
    }
  })()

  const listeners = new Set<(next: MoatCollections) => void>()
  const commit = (next: MoatCollections) => {
    state = next
    if (typeof window !== 'undefined') {
      try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* storage full */ }
    }
    listeners.forEach(l => l(state))
  }

  return {
    mode: 'local',
    snapshot: () => state,
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener) },
    repo<K extends MoatCollectionName>(name: K) {
      type T = MoatCollections[K][number]
      const rows = () => state[name] as unknown as T[]
      return {
        list: async () => [...rows()],
        get: async (id: ID) => rows().find(r => r.id === id) ?? null,
        create: async (value: T) => {
          commit({ ...state, [name]: [value, ...rows()] } as MoatCollections)
          return value
        },
        update: async (id: ID, patch: Partial<T>) => {
          const next = rows().map(r => (r.id === id ? { ...r, ...patch } : r))
          commit({ ...state, [name]: next } as MoatCollections)
          return next.find(r => r.id === id)!
        },
        remove: async (id: ID) => {
          commit({ ...state, [name]: rows().filter(r => r.id !== id) } as MoatCollections)
        },
      }
    },
  }
}

/** Remote adapter. Keeps the seeded snapshot until the first load resolves. */
export function createRemoteMoatLayer(gateway: TableGateway): MoatDataLayer {
  const state = seedMoatCollections()
  const listeners = new Set<(next: MoatCollections) => void>()
  const emit = () => listeners.forEach(l => l(state))

  void (async () => {
    for (const key of Object.keys(moatTableNames) as MoatCollectionName[]) {
      try {
        const rows = await gateway.select(moatTableNames[key])
        ;(state[key] as unknown[]) = rows as unknown[]
      } catch { /* keep seeded rows for this collection */ }
    }
    emit()
  })()

  return {
    mode: 'remote',
    snapshot: () => state,
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener) },
    repo<K extends MoatCollectionName>(name: K) {
      type T = MoatCollections[K][number]
      const table = moatTableNames[name]
      const rows = () => state[name] as unknown as T[]
      const set = (next: T[]) => { (state[name] as unknown[]) = next as unknown[]; emit() }
      return {
        list: async () => [...rows()],
        get: async (id: ID) => rows().find(r => r.id === id) ?? null,
        create: async (value: T) => {
          const saved = (await gateway.insert(table, value as unknown as Record<string, unknown>)) as unknown as T
          set([saved ?? value, ...rows()])
          return saved ?? value
        },
        update: async (id: ID, patch: Partial<T>) => {
          await gateway.update(table, id, patch as Record<string, unknown>)
          const next = rows().map(r => (r.id === id ? { ...r, ...patch } : r))
          set(next)
          return next.find(r => r.id === id)!
        },
        remove: async (id: ID) => {
          await gateway.delete(table, id)
          set(rows().filter(r => r.id !== id))
        },
      }
    },
  }
}

let active: MoatDataLayer | null = null
/** Single entry point. Swap in `createRemoteMoatLayer` once a database is wired. */
export function getMoatDataLayer(): MoatDataLayer {
  if (!active) active = createLocalMoatLayer()
  return active
}
