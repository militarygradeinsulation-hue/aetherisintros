import { ArrowRight, Bell, BriefcaseBusiness, CalendarDays, Check, CircleHelp, HeartHandshake, MessageSquare, Plus, Search, Sparkles, Users, type LucideIcon } from 'lucide-react'
import { useNetwork } from '@/aetheris/store'
import type { NetworkMember } from '../networkData'
import type { ActivePage } from '../components/layout/TopNavigation'
import './connected-executive-overview.css'

type Props = {
  name?: string
  members: NetworkMember[]
  connectedIds: ReadonlySet<string>
  onNavigate: (page: ActivePage, memberId?: string) => void
  onConnect: (memberId: string) => void
  onWorkspace: (workspace: string) => void
  onCompose: () => void
}

function Initials({ name }: { name: string }) {
  const letters = name.trim().split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toUpperCase()
  return <span className="ix-cxo-avatar" aria-hidden="true">{letters || 'M'}</span>
}

function Action({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return <button type="button" className="ix-cxo-shortcut" onClick={onClick}><Icon size={16} aria-hidden="true" /><span>{label}</span><ArrowRight size={13} aria-hidden="true" /></button>
}

/**
 * Authenticated-only visual summary. It consumes the existing authoritative
 * NetworkProvider, member directory and persistence callbacks. It MUST NOT
 * import public demo fixtures, mount a second store or infer revenue metrics.
 */
export function ConnectedExecutiveOverview({
  name, members, connectedIds, onNavigate, onConnect, onWorkspace, onCompose,
}: Props) {
  const network = useNetwork()
  const verified = members.filter(member => member.verified)
  const recentPosts = network.posts.filter(post => post.visibility !== 'private').slice(0, 2)
  const recentAsks = network.asks.filter(ask => ask.visibility === 'network' && !['expired', 'closed', 'withdrawn'].includes((ask.status || '').toLowerCase()))
  const unreadThreads = network.threads.filter(thread => thread.unread).length
  const ready = network.synced && !network.networkLoadError
  const displayCount = (value: number) => ready ? value.toLocaleString() : '—'
  const firstName = name?.trim().split(/\s+/)[0]
  const authorFor = (memberId: string) => memberId === 'me'
    ? name || network.profile.name || 'You'
    : network.members.find(member => member.id === memberId)?.name ?? members.find(member => member.id === memberId)?.name ?? 'Network member'
  const openButler = () => window.dispatchEvent(new CustomEvent('aetheris:open-assistant'))

  const stats: Array<{ label: string; value: number; icon: LucideIcon; destination: () => void }> = [
    { label: 'Verified members visible', value: verified.length, icon: Users, destination: () => onNavigate('people') },
    { label: 'Your connections', value: connectedIds.size, icon: HeartHandshake, destination: () => onNavigate('people') },
    { label: 'Network updates', value: network.posts.filter(post => post.visibility !== 'private').length, icon: Bell, destination: onCompose },
    { label: 'Open network asks', value: recentAsks.length, icon: BriefcaseBusiness, destination: () => onWorkspace('needs') },
    { label: 'Unread conversations', value: unreadThreads, icon: MessageSquare, destination: () => onNavigate('messages') },
  ]

  return <section className="ix-connected-overview" aria-label="Your connected executive dashboard">
    <div className="ix-cxo-hero">
      <div className="ix-cxo-hero-copy">
        <span className="ix-cxo-eyebrow"><span className="ix-cxo-live-dot" /> VERIFIED MEMBER WORKSPACE · LIVE CONNECTIONS</span>
        <h2>{firstName ? <>Welcome back, <em>{firstName}.</em></> : <>One connected system <em>for you.</em></>}</h2>
        <p>People. Relationships. Opportunities. Meetings. Intelligence. All in your private member workspace.</p>
        <div className="ix-cxo-hero-actions">
          <button type="button" className="ix-cxo-primary" onClick={onCompose}><Plus size={16} /> Share an update</button>
          <button type="button" className="ix-cxo-secondary" onClick={() => onNavigate('people')}><Search size={15} /> Explore your network</button>
        </div>
      </div>
      <div className="ix-cxo-butler">
        <Sparkles size={23} aria-hidden="true" />
        <span>ASK INTROS BUTLER</span>
        <strong>Context for your next move.</strong>
        <p>Ask about your members, meetings and priorities in the existing assistant.</p>
        <button type="button" onClick={openButler}>Open Butler <ArrowRight size={14} /></button>
      </div>
    </div>

    {network.networkLoadError && <div role="alert" className="ix-cxo-error">
      Some live member data is unavailable. Figures below are withheld until the network reloads.
      <button type="button" onClick={() => window.location.reload()}>Retry loading</button>
    </div>}
    {!network.synced && !network.networkLoadError && <p className="ix-cxo-loading" role="status">Loading your private member data…</p>}

    <div className="ix-cxo-stats" aria-label="Live member counts">
      {stats.map(({ label, value, icon: Icon, destination }) =>
        <button key={label} type="button" className="ix-cxo-stat" onClick={destination}>
          <Icon size={19} aria-hidden="true" />
          <strong>{displayCount(value)}</strong>
          <span>{label}</span>
          <ArrowRight size={12} className="ix-cxo-stat-arrow" aria-hidden="true" />
        </button>)}
    </div>

    <div className="ix-cxo-sections">
      <div className="ix-cxo-panel">
        <div className="ix-cxo-panel-header"><h3>People in your network</h3><button type="button" onClick={() => onNavigate('people')}>View network <ArrowRight size={13}/></button></div>
        {verified.slice(0, 3).map(member =>
          <div className="ix-cxo-person" key={member.id}>
            <button type="button" className="ix-cxo-person-name" onClick={() => onNavigate('profile', member.id)}>
              <Initials name={member.name}/>
              <span><strong>{member.name}</strong><small>{[member.title, member.company].filter(Boolean).join(' · ') || 'Verified member'}</small></span>
            </button>
            <button type="button" className={connectedIds.has(member.id) ? 'ix-cxo-connected' : 'ix-cxo-connect'} onClick={() => onConnect(member.id)} aria-label={connectedIds.has(member.id) ? `Disconnect from ${member.name}` : `Connect with ${member.name}`} aria-pressed={connectedIds.has(member.id)}>
              {connectedIds.has(member.id) ? <><Check size={13}/> Connected</> : <><Plus size={13}/> Connect</>}
            </button>
          </div>)}
        {!verified.length && <p className="ix-cxo-empty">{network.networkLoadError ? 'Directory unavailable.' : 'No verified members in your visible directory yet.'}</p>}
      </div>
      <div className="ix-cxo-panel">
        <div className="ix-cxo-panel-header"><h3>From the live feed</h3><button type="button" onClick={onCompose}>Open feed <ArrowRight size={13}/></button></div>
        {recentPosts.map(post =>
          <button type="button" className="ix-cxo-post" key={post.id} onClick={onCompose}>
            <span className="ix-cxo-post-meta">{authorFor(post.memberId)} <small>· {post.kind} · {post.when}</small></span>
            <span>{post.text}</span>
            <small>{post.visibility === 'network' ? 'Shared with network' : 'Network update'}</small>
          </button>)}
        {!recentPosts.length && <p className="ix-cxo-empty">{network.feedError || network.networkLoadError ? 'The live feed could not be loaded.' : 'No network posts yet. Start a conversation.'}</p>}
      </div>
      <div className="ix-cxo-panel ix-cxo-actions">
        <div className="ix-cxo-panel-header"><h3>Your next actions</h3><span>Connected tools</span></div>
        <Action icon={HeartHandshake} label="Warm introductions" onClick={() => onNavigate('intros')}/>
        <Action icon={BriefcaseBusiness} label="CRM & opportunities" onClick={() => onWorkspace('crm')}/>
        <Action icon={CalendarDays} label="Calendar & meetings" onClick={() => onWorkspace('calendar')}/>
        <Action icon={MessageSquare} label="Private messages" onClick={() => onNavigate('messages')}/>
        <Action icon={CircleHelp} label="Member intelligence" onClick={() => onNavigate('intelligence')}/>
      </div>
    </div>
  </section>
}
