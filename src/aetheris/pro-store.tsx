/**
 * Professional-layer provider. All CRUD goes through the repository
 * abstraction, so the preview persists locally and a database adapter can be
 * swapped in without touching any surface.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ID } from './domain/models'
import type {
  AcquisitionIntent, CapabilityProblem, ContextualReputation, DealRoom, DealStage,
  ExpertiseOffer, ImportBatch, IndustryIntelligenceItem, KnowledgeAsset, PitchDecision,
  ProfessionalAvailability, ProfessionalInboxDecision, ProfessionalOpportunity,
  ProfessionalReferral, RelationshipVaultExport, SuggestedTeam, TransactionRecord,
} from './domain/pro-models'
import { getProDataLayer, type ProCollectionName, type ProCollections } from './domain/pro-repository'
import {
  buildTeam, checkBoundaries, composeBriefing, proofGraphFor, rankMarketplace, readCredibility,
  reputationsFor, scoreExpertise, scoreOpportunity, toCsv, universalSearch,
  type BoundaryVerdict, type SearchCorpusItem,
} from './domain/pro-engine'
import type { Member } from './social'
import { contactExportIsDenied } from '@/lib/contact-export'

const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
const today = () => new Date().toISOString().slice(0, 10)
const ahead = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export interface ProApi extends ProCollections {
  mode: 'local' | 'remote'

  /* identity + proof */
  credibility(memberId: ID): ReturnType<typeof readCredibility>
  proofGraph(memberId: ID): ReturnType<typeof proofGraphFor>
  reputationFor(memberId: ID): ContextualReputation[]
  setFieldScope(memberId: ID, field: string, scope: 'private' | 'team' | 'organization' | 'shareable' | 'public'): void

  /* opportunity exchange */
  rankOpportunities(ctx: { industries: string[]; expertise: string[]; connections: ID[] }): Array<{ opportunity: ProfessionalOpportunity; fit: ReturnType<typeof scoreOpportunity> }>
  postOpportunity(input: Partial<ProfessionalOpportunity> & { title: string; objective: string }): ProfessionalOpportunity
  expressInterest(id: ID, note: string, state?: 'interested' | 'question' | 'warm-path'): void
  askOpportunityQuestion(id: ID, question: string): void
  answerOpportunityQuestion(oppId: ID, questionId: ID, answer: string): void
  toggleOpportunitySave(id: ID): void
  renewOpportunity(id: ID, days?: number): void
  convertToDealRoom(id: ID): DealRoom | undefined

  /* deal rooms */
  setDealStage(id: ID, stage: DealStage): void
  toggleDealMilestone(roomId: ID, milestoneId: ID): void
  toggleDealLoop(roomId: ID, loopId: ID): void
  answerDiligence(roomId: ID, questionId: ID, answer: string): void
  recordDealDecision(roomId: ID, record: string): void
  setDealNextAction(roomId: ID, next: string): void
  addTransaction(input: Omit<TransactionRecord, 'id' | 'createdAt'>): TransactionRecord
  setSignatureState(id: ID, state: TransactionRecord['signatureState'], note?: string): void

  /* expertise + referrals */
  matchExpertise(need: string): Array<{ offer: ExpertiseOffer; fit: ReturnType<typeof scoreExpertise> }>
  requestExpertise(id: ID, context: string): void
  setExpertiseRequestState(offerId: ID, requestId: ID, state: 'requested' | 'scheduled' | 'answered' | 'declined'): void
  toggleExpertiseSave(id: ID): void
  publishExpertise(input: Partial<ExpertiseOffer> & { topic: string; offer: string }): ExpertiseOffer
  giveReferral(input: { refereeId: ID; category: ProfessionalReferral['category']; context: string; evidence: string; relationshipBasis: string; strength?: ProfessionalReferral['strength']; shareable?: boolean }): ProfessionalReferral
  toggleReferralShareable(id: ID): void

  /* talent + teams */
  postProblem(input: Partial<CapabilityProblem> & { title: string; problem: string }): CapabilityProblem
  suggestTeam(problemId: ID, ctx: { members: Member[]; connections: ID[] }): SuggestedTeam | undefined
  saveTeam(team: SuggestedTeam): SuggestedTeam
  inviteToTeam(teamId: ID, memberId: ID): void

  /* capital + acquisition + board */
  updateCapital(id: ID, patch: Partial<ProCollections['capital'][number]>): void
  setAcquisitionInterest(id: ID, level: AcquisitionIntent['interestLevel']): void
  revealAcquisitionIdentity(id: ID): void
  approveAcquisitionStep(id: ID): void
  setBoardOpenness(id: ID, openness: 'Open' | 'Selective' | 'Closed'): void

  /* rooms, councils, intelligence */
  toggleRoom(id: ID): void
  postIntelligence(input: Omit<IndustryIntelligenceItem, 'id' | 'when' | 'authorId'>): void
  toggleCouncil(id: ID): void
  askCouncil(councilId: ID, question: string): void
  respondToCouncil(councilId: ID, questionId: ID, text: string): void
  recordCouncilDecision(councilId: ID, record: string): void

  /* presence */
  setEventOptIn(id: ID, optedIn: boolean): void
  setEventMeetingState(eventId: ID, meetingId: ID, state: 'suggested' | 'requested' | 'confirmed' | 'met'): void
  toggleEventFollowUp(eventId: ID, followUpId: ID): void
  setTravelVisible(id: ID, visible: boolean): void
  setTravelPlanState(travelId: ID, planId: ID, state: 'suggested' | 'requested' | 'confirmed'): void
  setAvailabilityActive(id: ID, active: boolean): void
  publishAvailability(input: Partial<ProfessionalAvailability> & { status: string; detail: string }): ProfessionalAvailability

  /* permission + boundaries */
  boundaryCheck(category: string, ctx: { recipientId: ID; warmPath: boolean }): BoundaryVerdict
  requestPermission(input: { recipientId: ID; category: string; reason: string; whyRelevant: string; valueToRecipient: string; whyNow: string; warmPath?: string; evidence: string[] }): void
  decidePermission(id: ID, decision: PitchDecision, note?: string): void
  toggleBoundary(id: ID): void
  addBoundary(input: { label: string; category: string; action: 'block' | 'require-permission' | 'reroute'; explanation: string; rerouteTo?: string }): void

  /* search, imports, vault */
  search(query: string, corpus: SearchCorpusItem[]): ReturnType<typeof universalSearch>
  setImportState(id: ID, state: ImportBatch['state']): void
  setProposalAccepted(id: ID, accepted: boolean): void
  commitImport(batchId: ID): { accepted: number; skipped: number }
  removeImportSource(batchId: ID): void
  exportVault(input: { scope: RelationshipVaultExport['scope']; format: 'json' | 'csv'; includes: string[]; rows: Array<Record<string, unknown>> }): Promise<{ record: RelationshipVaultExport; content: string } | null>

  /* inbox + briefing */
  setDecisionState(id: ID, state: ProfessionalInboxDecision['state']): void
  briefing(ctx: Parameters<typeof composeBriefing>[0]): ReturnType<typeof composeBriefing>

  /* marketplace + knowledge + concierge + standard */
  marketplaceRanked(ctx: { connections: ID[]; need?: string }): ReturnType<typeof rankMarketplace>
  publishKnowledge(input: Partial<KnowledgeAsset> & { title: string; summary: string; body: string }): KnowledgeAsset
  reviseKnowledge(id: ID, note: string, body?: string): void
  setConciergeState(id: ID, state: ProCollections['concierge'][number]['state'], note?: string): void
  acceptStandard(accepted: boolean): void
}

const Ctx = createContext<ProApi | null>(null)

export function usePro() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('usePro must be used inside ProProvider')
  return ctx
}

export function ProProvider({ children }: { children: ReactNode }) {
  const layer = useMemo(() => getProDataLayer(), [])
  const [state, setState] = useState<ProCollections>(() => layer.snapshot())

  useEffect(() => layer.subscribe(next => setState({ ...next })), [layer])

  const create = useCallback(<K extends ProCollectionName>(name: K, value: ProCollections[K][number]) => {
    void layer.repo(name).create(value)
    return value
  }, [layer])
  const patch = useCallback(<K extends ProCollectionName>(name: K, id: ID, value: Partial<ProCollections[K][number]>) => {
    void layer.repo(name).update(id, value)
  }, [layer])

  const api = useMemo<ProApi>(() => ({
    ...state,
    mode: layer.mode,

    credibility(memberId) {
      return readCredibility(
        state.passportProfiles.find(p => p.memberId === memberId),
        state.credentials.filter(c => c.memberId === memberId),
        state.proofNodes.filter(n => n.memberIds.includes(memberId)),
      )
    },
    proofGraph(memberId) { return proofGraphFor(memberId, state.proofNodes, state.proofEdges) },
    reputationFor(memberId) { return reputationsFor(memberId, state.reputations, memberId === 'me') },
    setFieldScope(memberId, field, scope) {
      const p = state.passportProfiles.find(x => x.memberId === memberId)
      if (p) patch('passportProfiles', p.id, { fieldScopes: { ...p.fieldScopes, [field]: scope }, updatedAt: today() })
    },

    rankOpportunities(ctx) {
      return state.opportunities
        .map(opportunity => ({
          opportunity,
          fit: scoreOpportunity(opportunity, {
            me: { industries: ctx.industries, expertise: ctx.expertise },
            connections: ctx.connections,
            reputations: state.reputations.filter(r => r.memberId === 'me'),
          }),
        }))
        .sort((a, b) => b.fit.score - a.fit.score)
    },
    postOpportunity(input) {
      const record: ProfessionalOpportunity = {
        id: uid('op'), ownerId: 'me', kind: 'Partnership', whoItIsFor: '', qualification: [],
        whatIsNeeded: '', whatIsOffered: '', mutualValue: '', whyNow: '', expiresOn: ahead(30),
        visibility: 'network', confidential: false, personIds: [], systemIds: [], circleIds: [],
        evidence: [], interest: [], questions: [], saved: false, status: 'open', createdAt: today(),
        ...input,
      }
      return create('opportunities', record)
    },
    expressInterest(id, note, state_ = 'interested') {
      const o = state.opportunities.find(x => x.id === id)
      if (!o) return
      patch('opportunities', id, {
        interest: [...o.interest, { memberId: 'me', note, when: today(), state: state_ }],
        status: o.status === 'open' ? 'in-conversation' : o.status,
      })
    },
    askOpportunityQuestion(id, question) {
      const o = state.opportunities.find(x => x.id === id)
      if (!o) return
      patch('opportunities', id, { questions: [...o.questions, { id: uid('oq'), memberId: 'me', question, when: today() }] })
    },
    answerOpportunityQuestion(oppId, questionId, answer) {
      const o = state.opportunities.find(x => x.id === oppId)
      if (!o) return
      patch('opportunities', oppId, { questions: o.questions.map(q => (q.id === questionId ? { ...q, answer } : q)) })
    },
    toggleOpportunitySave(id) {
      const o = state.opportunities.find(x => x.id === id)
      if (o) patch('opportunities', id, { saved: !o.saved })
    },
    renewOpportunity(id, days = 30) {
      patch('opportunities', id, { expiresOn: ahead(days), status: 'open' })
    },
    convertToDealRoom(id) {
      const o = state.opportunities.find(x => x.id === id)
      if (!o) return undefined
      if (o.dealRoomId) return state.dealRooms.find(r => r.id === o.dealRoomId)
      const room: DealRoom = {
        id: uid('dr'), name: o.title, opportunityId: o.id, stage: 'Evaluating',
        partyIds: ['me', o.ownerId, ...o.personIds].filter((v, i, a) => a.indexOf(v) === i),
        companyIds: o.companyId ? [o.companyId] : [], originatingPath: 'Opened from the opportunity exchange.',
        systemIds: o.systemIds, threadIds: [], meetingIds: [], files: [], evidenceIds: [],
        diligence: o.qualification.map(q => ({ id: uid('dq'), question: q, owner: 'Both parties', state: 'open' as const })),
        openLoops: [{ id: uid('dl'), label: 'Agree what a good outcome looks like for both sides', done: false }],
        decisions: [], permissions: [], milestones: [], transactionIds: [],
        nextAction: 'Confirm the objective in writing before anything else moves.',
        valueState: 'modeled', outcome: '', privateNote: 'Private to the parties in this room.',
        createdAt: today(),
      }
      create('dealRooms', room)
      patch('opportunities', id, { dealRoomId: room.id, status: 'deal-room' })
      return room
    },

    setDealStage(id, stage) { patch('dealRooms', id, { stage }) },
    toggleDealMilestone(roomId, milestoneId) {
      const r = state.dealRooms.find(x => x.id === roomId)
      if (r) patch('dealRooms', roomId, { milestones: r.milestones.map(m => (m.id === milestoneId ? { ...m, done: !m.done } : m)) })
    },
    toggleDealLoop(roomId, loopId) {
      const r = state.dealRooms.find(x => x.id === roomId)
      if (r) patch('dealRooms', roomId, { openLoops: r.openLoops.map(l => (l.id === loopId ? { ...l, done: !l.done } : l)) })
    },
    answerDiligence(roomId, questionId, answer) {
      const r = state.dealRooms.find(x => x.id === roomId)
      if (r) patch('dealRooms', roomId, { diligence: r.diligence.map(q => (q.id === questionId ? { ...q, answer, state: 'answered' as const } : q)) })
    },
    recordDealDecision(roomId, record) {
      const r = state.dealRooms.find(x => x.id === roomId)
      if (r) patch('dealRooms', roomId, { decisions: [...r.decisions, { id: uid('dd'), record, when: today(), by: 'You' }] })
    },
    setDealNextAction(roomId, next) { patch('dealRooms', roomId, { nextAction: next }) },
    addTransaction(input) {
      const record: TransactionRecord = { id: uid('tx'), createdAt: today(), ...input }
      create('transactions', record)
      if (input.dealRoomId) {
        const r = state.dealRooms.find(x => x.id === input.dealRoomId)
        if (r) patch('dealRooms', r.id, { transactionIds: [...r.transactionIds, record.id] })
      }
      return record
    },
    setSignatureState(id, signatureState, note) {
      patch('transactions', id, { signatureState, ...(note ? { signatureNote: note } : {}) })
    },

    matchExpertise(need) {
      return state.expertise
        .map(offer => ({ offer, fit: scoreExpertise(offer, need) }))
        .sort((a, b) => b.fit.score - a.fit.score)
    },
    requestExpertise(id, context) {
      const o = state.expertise.find(x => x.id === id)
      if (o) patch('expertise', id, { requests: [...o.requests, { id: uid('er'), memberId: 'me', context, state: 'requested' as const, when: today() }] })
    },
    setExpertiseRequestState(offerId, requestId, reqState) {
      const o = state.expertise.find(x => x.id === offerId)
      if (o) patch('expertise', offerId, { requests: o.requests.map(r => (r.id === requestId ? { ...r, state: reqState } : r)) })
    },
    toggleExpertiseSave(id) {
      const o = state.expertise.find(x => x.id === id)
      if (o) patch('expertise', id, { saved: !o.saved })
    },
    publishExpertise(input) {
      const record: ExpertiseOffer = {
        id: uid('ex'), memberId: 'me', audience: 'Members with a specific, bounded question',
        format: '30 minute call', availability: 'Two slots a week', durationMinutes: 30,
        constraints: 'No sales conversations. Bring the specific question.', terms: 'Free',
        proofNodeIds: [], industries: [], geography: 'Remote', visibility: 'network',
        expiresOn: ahead(60), requests: [], saved: false, createdAt: today(),
        ...input,
      }
      return create('expertise', record)
    },
    giveReferral(input) {
      const record: ProfessionalReferral = {
        id: uid('rf'), referrerId: 'me', strength: 'Confident', when: today(),
        reconfirmBy: ahead(365), scope: 'shareable', shareable: true, ...input,
      }
      return create('referrals', record)
    },
    toggleReferralShareable(id) {
      const r = state.referrals.find(x => x.id === id)
      if (r) patch('referrals', id, { shareable: !r.shareable })
    },

    postProblem(input) {
      const record: CapabilityProblem = {
        id: uid('cp'), ownerId: 'me', confidentialCompany: false, kind: 'Problem to solve',
        whyItMatters: '', whatGoodLooksLike: '', constraints: '', paths: ['Operator', 'Advisor'],
        industries: [], geography: 'Remote', visibility: 'network', systemIds: [],
        status: 'open', createdAt: today(), ...input,
      }
      return create('problems', record)
    },
    suggestTeam(problemId, ctx) {
      const problem = state.problems.find(p => p.id === problemId)
      if (!problem) return undefined
      return buildTeam(problem, {
        members: ctx.members, reputations: state.reputations, proofs: state.proofNodes,
        availability: state.proAvailability, referrals: state.referrals, connections: ctx.connections,
      })
    },
    saveTeam(team) { return create('teams', { ...team, saved: true }) },
    inviteToTeam(teamId, memberId) {
      const t = state.teams.find(x => x.id === teamId)
      if (t && !t.invited.includes(memberId)) patch('teams', teamId, { invited: [...t.invited, memberId] })
    },

    updateCapital(id, p) { patch('capital', id, p) },
    setAcquisitionInterest(id, interestLevel) { patch('acquisitions', id, { interestLevel }) },
    revealAcquisitionIdentity(id) { patch('acquisitions', id, { identityRevealed: true }) },
    approveAcquisitionStep(id) {
      const a = state.acquisitions.find(x => x.id === id)
      if (a) patch('acquisitions', id, { approvals: [...a.approvals, { memberId: 'me', approved: true, when: today() }] })
    },
    setBoardOpenness(id, openness) { patch('boardIntents', id, { openness }) },

    toggleRoom(id) {
      const r = state.industryRooms.find(x => x.id === id)
      if (r) patch('industryRooms', id, { joined: !r.joined, memberIds: r.joined ? r.memberIds.filter(m => m !== 'me') : [...r.memberIds, 'me'] })
    },
    postIntelligence(input) {
      create('intelligence', { id: uid('ii'), authorId: 'me', when: today(), ...input })
    },
    toggleCouncil(id) {
      const c = state.councils.find(x => x.id === id)
      if (c) patch('councils', id, { joined: !c.joined })
    },
    askCouncil(councilId, question) {
      const c = state.councils.find(x => x.id === councilId)
      if (c) patch('councils', councilId, { sharedQuestions: [...c.sharedQuestions, { id: uid('cq'), memberId: 'me', question, when: today(), responses: [] }] })
    },
    respondToCouncil(councilId, questionId, text) {
      const c = state.councils.find(x => x.id === councilId)
      if (c) patch('councils', councilId, {
        sharedQuestions: c.sharedQuestions.map(q => (q.id === questionId ? { ...q, responses: [...q.responses, { memberId: 'me', text }] } : q)),
      })
    },
    recordCouncilDecision(councilId, record) {
      const c = state.councils.find(x => x.id === councilId)
      if (c) patch('councils', councilId, { decisions: [...c.decisions, { id: uid('cd'), record, when: today() }] })
    },

    setEventOptIn(id, optedIn) { patch('eventPresence', id, { optedIn }) },
    setEventMeetingState(eventId, meetingId, meetingState) {
      const e = state.eventPresence.find(x => x.id === eventId)
      if (e) patch('eventPresence', eventId, { meetings: e.meetings.map(m => (m.id === meetingId ? { ...m, state: meetingState } : m)) })
    },
    toggleEventFollowUp(eventId, followUpId) {
      const e = state.eventPresence.find(x => x.id === eventId)
      if (e) patch('eventPresence', eventId, { followUps: e.followUps.map(f => (f.id === followUpId ? { ...f, done: !f.done } : f)) })
    },
    setTravelVisible(id, visible) { patch('travel', id, { visible }) },
    setTravelPlanState(travelId, planId, planState) {
      const t = state.travel.find(x => x.id === travelId)
      if (t) patch('travel', travelId, { plan: t.plan.map(p => (p.id === planId ? { ...p, state: planState } : p)) })
    },
    setAvailabilityActive(id, active) { patch('proAvailability', id, { active }) },
    publishAvailability(input) {
      const record: ProfessionalAvailability = {
        id: uid('av'), memberId: 'me', from: today(), visibility: 'network',
        audienceConstraint: 'Members with a warm path or shared context',
        influencesMatching: true, active: true, ...input,
      }
      return create('proAvailability', record)
    },

    boundaryCheck(category, ctx) {
      return checkBoundaries(category, {
        recipientId: ctx.recipientId, rules: state.boundaries,
        warmPath: ctx.warmPath, availability: state.proAvailability,
      })
    },
    requestPermission(input) {
      create('pitchRequests', {
        id: uid('pp'), requesterId: 'me', decision: 'pending', createdAt: today(), ...input,
      })
    },
    decidePermission(id, decision, note) {
      patch('pitchRequests', id, {
        decision, decidedAt: today(),
        ...(decision === 'not-now' && note ? { revisitTrigger: note } : {}),
        ...(decision === 'refer' && note ? { referredTo: note } : {}),
      })
    },
    toggleBoundary(id) {
      const b = state.boundaries.find(x => x.id === id)
      if (b) patch('boundaries', id, { active: !b.active })
    },
    addBoundary(input) {
      create('boundaries', { id: uid('bd'), memberId: 'me', active: true, custom: true, ...input })
    },

    search(query, corpus) { return universalSearch(query, corpus) },
    setImportState(id, importState) {
      patch('imports', id, {
        state: importState,
        ...(importState === 'reviewing' ? { reviewedAt: today() } : {}),
        ...(importState === 'committed' ? { committedAt: today() } : {}),
      })
    },
    setProposalAccepted(id, accepted) { patch('importProposals', id, { accepted }) },
    commitImport(batchId) {
      const rows = state.importProposals.filter(p => p.batchId === batchId)
      const accepted = rows.filter(p => p.accepted === true)
      for (const row of rows.filter(p => p.accepted !== true)) patch('importProposals', row.id, { accepted: false })
      patch('imports', batchId, {
        state: 'committed', committedAt: today(), rowCount: accepted.length,
        note: `${accepted.length} record${accepted.length === 1 ? '' : 's'} approved and committed. ${rows.length - accepted.length} left out.`,
      })
      return { accepted: accepted.length, skipped: rows.length - accepted.length }
    },
    removeImportSource(batchId) {
      const rows = state.importProposals.filter(p => p.batchId === batchId)
      for (const row of rows) patch('importProposals', row.id, { accepted: false })
      patch('imports', batchId, {
        state: 'removed', rowCount: 0,
        note: 'Source removed. Every record that arrived with it has been withdrawn from your graph.',
      })
    },
    async exportVault({ scope, format, includes, rows }) {
      if (['everything', 'relationships', 'opportunities'].includes(scope) && await contactExportIsDenied()) return null
      const record: RelationshipVaultExport = {
        id: uid('vx'), requestedAt: today(), scope, format, includes,
        rowCount: rows.length, fileName: `aetheris-${scope}-${today()}.${format}`, state: 'previewed',
      }
      create('vaultExports', record)
      return { record, content: format === 'csv' ? toCsv(rows) : JSON.stringify(rows, null, 2) }
    },

    setDecisionState(id, decisionState) { patch('inboxDecisions', id, { state: decisionState }) },
    briefing(ctx) { return composeBriefing(ctx) },

    marketplaceRanked(ctx) {
      return rankMarketplace(state.marketplace, {
        connections: ctx.connections, reputations: state.reputations,
        referrals: state.referrals, availability: state.proAvailability,
        ...(ctx.need ? { need: ctx.need } : {}),
      })
    },
    publishKnowledge(input) {
      const record: KnowledgeAsset = {
        id: uid('ka'), authorId: 'me', kind: 'Field note', contributorIds: [],
        provenance: 'Firsthand', evidence: '', revisions: [], industries: [],
        audience: 'Members working on the same problem', visibility: 'network',
        systemIds: [], outcomeIds: [], companyIds: [], proofNodeIds: [],
        createdAt: today(), updatedAt: today(), ...input,
      }
      return create('knowledgeAssets', record)
    },
    reviseKnowledge(id, note, body) {
      const k = state.knowledgeAssets.find(x => x.id === id)
      if (!k) return
      patch('knowledgeAssets', id, {
        revisions: [...k.revisions, { id: uid('kr'), note, when: today() }],
        ...(body ? { body } : {}), updatedAt: today(),
      })
    },
    setConciergeState(id, conciergeState, note) {
      patch('concierge', id, { state: conciergeState, updatedAt: today(), ...(note ? { reviewerNote: note } : {}) })
    },
    acceptStandard(accepted) {
      const s = state.standard[0]
      if (s) patch('standard', s.id, { accepted, ...(accepted ? { acceptedAt: today() } : {}) })
    },
  }), [state, layer.mode, create, patch])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}
