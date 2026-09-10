/**
 * Moat layer provider. CRUD over the moat collections through the repository
 * abstraction, so the preview persists locally and a database adapter can be
 * swapped in without touching any surface.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ID } from './domain/models'
import type {
  AdvisoryBoard, AdvisoryContribution, AudienceScope, ConsentLedgerEntry,
  DigitalRepresentativePolicy, KnowledgePost, KnowledgePostKind, LiveEvent, NetworkQuestion,
  OutreachQualityReview, PortableIdentity, RelationshipContextQuery, SerendipityMatch,
} from './domain/moat-models'
import { getMoatDataLayer, type MoatCollectionName, type MoatCollections } from './domain/moat-repository'
import { reviewOutreach, routeQuestion, type OutreachContext } from './domain/moat-engine'
import type { Member } from './social'

const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
const today = () => new Date().toISOString().slice(0, 10)

export interface MoatApi extends MoatCollections {
  mode: 'local' | 'remote'
  /* anti-spam */
  review(text: string, ctx: Omit<OutreachContext, 'rules'>): OutreachQualityReview
  recordReview(review: OutreachQualityReview): void
  toggleRule(id: ID): void
  /* ask my network */
  askNetwork(input: { question: string; context: string; audience: AudienceScope; circleId?: ID; members: Member[]; connections: ID[]; circleMemberIds?: ID[] }): NetworkQuestion
  answerQuestion(questionId: ID, memberId: ID, response: string): void
  closeQuestion(questionId: ID, outcome: string): void
  /* serendipity */
  setSerendipityStatus(id: ID, status: SerendipityMatch['status']): void
  addSerendipity(match: SerendipityMatch): void
  /* events */
  toggleEventPlanItem(eventId: ID, planId: ID): void
  addEventPlanItem(eventId: ID, item: { memberId: ID; why: string; opener: string; introducerId?: ID }): void
  setEventStatus(id: ID, status: LiveEvent['status']): void
  setEventVisibility(id: ID, visibility: LiveEvent['attendanceVisibility']): void
  /* gaps */
  linkGapToStrategy(gapId: ID, strategyId: ID): void
  /* portable identity */
  updateIdentity(patch: Partial<PortableIdentity>): void
  setIdentityRequest(requestId: ID, status: 'accepted' | 'declined'): void
  addIdentityRequest(input: { name: string; email: string; context: string; kind: 'connect' | 'intro' }): void
  /* consent */
  setConsentScope(id: ID, scope: ConsentLedgerEntry['scope']): void
  revokeConsent(id: ID): void
  restoreConsent(id: ID): void
  revokeShare(entryId: ID, shareId: ID): void
  /* representative */
  updateRepresentative(patch: Partial<DigitalRepresentativePolicy>): void
  logRepresentative(entry: { from: string; question: string; answer: string; permitted: boolean; handedOff: boolean }): void
  /* availability */
  useAvailability(id: ID): void
  /* knowledge */
  addKnowledge(input: { kind: KnowledgePostKind; title: string; body: string; industries: string[]; reviewId?: ID }): KnowledgePost
  toggleKnowledgeSave(id: ID): void
  toggleKnowledgeUseful(id: ID): void
  discussKnowledge(id: ID, text: string): void
  askFollowUp(id: ID, question: string): void
  /* boards */
  createBoard(input: { name: string; decision: string; context: string; memberIds: ID[] }): AdvisoryBoard
  inviteToBoard(boardId: ID, memberId: ID, expertise: string): void
  contributeToBoard(boardId: ID, contribution: Omit<AdvisoryContribution, 'id' | 'when'>): void
  recordBoardDecision(boardId: ID, record: string): void
  /* context layer */
  logContextQuery(query: RelationshipContextQuery): void
}

const Ctx = createContext<MoatApi | null>(null)

export function useMoat() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useMoat must be used inside MoatProvider')
  return ctx
}

export function MoatProvider({ children }: { children: ReactNode }) {
  const layer = useMemo(() => getMoatDataLayer(), [])
  const [state, setState] = useState<MoatCollections>(() => layer.snapshot())

  useEffect(() => layer.subscribe(next => setState({ ...next })), [layer])

  const create = useCallback(<K extends MoatCollectionName>(name: K, value: MoatCollections[K][number]) => {
    void layer.repo(name).create(value)
    return value
  }, [layer])
  const patch = useCallback(<K extends MoatCollectionName>(name: K, id: ID, value: Partial<MoatCollections[K][number]>) => {
    void layer.repo(name).update(id, value)
  }, [layer])

  const api = useMemo<MoatApi>(() => {
    const identity = state.identities[0]
    const rep = state.representatives[0]

    return {
      ...state,
      mode: layer.mode,

      review(text, ctx) {
        return reviewOutreach(text, { ...ctx, rules: state.constitution })
      },
      recordReview(review) {
        create('reviews', review)
        if (review.flags.length) {
          const ledger = state.strikes.find(s => s.memberId === review.authorId)
          const flag = review.flags[0]!.kind
          if (ledger) {
            patch('strikes', ledger.id, {
              strikes: ledger.strikes + 1, lastFlag: flag, lastFlaggedAt: today(),
              privateNote: 'Private enforcement record. Never shown to other members.',
            })
          }
        }
      },
      toggleRule(id) {
        const rule = state.constitution.find(r => r.id === id)
        if (rule) patch('constitution', id, { active: !rule.active })
      },

      askNetwork({ question, context, audience, circleId, members, connections, circleMemberIds }) {
        const { routed, logic } = routeQuestion(question, {
          members, audience, passports: state.passports,
          ...(circleMemberIds ? { circleMemberIds } : {}),
          connections,
        })
        const record: NetworkQuestion = {
          id: uid('nq'), authorId: 'me', question, context, audience,
          ...(circleId ? { circleId } : {}),
          routed, routingLogic: logic, relatedSystemIds: [],
          relatedPersonIds: routed.map(r => r.memberId), spawnedIntroIds: [],
          status: routed.length ? 'open' : 'routing', outcome: '', createdAt: today(),
        }
        return create('questions', record)
      },
      answerQuestion(questionId, memberId, response) {
        const q = state.questions.find(x => x.id === questionId)
        if (!q) return
        patch('questions', questionId, {
          status: 'answered',
          routed: q.routed.map(r => (r.memberId === memberId ? { ...r, responded: true, response, respondedAt: today() } : r)),
        })
      },
      closeQuestion(questionId, outcome) { patch('questions', questionId, { status: 'closed', outcome }) },

      setSerendipityStatus(id, status) { patch('serendipity', id, { status }) },
      addSerendipity(match) {
        if (!state.serendipity.some(m => m.memberId === match.memberId)) create('serendipity', match)
      },

      toggleEventPlanItem(eventId, planId) {
        const ev = state.events.find(e => e.id === eventId)
        if (!ev) return
        patch('events', eventId, { myPlan: ev.myPlan.map(p => (p.id === planId ? { ...p, done: !p.done } : p)) })
      },
      addEventPlanItem(eventId, item) {
        const ev = state.events.find(e => e.id === eventId)
        if (!ev) return
        patch('events', eventId, { myPlan: [...ev.myPlan, { id: uid('ep'), done: false, ...item }] })
      },
      setEventStatus(id, status) { patch('events', id, { status }) },
      setEventVisibility(id, visibility) { patch('events', id, { attendanceVisibility: visibility }) },

      linkGapToStrategy(gapId, strategyId) { patch('gaps', gapId, { strategyId }) },

      updateIdentity(p) { if (identity) patch('identities', identity.id, { ...p, updatedAt: today() }) },
      setIdentityRequest(requestId, status) {
        if (!identity) return
        patch('identities', identity.id, {
          requests: identity.requests.map(r => (r.id === requestId ? { ...r, status } : r)), updatedAt: today(),
        })
      },
      addIdentityRequest(input) {
        if (!identity) return
        patch('identities', identity.id, {
          requests: [{ id: uid('pir'), when: today(), status: 'new', ...input }, ...identity.requests], updatedAt: today(),
        })
      },

      setConsentScope(id, scope) { patch('consent', id, { scope, updatedAt: today() }) },
      revokeConsent(id) { patch('consent', id, { revoked: true, sharedWith: [], updatedAt: today() }) },
      restoreConsent(id) { patch('consent', id, { revoked: false, updatedAt: today() }) },
      revokeShare(entryId, shareId) {
        const entry = state.consent.find(e => e.id === entryId)
        if (!entry) return
        patch('consent', entryId, { sharedWith: entry.sharedWith.filter(s => s.id !== shareId), updatedAt: today() })
      },

      updateRepresentative(p) { if (rep) patch('representatives', rep.id, { ...p, updatedAt: today() }) },
      logRepresentative(entry) {
        if (!rep) return
        patch('representatives', rep.id, {
          transcript: [{ id: uid('dt'), when: today(), ...entry }, ...rep.transcript], updatedAt: today(),
        })
      },

      useAvailability(id) {
        const w = state.availability.find(x => x.id === id)
        if (w) patch('availability', id, { used: Math.min(w.maxIntroductions, w.used + 1) })
      },

      addKnowledge(input) {
        const post: KnowledgePost = {
          id: uid('kp'), authorId: 'me', circleIds: [], systemIds: [],
          whyInYourFeed: 'You wrote this. It is routed to members with a permissioned signal on the topic.',
          relevance: 80, usefulPrivately: false, saved: false, discussion: [], followUps: [],
          createdAt: today(), ...input,
        }
        return create('knowledge', post)
      },
      toggleKnowledgeSave(id) {
        const p = state.knowledge.find(x => x.id === id)
        if (p) patch('knowledge', id, { saved: !p.saved })
      },
      toggleKnowledgeUseful(id) {
        const p = state.knowledge.find(x => x.id === id)
        if (p) patch('knowledge', id, { usefulPrivately: !p.usefulPrivately })
      },
      discussKnowledge(id, text) {
        const p = state.knowledge.find(x => x.id === id)
        if (p) patch('knowledge', id, { discussion: [...p.discussion, { id: uid('kd'), authorId: 'me', text, when: today() }] })
      },
      askFollowUp(id, question) {
        const p = state.knowledge.find(x => x.id === id)
        if (p) patch('knowledge', id, { followUps: [...p.followUps, { id: uid('kf'), authorId: 'me', question, when: today() }] })
      },

      createBoard(input) {
        const board: AdvisoryBoard = {
          id: uid('ab'), ownerId: 'me', invited: [], missingExpertise: [], contributions: [],
          meetingIds: [], openLoops: [], decisionMade: false, decisionRecord: '', evidenceIds: [],
          visibility: 'private', createdAt: today(), ...input,
        }
        return create('boards', board)
      },
      inviteToBoard(boardId, memberId, expertise) {
        const b = state.boards.find(x => x.id === boardId)
        if (!b || b.invited.some(i => i.memberId === memberId)) return
        patch('boards', boardId, { invited: [...b.invited, { memberId, expertise, status: 'invited' }] })
      },
      contributeToBoard(boardId, contribution) {
        const b = state.boards.find(x => x.id === boardId)
        if (!b) return
        patch('boards', boardId, { contributions: [...b.contributions, { id: uid('ac'), when: today(), ...contribution }] })
      },
      recordBoardDecision(boardId, record) {
        patch('boards', boardId, { decisionMade: true, decisionRecord: record, decidedAt: today() })
      },

      logContextQuery(query) { create('contextQueries', query) },
    }
  }, [state, layer.mode, create, patch])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}
