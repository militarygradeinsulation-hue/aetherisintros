/**
 * Persistence abstraction.
 *
 * The preview runs on the local adapter (localStorage, seeded demo content).
 * When a database is available, implement `TableGateway` against it and pass it
 * to `createRemoteDataLayer` — no UI or domain code changes. Table names and
 * ownership/visibility columns are declared in ./schema.sql.
 */
import type {
  AvailabilityWindow, Circle, CompanyProfile, ConnectionChain, ConnectorReputation, ContextCapsule,
  DigitalHandshake, ID, IntentCard, MeetingContinuity, OpenLoop, OrganizationRelationship, Outcome,
  Placement, RelationshipWeather, SystemRecord, TriggerMemory,
} from './models'
import {
  seedAvailability, seedCapsules, seedChains, seedCircles, seedCompanies, seedHandshakes, seedIntents,
  seedLoops, seedMeetings, seedOrgRelationships, seedOutcomes, seedPlacements, seedReputation,
  seedSystems, seedTriggers, seedWeather,
} from './seed'

export interface Repository<T extends { id: ID }> {
  list(): Promise<T[]>
  get(id: ID): Promise<T | null>
  create(value: T): Promise<T>
  update(id: ID, patch: Partial<T>): Promise<T>
  remove(id: ID): Promise<void>
}

export interface Collections {
  systems: SystemRecord[]
  placements: Placement[]
  circles: Circle[]
  intents: IntentCard[]
  handshakes: DigitalHandshake[]
  capsules: ContextCapsule[]
  weather: RelationshipWeather[]
  loops: OpenLoop[]
  triggers: TriggerMemory[]
  reputation: ConnectorReputation[]
  chains: ConnectionChain[]
  companies: CompanyProfile[]
  orgRelationships: OrganizationRelationship[]
  availability: AvailabilityWindow[]
  meetings: MeetingContinuity[]
  outcomes: Outcome[]
}

export type CollectionName = keyof Collections

export const tableNames: Record<CollectionName, string> = {
  systems: 'systems',
  placements: 'placements',
  circles: 'circles',
  intents: 'intent_cards',
  handshakes: 'digital_handshakes',
  capsules: 'context_capsules',
  weather: 'relationship_weather',
  loops: 'open_loops',
  triggers: 'trigger_memories',
  reputation: 'connector_reputation',
  chains: 'connection_chains',
  companies: 'company_profiles',
  orgRelationships: 'organization_relationships',
  availability: 'availability_windows',
  meetings: 'meeting_continuity',
  outcomes: 'outcomes',
}

export function seedCollections(): Collections {
  return {
    systems: seedSystems, placements: seedPlacements, circles: seedCircles, intents: seedIntents,
    handshakes: seedHandshakes, capsules: seedCapsules, weather: seedWeather, loops: seedLoops,
    triggers: seedTriggers, reputation: seedReputation, chains: seedChains, companies: seedCompanies,
    orgRelationships: seedOrgRelationships, availability: seedAvailability, meetings: seedMeetings,
    outcomes: seedOutcomes,
  }
}

export interface DataLayer {
  readonly mode: 'local' | 'remote'
  snapshot(): Collections
  repo<K extends CollectionName>(name: K): Repository<Collections[K][number]>
  subscribe(listener: (next: Collections) => void): () => void
}

const KEY = 'aetheris-platform-v1'

/** Local adapter: synchronous snapshot for render, async repositories for parity. */
export function createLocalDataLayer(): DataLayer {
  const seeded = seedCollections()
  let state: Collections = (() => {
    if (typeof window === 'undefined') return seeded
    try {
      const raw = localStorage.getItem(KEY)
      if (!raw) return seeded
      const parsed = JSON.parse(raw) as Partial<Collections>
      const merged = { ...seeded } as Collections
      for (const key of Object.keys(seeded) as CollectionName[]) {
        const stored = parsed[key]
        if (Array.isArray(stored)) (merged[key] as unknown[]) = stored
      }
      return merged
    } catch {
      return seeded
    }
  })()

  const listeners = new Set<(next: Collections) => void>()
  const commit = (next: Collections) => {
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
    repo<K extends CollectionName>(name: K) {
      type T = Collections[K][number]
      const rows = () => state[name] as unknown as T[]
      return {
        list: async () => [...rows()],
        get: async (id: ID) => rows().find(r => r.id === id) ?? null,
        create: async (value: T) => {
          commit({ ...state, [name]: [value, ...rows()] } as Collections)
          return value
        },
        update: async (id: ID, patch: Partial<T>) => {
          const next = rows().map(r => (r.id === id ? { ...r, ...patch } : r))
          commit({ ...state, [name]: next } as Collections)
          return next.find(r => r.id === id)!
        },
        remove: async (id: ID) => {
          commit({ ...state, [name]: rows().filter(r => r.id !== id) } as Collections)
        },
      }
    },
  }
}

/**
 * Minimal gateway a Postgres/Supabase-backed implementation must satisfy.
 * Kept dependency-free so the preview never requires database credentials.
 */
export interface TableGateway {
  select(table: string): Promise<Array<Record<string, unknown>>>
  insert(table: string, row: Record<string, unknown>): Promise<Record<string, unknown>>
  update(table: string, id: string, patch: Record<string, unknown>): Promise<Record<string, unknown>>
  delete(table: string, id: string): Promise<void>
}

/** Remote adapter. Falls back to the seeded snapshot until the first load resolves. */
export function createRemoteDataLayer(gateway: TableGateway): DataLayer {
  let state = seedCollections()
  const listeners = new Set<(next: Collections) => void>()
  const emit = () => listeners.forEach(l => l(state))

  void (async () => {
    for (const key of Object.keys(tableNames) as CollectionName[]) {
      try {
        const rows = await gateway.select(tableNames[key])
        ;(state[key] as unknown[]) = rows as unknown[]
      } catch { /* keep seeded rows for this collection */ }
    }
    emit()
  })()

  return {
    mode: 'remote',
    snapshot: () => state,
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener) },
    repo<K extends CollectionName>(name: K) {
      type T = Collections[K][number]
      const table = tableNames[name]
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

let active: DataLayer | null = null
/** Single entry point. Swap in `createRemoteDataLayer` once a database is wired. */
export function getDataLayer(): DataLayer {
  if (!active) active = createLocalDataLayer()
  return active
}
