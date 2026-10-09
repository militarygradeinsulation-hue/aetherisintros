/**
 * Quick Menu rules (no React): the catalog of actions a member can put on their right-click
 * menu, the default set, and the small helpers the menu and its editor share.
 */

export type QuickTarget =
  | { kind: 'page'; page: 'home' | 'people' | 'intros' | 'messages' | 'meetings' | 'news' | 'insights' }
  | { kind: 'workspace'; page: string }

export interface QuickAction {
  id: string
  label: string
  hint: string
  target: QuickTarget
}

/** Everything a member can choose from, in the order the editor lists them. */
export const QUICK_ACTIONS: QuickAction[] = [
  { id: 'new-ask', label: 'Post an ask', hint: 'Ask the network for help', target: { kind: 'workspace', page: 'needs' } },
  { id: 'people', label: 'Find people', hint: 'Search members', target: { kind: 'page', page: 'people' } },
  { id: 'intros', label: 'Introductions', hint: 'Requests and accepted intros', target: { kind: 'page', page: 'intros' } },
  { id: 'messages', label: 'Messages', hint: 'Your conversations', target: { kind: 'page', page: 'messages' } },
  { id: 'meetings', label: 'Meetings', hint: 'Start or join a call', target: { kind: 'page', page: 'meetings' } },
  { id: 'warmpaths', label: 'Warm paths', hint: 'Who can introduce you', target: { kind: 'workspace', page: 'warmpaths' } },
  { id: 'events', label: 'Events', hint: 'Dinners and roundtables', target: { kind: 'workspace', page: 'events' } },
  { id: 'peergroups', label: 'Peer groups', hint: 'Your confidential group', target: { kind: 'workspace', page: 'peergroups' } },
  { id: 'providers', label: 'Trusted providers', hint: 'Firms members vouch for', target: { kind: 'workspace', page: 'providers' } },
  { id: 'calendar', label: 'Calendar', hint: 'Your schedule', target: { kind: 'workspace', page: 'calendar' } },
  { id: 'crm', label: 'CRM', hint: 'People, companies, deals', target: { kind: 'workspace', page: 'crm' } },
  { id: 'agentinbox', label: 'Agent inbox', hint: 'Requests from AI agents', target: { kind: 'workspace', page: 'agentinbox' } },
  { id: 'home', label: 'Home', hint: 'This week', target: { kind: 'page', page: 'home' } },
  { id: 'news', label: 'News', hint: 'What changed', target: { kind: 'page', page: 'news' } },
  { id: 'insights', label: 'Insights', hint: 'Your network at a glance', target: { kind: 'page', page: 'insights' } },
  { id: 'profile', label: 'My profile', hint: 'How others see you', target: { kind: 'workspace', page: 'profile' } },
  { id: 'settings', label: 'Settings', hint: 'Preferences and privacy', target: { kind: 'workspace', page: 'preferences' } },
]

export const DEFAULT_QUICK_ITEMS = ['new-ask', 'people', 'intros', 'messages', 'meetings', 'warmpaths', 'events', 'settings']
export const MAX_QUICK_ITEMS = 10

const byId = new Map(QUICK_ACTIONS.map(a => [a.id, a]))

export const quickAction = (id: string): QuickAction | undefined => byId.get(id)

/** Known ids only, no repeats, at most MAX_QUICK_ITEMS; null/garbage falls back to the default. */
export function cleanItems(items: unknown): string[] {
  if (!Array.isArray(items)) return [...DEFAULT_QUICK_ITEMS]
  const seen = new Set<string>()
  const out: string[] = []
  for (const id of items) {
    if (typeof id === 'string' && byId.has(id) && !seen.has(id)) { seen.add(id); out.push(id) }
    if (out.length === MAX_QUICK_ITEMS) break
  }
  return out
}

/** Moves one item up (-1) or down (+1); out-of-range moves leave the list unchanged. */
export function moveItem(items: string[], id: string, delta: -1 | 1): string[] {
  const i = items.indexOf(id)
  const j = i + delta
  if (i < 0 || j < 0 || j >= items.length) return items
  const next = [...items]
  ;[next[i], next[j]] = [next[j]!, next[i]!]
  return next
}

/** Adds or removes an item; adding past the limit does nothing. */
export function toggleItem(items: string[], id: string): string[] {
  if (items.includes(id)) return items.filter(x => x !== id)
  if (!byId.has(id) || items.length >= MAX_QUICK_ITEMS) return items
  return [...items, id]
}

/** Keeps a menu of the given size fully on screen, opening up/left near the edges. */
export function placeMenu(x: number, y: number, width: number, height: number, viewW: number, viewH: number, margin = 8) {
  const left = x + width + margin > viewW ? Math.max(margin, x - width) : x
  const top = y + height + margin > viewH ? Math.max(margin, viewH - height - margin) : y
  return { left: Math.round(left), top: Math.round(top) }
}

/** Where the browser's own menu should win: typing fields, editable text and media. */
export function wantsNativeMenu(el: Element | null, shiftKey: boolean): boolean {
  if (shiftKey || !el) return true
  return !!el.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"], video, audio, canvas, iframe, [data-native-menu]')
}
