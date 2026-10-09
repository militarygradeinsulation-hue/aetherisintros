import { useEffect } from 'react'
import { BookOpen, Briefcase, CircleHelp, Fingerprint, HandHelping, LogOut, Network, PlugZap, Route, Settings2, ShieldCheck, UsersRound, X } from 'lucide-react'
import { signOutMember } from '../sync/workspace-sync'
import type { Page } from '../nav'

const RECENT_KEY = 'aetheris.more.recent'

export function readRecent(): Page[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as Page[] } catch { return [] }
}

export function rememberRecent(page: Page) {
  const next = [page, ...readRecent().filter(item => item !== page)].slice(0, 5)
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)) } catch { /* unavailable */ }
}

const utilities: Array<{ id: Page; label: string; note: string; icon: typeof ShieldCheck }> = [
  { id: 'permission', label: 'Security & Privacy', note: 'Verification, privacy, sessions and data controls.', icon: ShieldCheck },
  { id: 'integrations', label: 'Connected Apps', note: 'Manage the services you already use.', icon: PlugZap },
  { id: 'preferences', label: 'Preferences', note: 'Display, voice, pointer and reading choices.', icon: Settings2 },
]

const groups: Array<{ label: string; items: Array<{ id: Page; label: string; note: string; icon: typeof ShieldCheck }> }> = [
  { label: 'Relationship intelligence', items: [
    { id: 'inbox', label: 'Relationship Inbox', note: 'Signals, commitments, and changes that need attention.', icon: Network },
    { id: 'warmpaths', label: 'Warm Paths', note: 'Who can introduce you to a person or company, and how warm each path is.', icon: Route },
    { id: 'evidence', label: 'Evidence Ledger', note: 'The source and confidence behind recommendations.', icon: Fingerprint },
  ] },
  { label: 'Executive work', items: [
    { id: 'peergroups', label: 'Peer Groups', note: 'Your confidential group of peers, its sessions and issues.', icon: UsersRound },
    { id: 'rooms', label: 'Opportunity Rooms', note: 'Move live opportunities with people and context attached.', icon: Briefcase },
    { id: 'providers', label: 'Trusted Providers', note: 'Firms members vouch for, and help finding the right one.', icon: HandHelping },
    { id: 'autopilot', label: 'Approvals', note: 'Review prepared actions before anything leaves your account.', icon: ShieldCheck },
  ] },
  { label: 'Account', items: utilities },
]

/** Deliberately small utility menu. Advanced capabilities remain available through search and hub context. */
export function MoreDrawer({ open, onClose, onNavigate }: {
  open: boolean; page: Page; onClose: () => void; onNavigate: (page: Page) => void
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  const go = (page: Page) => { onNavigate(page); onClose() }
  const signOut = () => signOutMember('/auth')

  return <div className="more-wrap utility-wrap" role="dialog" aria-label="Utilities">
    <button className="more-scrim" aria-label="Close menu" onClick={onClose} />
    <aside className="more-panel utility-panel">
      <header className="more-head"><div><span className="more-eyebrow">ACCOUNT</span><h2>Utilities</h2><p>The essentials, without a directory of features.</p></div>
        <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={17} /></button></header>
      <nav className="utility-list">
        {groups.map(group => <section key={group.label}><span className="utility-group-label">{group.label}</span>{group.items.map((item, index) => { const Icon = item.icon; return <button key={`${item.label}-${index}`} onClick={() => go(item.id)}><Icon size={18} /><span><b>{item.label}</b><small>{item.note}</small></span></button> })}</section>)}
        <button onClick={() => { onClose(); window.dispatchEvent(new CustomEvent('aetheris:open-assistant')) }}><CircleHelp size={18} /><span><b>Help</b><small>Ask Intros about any page, action or decision.</small></span></button>
        <a href="/founder-story"><BookOpen size={18} /><span><b>Founder Story</b><small>Read the complete Architect Behind the Operator.</small></span></a>
        <button className="utility-signout" onClick={() => { void signOut() }}><LogOut size={18} /><span><b>Sign Out</b><small>End this private session.</small></span></button>
      </nav>
    </aside>
  </div>
}