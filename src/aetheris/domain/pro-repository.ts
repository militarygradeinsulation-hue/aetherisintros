/**
 * Persistence abstraction for the professional layer.
 *
 * Same contract as ./repository.ts, ./os-repository.ts and
 * ./moat-repository.ts: the preview runs on the local adapter (localStorage +
 * seeded demo content), and a database adapter can be swapped in by
 * implementing `TableGateway`. Tables are declared in ./schema.sql.
 */
import type { ID } from './models'
import type { Repository, TableGateway } from './repository'
import type {
  AcquisitionIntent, AetherisStandardAcceptance, BoardAdvisoryIntent, CapabilityProblem,
  CapitalProfile, ContextualReputation, DealRoom, EventPresence, ExpertiseOffer,
  HumanConciergeReview, ImportBatch, ImportProposal, IndustryIntelligenceItem, IndustryRoom, IntroducerRecord,
  KnowledgeAsset, MarketplaceListing, PassportCredential, PeerCouncil, PitchPermissionRequest,
  ProfessionalAvailability, ProfessionalBoundaryRule, ProfessionalInboxDecision,
  ProfessionalOpportunity, ProfessionalPassportProfile, ProfessionalReferral, ProofOfWorkEdge,
  ProofOfWorkNode, RelationshipVaultExport, SuggestedTeam, TransactionRecord, TravelPlan,
} from './pro-models'
import {
  seedAcquisitions, seedBoardIntents, seedBoundaries, seedCapital, seedConcierge, seedCouncils,
  seedCredentials, seedDealRooms, seedEventPresence, seedExpertise, seedImportProposals, seedImports,
  seedIndustryRooms, seedInboxDecisions, seedIntelligenceItems, seedIntroducerRecords,
  seedKnowledgeAssets, seedMarketplace, seedOpportunities, seedPassportProfiles,
  seedPitchRequests, seedProAvailability, seedProblems, seedProofEdges, seedProofNodes,
  seedReferrals, seedReputations, seedStandard, seedTeams, seedTransactions, seedTravel,
} from './pro-seed'

export interface ProCollections {
  passportProfiles: ProfessionalPassportProfile[]
  credentials: PassportCredential[]
  proofNodes: ProofOfWorkNode[]
  proofEdges: ProofOfWorkEdge[]
  reputations: ContextualReputation[]
  opportunities: ProfessionalOpportunity[]
  dealRooms: DealRoom[]
  expertise: ExpertiseOffer[]
  referrals: ProfessionalReferral[]
  introducerRecords: IntroducerRecord[]
  problems: CapabilityProblem[]
  teams: SuggestedTeam[]
  capital: CapitalProfile[]
  acquisitions: AcquisitionIntent[]
  boardIntents: BoardAdvisoryIntent[]
  industryRooms: IndustryRoom[]
  intelligence: IndustryIntelligenceItem[]
  councils: PeerCouncil[]
  eventPresence: EventPresence[]
  travel: TravelPlan[]
  proAvailability: ProfessionalAvailability[]
  pitchRequests: PitchPermissionRequest[]
  boundaries: ProfessionalBoundaryRule[]
  imports: ImportBatch[]
  importProposals: ImportProposal[]
  vaultExports: RelationshipVaultExport[]
  inboxDecisions: ProfessionalInboxDecision[]
  transactions: TransactionRecord[]
  marketplace: MarketplaceListing[]
  knowledgeAssets: KnowledgeAsset[]
  concierge: HumanConciergeReview[]
  standard: AetherisStandardAcceptance[]
}

export type ProCollectionName = keyof ProCollections

export const proTableNames: Record<ProCollectionName, string> = {
  passportProfiles: 'professional_passport_profiles',
  credentials: 'passport_credentials',
  proofNodes: 'proof_of_work_nodes',
  proofEdges: 'proof_of_work_edges',
  reputations: 'contextual_reputations',
  opportunities: 'professional_opportunities',
  dealRooms: 'deal_rooms',
  expertise: 'expertise_offers',
  referrals: 'professional_referrals',
  introducerRecords: 'introducer_records',
  problems: 'capability_problems',
  teams: 'suggested_teams',
  capital: 'capital_profiles',
  acquisitions: 'acquisition_intents',
  boardIntents: 'board_advisory_intents',
  industryRooms: 'industry_rooms',
  intelligence: 'industry_intelligence_items',
  councils: 'peer_councils',
  eventPresence: 'event_presences',
  travel: 'travel_plans',
  proAvailability: 'professional_availability',
  pitchRequests: 'pitch_permission_requests',
  boundaries: 'professional_boundary_rules',
  imports: 'import_batches',
  importProposals: 'import_proposals',
  vaultExports: 'relationship_vault_exports',
  inboxDecisions: 'professional_inbox_decisions',
  transactions: 'transaction_records',
  marketplace: 'marketplace_listings',
  knowledgeAssets: 'knowledge_assets',
  concierge: 'human_concierge_reviews',
  standard: 'aetheris_standard_acceptances',
}

export function seedProCollections(): ProCollections {
  return {
    passportProfiles: seedPassportProfiles, credentials: seedCredentials,
    proofNodes: seedProofNodes, proofEdges: seedProofEdges, reputations: seedReputations,
    opportunities: seedOpportunities, dealRooms: seedDealRooms, expertise: seedExpertise,
    referrals: seedReferrals, introducerRecords: seedIntroducerRecords, problems: seedProblems,
    teams: seedTeams, capital: seedCapital, acquisitions: seedAcquisitions,
    boardIntents: seedBoardIntents, industryRooms: seedIndustryRooms,
    intelligence: seedIntelligenceItems, councils: seedCouncils,
    eventPresence: seedEventPresence, travel: seedTravel, proAvailability: seedProAvailability,
    pitchRequests: seedPitchRequests, boundaries: seedBoundaries, imports: seedImports,
    importProposals: seedImportProposals,
    vaultExports: [], inboxDecisions: seedInboxDecisions, transactions: seedTransactions,
    marketplace: seedMarketplace, knowledgeAssets: seedKnowledgeAssets, concierge: seedConcierge,
    standard: seedStandard,
  }
}

export interface ProDataLayer {
  readonly mode: 'local' | 'remote'
  snapshot(): ProCollections
  repo<K extends ProCollectionName>(name: K): Repository<ProCollections[K][number]>
  subscribe(listener: (next: ProCollections) => void): () => void
}

const KEY = 'aetheris-pro-v1'

export function createLocalProLayer(): ProDataLayer {
  const seeded = seedProCollections()
  let state: ProCollections = (() => {
    if (typeof window === 'undefined') return seeded
    try {
      const raw = localStorage.getItem(KEY)
      if (!raw) return seeded
      const parsed = JSON.parse(raw) as Partial<ProCollections>
      const merged = { ...seeded } as ProCollections
      for (const key of Object.keys(seeded) as ProCollectionName[]) {
        const stored = parsed[key]
        if (Array.isArray(stored)) (merged[key] as unknown[]) = stored
      }
      return merged
    } catch {
      return seeded
    }
  })()

  const listeners = new Set<(next: ProCollections) => void>()
  const commit = (next: ProCollections) => {
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
    repo<K extends ProCollectionName>(name: K) {
      type T = ProCollections[K][number]
      const rows = () => state[name] as unknown as T[]
      return {
        list: async () => [...rows()],
        get: async (id: ID) => rows().find(r => r.id === id) ?? null,
        create: async (value: T) => {
          commit({ ...state, [name]: [value, ...rows()] } as ProCollections)
          return value
        },
        update: async (id: ID, p: Partial<T>) => {
          const next = rows().map(r => (r.id === id ? { ...r, ...p } : r))
          commit({ ...state, [name]: next } as ProCollections)
          return next.find(r => r.id === id)!
        },
        remove: async (id: ID) => {
          commit({ ...state, [name]: rows().filter(r => r.id !== id) } as ProCollections)
        },
      }
    },
  }
}

/** Remote adapter. Keeps the seeded snapshot until the first load resolves. */
export function createRemoteProLayer(gateway: TableGateway): ProDataLayer {
  const state = seedProCollections()
  const listeners = new Set<(next: ProCollections) => void>()
  const emit = () => listeners.forEach(l => l(state))

  void (async () => {
    for (const key of Object.keys(proTableNames) as ProCollectionName[]) {
      try {
        const rows = await gateway.select(proTableNames[key])
        ;(state[key] as unknown[]) = rows as unknown[]
      } catch { /* keep seeded rows for this collection */ }
    }
    emit()
  })()

  return {
    mode: 'remote',
    snapshot: () => state,
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener) },
    repo<K extends ProCollectionName>(name: K) {
      type T = ProCollections[K][number]
      const table = proTableNames[name]
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
        update: async (id: ID, p: Partial<T>) => {
          await gateway.update(table, id, p as Record<string, unknown>)
          const next = rows().map(r => (r.id === id ? { ...r, ...p } : r))
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

let active: ProDataLayer | null = null
/** Single entry point. Swap in `createRemoteProLayer` once a database is wired. */
export function getProDataLayer(): ProDataLayer {
  if (!active) active = createLocalProLayer()
  return active
}
