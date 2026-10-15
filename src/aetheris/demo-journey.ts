/** Fictional, zero-network interactive tour of the relationship-to-outcome lifecycle.
 * The public tour never reads member data or writes messages/introductions/deals.
 * Its stages are illustrative, not proof of a live customer's performance.
 */
export type JourneyStep = {
  id: 'need' | 'fit' | 'consent' | 'lobby' | 'meeting' | 'workspace' | 'outcome'
  label: string
  eyebrow: string
  headline: string
  explanation: string
  evidence: string
  outcome: string
}
export const JOURNEY_STEPS: readonly JourneyStep[] = [
  { id: 'need', label: 'Business need', eyebrow: '01 / THE SIGNAL',
    headline: 'A company needs a distribution partner.',
    explanation: 'Harborline Manufacturing, a fictional business, states a concrete expansion need rather than publishing another vague status update.',
    evidence: 'Need: Find a qualified regional distribution partner. Timing: next quarter. Geography: Midwest.',
    outcome: 'Ask Intros has a defined objective to match against real, permission-safe capabilities.' },
  { id: 'fit', label: 'Evidence-based fit', eyebrow: '02 / THE INTELLIGENCE',
    headline: 'Relevance requires a reason.',
    explanation: 'The matching layer compares declared needs, capabilities, geography, timing and evidence. A strong-looking profile is not the same as verified delivery.',
    evidence: 'Illustrative match: Northway Supply. Compatible region and service; project experience would require verification.',
    outcome: 'A recommendation should carry reasons and unknowns, not an invented confidence score.' },
  { id: 'consent', label: 'Warm introduction', eyebrow: '03 / THE TRUST',
    headline: 'Both people decide to connect.',
    explanation: 'A mutual contact can suggest an introduction. Neither executive is added to an unsolicited conversation until the appropriate participants opt in.',
    evidence: 'Harborline: opted in. Northway: opted in. Introduction: accepted.',
    outcome: 'A business conversation becomes appropriate because mutual intent is established.' },
  { id: 'lobby', label: 'Business Lobby', eyebrow: '04 / THE OPEN DOOR',
    headline: 'A short conversation is one request away.',
    explanation: 'An approved connection voluntarily opens a temporary availability window. The other party knocks with context; only the recipient can accept.',
    evidence: 'Illustrative availability: 30 minutes. A request is pending; no camera, microphone or meeting starts automatically.',
    outcome: 'Reduce calendar friction without turning member availability into public surveillance.' },
  { id: 'meeting', label: 'Meeting intelligence', eyebrow: '05 / THE CONVERSATION',
    headline: 'The introduction now has shared context.',
    explanation: 'A real meeting would reuse Ask Intros video, camera selection, introduction-linked agenda and separately consented notes. Participants control recordings.',
    evidence: 'Example agenda: confirm distribution fit, define a pilot scope, agree on the next action.',
    outcome: 'A meeting can create a recorded follow-up while keeping each participant’s private notes private.' },
  { id: 'workspace', label: 'Private workspace', eyebrow: '06 / THE EXECUTION',
    headline: 'Turn a conversation into accountable work.',
    explanation: 'Participants move an accepted introduction into an invitation-only workspace with proposed scope, milestones, decisions and two-party approvals.',
    evidence: 'Illustrative project: limited distribution pilot. Milestones: evaluate, agree, deliver, accept.',
    outcome: 'The opportunity becomes work without exposing either company’s entire CRM.' },
  { id: 'outcome', label: 'Recorded outcome', eyebrow: '07 / THE LEARNING',
    headline: 'Measure what the relationship produced.',
    explanation: 'After business activity is recorded, Ask Intros can link reported outcomes to the introduction and its supporting evidence. Verification is a separate step.',
    evidence: 'Illustrative outcome: pilot completed; partnership result pending counterpart confirmation.',
    outcome: 'Business value is tied to attributable work, not impressions, connection counts or fabricated revenue.' },
] as const

export function boundedJourneyIndex(index: number, max = JOURNEY_STEPS.length) {
  return Number.isInteger(index) ? Math.min(max - 1, Math.max(0, index)) : 0
}
