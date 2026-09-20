import { useMemo, useState } from 'react'
import { ArrowUpRight, Compass, Home, Menu, MessageSquare, MoreHorizontal, Radar, Search, Users } from 'lucide-react'
import { useNetwork } from '../store'
import { useNav, type Page } from '../nav'
import { rankMatches } from '../matching'
import { Face } from '../ui'
import type { Member } from '../social'

const workspaceNav: Array<{ label: string; note: string; page: Page; icon: typeof Home }> = [
  { label: 'Home', note: 'Brief', page: 'home', icon: Home },
  { label: 'Network', note: 'People', page: 'discover', icon: Users },
  { label: 'Opportunities', note: 'Signals', page: 'opportunities', icon: Compass },
  { label: 'Messages', note: 'Threads', page: 'messages', icon: MessageSquare },
  { label: 'More', note: 'Tools', page: 'briefing', icon: MoreHorizontal },
]

export default function SimpleViewPage() {
  const net = useNetwork()
  const nav = useNav()
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()
  const hit = (...parts: Array<string | undefined>) => !query || parts.filter(Boolean).join(' ').toLowerCase().includes(query)

  const me = net.profile
  const ranked = useMemo(() => rankMatches(me, net.members, net.connections), [me, net.members, net.connections])
  const lead = ranked[0]
  const people = ranked.filter(item => item.member.id !== lead?.member.id && hit(item.member.name, item.member.company, item.member.title, item.member.focus, item.member.industry)).slice(0, 5)
  const signals = net.activity.filter(item => hit(item.text, item.kind)).slice(0, 5)
  const memory = net.learnings.filter(item => hit(item.text, item.category, item.source)).slice(0, 4)
  const asks = net.asks.filter(item => hit(item.ask, item.detail, item.industry, item.location)).slice(0, 4)
  const threads = net.threads.filter(thread => {
    const person = net.members.find(member => member.id === thread.memberId)
    return hit(person?.name, thread.introContext, thread.messages[thread.messages.length - 1]?.text)
  }).slice(0, 4)

  const filled = [me.name, me.title, me.company, me.location, me.thesis, me.lookingFor, me.canHelpWith, me.availability]
    .filter(value => Boolean(value && String(value).trim())).length
  const complete = Math.round((filled / 8) * 100)
  const nameOf = (id: string) => net.members.find(member => member.id === id)?.name ?? 'A member'
  const openMember = (member: Member) => nav.openMember(member)

  return <div className="sv">
    <header className="sv-utility">
      <div className="sv-utility-brand"><span className="sv-brandmark">A</span><div><strong>Social View</strong><small>Relationship intelligence</small></div></div>
      <label className="sv-search">
        <Search size={15} aria-hidden="true" />
        <input value={q} onChange={event => setQ(event.target.value)} placeholder="Search people, needs, memory, conversations…" aria-label="Search Social View" />
        {q ? <button className="sv-clear" onClick={() => setQ('')}>Clear</button> : <span>/</span>}
      </label>
      <button className="sv-sync" onClick={() => nav.setPage('memory')}><Radar size={14} /> Memory {complete}%</button>
      <button className="sv-menu" onClick={() => nav.setPage('briefing')} aria-label="Open tools"><Menu size={16} /></button>
    </header>

    <div className="sv-shell">
      <aside className="sv-sidebar">
        <button className="sv-person" onClick={() => nav.setPage('profile')}>
          <span className="sv-self-avatar">{me.initials || 'ME'}</span>
          <span><strong>{me.name || 'Complete your profile'}</strong><small>{me.title || 'Add your role'}{me.company ? ` · ${me.company}` : ''}</small></span>
        </button>
        <div className="sv-stats">
          <div><b>{net.connections.length}</b><span>Connections</span></div>
          <div><b>{net.asks.filter(ask => ask.mine).length}</b><span>Open asks</span></div>
          <div><b>{net.threads.length}</b><span>Threads</span></div>
        </div>
        <nav className="sv-local-nav" aria-label="Social View navigation">
          {workspaceNav.map(item => <button key={item.label} className={item.label === 'Home' ? 'active' : ''} onClick={() => nav.setPage(item.page)}>
            <item.icon size={14} /><span>{item.label}</span><small>{item.note}</small>
          </button>)}
        </nav>
        <div className="sv-status">
          <span className="sv-kicker">Relationship status</span>
          <p>Active Memory organizes your next useful move around people, context, and timing.</p>
          <div className="sv-progress"><span style={{ width: `${complete}%` }} /></div>
          <strong>{complete}% context synced</strong>
        </div>
        <button className="sv-side-action" onClick={() => nav.setPage('preferences')}>Workspace settings</button>
        <button className="sv-side-action" onClick={() => nav.setPage('briefing')}>All tools</button>
      </aside>

      <main className="sv-canvas">
        <section className="sv-masthead">
          <div className="sv-intro">
            <span className="sv-kicker">People × Context × Opportunity</span>
            <h1>Turn your network into <em>meaningful momentum.</em></h1>
            <p>Aetheris reads the people, context, and timing already around you, then makes the next valuable relationship move clear.</p>
          </div>
          <div className="sv-brief">
            <div><span className="sv-kicker">Brief the system in your own words</span><p>Find the person, not the job title. Search the way you would brief someone you trust.</p></div>
            <div className="sv-chips"><span>Active memory</span><span>Explainable reasoning</span><span>Permission first</span></div>
            <div className="sv-now"><span className="sv-kicker">What do you need right now?</span><p>Describe the outcome and Intros will organize the useful next move around people, not noise.</p><button className="sv-text-action" onClick={() => nav.postNeed()}>Post a need <ArrowUpRight size={13} /></button></div>
          </div>
        </section>

        <section className="sv-story-grid">
          <article className="sv-story">
            <span className="sv-kicker">Lead introduction</span>
            {lead ? <>
              <div className="sv-story-person"><Face person={lead.member} large portrait /><div><h2>{lead.member.name} is your strongest current path.</h2><p>{lead.member.title} at {lead.member.company} · {lead.member.location}</p></div></div>
              <p>{lead.match.headline} {lead.member.focus}</p>
              <div className="sv-story-actions"><button className="sv-primary" onClick={() => nav.openIntro(lead.member)}>Request introduction</button><button className="sv-ghost" onClick={() => nav.messageMember(lead.member.id)}>Message</button><button className="sv-text-action" onClick={() => openMember(lead.member)}>Full profile <ArrowUpRight size={13} /></button></div>
            </> : <><h2>Your first strong introduction will appear here.</h2><p>Complete your profile and connect with members to build an explainable match.</p><button className="sv-primary" onClick={() => nav.setPage('profile')}>Complete profile</button></>}
          </article>

          <article className="sv-actions">
            <span className="sv-kicker">Actionable layer</span>
            {lead ? <ul>{lead.match.components.slice(0, 4).map(component => <li key={component.label}><span>{component.label}</span><p>{component.evidence}</p><b>+{component.score}</b></li>)}</ul> : <p>Relationship evidence will appear as your network grows.</p>}
            <p className="sv-editorial-note">A score is only useful when the reasons remain visible.</p>
          </article>

          <aside className="sv-attention">
            <span className="sv-kicker">What deserves attention</span>
            <ul>
              <li><strong>{net.threads.length} active conversations</strong><small>Prepared conversations can be updated against current context.</small></li>
              <li><strong>{net.asks.length} needs in view</strong><small>Open intent creates a reason for the right person to respond.</small></li>
              {lead && <li><strong>{lead.member.name} is highest fit</strong><small>{lead.match.total}/100 relationship fit with evidence attached.</small></li>}
              <li><strong>{signals.length} changing signals</strong><small>Recent relationship movement worth reviewing.</small></li>
            </ul>
            <button className="sv-text-action" onClick={() => nav.setPage('insights')}>Open insights <ArrowUpRight size={13} /></button>
          </aside>
        </section>

        <section className="sv-module-head"><div><span className="sv-kicker">Relationship workspace</span><h2>Move what matters forward.</h2></div><button className="sv-ghost" onClick={() => nav.setPage('discover')}>Open network</button></section>
        <section className="sv-modules">
          <article className="sv-module">
            <header><div><span className="sv-kicker">People</span><h3>Worth knowing</h3></div><b>{String(people.length).padStart(2, '0')}</b></header>
            {people.length ? <ul className="sv-list">{people.map((item, index) => <li key={item.member.id}><span>{String(index + 1).padStart(2, '0')}</span><div><button className="sv-link" onClick={() => openMember(item.member)}>{item.member.name}</button><small>{item.member.title} · {item.member.company}</small></div><b>{item.match.total}<small>FIT</small></b><button className="sv-icon-action" onClick={() => nav.messageMember(item.member.id)} aria-label={`Message ${item.member.name}`}>↗</button></li>)}</ul> : <p className="sv-empty">No members match that search yet.</p>}
          </article>

          <article className="sv-module">
            <header><div><span className="sv-kicker">Intent</span><h3>Needs in motion</h3></div><b>{String(asks.length).padStart(2, '0')}</b></header>
            {asks.length ? <ul className="sv-plain">{asks.map(ask => <li key={ask.id}><span className="sv-tag">{ask.industry || 'Open need'}</span><strong>{ask.ask}</strong><small>{nameOf(ask.memberId)} · {ask.location || 'Location open'}</small><div><button className="sv-mini" onClick={() => nav.messageMember(ask.memberId)}>Respond</button><button className="sv-mini" onClick={() => net.requestWarmPath(ask.id)}>Warm path</button></div></li>)}</ul> : <p className="sv-empty">No needs match. Add yours so the network can act.</p>}
            <button className="sv-text-action" onClick={() => nav.postNeed()}>Post a need <ArrowUpRight size={13} /></button>
          </article>

          <article className="sv-module">
            <header><div><span className="sv-kicker">Memory</span><h3>Context retained</h3></div><b>{String(memory.length).padStart(2, '0')}</b></header>
            {memory.length ? <ul className="sv-plain">{memory.map(item => <li key={item.id}><span className="sv-tag">{item.category}</span><strong>{item.text}</strong><small>{item.source} · confidence {item.confidence}</small></li>)}</ul> : <p className="sv-empty">Memory fills in as you talk and act.</p>}
            <button className="sv-text-action" onClick={() => nav.setPage('memory')}>Open Active Memory <ArrowUpRight size={13} /></button>
          </article>
        </section>

        <section className="sv-lower">
          <article className="sv-module"><header><div><span className="sv-kicker">Action log</span><h3>Signals worth attention</h3></div><b>{String(signals.length).padStart(2, '0')}</b></header>{signals.length ? <ul className="sv-log">{signals.map((signal, index) => <li key={signal.id}><span>{String(index + 1).padStart(2, '0')}</span><i /><div><strong>{signal.text}</strong><small>{signal.kind} · {signal.when}</small></div></li>)}</ul> : <p className="sv-empty">Signals appear here as relationships change.</p>}</article>
          <article className="sv-module"><header><div><span className="sv-kicker">Conversations</span><h3>Rooms in motion</h3></div><b>{String(threads.length).padStart(2, '0')}</b></header>{threads.length ? <ul className="sv-rooms">{threads.map(thread => <li key={thread.id}><span className="sv-room-avatar">{nameOf(thread.memberId).split(/\s+/).slice(0, 2).map(word => word[0]).join('')}</span><div><strong>{nameOf(thread.memberId)}</strong><small>{thread.messages[thread.messages.length - 1]?.text ?? thread.introContext}</small></div><button className="sv-icon-action" onClick={() => nav.goToThread(thread.id)} aria-label={`Open conversation with ${nameOf(thread.memberId)}`}>↗</button></li>)}</ul> : <p className="sv-empty">Start a conversation with a reason and it lands here.</p>}</article>
        </section>
      </main>
    </div>
  </div>
}