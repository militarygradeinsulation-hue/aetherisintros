/**
 * Platform state: systems, placements, circles, intents, handshakes, capsules,
 * open loops, triggers, scheduling, meetings and outcomes.
 *
 * UI never touches storage directly — every mutation goes through a repository
 * on the active data layer, so the same actions work against Postgres later.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type {
  AvailabilityWindow, Circle, ContextCapsule, DigitalHandshake, IntentCard,
  MeetingContinuity, OpenLoop, Outcome, Placement, PlacementStage, SystemRecord,
} from './domain/models'
import type { Collections } from './domain/repository'
import { getDataLayer } from './domain/repository'

export type { Collections }

const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
const today = () => new Date().toISOString().slice(0, 10)
const plusDays = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

export interface PlatformApi extends Collections {
  mode: 'local' | 'remote'
  /* systems */
  createSystem: (draft: Partial<SystemRecord> & { name: string; thesis: string }) => string
  updateSystem: (id: string, patch: Partial<SystemRecord>) => void
  archiveSystem: (id: string) => void
  /* placements */
  startPlacement: (systemId: string, target: { type: 'person' | 'circle'; id: string; label: string }, detail: Partial<Placement>) => string
  advancePlacement: (id: string, stage: PlacementStage, note: string) => void
  /* circles */
  joinCircle: (id: string) => void
  leaveCircle: (id: string) => void
  postCircleMessage: (id: string, text: string) => void
  shareSystemWithCircle: (circleId: string, systemId: string) => void
  setCirclePurpose: (id: string, status: Circle['purposeStatus']) => void
  createCircle: (draft: { name: string; purpose: string; description: string; sharedIntents: string[] }) => string
  /* intents */
  createIntent: (draft: Omit<IntentCard, 'id' | 'memberId' | 'status' | 'startsAt' | 'expiresAt'> & { expiresAt?: string }) => string
  expireIntent: (id: string) => void
  reactivateIntent: (id: string) => void
  /* handshake + capsule */
  saveHandshake: (h: DigitalHandshake) => void
  approveHandshake: (id: string, side: 'a' | 'b') => void
  saveCapsule: (c: ContextCapsule) => void
  toggleCapsuleItem: (capsuleId: string, itemId: string) => void
  /* loops */
  createLoop: (draft: Omit<OpenLoop, 'id' | 'createdAt' | 'status'>) => void
  completeLoop: (id: string) => void
  snoozeLoop: (id: string) => void
  reopenLoop: (id: string) => void
  /* triggers */
  actOnTrigger: (id: string) => void
  dismissTrigger: (id: string) => void
  /* scheduling + meetings */
  bookSlot: (slotId: string, purpose: string, capsuleId?: string) => void
  releaseSlot: (slotId: string) => void
  addAvailability: (draft: Omit<AvailabilityWindow, 'id'>) => void
  closeMeetingLoop: (id: string, after: NonNullable<MeetingContinuity['after']>) => void
  createMeeting: (draft: Omit<MeetingContinuity, 'id' | 'closed'>) => string
  /* outcomes */
  recordOutcome: (draft: Omit<Outcome, 'id' | 'createdAt'>) => void
}

const Ctx = createContext<PlatformApi | null>(null)

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const layer = useMemo(() => getDataLayer(), [])
  const [data, setData] = useState<Collections>(() => layer.snapshot())

  useEffect(() => layer.subscribe(next => setData({ ...next })), [layer])

  const write = useCallback(<K extends keyof Collections>(name: K) => layer.repo(name), [layer])

  const api = useMemo<PlatformApi>(() => {
    const systems = write('systems')
    const placements = write('placements')
    const circles = write('circles')
    const intents = write('intents')
    const handshakes = write('handshakes')
    const capsules = write('capsules')
    const loops = write('loops')
    const triggers = write('triggers')
    const availability = write('availability')
    const meetings = write('meetings')
    const outcomes = write('outcomes')

    return {
      ...data,
      mode: layer.mode,

      createSystem: draft => {
        const id = uid('sys')
        const record: SystemRecord = {
          id, name: draft.name, ownerId: 'me', thesis: draft.thesis,
          category: draft.category ?? 'Product', description: draft.description ?? draft.thesis,
          bestFitCompanies: draft.bestFitCompanies ?? [], bestFitRoles: draft.bestFitRoles ?? [],
          industries: draft.industries ?? [], geography: draft.geography ?? 'US',
          proof: draft.proof ?? [], placementGoal: draft.placementGoal ?? 'Place with two credible first adopters.',
          targetPlacements: draft.targetPlacements ?? 3, activePlacements: 0, adoptionCount: 0, referralCount: 0,
          valueProposition: draft.valueProposition ?? draft.thesis, evidence: draft.evidence ?? [],
          expectedFriction: draft.expectedFriction ?? 'Unproven with this audience. Lead with evidence, not method.',
          whoBenefits: draft.whoBenefits ?? 'People accountable for the outcome this affects.',
          status: 'active', visibility: draft.visibility ?? 'network', createdAt: today(), updatedAt: today(),
        }
        void systems.create(record)
        return id
      },
      updateSystem: (id, patch) => { void systems.update(id, { ...patch, updatedAt: today() }) },
      archiveSystem: id => { void systems.update(id, { status: 'archived', updatedAt: today() }) },

      startPlacement: (systemId, target, detail) => {
        const id = uid('pl')
        const record: Placement = {
          id, systemId, targetType: target.type, targetId: target.id, targetLabel: target.label,
          stage: 'Identified', fitScore: detail.fitScore ?? 60, circleRelevance: detail.circleRelevance ?? 50,
          timingScore: detail.timingScore ?? 50, mutualValue: detail.mutualValue ?? '',
          trustPath: detail.trustPath ?? ['You', target.label], friction: detail.friction ?? '',
          expectedOutcome: detail.expectedOutcome ?? '', reasonFit: detail.reasonFit ?? '',
          reasonNow: detail.reasonNow ?? '', nextStep: detail.nextStep ?? '', unknowns: detail.unknowns ?? [],
          provenance: detail.provenance ?? { sourceType: 'derived', confidence: 60, evidenceIds: [], scope: 'private' },
          history: [{ stage: 'Identified', when: today(), note: 'Placement started from the placement engine.' }],
          createdAt: today(), updatedAt: today(),
        }
        void placements.create(record)
        const system = data.systems.find(s => s.id === systemId)
        if (system) void systems.update(systemId, { activePlacements: system.activePlacements + 1, status: 'placing', updatedAt: today() })
        return id
      },
      advancePlacement: (id, stage, note) => {
        const current = data.placements.find(p => p.id === id)
        if (!current) return
        void placements.update(id, {
          stage, updatedAt: today(),
          history: [...current.history, { stage, when: today(), note }],
        })
        const system = data.systems.find(s => s.id === current.systemId)
        if (system && stage === 'Adopted') void systems.update(system.id, { adoptionCount: system.adoptionCount + 1, updatedAt: today() })
        if (system && stage === 'Referred') void systems.update(system.id, { referralCount: system.referralCount + 1, updatedAt: today() })
      },

      joinCircle: id => {
        const circle = data.circles.find(c => c.id === id)
        if (!circle || circle.memberIds.includes('me')) return
        void circles.update(id, { memberIds: [...circle.memberIds, 'me'] })
      },
      leaveCircle: id => {
        const circle = data.circles.find(c => c.id === id)
        if (!circle) return
        void circles.update(id, { memberIds: circle.memberIds.filter(m => m !== 'me') })
      },
      postCircleMessage: (id, text) => {
        const circle = data.circles.find(c => c.id === id)
        if (!circle) return
        void circles.update(id, { discussion: [{ id: uid('d'), authorId: 'me', text, when: 'Just now' }, ...circle.discussion] })
      },
      shareSystemWithCircle: (circleId, systemId) => {
        const circle = data.circles.find(c => c.id === circleId)
        if (!circle || circle.activeSystemIds.includes(systemId)) return
        void circles.update(circleId, { activeSystemIds: [...circle.activeSystemIds, systemId] })
      },
      setCirclePurpose: (id, purposeStatus) => { void circles.update(id, { purposeStatus }) },
      createCircle: draft => {
        const id = uid('cir')
        const record: Circle = {
          id, name: draft.name, purpose: draft.purpose, description: draft.description,
          memberIds: ['me'], rolesRepresented: [], sharedIntents: draft.sharedIntents,
          activeSystemIds: [], openIntroCount: 0, opportunities: [], eventIds: [],
          relevanceScore: 70, ownerId: 'me', moderatorIds: ['me'], visibility: 'network',
          purposeStatus: 'active', health: 'New room. Purpose is stated; substance comes next.',
          discussion: [], createdAt: today(),
        }
        void circles.create(record)
        return id
      },

      createIntent: draft => {
        const id = uid('int')
        const record: IntentCard = {
          ...draft, id, memberId: 'me', status: 'active', startsAt: today(),
          expiresAt: draft.expiresAt ?? plusDays(30),
        }
        void intents.create(record)
        return id
      },
      expireIntent: id => { void intents.update(id, { status: 'expired' }) },
      reactivateIntent: id => { void intents.update(id, { status: 'active', expiresAt: plusDays(30) }) },

      saveHandshake: h => {
        const existing = data.handshakes.find(x => x.id === h.id)
        if (existing) void handshakes.update(h.id, h)
        else void handshakes.create(h)
      },
      approveHandshake: (id, side) => { void handshakes.update(id, side === 'a' ? { aApproved: true } : { bApproved: true }) },
      saveCapsule: c => {
        const existing = data.capsules.find(x => x.id === c.id)
        if (existing) void capsules.update(c.id, c)
        else void capsules.create(c)
      },
      toggleCapsuleItem: (capsuleId, itemId) => {
        const capsule = data.capsules.find(c => c.id === capsuleId)
        if (!capsule) return
        void capsules.update(capsuleId, {
          items: capsule.items.map(i => (i.id === itemId ? { ...i, shared: !i.shared } : i)),
        })
      },

      createLoop: draft => { void loops.create({ ...draft, id: uid('ol'), status: 'open', createdAt: today() }) },
      completeLoop: id => { void loops.update(id, { status: 'complete' }) },
      snoozeLoop: id => { void loops.update(id, { status: 'snoozed' }) },
      reopenLoop: id => { void loops.update(id, { status: 'open' }) },

      actOnTrigger: id => { void triggers.update(id, { status: 'acted' }) },
      dismissTrigger: id => { void triggers.update(id, { status: 'dismissed' }) },

      bookSlot: (slotId, purpose, capsuleId) => {
        void availability.update(slotId, { bookedBy: 'me', meetingPurpose: purpose, ...(capsuleId ? { capsuleId } : {}) })
      },
      releaseSlot: slotId => { void availability.update(slotId, { bookedBy: undefined, meetingPurpose: undefined } as Partial<AvailabilityWindow>) },
      addAvailability: draft => { void availability.create({ ...draft, id: uid('av') }) },
      closeMeetingLoop: (id, after) => { void meetings.update(id, { closed: true, after }) },
      createMeeting: draft => {
        const id = uid('mt')
        void meetings.create({ ...draft, id, closed: false })
        return id
      },

      recordOutcome: draft => { void outcomes.create({ ...draft, id: uid('out'), createdAt: today() }) },
    }
  }, [data, layer.mode, write])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function usePlatform() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('usePlatform must be used inside PlatformProvider')
  return ctx
}

