/**
 * Business leak check: ten plain questions about where a company loses time, leads and
 * revenue (lead response, follow-up, lead tracking, website, retention, handoffs, manual
 * work, key-person risk, vendor spend, brand clarity). Each weak answer becomes a finding in
 * one of the Diagnose problem areas, so it can be routed to members who have fixed it.
 * Pure and deterministic: no AI, no estimates of money, nothing leaves the device unless
 * the member saves it (privately) or posts an ask.
 */
import type { ProviderId } from './capabilities/types'

export interface LeakOption { label: string; score: 0 | 1 | 2 | 3 }

export interface LeakQuestion {
  id: string
  area: ProviderId
  topic: string
  question: string
  options: LeakOption[]
  /** What the leak is, in the owner's terms, when the answer scores 2 or 3. */
  leak: string
  /** The first concrete fix to try. */
  firstFix: string
}

export const LEAK_QUESTIONS: LeakQuestion[] = [
  { id: 'response', area: 'revenue', topic: 'Lead response', question: 'How fast does a new inquiry get a real reply?',
    options: [{ label: 'Within 5 minutes', score: 0 }, { label: 'Within the hour', score: 1 }, { label: 'Same day', score: 2 }, { label: 'Next day or later', score: 3 }],
    leak: 'New leads wait too long for a reply, so the fastest competitor gets them.', firstFix: 'Route every inquiry to one owner with an instant acknowledgement and a same-hour reply target.' },
  { id: 'followup', area: 'revenue', topic: 'Follow-up', question: 'How many times do you follow up with a lead who goes quiet?',
    options: [{ label: 'Five or more, on a schedule', score: 0 }, { label: 'Three or four', score: 1 }, { label: 'Once or twice', score: 2 }, { label: 'Rarely', score: 3 }],
    leak: 'Leads that go quiet are dropped after one or two tries, so interested buyers slip away.', firstFix: 'Set a written follow-up sequence (calls, emails, texts) with dates, and automate the reminders.' },
  { id: 'tracking', area: 'access', topic: 'Lead tracking', question: 'Where do leads and deals live?',
    options: [{ label: 'One CRM everyone uses', score: 0 }, { label: 'A CRM, used by some', score: 1 }, { label: 'Spreadsheets and inboxes', score: 2 }, { label: "In people's heads", score: 3 }],
    leak: "Leads live in inboxes and memory, so nobody can see what's open, owed or lost.", firstFix: 'Put every open lead and deal in one shared system with a named owner and a next step.' },
  { id: 'website', area: 'strategic', topic: 'Website', question: 'Do you know what share of website visitors become inquiries?',
    options: [{ label: 'Yes, and it is healthy', score: 0 }, { label: 'Yes, and it is low', score: 1 }, { label: "We don't track it", score: 2 }, { label: "Our site hasn't been touched in years", score: 3 }],
    leak: "The website isn't measured or maintained, so it may be losing inquiries you never see.", firstFix: 'Measure visits to inquiries, then fix the top page: a clear offer, proof, and one obvious next step.' },
  { id: 'retention', area: 'customer', topic: 'Customer retention', question: 'Do you know why customers leave or stop buying?',
    options: [{ label: 'Tracked, and we act on it', score: 0 }, { label: 'We have a rough idea', score: 1 }, { label: 'We rarely ask', score: 2 }, { label: 'No idea', score: 3 }],
    leak: "Customers leave without the business learning why, so the same losses repeat.", firstFix: 'Ask every lost or quiet customer one short question, and review the answers monthly.' },
  { id: 'handoffs', area: 'decision', topic: 'Handoffs', question: 'How often does something fall through between sales and delivery?',
    options: [{ label: 'Almost never', score: 0 }, { label: 'Occasionally', score: 1 }, { label: 'Monthly', score: 2 }, { label: 'Weekly', score: 3 }],
    leak: 'Work falls through between teams, costing rework, delays and customer trust.', firstFix: 'Write a one-page handoff checklist and make one person accountable for each handoff.' },
  { id: 'manual', area: 'access', topic: 'Manual work', question: 'How many hours a week does the team spend on repetitive admin (data entry, copying between tools)?',
    options: [{ label: 'Under 2', score: 0 }, { label: '2 to 5', score: 1 }, { label: '5 to 15', score: 2 }, { label: 'More than 15', score: 3 }],
    leak: 'Skilled people spend hours a week on copy-paste admin that a system could do.', firstFix: 'List the three most repeated admin tasks and automate the biggest one first.' },
  { id: 'keyperson', area: 'workforce', topic: 'Key-person risk', question: 'If your best person left tomorrow, what would happen?',
    options: [{ label: "It's documented; we'd be fine", score: 0 }, { label: "We'd be slow for a few weeks", score: 1 }, { label: "We'd lose clients", score: 2 }, { label: 'Parts of the business would stop', score: 3 }],
    leak: 'Critical knowledge and relationships sit with one person, so one departure puts revenue at risk.', firstFix: 'Document their top five recurring jobs and share their key client relationships with a second person.' },
  { id: 'vendors', area: 'vendor', topic: 'Vendor and software spend', question: 'When did you last review vendor contracts and software subscriptions?',
    options: [{ label: 'In the last 6 months', score: 0 }, { label: 'Within the year', score: 1 }, { label: '1 to 2 years ago', score: 2 }, { label: 'Never', score: 3 }],
    leak: 'Contracts and subscriptions renew without review, so you likely pay for things you no longer use.', firstFix: 'Pull 12 months of card and bank charges, list every recurring cost, and cancel or renegotiate the unused ones.' },
  { id: 'brand', area: 'strategic', topic: 'Brand clarity', question: 'Do customers describe what you do the way you would?',
    options: [{ label: 'Yes', score: 0 }, { label: 'Mostly', score: 1 }, { label: 'Not sure', score: 2 }, { label: 'No', score: 3 }],
    leak: "Customers can't say clearly what you do, so referrals and marketing work harder for less.", firstFix: 'Ask five good customers how they would describe you, and rewrite your one-line offer in their words.' },
]

export type LeakAnswers = Record<string, number>

export interface LeakFinding {
  id: string
  provider: ProviderId
  severity: 'medium' | 'high'
  topic: string
  leak: string
  firstFix: string
  score: number
}

export interface LeakResult {
  /** 0 = no leaks found, 100 = every answer at its worst. */
  leakIndex: number
  answered: number
  findings: LeakFinding[]
  strengths: string[]
}

export function scoreLeakCheck(answers: LeakAnswers, questions: LeakQuestion[] = LEAK_QUESTIONS): LeakResult {
  let total = 0
  let answered = 0
  const findings: LeakFinding[] = []
  const strengths: string[] = []
  for (const q of questions) {
    const i = answers[q.id]
    const option = typeof i === 'number' ? q.options[i] : undefined
    if (!option) continue
    answered++
    total += option.score
    if (option.score >= 2) {
      findings.push({ id: `leak-${q.id}`, provider: q.area, severity: option.score === 3 ? 'high' : 'medium', topic: q.topic, leak: q.leak, firstFix: q.firstFix, score: option.score })
    } else if (option.score === 0) {
      strengths.push(q.topic)
    }
  }
  findings.sort((a, b) => b.score - a.score || questions.findIndex(q => `leak-${q.id}` === a.id) - questions.findIndex(q => `leak-${q.id}` === b.id))
  return { leakIndex: answered ? Math.round((total / (answered * 3)) * 100) : 0, answered, findings, strengths }
}

export function leakIndexLabel(index: number): string {
  if (index <= 15) return 'Tight. Few leaks.'
  if (index <= 40) return 'Some leaks worth fixing.'
  if (index <= 65) return 'Significant leaks.'
  return 'Leaking badly. Start with the top two.'
}
