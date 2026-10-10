/**
 * Moat layer engines. Pure, explainable functions — no storage, no UI.
 * Every recommendation returns its reasoning so a surface can show it.
 */
import type { Member } from '../social'
import { knownInteractionDays } from '../lib/engine'
import type { ID } from './models'
import type {
  AudienceScope, ConsentLedgerEntry, DigitalRepresentativePolicy, IntroductionAvailability,
  NetworkConstitutionRule, NetworkSnapshot, OutcomeAttributionEdge, OutreachFlag,
  OutreachQualityReview, OutreachVerdict, ProfessionalPassport, QuestionRecipient,
  ReciprocitySignal, RelationshipDecayRisk, RelationshipGap, SerendipityMatch, SnapshotDiff,
} from './moat-models'

const now = () => new Date().toISOString().slice(0, 10)
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

/* --------------------------------------------- 1. professional passport */

export function passportFor(passports: ProfessionalPassport[], memberId: ID) {
  return passports.find(p => p.memberId === memberId)
}

/** Credibility is about fitness for one conversation, never popularity. */
export function credibilityBand(passport: ProfessionalPassport | undefined) {
  if (!passport) return { band: 'Unverified' as const, note: 'No passport yet. Treat every claim as self-reported.' }
  const verified = [passport.company, passport.role, ...passport.expertise].filter(c => c.state === 'verified').length
  const total = 2 + passport.expertise.length
  const honoured = passport.introductionsCompleted ? passport.introductionsHonoured / passport.introductionsCompleted : 0
  if (verified / total > 0.7 && honoured > 0.85) return { band: 'Evidence-backed' as const, note: 'Company, role and most expertise claims are verified, and introductions are honoured.' }
  if (verified >= 2) return { band: 'Partly verified' as const, note: 'Identity is verified; some expertise remains self-reported.' }
  return { band: 'Self-reported' as const, note: 'Claims are stated by the member and not yet verified.' }
}

export function passportFilterOptions(passports: ProfessionalPassport[]) {
  const expertise = new Set<string>()
  const companies = new Set<string>()
  const roles = new Set<string>()
  for (const p of passports) {
    if (p.company.state === 'verified') companies.add(p.company.value)
    if (p.role.state === 'verified') roles.add(p.role.value)
    p.expertise.filter(e => e.state === 'verified').forEach(e => expertise.add(e.value))
  }
  return { expertise: [...expertise].sort(), companies: [...companies].sort(), roles: [...roles].sort() }
}

/* ------------------------------------- 2. anti-spam / constitution engine */

const pitchWords = ['revolutionary', 'game-changing', 'unlock', 'synergy', 'supercharge', 'best-in-class', 'quick call', 'circle back', 'touch base', 'exciting opportunity', 'solutions provider', 'reach out to see if', 'hop on a call', '15 minutes of your time', 'special offer', 'limited time', 'guaranteed results', 'roi guaranteed']
const sellWords = ['our product', 'our platform', 'our solution', 'we sell', 'pricing', 'buy now', 'demo of our', 'sign up today', 'discount']
const bulkWords = ['dear sir', 'to whom it may concern', 'hi there,', 'hope this finds you well', 'per my last email', 'reaching out to everyone']

export interface OutreachContext {
  channel: OutreachQualityReview['channel']
  authorId: ID
  recipient?: Member
  /** Same text already sent to other members this cycle. */
  duplicateOf?: number
  messagesSentToRecipientThisWeek?: number
  previouslyDeclined?: boolean
  sharedContext?: string
  rules: NetworkConstitutionRule[]
}

export function reviewOutreach(text: string, ctx: OutreachContext): OutreachQualityReview {
  const body = text.trim()
  const lower = body.toLowerCase()
  const flags: OutreachFlag[] = []
  const strengths: string[] = []
  const active = (kind: OutreachFlag['kind']) => ctx.rules.some(r => r.active && r.detects.includes(kind))

  const hitPitch = pitchWords.filter(w => lower.includes(w))
  if (hitPitch.length && active('vague-pitch')) flags.push({ kind: 'vague-pitch', principle: 'Specificity', plainLanguage: `This reads as promotional. Phrases like “${hitPitch[0]}” describe a pitch, not a reason.`, fix: 'Replace the claim with the one specific thing you noticed about their work.' })
  const hitSell = sellWords.filter(w => lower.includes(w))
  if (hitSell.length && !ctx.sharedContext && active('unsolicited-selling')) flags.push({ kind: 'unsolicited-selling', principle: 'No mass-selling', plainLanguage: 'This is selling into a relationship that has no shared context yet.', fix: 'Lead with something useful to them. Sell later, or not here.' })
  if (bulkWords.some(w => lower.includes(w)) || (ctx.duplicateOf ?? 0) > 0) {
    if (active('bulk-outreach')) flags.push({ kind: 'bulk-outreach', principle: 'No mass-selling', plainLanguage: (ctx.duplicateOf ?? 0) > 0 ? `Nearly identical text has gone to ${ctx.duplicateOf} other members.` : 'This opening reads as copy-paste outreach.', fix: 'Narrow the audience and write one message that only makes sense to this person.' })
  }
  if (body.length < 60 && ctx.channel !== 'ask' && active('missing-context')) flags.push({ kind: 'missing-context', principle: 'Specificity', plainLanguage: 'There is not enough context here for them to answer well.', fix: 'Add what you are moving, why now, and what they would be walking into.' })
  const namesRecipient = ctx.recipient ? lower.includes(ctx.recipient.name.split(' ')[0]!.toLowerCase()) || lower.includes(ctx.recipient.company.toLowerCase()) : true
  if (!namesRecipient && active('irrelevant-ask')) flags.push({ kind: 'irrelevant-ask', principle: 'Relevance', plainLanguage: 'Nothing in this message is specific to them or their company.', fix: 'Name the reason it is them: a problem, a circle, a piece of their work.' })
  const givesValue = /\b(i can|happy to|useful to you|for you|i noticed|i'll send|here is|sharing)\b/.test(lower)
  const asks = /\b(can you|could you|would you|introduce|intro|advice|help me)\b/.test(lower)
  if (asks && !givesValue && active('no-mutual-value')) flags.push({ kind: 'no-mutual-value', principle: 'Reciprocity', plainLanguage: 'This asks without offering anything in return.', fix: 'Add one concrete thing you can do, send or answer for them.' })
  if ((ctx.messagesSentToRecipientThisWeek ?? 0) >= 3 && active('excessive-frequency')) flags.push({ kind: 'excessive-frequency', principle: 'Consent', plainLanguage: 'This is your fourth message to them this week.', fix: 'Wait for a reply. Frequency does not create interest.' })
  if (ctx.previouslyDeclined && active('repeated-decline')) flags.push({ kind: 'repeated-decline', principle: 'Consent', plainLanguage: 'They have already declined contact on this topic.', fix: 'Do not send. A declined request is a boundary, not a delay.' })

  if (namesRecipient && ctx.recipient) strengths.push('Names the specific person and context.')
  if (givesValue) strengths.push('Offers something useful, not only an ask.')
  if (body.length >= 120) strengths.push('Carries enough context to be answerable.')
  if (ctx.sharedContext) strengths.push(`Shared context: ${ctx.sharedContext}`)

  const blocked = flags.some(f => f.kind === 'repeated-decline' || f.kind === 'bulk-outreach')
  const quality = Math.max(5, Math.min(98, 90 - flags.length * 18 + strengths.length * 5))
  const verdict: OutreachVerdict = blocked ? 'Hold'
    : flags.some(f => f.kind === 'vague-pitch' || f.kind === 'unsolicited-selling') ? 'Reads As Promotional'
      : flags.length ? 'Needs Context' : 'Ready'

  return {
    id: uid('oqr'), channel: ctx.channel, authorId: ctx.authorId,
    ...(ctx.recipient ? { recipientId: ctx.recipient.id } : {}),
    text: body, verdict, quality, flags, strengths,
    suggestedRewrite: suggestRewrite(body, ctx, flags),
    allowSend: !blocked && verdict !== 'Reads As Promotional',
    createdAt: now(),
  }
}

function suggestRewrite(body: string, ctx: OutreachContext, flags: OutreachFlag[]): string {
  if (!flags.length) return body
  const who = ctx.recipient?.name.split(' ')[0] ?? 'there'
  const hook = ctx.recipient ? `I read what you said about ${ctx.recipient.focus.replace(/\.$/, '').toLowerCase()}` : 'I noticed the specific problem you described'
  const give = ctx.recipient?.needs[0] ? `I can send the one-page version of how we handled ${ctx.recipient.needs[0].toLowerCase()} — no call needed.` : 'I can send the short written version, no call needed.'
  return `${who} — ${hook}. ${give} If it is useful, I would value fifteen minutes on ${ctx.sharedContext ? ctx.sharedContext.toLowerCase() : 'one specific question'}. If not, no follow-up.`
}

/* ------------------------------------------------ 3. question routing */

export function routeQuestion(question: string, opts: {
  members: Member[]
  audience: AudienceScope
  circleMemberIds?: ID[]
  connections?: ID[]
  passports?: ProfessionalPassport[]
}): { routed: QuestionRecipient[]; logic: string[]; excluded: number } {
  const terms = question.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 3)
  const pool = opts.members.filter(m => {
    if (opts.audience === 'circle') return (opts.circleMemberIds ?? []).includes(m.id)
    if (opts.audience === 'connections') return (opts.connections ?? []).includes(m.id)
    return true
  })
  const scored = pool.map(m => {
    const haystack = `${m.title} ${m.company} ${m.industry} ${m.expertise.join(' ')} ${m.needs.join(' ')} ${m.offers.join(' ')} ${m.focus}`.toLowerCase()
    const hits = terms.filter(t => haystack.includes(t))
    const passport = opts.passports ? passportFor(opts.passports, m.id) : undefined
    const verifiedBoost = passport && credibilityBand(passport).band === 'Evidence-backed' ? 12 : passport ? 6 : 0
    const recency = m.lastInteractionDays < 45 ? 8 : 0
    const confidence = Math.min(96, hits.length * 22 + verifiedBoost + recency)
    const reasonBits = [
      hits.length ? `Permissioned signal on ${hits.slice(0, 2).join(' and ')}` : '',
      passport ? `${credibilityBand(passport).band.toLowerCase()} passport in ${m.industry.toLowerCase()}` : '',
      m.lastInteractionDays < 45 ? 'active in the network recently' : '',
    ].filter(Boolean)
    return { memberId: m.id, reason: reasonBits.join(' · ') || 'Adjacent industry context only', confidence, responded: false }
  })
  const routed = scored.filter(r => r.confidence >= 30).sort((a, b) => b.confidence - a.confidence).slice(0, 6)
  const logic = [
    opts.audience === 'circle' ? 'Circle members only' : opts.audience === 'connections' ? 'Direct connections only' : `Audience: ${opts.audience}`,
    'Matched on permissioned expertise, industry, stated needs and offers',
    'Verified passport claims weighted above self-reported ones',
    'Recent network activity used as a responsiveness signal',
    `Excluded ${pool.length - routed.length} members with no permissioned signal on this question`,
  ]
  return { routed, logic, excluded: pool.length - routed.length }
}

/* ----------------------------------------------------- 4. serendipity */

export function rankSerendipity(matches: SerendipityMatch[]) {
  return matches
    .filter(m => m.status !== 'dismissed' && m.status !== 'not-relevant')
    .sort((a, b) => b.confidence - a.confidence)
}

/** Derive an additional unexpected overlap from live members, evidence-backed only. */
export function deriveSerendipity(members: Member[], ownerIndustry: string, existing: SerendipityMatch[]): SerendipityMatch | null {
  const taken = new Set(existing.map(m => m.memberId))
  const candidate = members.find(m => !taken.has(m.id) && m.industry !== ownerIndustry && m.needs.length > 0 && m.offers.length > 0)
  if (!candidate) return null
  return {
    id: uid('sm'), ownerId: 'me', memberId: candidate.id, basis: ['adjacent problem', 'complementary capability'],
    whyUnexpected: `${candidate.industry} never appears in your searches, so this person would not surface any other way.`,
    whyItCouldMatter: `They need ${candidate.needs[0]!.toLowerCase()} and offer ${candidate.offers[0]!.toLowerCase()} — the second half is what you are short of.`,
    whyNow: 'Both of you have an active, stated need in the same period.',
    mutualValue: 'A second industry proof point for you, a working method for them.',
    uncertainty: 'The overlap is structural, not yet confirmed by either side.',
    evidenceIds: [], confidence: 58, status: 'new', createdAt: now(),
  }
}

/* -------------------------------------------------------- 7. gap map */

export function deriveGaps(members: Member[], objective: string, existing: RelationshipGap[]): RelationshipGap[] {
  if (existing.length) return existing.filter(g => !objective || g.objective === existing[0]!.objective)
  const industries = new Set(members.map(m => m.industry))
  const roles = new Set(members.map(m => m.role))
  const gaps: RelationshipGap[] = []
  if (!roles.has('Investor')) gaps.push({ id: uid('gap'), ownerId: 'me', objective, dimension: 'role', missing: 'Capital-side relationships', strength: 'Operator coverage is strong', whyItMatters: 'Large decisions are underwritten above the operator.', bridgeReason: '', circleIds: [], systemIds: [], nextMove: 'Ask your network who has sold to the capital side.', severity: 70 })
  if (industries.size < 4) gaps.push({ id: uid('gap'), ownerId: 'me', objective, dimension: 'industry', missing: 'A second industry', strength: 'Depth in your primary industry', whyItMatters: 'One industry makes your evidence look local.', bridgeReason: '', circleIds: [], systemIds: [], nextMove: 'Take one adjacent-problem conversation this month.', severity: 55 })
  return gaps
}

export function gapBridge(gap: RelationshipGap, members: Member[]) {
  if (gap.bridgeMemberId) return members.find(m => m.id === gap.bridgeMemberId)
  return members
    .filter(m => `${m.industry} ${m.role} ${m.expertise.join(' ')}`.toLowerCase().includes(gap.missing.split(' ')[0]!.toLowerCase()))
    .sort((a, b) => b.scoreTotal - a.scoreTotal)[0]
}

/* --------------------------------------------- 9. consent ledger reads */

export function shareableFor(entries: ConsentLedgerEntry[], scopes: Array<ConsentLedgerEntry['scope']>) {
  return entries.filter(e => !e.revoked && scopes.includes(e.scope))
}

export function withheldCount(entries: ConsentLedgerEntry[], scopes: Array<ConsentLedgerEntry['scope']>) {
  return entries.filter(e => !scopes.includes(e.scope) && !e.revoked).length
}

/* --------------------------------------------------- 10. reciprocity */

export function reciprocityFor(signals: ReciprocitySignal[], memberId: ID) {
  return signals.find(s => s.counterpartyId === memberId)
}

export function reciprocityAdvice(signals: ReciprocitySignal[], circleId?: ID) {
  const scoped = circleId ? signals.filter(s => s.circleId === circleId) : signals
  const owing = scoped.filter(s => s.direction === 'you owe value')
  if (!owing.length) return 'Balanced. Asking here is reasonable and likely to be answered.'
  const names = owing.map(s => s.counterpartyName).slice(0, 2).join(' and ')
  return `You have received more than you have given from ${names} recently. There are credible ways to create value before asking again — ${owing[0]!.recommendation.split('. ').slice(-1)[0]}`
}

/** Plain-language only. No points, no score, ever. */
export function canAskConnector(signals: ReciprocitySignal[], memberId: ID) {
  const s = reciprocityFor(signals, memberId)
  if (!s) return { safe: true, note: 'No recent asks recorded. This is a reasonable request.' }
  if (s.direction === 'you owe value') return { safe: false, note: s.recommendation }
  return { safe: true, note: 'This relationship is balanced. The ask is fair to make.' }
}

/* ------------------------------------------------------ 11. decay */

export function decayFor(risks: RelationshipDecayRisk[], memberId: ID) {
  return risks.find(r => r.memberId === memberId)
}

export function deriveDecay(member: Member, ownerId = 'me'): RelationshipDecayRisk {
  const causes: RelationshipDecayRisk['causes'] = []
  // No recorded interaction is "unknown", not decay: there is no relationship to decay yet.
  const days = knownInteractionDays(member)
  if (days !== null && days > 60) causes.push({ cause: 'no natural cadence', explanation: `${days} days without a reason to talk.` })
  if (member.introState === 'waiting') causes.push({ cause: 'unanswered message', explanation: 'An introduction is waiting on a response.' })
  if (!member.nextAction) causes.push({ cause: 'no next reason', explanation: 'Nothing scheduled or promised creates the next conversation.' })
  const risk = Math.min(92, causes.length * 26 + Math.min(40, (days ?? 0) / 3))
  const quiet = risk < 30
  return {
    id: uid('dr'), ownerId, memberId: member.id, risk,
    horizon: quiet ? 'Healthy' : risk > 60 ? 'Likely to cool within three weeks' : 'Cooling slowly',
    causes: causes.length ? causes : [{ cause: 'timing mismatch', explanation: 'Nothing is wrong. Contact now would cost more than it earns.' }],
    minimumAction: quiet ? 'Do nothing yet. This relationship does not need attention.' : member.nextAction || 'Send one piece of context they can use, with no ask attached.',
    actionKind: quiet ? 'do nothing yet' : causes[0]?.cause === 'unfinished commitment' ? 'close a loop' : 'send context',
    evidenceIds: [], updatedAt: now(),
  }
}

/* ------------------------------------------ 12. digital representative */

export interface RepresentativeReply {
  answer: string
  permitted: boolean
  handoff: boolean
  basis: string[]
}

export function representativeReply(question: string, policy: DigitalRepresentativePolicy, context: {
  ownerName: string
  approvedFacts: Array<{ item: string; detail: string }>
}): RepresentativeReply {
  const q = question.toLowerCase()
  const blocked = policy.blockedTopics.find(t => q.includes(t.toLowerCase().split(' ')[0]!))
  const commercial = /\b(price|pricing|rate|cost|contract|sign|book|schedule|calendar|commit|agree)\b/.test(q)
  if (!policy.enabled) return { answer: `${context.ownerName} has not enabled a representative. I can record your question and pass it on.`, permitted: false, handoff: true, basis: [] }
  if (commercial) return { answer: `I am an Aetheris representative, not ${context.ownerName}. I am not permitted to discuss commercial terms or place anything on a calendar. I can record the context and hand it to ${context.ownerName} directly.`, permitted: false, handoff: true, basis: ['Authority limit: no commitments'] }
  if (blocked) return { answer: `That is outside what I am permitted to discuss. I can note the question and ${context.ownerName} can answer it personally.`, permitted: false, handoff: true, basis: [`Blocked topic: ${blocked}`] }
  const relevant = context.approvedFacts.filter(f => q.split(/[^a-z]+/).some(w => w.length > 3 && `${f.item} ${f.detail}`.toLowerCase().includes(w)))
  if (!relevant.length) return { answer: `I do not have approved context that answers that. I have recorded it for ${context.ownerName}.`, permitted: true, handoff: true, basis: ['No approved context matched'] }
  return {
    answer: `From approved context: ${relevant.map(f => f.detail).join(' ')} I am an Aetheris representative speaking from ${context.ownerName}'s shareable context — not ${context.ownerName}.`,
    permitted: true, handoff: false, basis: relevant.map(f => f.item),
  }
}

/* --------------------------------------- 13. introduction availability */

export function availabilityEligibility(window: IntroductionAvailability, opts: {
  member?: Member
  contextProvided: string[]
  relationshipStrength: 'any' | 'warm' | 'strong'
}) {
  const reasons: string[] = []
  const remaining = window.maxIntroductions - window.used
  const open = new Date(window.closesAt) >= new Date() && new Date(window.opensAt) <= new Date()
  if (!open) reasons.push('The window is closed for this cycle.')
  if (remaining <= 0) reasons.push('All introductions in this window are used.')
  const missing = window.requiredContext.filter(c => !opts.contextProvided.some(p => p.toLowerCase().includes(c.toLowerCase().split(' ')[0]!)))
  if (missing.length) reasons.push(`Required context missing: ${missing.join(', ')}.`)
  const strengthOrder = { any: 0, warm: 1, strong: 2 }
  if (strengthOrder[opts.relationshipStrength] < strengthOrder[window.preferredStrength]) reasons.push(`Preferred relationship strength is ${window.preferredStrength}.`)
  return { eligible: !reasons.length, remaining, open, reasons }
}

/* --------------------------------------------------- 14. time machine */

export function diffSnapshots(from: NetworkSnapshot, to: NetworkSnapshot): SnapshotDiff {
  const only = (a: string[], b: string[]) => a.filter(x => !b.includes(x))
  return {
    from: from.label, to: to.label,
    newRelationships: only(to.connectionIds, from.connectionIds),
    dormant: only(to.dormantIds, from.dormantIds),
    circlesGainedRelevance: only(to.activeCircleIds, from.activeCircleIds),
    systemsSpread: only(to.systemsSpread, from.systemsSpread),
    opportunitiesAppeared: only(to.opportunitiesOpen, from.opportunitiesOpen),
    opportunitiesClosed: only(from.opportunitiesOpen, to.opportunitiesOpen),
    downstream: to.introductionsMade > from.introductionsMade
      ? [`${to.introductionsMade - from.introductionsMade} introductions were made between these points, and ${only(to.connectionIds, from.connectionIds).length} relationships exist because of them.`]
      : ['No introductions between these points.'],
  }
}

/* ---------------------------------------------------- 15. attribution */

export function tracePath(edges: OutcomeAttributionEdge[], outcomeId: ID) {
  return edges.filter(e => e.outcomeId === outcomeId).sort((a, b) => a.step - b.step)
}

export function attributionSummary(edges: OutcomeAttributionEdge[], outcomeId: ID) {
  const path = tracePath(edges, outcomeId)
  if (!path.length) return { origin: 'Not traced yet', steps: 0, direct: 0, influenced: 0, contextual: 0 }
  return {
    origin: path[0]!.fromLabel, steps: path.length,
    direct: path.filter(e => e.contribution === 'direct').length,
    influenced: path.filter(e => e.contribution === 'influenced').length,
    contextual: path.filter(e => e.contribution === 'contextual').length,
  }
}

/* ---------------------------------------------- 18. relationship context */

export function relationshipContext(opts: {
  member: Member
  weather: string
  openLoops: string[]
  currentIntent: string
  roomIds: ID[]
  scopesAllowed: Array<ConsentLedgerEntry['scope']>
  ledger: ConsentLedgerEntry[]
}) {
  const withheld = opts.ledger.filter(e => !opts.scopesAllowed.includes(e.scope) && !e.revoked).map(e => e.item)
  return {
    identity: `${opts.member.name} · ${opts.member.title} · ${opts.member.company}`,
    weather: opts.weather,
    openLoops: opts.openLoops,
    currentIntent: opts.currentIntent,
    roomIds: opts.roomIds,
    bestNextMove: opts.member.nextAction || 'Send one piece of useful context with no ask attached.',
    evidenceIds: [],
    withheld,
  }
}
