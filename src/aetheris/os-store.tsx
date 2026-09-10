/**
 * Relationship OS provider. CRUD over the OS collections through the
 * repository abstraction, so the preview persists locally and a database
 * adapter can be swapped in without touching any surface.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ID } from './domain/models'
import type {
  AutopilotAction, CaptureProposal, EvidenceItem, IntroQualityReview, NetworkSimulation,
  NetworkStrategy, OpportunityCollision, OpportunityRoom, RelationshipInboxItem, RelationshipTwin,
  RoomStage, SimulationInput, StrategyStep, TrustBudgetState, VoiceMemoryCapture,
} from './domain/os-models'
import { getOSDataLayer, type OSCollectionName, type OSCollections } from './domain/os-repository'
import { runSimulation, strategyFromSimulation } from './domain/os-engine'
import type { Member } from './social'

const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
const today = () => new Date().toISOString().slice(0, 10)

export interface OSApi extends OSCollections {
  mode: 'local' | 'remote'
  /* rooms */
  createRoom(input: Partial<OpportunityRoom> & { name: string; thesis: string }): OpportunityRoom
  updateRoom(id: ID, patch: Partial<OpportunityRoom>): void
  advanceRoom(id: ID, stage: RoomStage, note?: string): void
  addToRoom(id: ID, field: 'peopleIds' | 'systemIds' | 'circleIds' | 'evidenceIds' | 'openLoopIds' | 'meetingIds', value: ID): void
  logRoomEvent(id: ID, text: string): void
  archiveRoom(id: ID): void
  /* twins */
  saveTwin(twin: RelationshipTwin): void
  /* simulations + strategies */
  simulate(input: SimulationInput, people: Member[], circleNames: Record<string, string>): NetworkSimulation
  saveSimulation(sim: NetworkSimulation): void
  createStrategyFromSimulation(sim: NetworkSimulation, people: Member[]): NetworkStrategy
  createStrategy(input: Partial<NetworkStrategy> & { goal: string }): NetworkStrategy
  updateStrategy(id: ID, patch: Partial<NetworkStrategy>): void
  toggleStrategyStep(strategyId: ID, stepId: ID): void
  addStrategyStep(strategyId: ID, step: Omit<StrategyStep, 'id' | 'done'>): void
  /* collisions */
  setCollisionStatus(id: ID, status: OpportunityCollision['status'], roomId?: ID): void
  /* trust */
  noteConnectorAsk(connectorId: ID): void
  /* intro quality */
  recordReview(review: IntroQualityReview): void
  latestReview(memberId: ID): IntroQualityReview | undefined
  /* inbox */
  completeInboxItem(id: ID): void
  snoozeInboxItem(id: ID): void
  addInboxItem(item: Partial<RelationshipInboxItem> & { title: string; kind: RelationshipInboxItem['kind'] }): void
  /* evidence */
  addEvidence(item: Partial<EvidenceItem> & { statement: string }): EvidenceItem
  /* captures */
  saveCapture(capture: VoiceMemoryCapture): void
  setProposal(captureId: ID, proposalId: ID, patch: Partial<CaptureProposal>): void
  finishCapture(captureId: ID, status: VoiceMemoryCapture['status']): void
  /* autopilot */
  setAutopilotStatus(id: ID, status: AutopilotAction['status']): void
  updateAutopilotDraft(id: ID, draft: string): void
}

const OSCtx = createContext<OSApi | null>(null)

export function useOS() {
  const ctx = useContext(OSCtx)
  if (!ctx) throw new Error('useOS must be used inside OSProvider')
  return ctx
}

export function OSProvider({ children }: { children: ReactNode }) {
  const layer = useMemo(() => getOSDataLayer(), [])
  const [state, setState] = useState<OSCollections>(() => layer.snapshot())
  const [reviews, setReviews] = useState<IntroQualityReview[]>([])

  useEffect(() => layer.subscribe(next => setState({ ...next })), [layer])

  const create = useCallback(<K extends OSCollectionName>(name: K, value: OSCollections[K][number]) => {
    void layer.repo(name).create(value)
    return value
  }, [layer])
  const patch = useCallback(<K extends OSCollectionName>(name: K, id: ID, value: Partial<OSCollections[K][number]>) => {
    void layer.repo(name).update(id, value)
  }, [layer])

  const api = useMemo<OSApi>(() => ({
    ...state,
    mode: layer.mode,

    createRoom(input) {
      const room: OpportunityRoom = {
        id: uid('room'), ownerId: 'me', peopleIds: [], systemIds: [], circleIds: [], intentIds: [],
        introIds: [], messageThreadIds: [], openLoopIds: [], meetingIds: [], evidenceIds: [],
        stage: 'Signal', valueState: 'unquantified', knownValue: '', modeledValue: '', confidence: 50,
        nextAction: 'Name the one thing that has to be true next.', blockers: [], archived: false,
        timeline: [{ id: uid('tl'), when: today(), text: 'Room opened.', stage: 'Signal' }],
        createdAt: today(), updatedAt: today(), ...input,
      }
      return create('rooms', room)
    },
    updateRoom(id, p) { patch('rooms', id, { ...p, updatedAt: today() }) },
    advanceRoom(id, stage, note) {
      const room = state.rooms.find(r => r.id === id)
      if (!room) return
      patch('rooms', id, {
        stage, updatedAt: today(),
        timeline: [{ id: uid('tl'), when: today(), text: note ?? `Moved to ${stage}.`, stage }, ...room.timeline],
      })
    },
    addToRoom(id, field, value) {
      const room = state.rooms.find(r => r.id === id)
      if (!room || room[field].includes(value)) return
      patch('rooms', id, { [field]: [...room[field], value], updatedAt: today() } as Partial<OpportunityRoom>)
    },
    logRoomEvent(id, text) {
      const room = state.rooms.find(r => r.id === id)
      if (!room) return
      patch('rooms', id, { timeline: [{ id: uid('tl'), when: today(), text }, ...room.timeline], updatedAt: today() })
    },
    archiveRoom(id) { patch('rooms', id, { archived: true, updatedAt: today() }) },

    saveTwin(twin) {
      if (state.twins.some(t => t.id === twin.id)) patch('twins', twin.id, twin)
      else create('twins', twin)
    },

    simulate(input, people, circleNames) {
      return runSimulation(input, { people, budgets: state.trustBudgets, circleNames })
    },
    saveSimulation(sim) {
      if (state.simulations.some(s => s.id === sim.id)) patch('simulations', sim.id, sim)
      else create('simulations', sim)
    },
    createStrategyFromSimulation(sim, people) {
      const strategy = strategyFromSimulation(sim, people)
      create('strategies', strategy)
      if (state.simulations.some(s => s.id === sim.id)) patch('simulations', sim.id, { savedAsStrategyId: strategy.id })
      else create('simulations', { ...sim, savedAsStrategyId: strategy.id })
      return strategy
    },
    createStrategy(input) {
      const strategy: NetworkStrategy = {
        id: uid('strat'), ownerId: 'me', relationshipType: '', industry: '', geography: '',
        targetCount: 5, horizon: '', systemIds: [], preferredCircleIds: [], constraints: [],
        progressPersonIds: [], gaps: [], strongestPaths: [], nextMoves: [], visibility: 'private',
        createdAt: today(), updatedAt: today(), ...input,
      }
      return create('strategies', strategy)
    },
    updateStrategy(id, p) { patch('strategies', id, { ...p, updatedAt: today() }) },
    toggleStrategyStep(strategyId, stepId) {
      const s = state.strategies.find(x => x.id === strategyId)
      if (!s) return
      patch('strategies', strategyId, {
        nextMoves: s.nextMoves.map(m => (m.id === stepId ? { ...m, done: !m.done } : m)), updatedAt: today(),
      })
    },
    addStrategyStep(strategyId, step) {
      const s = state.strategies.find(x => x.id === strategyId)
      if (!s) return
      patch('strategies', strategyId, { nextMoves: [...s.nextMoves, { ...step, id: uid('sm'), done: false }], updatedAt: today() })
    },

    setCollisionStatus(id, status, roomId) {
      patch('collisions', id, roomId ? { status, roomId } : { status })
    },

    noteConnectorAsk(connectorId) {
      const b = state.trustBudgets.find(x => x.connectorId === connectorId)
      if (!b) return
      const requestsThisMonth = b.requestsThisMonth + 1
      const health: TrustBudgetState['health'] = requestsThisMonth >= 3 ? 'strained' : requestsThisMonth === 2 ? 'watch' : b.health
      patch('trustBudgets', b.id, {
        requestsThisMonth, lastAskDaysAgo: 0, health, updatedAt: today(),
        guidance: health === 'strained'
          ? `${b.connectorName} has carried ${requestsThisMonth} asks this month. Give something before asking again.`
          : b.guidance,
      })
    },

    recordReview(review) { setReviews(prev => [review, ...prev.filter(r => r.memberId !== review.memberId)]) },
    latestReview(memberId) { return reviews.find(r => r.memberId === memberId) },

    completeInboxItem(id) { patch('inbox', id, { status: 'done' }) },
    snoozeInboxItem(id) { patch('inbox', id, { status: 'snoozed' }) },
    addInboxItem(item) {
      create('inbox', {
        id: uid('inb'), ownerId: 'me', whyThisMatters: '', whyNow: '', nextMove: '', lanes: ['This Week'],
        priority: 60, evidenceIds: [], status: 'open', createdAt: today(), ...item,
      } as RelationshipInboxItem)
    },

    addEvidence(item) {
      return create('evidence', {
        id: uid('ev'), category: 'Observed', sourceType: 'explicit', sourceLabel: 'Your capture',
        date: today(), confidence: 70, scope: 'private', shareable: false, ...item,
      } as EvidenceItem)
    },

    saveCapture(capture) { create('captures', capture) },
    setProposal(captureId, proposalId, p) {
      const c = state.captures.find(x => x.id === captureId)
      if (!c) return
      patch('captures', captureId, {
        proposals: c.proposals.map(pr => (pr.id === proposalId ? { ...pr, ...p } : pr)),
      })
    },
    finishCapture(captureId, status) { patch('captures', captureId, { status }) },

    setAutopilotStatus(id, status) { patch('autopilot', id, { status }) },
    updateAutopilotDraft(id, draft) { patch('autopilot', id, { draft }) },
  }), [state, layer.mode, create, patch, reviews])

  return <OSCtx.Provider value={api}>{children}</OSCtx.Provider>
}
