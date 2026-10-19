import type { CrmCompany, CrmPerson } from '../crm/types'
import { opportunityReadiness } from '../opportunity-readiness'
import { normalizeLinkedInUrl } from '../linkedin-import'

export type Icp = {
  id: string; label: string; objective: 'client' | 'partner' | 'investor' | 'referral' | 'hire'
  industries: string; employees: string; revenue: string; titles: string; locations: string
  keywords: string; disqualifiers: string; excludeClients: boolean; excludeContacted: boolean
  minimumFit: number; valueOffer: string
}
export const starter: Icp = { id: 'primary', label: 'Industrial & service founders', objective: 'client', industries: 'industrial, trades, services', employees: '', revenue: '', titles: 'founder, CEO', locations: '', keywords: '', disqualifiers: '', excludeClients: true, excludeContacted: true, minimumFit: 60, valueOffer: '' }
export const statuses = ['new','shortlisted','draft','approved','invited','accepted','follow_up','dismissed','not_appropriate'] as const
export type Status = typeof statuses[number]
export type Workflow = { status: Status; note: string; consent: boolean; updatedAt?: string }
export const initialWorkflow: Workflow = { status: 'new', note: '', consent: false }
export const transitions: Record<Status, readonly Status[]> = {
  new: ['shortlisted','draft','dismissed','not_appropriate'], shortlisted: ['draft','dismissed','not_appropriate'],
  draft: ['draft','approved','dismissed','not_appropriate'], approved: ['draft','invited','dismissed','not_appropriate'],
  invited: ['accepted','not_appropriate'], accepted: ['follow_up','not_appropriate'], follow_up: ['follow_up','not_appropriate'],
  dismissed: ['shortlisted'], not_appropriate: [],
}
export function canTransition(from: Status, to: Status) { return transitions[from]?.includes(to) ?? false }
const terms = (text: string) => text.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
const contains = (value: string, term: string) => new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}($|[^a-z0-9])`, 'i').test(value)
export function scoreProspect(icp: Icp, person: CrmPerson, company?: CrmCompany, contacted = false, consent = false) {
  const corpus = [person.title,person.companyName,person.location,person.notes,...person.tags,company?.industry].filter(Boolean).join(' ')
  const excluded = person.archived ? 'Archived CRM person' : icp.excludeClients && person.lifecycle === 'Customer' ? 'Current client'
    : icp.excludeContacted && contacted ? 'Already contacted' : terms(icp.disqualifiers).some(t => contains(corpus,t)) ? 'Disqualifier matched' : null
  const fields = [
    ['Role',icp.titles,person.title,30], ['Industry',icp.industries,company?.industry ?? '',25],
    ['Location',icp.locations,person.location || company?.location || '',15], ['Keywords',icp.keywords,corpus,10],
    ['Employee band',icp.employees,company?.employees ?? '',10], ['Revenue band',icp.revenue,company?.revenueBand ?? '',10],
  ] as const
  const active = fields.filter(([,target]) => terms(target).length)
  const denominator = active.reduce((s,f) => s+f[3],0)
  const breakdown = active.map(([label,target,value,weight]) => ({ label,weight,known: !!value.trim(),matched: terms(target).some(t => contains(value,t)), evidence: value.trim() || 'Unknown', kind: value.trim() ? 'CRM record · not independently verified' : 'Unknown' }))
  const score = excluded || !denominator ? 0 : Math.round(breakdown.reduce((s,b) => s+(b.matched ? b.weight : 0),0)/denominator*100)
  const confidence = denominator ? Math.round(breakdown.reduce((s,b) => s+(b.known ? b.weight : 0),0)/denominator*100) : 0
  const readiness = opportunityReadiness([], { contactConsent: consent, reciprocalValue: !!icp.valueOffer.trim() })
  return { score,confidence,breakdown,excluded,readiness,whyThem: breakdown.filter(b => b.matched).map(b => `${b.label}: ${b.evidence}`).join(' · ') || 'No documented fit yet.', whyMe: icp.valueOffer || 'Your contribution is not recorded.', whyNow: 'No independently verified timing signal.', nextAction: excluded ? 'Do not contact under this ICP.' : score < icp.minimumFit ? 'Review missing fit evidence.' : readiness.nextAction }
}
export function draftNote(person: CrmPerson, icp: Icp) {
  const first = person.fullName.trim().split(/\s+/)[0] || 'Hello'
  const context = person.companyName ? ` about ${person.companyName}` : ''
  return `Hi ${first}, I’d like to connect${context}.${icp.valueOffer.trim() ? ` ${icp.valueOffer.trim()}` : ''} Would you be open to a conversation?`.slice(0,300)
}
export function reviewNote(note: string) {
  const issues: string[] = []
  if (!note.trim() || note.length > 300) issues.push('Use a note between 1 and 300 characters.')
  if (/i (?:loved|enjoyed|saw|read)|we met|as discussed|guarantee|limited time|buy now/i.test(note)) issues.push('Remove unsupported familiarity or promotional claims.')
  if (/https?:\/\//i.test(note)) issues.push('Remove promotional links from the connection note.')
  return issues
}
export function safeLinkedInLink(value: string) { return normalizeLinkedInUrl(value) || null }
/** Only a navigation effect; never sends or mutates workflow state. */
export function openManualProfile(url: string, open: (url:string,target:string,features:string) => unknown) {
  const link = safeLinkedInLink(url)
  if (!link) return false
  open(link,'_blank','noopener,noreferrer')
  return true
}
export function isDuplicate(candidate: Partial<CrmPerson>, existing: readonly Partial<CrmPerson>[]) {
  const norm = (s?: string) => (s ?? '').trim().toLowerCase()
  const url = candidate.linkedinUrl ? safeLinkedInLink(candidate.linkedinUrl) : null
  return existing.some(p => (norm(candidate.email) && norm(candidate.email) === norm(p.email)) || (url && url === safeLinkedInLink(p.linkedinUrl ?? '')) || (norm(candidate.fullName) && norm(candidate.companyName) && norm(candidate.fullName) === norm(p.fullName) && norm(candidate.companyName) === norm(p.companyName)))
}