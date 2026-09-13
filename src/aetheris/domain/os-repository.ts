/**
 * Persistence abstraction for the Relationship OS collections.
 *
 * Mirrors ./repository.ts exactly: the preview runs on the local adapter
 * (localStorage + seeded demo content); when a database is wired, implement
 * `TableGateway` and pass it to `createRemoteOSLayer`. No UI changes needed.
 * Table names and columns are declared in ./schema.sql.
 */
import { isShowcase } from '../showcase'
import type { ID } from './models'
import type { Repository, TableGateway } from './repository'
import type {
  AutopilotAction, EvidenceItem, LatentNetworkPath, NetworkSimulation, NetworkStrategy,
  OpportunityCollision, OpportunityRoom, RelationshipInboxItem, RelationshipTwin,
  TrustBudgetState, VoiceMemoryCapture,
} from './os-models'
import {
  seedAutopilot, seedCaptures, seedCollisions, seedEvidence, seedInbox, seedLatentPaths,
  seedRooms, seedSimulations, seedStrategies, seedTrustBudget, seedTwins,
} from './os-seed'

export interface OSCollections {
  rooms: OpportunityRoom[]
  twins: RelationshipTwin[]
  simulations: NetworkSimulation[]
  collisions: OpportunityCollision[]
  latentPaths: LatentNetworkPath[]
  trustBudgets: TrustBudgetState[]
  inbox: RelationshipInboxItem[]
  evidence: EvidenceItem[]
  captures: VoiceMemoryCapture[]
  autopilot: AutopilotAction[]
  strategies: NetworkStrategy[]
}

export type OSCollectionName = keyof OSCollections

export const osTableNames: Record<OSCollectionName, string> = {
  rooms: 'opportunity_rooms',
  twins: 'relationship_twins',
  simulations: 'network_simulations',
  collisions: 'opportunity_collisions',
  latentPaths: 'latent_network_paths',
  trustBudgets: 'trust_budget_states',
  inbox: 'relationship_inbox_items',
  evidence: 'evidence_items',
  captures: 'voice_memory_captures',
  autopilot: 'autopilot_actions',
  strategies: 'network_strategies',
}

/** The live network starts empty: only member-created rows may appear. */
export function emptyOSCollections(): OSCollections {
  return Object.fromEntries(Object.keys(osTableNames).map(key => [key, []])) as unknown as OSCollections
}

export function seedOSCollections(): OSCollections {
  return {
    rooms: seedRooms, twins: seedTwins, simulations: seedSimulations, collisions: seedCollisions,
    latentPaths: seedLatentPaths, trustBudgets: seedTrustBudget, inbox: seedInbox,
    evidence: seedEvidence, captures: seedCaptures, autopilot: seedAutopilot, strategies: seedStrategies,
  }
}

export interface OSDataLayer {
  readonly mode: 'local' | 'remote'
  snapshot(): OSCollections
  repo<K extends OSCollectionName>(name: K): Repository<OSCollections[K][number]>
  subscribe(listener: (next: OSCollections) => void): () => void
}

const KEY = 'aetheris-relationship-os-v1'
const storeKey = () => `${KEY}-${isShowcase() ? 'demo' : 'live'}`

export function createLocalOSLayer(): OSDataLayer {
  const seeded = isShowcase() ? seedOSCollections() : emptyOSCollections()
  let state: OSCollections = (() => {
    if (typeof window === 'undefined') return seeded
    try {
      const raw = localStorage.getItem(storeKey())
      if (!raw) return seeded
      const parsed = JSON.parse(raw) as Partial<OSCollections>
      const merged = { ...seeded } as OSCollections
      for (const key of Object.keys(seeded) as OSCollectionName[]) {
        const stored = parsed[key]
        if (Array.isArray(stored)) (merged[key] as unknown[]) = stored
      }
      return merged
    } catch {
      return seeded
    }
  })()

  const listeners = new Set<(next: OSCollections) => void>()
  const commit = (next: OSCollections) => {
    state = next
    if (typeof window !== 'undefined') {
      try { localStorage.setItem(storeKey(), JSON.stringify(state)) } catch { /* storage full */ }
    }
    listeners.forEach(l => l(state))
  }

  return {
    mode: 'local',
    snapshot: () => state,
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener) },
    repo<K extends OSCollectionName>(name: K) {
      type T = OSCollections[K][number]
      const rows = () => state[name] as unknown as T[]
      return {
        list: async () => [...rows()],
        get: async (id: ID) => rows().find(r => r.id === id) ?? null,
        create: async (value: T) => {
          commit({ ...state, [name]: [value, ...rows()] } as OSCollections)
          return value
        },
        update: async (id: ID, patch: Partial<T>) => {
          const next = rows().map(r => (r.id === id ? { ...r, ...patch } : r))
          commit({ ...state, [name]: next } as OSCollections)
          return next.find(r => r.id === id)!
        },
        remove: async (id: ID) => {
          commit({ ...state, [name]: rows().filter(r => r.id !== id) } as OSCollections)
        },
      }
    },
  }
}

/** Remote adapter. Keeps the seeded snapshot until the first load resolves. */
export function createRemoteOSLayer(gateway: TableGateway): OSDataLayer {
  const state = isShowcase() ? seedOSCollections() : emptyOSCollections()
  const listeners = new Set<(next: OSCollections) => void>()
  const emit = () => listeners.forEach(l => l(state))

  void (async () => {
    for (const key of Object.keys(osTableNames) as OSCollectionName[]) {
      try {
        const rows = await gateway.select(osTableNames[key])
        ;(state[key] as unknown[]) = rows as unknown[]
      } catch { /* keep seeded rows for this collection */ }
    }
    emit()
  })()

  return {
    mode: 'remote',
    snapshot: () => state,
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener) },
    repo<K extends OSCollectionName>(name: K) {
      type T = OSCollections[K][number]
      const table = osTableNames[name]
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

let active: OSDataLayer | null = null
let activeShowcase: boolean | null = null
/** Single entry point. Swap in `createRemoteOSLayer` once a database is wired. */
export function getOSDataLayer(): OSDataLayer {
  if (!active || activeShowcase !== isShowcase()) {
    activeShowcase = isShowcase()
    active = createLocalOSLayer()
  }
  return active
}
