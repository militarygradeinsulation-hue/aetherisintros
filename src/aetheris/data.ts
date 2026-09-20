import type { DigitalYouProfile, ForensicLeak, Meeting, Objective, Person } from './types'
import { calculateConnectionScore, determineRadarState } from './lib/engine'

const seed = [
  {
    id: 'p1', name: 'Adrian Vale', initials: 'AV', title: 'Founder & Advisor', company: 'Anything But Typical', location: 'Charlotte, NC',
    tags: ['Founder', 'Advisor', 'Podcast', 'Connector'], needs: ['Portfolio growth systems', 'Distinctive operator stories'], offers: ['Founder network', 'Executive introductions', 'Media reach'],
    lastInteractionDays: 11, relationshipStatus: 'active' as const,
    score: { strategicFit: 95, mutualValue: 92, timing: 88, trust: 83, relationshipStrength: 80, decisionInfluence: 92, opportunityValue: 90, friction: 18 },
    whyThem: 'He operates inside a founder and executive network where Aetheris relationship forensics can create immediate value.',
    whyYou: 'Aetheris gives him a differentiated diagnostic and AI systems story he can use with founders, portfolio operators and podcast audiences.',
    whyNow: 'The relationship is already active and there is recent interest in Aetheris methodology.',
    bestPath: ['You', 'Adrian Vale'], nextAction: 'Ask for perspective on the Intros model before asking for any introduction.', dontDo: 'Do not open with a sales pitch or ask for a list of his connections.', confidence: 94, opportunityLow: 75000, opportunityHigh: 350000,
  },
  {
    id: 'p2', name: 'Mina Park', initials: 'MP', title: 'Operating Partner', company: 'Northline Capital', location: 'Chicago, IL',
    tags: ['PE', 'Operator', 'B2B', 'Growth'], needs: ['Portfolio revenue visibility', 'Faster operator reporting'], offers: ['Portfolio access', 'Investment network', 'Operating insight'],
    lastInteractionDays: 32, relationshipStatus: 'new' as const,
    score: { strategicFit: 93, mutualValue: 86, timing: 78, trust: 56, relationshipStrength: 50, decisionInfluence: 96, opportunityValue: 95, friction: 38 },
    whyThem: 'She oversees growth across multiple operating companies that match the ideal Aetheris diagnostic use case.',
    whyYou: 'Aetheris can surface revenue leakage without forcing every portfolio company into the same software stack.',
    whyNow: 'Northline recently added two operating companies and is standardizing growth reporting.',
    bestPath: ['You', 'Adrian Vale', 'Mina Park'], nextAction: 'Use Adrian as context only after validating his willingness to make the introduction.', dontDo: 'Do not cold-send a long deck.', confidence: 82, opportunityLow: 125000, opportunityHigh: 600000,
  },
  {
    id: 'p3', name: 'Nolan Pierce', initials: 'NP', title: 'CEO', company: 'ForgeLine Systems', location: 'Indianapolis, IN',
    tags: ['CEO', 'Manufacturing', 'SaaS'], needs: ['Pipeline consistency', 'CRM accountability'], offers: ['Manufacturing network', 'Buyer perspective'],
    lastInteractionDays: 4, relationshipStatus: 'strong' as const,
    score: { strategicFit: 88, mutualValue: 90, timing: 92, trust: 88, relationshipStrength: 86, decisionInfluence: 91, opportunityValue: 84, friction: 12 },
    whyThem: 'He directly controls a company with the exact CRM, handoff and pipeline problems Aetheris diagnoses.',
    whyYou: 'You can give him an outside forensic view of where sales and marketing handoffs are losing revenue.',
    whyNow: 'He is actively reviewing CRM adoption and sales follow-through this quarter.',
    bestPath: ['You', 'Nolan Pierce'], nextAction: 'Offer a short forensic look at one live pipeline problem.', dontDo: 'Do not position this as a CRM replacement.', confidence: 96, opportunityLow: 25000, opportunityHigh: 120000,
  },
  {
    id: 'p4', name: 'Celeste Arden', initials: 'CA', title: 'VP Partnerships', company: 'Harbor Grid', location: 'Seattle, WA',
    tags: ['Partnerships', 'Energy', 'Enterprise'], needs: ['Channel partners', 'Strategic distribution'], offers: ['Enterprise introductions', 'Channel design'],
    lastInteractionDays: 228, relationshipStatus: 'dormant' as const,
    score: { strategicFit: 78, mutualValue: 82, timing: 66, trust: 79, relationshipStrength: 76, decisionInfluence: 81, opportunityValue: 72, friction: 28 },
    whyThem: 'She has strong enterprise partnership reach and previously showed interest in operator-focused AI systems.',
    whyYou: 'Aetheris can help her partners diagnose gaps before Harbor Grid commits resources to joint motions.',
    whyNow: 'Her role expanded into national partnerships, making the old relationship newly relevant.',
    bestPath: ['You', 'Celeste Arden'], nextAction: 'Reactivate with a role-change note and one specific reason you thought of her.', dontDo: 'Do not pretend the relationship has been active recently.', confidence: 79, opportunityLow: 15000, opportunityHigh: 90000,
  },
  {
    id: 'p5', name: 'Rohan Vey', initials: 'RV', title: 'Founder', company: 'VectorLedger', location: 'Austin, TX',
    tags: ['Founder', 'Fintech', 'Capital'], needs: ['Distribution', 'Enterprise credibility'], offers: ['Investor access', 'Fintech operator network'],
    lastInteractionDays: 510, relationshipStatus: 'at-risk' as const,
    score: { strategicFit: 75, mutualValue: 77, timing: 52, trust: 84, relationshipStrength: 82, decisionInfluence: 73, opportunityValue: 76, friction: 34 },
    whyThem: 'He has a strong investor and founder network with several crossover opportunities for Aetheris.',
    whyYou: 'You can help him diagnose go-to-market gaps before he scales distribution spending.',
    whyNow: 'There is no strong urgency signal yet, but the relationship is valuable enough that continued dormancy is a risk.',
    bestPath: ['You', 'Rohan Vey'], nextAction: 'Send a low-pressure reactivation note with something useful, not an ask.', dontDo: 'Do not mention how long it has been in a guilt-heavy way.', confidence: 73, opportunityLow: 0, opportunityHigh: 150000,
  },
  {
    id: 'p6', name: 'Caleb Wynn', initials: 'CW', title: 'Head of Talent', company: 'Arc Foundry', location: 'New York, NY',
    tags: ['Talent', 'AI', 'Executive Search'], needs: ['AI systems leaders', 'High-trust referrals'], offers: ['Executive talent', 'Founder referrals'],
    lastInteractionDays: 71, relationshipStatus: 'active' as const,
    score: { strategicFit: 68, mutualValue: 74, timing: 70, trust: 72, relationshipStrength: 68, decisionInfluence: 77, opportunityValue: 60, friction: 24 },
    whyThem: 'He sees founders hiring for AI and systems roles and can surface needs before they become public searches.',
    whyYou: 'Your operator and AI-systems background gives him a credible specialist to introduce when clients need more than a standard technical hire.',
    whyNow: 'He is actively filling two systems leadership searches.',
    bestPath: ['You', 'Caleb Wynn'], nextAction: 'Offer a short profile of the types of systems problems you solve and ask what he is seeing.', dontDo: 'Do not ask him to “keep you in mind” generically.', confidence: 77, opportunityLow: 10000, opportunityHigh: 75000,
  },
]

export const people: Person[] = seed.map((p) => {
  const scoreTotal = calculateConnectionScore(p.score)
  const full = { ...p, scoreTotal, radar: 'unknown_path' as const }
  return { ...full, radar: determineRadarState(full) }
})

export const objectives: Objective[] = [
  { id: 'o1', title: 'Founder & PE introductions', outcome: 'Open 5 serious conversations with operators who can expose Aetheris to multiple companies.', target: 'PE operating partners, founder advisors and high-trust connectors', whyNow: 'Aetheris methodology is mature enough to demonstrate across multiple companies.', valueOffer: 'Revenue leak forensics and relationship intelligence without forcing a new software stack.', success: '5 qualified conversations, 2 pilots, 1 multi-company opportunity.', priority: 'critical' },
]

export const leaks: ForensicLeak[] = [
  { id: 'l1', type: 'Dormant high-value relationship', personId: 'p4', businessReason: 'Celeste now controls a wider national partnership remit than when you last spoke.', evidence: 'Strong prior relationship + 228 days inactive + role scope expanded.', urgency: 'high', recommendedAction: 'Reactivate with a direct note tied to her expanded role.', confidence: 84, estimatedValue: '$15K–$90K modeled' },
  { id: 'l2', type: 'Relationship at risk', personId: 'p5', businessReason: 'Strong trust history but more than a year without meaningful contact.', evidence: 'Relationship strength 82 / 100; 510 days since interaction.', urgency: 'medium', recommendedAction: 'Send something useful with no immediate ask.', confidence: 91 },
  { id: 'l3', type: 'Warm path available', personId: 'p2', businessReason: 'Mina is a high-fit operator and a credible two-hop path already exists.', evidence: 'Adrian → Mina path; Strategic Fit 93 / 100.', urgency: 'high', recommendedAction: 'Validate connector interest before requesting the introduction.', confidence: 82, estimatedValue: '$125K–$600K modeled' },
]

export const meetings: Meeting[] = [
  { id: 'm1', personId: 'p3', date: 'Today · 2:30 PM', reason: 'Discuss why pipeline visibility is weakening as the sales team scales.', caresAbout: ['Pipeline consistency', 'Rep accountability', 'Shorter follow-up delay'], recentSignals: ['CRM review is active this quarter', 'Sales leader asked for better source attribution'], openLoops: ['Who owns follow-up after inbound demo requests?', 'Which reports does leadership actually trust?'], opportunity: 'Run a narrow Aetheris forensic scan on one live handoff problem before discussing a larger system.', opening: 'You mentioned the CRM is not the real issue — visibility into where follow-up dies is. Where do you feel that most right now?', questions: ['Which stage has the most disagreement internally?', 'What gets manually checked because nobody trusts the dashboard?', 'What happens to an inbound lead after 48 hours?'], avoid: 'Do not open with AI or a product tour.', desiredOutcome: 'Agree on one pipeline path to diagnose with real data.' },
  { id: 'm2', personId: 'p1', date: 'Friday · 11:00 AM', reason: 'Pressure-test Ask Intros with a founder who understands high-value networking.', caresAbout: ['Distinctive ideas', 'Useful founder relationships', 'Operator credibility'], recentSignals: ['Positive reaction to Aetheris methodology', 'Podcast conversation discussed'], openLoops: ['Best founder wedge for Intros?', 'What makes a connector system feel trustworthy?'], opportunity: 'Use his feedback to sharpen market positioning and possibly uncover 1–2 design partners.', opening: 'I built this around a problem I think most founders underestimate: they do not need more contacts, they need to understand which relationships actually matter.', questions: ['What would make you trust the score?', 'Where would this become creepy or too automated?', 'What would make you use it weekly?'], avoid: 'Do not ask for introductions during the product-feedback conversation.', desiredOutcome: 'Get candid objections and identify the one feature he would pay to keep.' },
]

export const defaultDigitalYou: DigitalYouProfile = {
  directness: 88,
  formality: 44,
  humor: 58,
  brevity: 72,
  warmth: 66,
  sellingAggressiveness: 35,
  followUpFrequency: 62,
  prohibitedPhrases: ['circle back', 'synergy', 'game-changing', 'pick your brain', 'leverage AI', 'just checking in'],
}
