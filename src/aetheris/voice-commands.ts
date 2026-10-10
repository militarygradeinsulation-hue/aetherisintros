/**
 * Spoken (or typed) commands that run instantly, without waiting for the language model:
 * go to a page, find a person or company, message or request an intro to someone, take a
 * note, post an ask. Anything not recognised here goes to the Ask Intros assistant, which can
 * answer questions and return the same kinds of actions.
 */
import type { AskIntrosAction } from '@/lib/askIntros.functions'

/** Every place a member can go, with the words people actually say for it. */
export const VOICE_PAGES: Array<{ page: string; label: string; words: string[] }> = [
  { page: 'home', label: 'Home', words: ['home', 'this week', 'dashboard', 'start'] },
  { page: 'people', label: 'People', words: ['people', 'members', 'directory', 'network', 'search'] },
  { page: 'intros', label: 'Introductions', words: ['introductions', 'intros', 'intro requests'] },
  { page: 'messages', label: 'Messages', words: ['messages', 'inbox', 'chats', 'conversations', 'dms'] },
  { page: 'meetings', label: 'Meetings', words: ['meetings', 'video', 'calls', 'meeting room'] },
  { page: 'news', label: 'News', words: ['news', 'headlines'] },
  { page: 'insights', label: 'Insights', words: ['insights', 'analytics'] },
  { page: 'memory', label: 'Memory', words: ['memory', 'notes', 'my notes'] },
  { page: 'needs', label: 'Asks', words: ['asks', 'needs', 'ask board', 'marketplace'] },
  { page: 'events', label: 'Events', words: ['events', 'dinners', 'roundtables'] },
  { page: 'peergroups', label: 'Peer groups', words: ['peer groups', 'peer group', 'forum', 'my group'] },
  { page: 'providers', label: 'Trusted providers', words: ['providers', 'trusted providers', 'vendors', 'marketplace of providers'] },
  { page: 'warmpaths', label: 'Warm paths', words: ['warm paths', 'warm path', 'paths'] },
  { page: 'calendar', label: 'Calendar', words: ['calendar', 'schedule', 'agenda'] },
  { page: 'crm', label: 'CRM', words: ['crm', 'pipeline', 'contacts'] },
  { page: 'deals', label: 'Deals', words: ['deals', 'deal rooms', 'deal room', 'my deals', 'engagements'] },
  { page: 'companies', label: 'Companies', words: ['companies', 'company list'] },
  { page: 'opportunities', label: 'Opportunities', words: ['opportunities'] },
  { page: 'agentinbox', label: 'Agent inbox', words: ['agent inbox', 'agent requests', 'ai inbox'] },
  { page: 'diagnostic', label: 'Company report', words: ['company report', 'diagnostic', 'leak check'] },
  { page: 'profile', label: 'My profile', words: ['my profile', 'profile'] },
  { page: 'preferences', label: 'Settings', words: ['settings', 'preferences', 'options'] },
]

const clean = (s: string) => s.toLowerCase().replace(/[.,!?;:"“”']/g, ' ').replace(/\s+/g, ' ').trim()

/** The page a phrase names, if any ("my peer group page" → peergroups). */
export function matchPage(phrase: string): string | null {
  const p = clean(phrase).replace(/^(the|my)\s+/, '').replace(/\s+(page|tab|screen|section|area)$/, '').trim()
  if (!p) return null
  for (const entry of VOICE_PAGES) if (entry.words.includes(p) || clean(entry.label) === p) return entry.page
  for (const entry of VOICE_PAGES) if (entry.words.some(w => w.length > 3 && (p.startsWith(w) || p.endsWith(w)))) return entry.page
  return null
}

/** The member a phrase names: exact name first, then a unique first/last-name match. */
export function matchPerson(phrase: string, people: string[]): string | null {
  const p = clean(phrase)
  if (!p) return null
  const exact = people.find(n => clean(n) === p)
  if (exact) return exact
  const partial = people.filter(n => clean(n).split(' ').some(part => part === p) || clean(n).startsWith(p))
  return partial.length === 1 ? partial[0]! : null
}

const act = (kind: string, value: string | null = null, page: string | null = null): AskIntrosAction => ({ kind, page, value })

/** One spoken or typed command, turned into an action; null when the assistant should handle it. */
export function parseVoiceCommand(input: string, people: string[] = []): AskIntrosAction | null {
  const raw = input.trim().replace(/^(hey |ok |okay )?(ask intros|intros)[,:]?\s*/i, '').replace(/^(please|can you|could you|would you)\s+/i, '').trim()
  if (!raw) return null
  let m: RegExpMatchArray | null

  // Notes: "take a note: call Ana Friday", "note that…", "remember to…"
  if ((m = raw.match(/^(?:take a note|make a note|add a note|note|note that|write down|jot down|remember(?: that)?)\s*[:,-]?\s+(.{2,})$/i))) {
    return act('take-note', m[1]!.trim())
  }
  // Messages: "message Ana", "send a message to Ana Diaz"
  if ((m = raw.match(/^(?:message|text|dm|write to|send (?:a )?message to)\s+(.+)$/i))) {
    const person = matchPerson(m[1]!, people)
    if (person) return act('message-member', person)
  }
  // Introductions: "introduce me to Ana", "request an intro to Ana Diaz"
  if ((m = raw.match(/^(?:introduce me to|request (?:an )?intro(?:duction)? (?:to|with)|get me (?:an )?intro(?:duction)? to)\s+(.+)$/i))) {
    const person = matchPerson(m[1]!, people)
    return person ? act('request-intro', person) : act('open-search', m[1]!.trim())
  }
  // Deal rooms: "start a deal with Ana" opens the create form prefilled; nothing is created until confirmed.
  if ((m = raw.match(/^(?:start|open|create) (?:a )?(?:new )?deal(?: room)? with\s+(.+)$/i))) {
    const person = matchPerson(m[1]!, people)
    if (person) return act('start-deal', person)
  }
  // Post an ask: "post an ask about hiring a CFO", "ask the network for a lawyer"
  if ((m = raw.match(/^(?:post (?:an? )?(?:ask|need)|ask the network)(?:\s+(?:about|for|to find))?\s*(.*)$/i))) {
    return act('post-need', m[1]!.trim() || null)
  }
  // Navigation: "go to events", "open my settings", "show me warm paths", "take me to the CRM"
  if ((m = raw.match(/^(?:go to|go back to|open|open up|show(?: me)?|take me to|switch to|bring up|navigate to|i want to see)\s+(.+)$/i))) {
    const page = matchPage(m[1]!)
    if (page) return act('navigate', null, page)
    const person = matchPerson(m[1]!, people)
    if (person) return act('open-member', person)
  }
  // A bare page name: "events", "settings"
  const bare = matchPage(raw)
  if (bare && raw.split(/\s+/).length <= 3) return act('navigate', null, bare)
  // Finding: "find Ana Diaz", "search for logistics CFOs", "look up Acme", "who is Ana"
  if ((m = raw.match(/^(?:find|search(?: for)?|look up|lookup|who is|who's|where is)\s+(.+?)\??$/i))) {
    const person = matchPerson(m[1]!, people)
    return person ? act('open-member', person) : act('open-search', m[1]!.trim())
  }
  // Reading and voice controls
  if (/^(read (this|the)? ?page|read (it|this) (to me|out loud|aloud))$/i.test(raw)) return act('read-page')
  if (/^(stop reading|stop talking|be quiet|quiet)$/i.test(raw)) return act('stop-reading')
  if ((m = raw.match(/^make (?:the )?(?:text|words|font) (bigger|larger|smaller)$/i))) return act('text-size', m[1]!.toLowerCase() === 'smaller' ? 'small' : 'large')
  return null
}

/** What to say back after running a command locally. */
export function confirmation(action: AskIntrosAction, result: string | null): string {
  if (result) return `${result}.`
  if (action.kind === 'open-member' || action.kind === 'message-member' || action.kind === 'request-intro') return `I could not find ${action.value ?? 'that member'} in your network.`
  return 'I could not do that here.'
}
