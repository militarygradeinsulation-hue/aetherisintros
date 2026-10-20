/**
 * Public, client-only Opportunity Preview.
 * Never reads people, contacts, accounts, member profiles, or external services.
 * Illustrative goal templates, not actual matches, forecasts, or outreach.
 */
export const opportunityGoals = [
  {
    id: 'customers',
    title: 'Find better customers',
    label: 'New business',
    outcome: 'find buyers who need help fixing slow lead follow-up',
    people: 'owners and operations leaders at growing service businesses',
    offer: 'a focused review of where inquiries turn into missed sales',
    steps: [
      'Describe the business problem and what a useful introduction looks like.',
      'Review potential connections with real context; never mistake a title for a fit.',
      'Request introductions by consent, then track the conversation and next step.',
    ],
  },
  {
    id: 'partners',
    title: 'Build a partnership',
    label: 'Strategic growth',
    outcome: 'find a partner to bring a new service into another market',
    people: 'operators with complementary services and shared customers',
    offer: 'a clear partnership proposal and a first small pilot',
    steps: [
      'Define what each side can contribute before asking for a connection.',
      'Use context and mutual interest to decide who should be introduced.',
      'Agree on a pilot, record commitments, and keep both sides informed.',
    ],
  },
  {
    id: 'operations',
    title: 'Solve a business bottleneck',
    label: 'Operations',
    outcome: 'reduce wasted time in quoting, handoffs, and follow-up',
    people: 'people who have solved similar operating problems',
    offer: 'a concrete description of the workflow and the ability to test a solution',
    steps: [
      'Turn a vague challenge into a specific question someone can answer.',
      'Route the question only where expertise and permissions suggest a fit.',
      'Capture the advice, next action, and outcome instead of losing another thread.',
    ],
  },
  {
    id: 'talent',
    title: 'Meet proven talent',
    label: 'People',
    outcome: 'find someone who can lead a complex growth project',
    people: 'people with demonstrated experience shipping similar work',
    offer: 'a real brief, clear expectations, and a fair conversation',
    steps: [
      'Describe the work and evidence of ability you need, not just a job title.',
      'Review credible experience and shared context before requesting contact.',
      'Use a permissioned introduction to explore fit and agree on next steps.',
    ],
  },
] as const

export type OpportunityGoal = (typeof opportunityGoals)[number]['id']
export type OpportunityFields = { outcome: string; people: string; offer: string }

export function opportunityGoal(id: string) {
  return opportunityGoals.find(item => item.id === id) ?? opportunityGoals[0]
}

/** Local-only text; normalize control characters and bound long pastes. */
export function cleanOpportunityField(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.replace(/[\p{Cc}<>]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 180).replace(/[.!?;,\s]+$/u, '')
}

export function buildOpportunityPreview(goal: OpportunityGoal, fields: OpportunityFields) {
  const base = opportunityGoal(goal)
  const outcome = cleanOpportunityField(fields.outcome) || base.outcome
  const people = cleanOpportunityField(fields.people) || base.people
  const offer = cleanOpportunityField(fields.offer) || base.offer
  return {
    ask: `I'm looking to ${outcome}. An introduction to ${people} would help. I can contribute ${offer}. If there's mutual interest, I'd welcome a short conversation about one useful next step.`,
    people,
    offer,
    steps: [...base.steps],
    /** Evidence-free previews must never imply that a real member or matching result exists. */
    notice: 'Illustrative preview only. No member search was run, no match is guaranteed, and nothing was sent or saved.',
  }
}
