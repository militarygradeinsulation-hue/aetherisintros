/**
 * The single Ask Intros phrase matcher. Existing CEO-view phrases are unchanged;
 * business diagnostic intents route to the Capability Workspace.
 */
import type { CeoRoute } from '../ceo-engine'

export function recognizeCommand(text: string): CeoRoute | null {
  const q = text.toLowerCase().trim()
  if (/show my capital map|who could fund this|introduce me to capital|capital map/.test(q)) return { view: 'capitalMap', arg: q.replace(/.*(?:capital map|fund this|capital)/, '').replace(/[?.!]+$/, '').trim() }
  if (/which customers? need attention|customer risk|accounts? at risk/.test(q)) return { view: 'customerRisk' }
  const negotiation = q.match(/(?:open|start|show)(?: the| a)? negotiation room(?: for)?\s*(.*)$/)
  if (negotiation || /negotiation room/.test(q)) return { view: 'negotiation', arg: negotiation?.[1]?.replace(/[?.!]+$/, '').trim() ?? '' }
  const scenario = q.match(/(?:run|open|start)(?: a)? scenario(?: for)?\s*(.*)$/)
  if (scenario || /what if .*deal slips?|deal slips? (?:30|60|90) days?/.test(q)) return { view: 'scenario', arg: scenario?.[1]?.replace(/[?.!]+$/, '').trim() || q }
  if (/review for delegation|what can i delegate|delegation intelligence/.test(q)) return { view: 'delegation' }
  if (/board network|board help|who could advise the board/.test(q)) return { view: 'boardNetwork', arg: q.replace(/.*(?:board help|board network)/, '').trim() }
  if (/advisor on demand|find (?:me )?an advisor|advisor search|who can advise/.test(q)) return { view: 'advisor', arg: q.replace(/.*(?:advisor|advise)(?: on| me on)?/, '').replace(/[?.!]+$/, '').trim() }
  if (/office hours|availability windows?/.test(q)) return { view: 'officeHours' }
  if (/trust profile|executive reputation/.test(q)) return { view: 'trustProfile', arg: q.replace(/.*(?:trust profile|reputation)(?: for| of)?/, '').replace(/[?.!]+$/, '').trim() }
  if (/private ask|share this ask privately/.test(q)) return { view: 'privateAsk' }
  const memory = q.match(/(?:deal|company) memory(?: for)?\s*(.*)$/)
  if (memory || /why are we here/.test(q)) return { view: 'dealMemory', arg: memory?.[1]?.replace(/[?.!]+$/, '').trim() ?? '' }
  if (/key[- ]person dependenc|dependency risk/.test(q)) return { view: 'dependencies' }
  if (/what am i missing|blind spots?/.test(q)) return { view: 'missing' }
  if (/challenge this|red team|argue against/.test(q)) return { view: 'redteam' }
  if (/who can i help|give value/.test(q)) return { view: 'help' }
  if (/where is my time|time roi/.test(q)) return { view: 'time' }
  if (/single[- ]thread/.test(q)) return { view: 'singles' }
  if (/promises? (put|at risk)|trust at risk|revenue at risk/.test(q)) return { view: 'promises' }
  const rep = q.match(/^replay\s*(?:this)?\s*(.*)$/)
  if (rep) return { view: 'replay', arg: rep[1]?.replace(/^(relationship|deal)\b/, '').replace(/[?.!]+$/, '').trim() ?? '' }
  if (/how did (this|the) deal get here/.test(q)) return { view: 'replay' }
  if (/show patterns|patterns?$/.test(q)) return { view: 'patterns' }
  if (/strategic relationships|stay close to|who should i stay close/.test(q)) return { view: 'strategic' }
  if (/\bbench\b/.test(q)) return { view: 'bench' }
  if (/coverage|relationship map|influence map/.test(q)) return { view: 'coverage', arg: q.replace(/.*(?:coverage|map)(?: for| at| of)?/, '').replace(/[?.!]+$/, '').trim() }
  if (/collision|who should meet/.test(q)) return { view: 'collisions' }
  if (/company(?:-to-| to )company|company match/.test(q)) return { view: 'companies' }
  if (/forecast/.test(q) && /(change|moved|delta|what)/.test(q)) return { view: 'forecast' }
  if (/what changed|what's new|what is new|since my last/.test(q)) return { view: 'changed' }
  if (/forget|chief of staff|what needs me/.test(q)) return { view: 'forgetting' }
  const who = q.match(/who can (?:change|fix|solve|help with) (?:this)?[:\s-]*(.*)$/)
  if (who) return { view: 'who', arg: who[1]?.replace(/[?.!]+$/, '').trim() ?? '' }
  const prep = q.match(/prepare me(?: for)?\s*(.*)$/)
  if (prep) return { view: 'prepare', arg: prep[1]?.replace(/[?.!]+$/, '').replace(/^(my )?(meeting with )?/, '').trim() ?? '' }
  if (/relationships? (needing|that need) attention|needing attention|relationship health/.test(q)) return { view: 'health' }
  if (/(create|new|open|start) (a )?decision/.test(q)) return { view: 'decisions', arg: 'new' }
  if (/(show|my|list).*decisions?/.test(q)) return { view: 'decisions' }
  if (/(create|add|record) (a )?commitment/.test(q)) return { view: 'commit' }
  if (/commitments?|promises?/.test(q)) return { view: 'commitments' }
  if (/board (brief|update|report)/.test(q)) return { view: 'brief', arg: 'board' }
  if (/investor (update|brief)/.test(q)) return { view: 'brief', arg: 'investor' }
  if (/(executive|weekly) brief/.test(q)) return { view: 'brief', arg: 'weekly' }
  if (/approvals?|waiting for (my )?approval/.test(q)) return { view: 'approvals' }
  if (/network roi|roi|intro outcomes/.test(q)) return { view: 'roi' }
  if (/close (the )?meeting|debrief/.test(q)) return { view: 'close' }
  return null
}

export interface CapabilityIntent { capabilityId: string; focus?: 'evidence' | 'prioritize' | 'changed' }

export function recognizeCapabilityIntent(text: string): CapabilityIntent | null {
  const q = text.toLowerCase().trim()
  if (/^diagnose\b|diagnose (this|the|my|a) (company|account|business|opportunity|deal)/.test(q)) return { capabilityId: 'company.diagnose' }
  if (/where (are|am) (we|i) losing money|losing money|revenue leaks?|leaking (money|revenue)/.test(q)) return { capabilityId: 'company.diagnose' }
  if (/why is (our )?revenue (slipping|down|dropping|falling)|revenue (is )?slipping/.test(q)) return { capabilityId: 'company.trace_cause' }
  if (/trace the cause|root cause|ask why again/.test(q)) return { capabilityId: 'company.trace_cause' }
  if (/show me the evidence/.test(q)) return { capabilityId: 'company.diagnose', focus: 'evidence' }
  if (/what happens if (we|i) do nothing|cost of (doing nothing|inaction)/.test(q)) return { capabilityId: 'company.model_impact' }
  if (/what should (i|we) fix first|fix first/.test(q)) return { capabilityId: 'company.diagnose', focus: 'prioritize' }
  if (/what changed (at|in|with) (this|the) (company|account|business)/.test(q)) return { capabilityId: 'company.diagnose', focus: 'changed' }
  return null
}
