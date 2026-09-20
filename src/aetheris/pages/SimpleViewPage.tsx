import { useMemo, useState } from 'react'
import { ArrowUpRight, Compass, Home, Menu, MessageSquare, MoreHorizontal, PenLine, Radar, Search, Send, Users, X } from 'lucide-react'
import { useNetwork } from '../store'
import { useNav, type Page } from '../nav'
import { rankMatches } from '../matching'
import { newsAge, useAetherisNews, type NewsItem } from '../news'
import { Face } from '../ui'
import { NewsReader } from './NewsReader'
import type { Member } from '../social'

const workspaceNav: Array<{ label: string; note: string; page: Page; icon: typeof Home }> = [
  { label: 'Home', note: 'Brief', page: 'home', icon: Home },
  { label: 'Network', note: 'People', page: 'discover', icon: Users },
  { label: 'Opportunities', note: 'Signals', page: 'opportunities', icon: Compass },
  { label: 'Messages', note: 'Threads', page: 'messages', icon: MessageSquare },
  { label: 'More', note: 'Tools', page: 'briefing', icon: MoreHorizontal },
]

/** Everything Social View can open without leaving the page. */
type Panel =
  | { kind: 'member'; memberId: string }
  | { kind: 'thread'; threadId: string }
  | { kind: 'need' }
  | { kind: 'journal' }
  | { kind: 'news'; item: NewsItem }
  | { kind: 'memory' }
  | { kind: 'signals' }
  | null

export default function SimpleViewPage() {
  const net = useNetwork()
  const nav = useNav()
  const [q, setQ] = useState('')
  const [panel, setPanel] = useState<Panel>(null)
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
  const openMember = (member: Member) => setPanel({ kind: 'member', memberId: member.id })
  const openConversation = (memberId: string) => setPanel({ kind: 'thread', threadId: net.openThreadWith(memberId) })
  const news = useAetherisNews()
  const headlines = (news.data?.items ?? []).filter(item => hit(item.title, item.summary, item.source, item.category)).slice(0, 5)

  return <div className="sv">
    <header className="sv-utility">
      <div className="sv-utility-brand"><span className="sv-brandmark">A</span><div><strong>Social View</strong><small>Relationship intelligence</small></div></div>
      <label className="sv-search">
        <Search size={15} aria-hidden="true" />
        <input value={q} onChange={event => setQ(event.target.value)} placeholder="Search people, needs, memory, conversations…" aria-label="Search Social View" />
        {q ? <button className="sv-clear" onClick={() => setQ('')}>Clear</button> : <span>/</span>}
      </label>
      <button className="sv-sync" onClick={() => setPanel({ kind: 'memory' })}><Radar size={14} /> Memory {complete}%</button>
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
        <div className="sv-quick">
          <span className="sv-kicker">Do it here</span>
          <button className="sv-primary" onClick={() => setPanel({ kind: 'journal' })}><PenLine size={12} /> Write a journal entry</button>
          <button className="sv-ghost" onClick={() => setPanel({ kind: 'need' })}>Post a need</button>
          <button className="sv-ghost" onClick={() => setPanel(threads[0] ? { kind: 'thread', threadId: threads[0].id } : { kind: 'memory' })}>Open a conversation</button>
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
            <p>Ask Intros reads the people, context, and timing already around you, then makes the next valuable relationship move clear — all from this one page.</p>
          </div>
          <div className="sv-brief">
            <div><span className="sv-kicker">Brief the system in your own words</span><p>Find the person, not the job title. Search the way you would brief someone you trust.</p></div>
            <div className="sv-chips"><span>Active memory</span><span>Explainable reasoning</span><span>Permission first</span></div>
            <div className="sv-now"><span className="sv-kicker">What do you need right now?</span><p>Describe the outcome and Intros will organize the useful next move around people, not noise.</p><button className="sv-text-action" onClick={() => setPanel({ kind: 'need' })}>Post a need <ArrowUpRight size={13} /></button></div>
          </div>
        </section>

        <section className="sv-story-grid">
          <article className="sv-story">
            <span className="sv-kicker">Lead introduction</span>
            {lead ? <>
              <div className="sv-story-person"><Face person={lead.member} large portrait /><div><h2>{lead.member.name} is your strongest current path.</h2><p>{lead.member.title} at {lead.member.company} · {lead.member.location}</p></div></div>
              <p>{lead.match.headline} {lead.member.focus}</p>
              <div className="sv-story-actions"><button className="sv-primary" onClick={() => { net.requestIntro(lead.member.id); setPanel({ kind: 'member', memberId: lead.member.id }) }}>Request introduction</button><button className="sv-ghost" onClick={() => openConversation(lead.member.id)}>Message</button><button className="sv-text-action" onClick={() => openMember(lead.member)}>Full profile <ArrowUpRight size={13} /></button></div>
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
            <button className="sv-text-action" onClick={() => setPanel({ kind: 'signals' })}>Review every signal <ArrowUpRight size={13} /></button>
          </aside>
        </section>

        <section className="sv-module-head"><div><span className="sv-kicker">Relationship workspace</span><h2>Move what matters forward.</h2></div><button className="sv-ghost" onClick={() => setPanel({ kind: 'journal' })}>Write an entry</button></section>
        <section className="sv-modules">
          <article className="sv-module">
            <header><div><span className="sv-kicker">People</span><h3>Worth knowing</h3></div><b>{String(people.length).padStart(2, '0')}</b></header>
            {people.length ? <ul className="sv-list">{people.map((item, index) => <li key={item.member.id}><span>{String(index + 1).padStart(2, '0')}</span><div><button className="sv-link" onClick={() => openMember(item.member)}>{item.member.name}</button><small>{item.member.title} · {item.member.company}</small></div><b>{item.match.total}<small>FIT</small></b><button className="sv-icon-action" onClick={() => openConversation(item.member.id)} aria-label={`Message ${item.member.name}`}>↗</button></li>)}</ul> : <p className="sv-empty">No members match that search yet.</p>}
          </article>

          <article className="sv-module">
            <header><div><span className="sv-kicker">Intent</span><h3>Needs in motion</h3></div><b>{String(asks.length).padStart(2, '0')}</b></header>
            {asks.length ? <ul className="sv-plain">{asks.map(ask => <li key={ask.id}><span className="sv-tag">{ask.industry || 'Open need'}</span><strong>{ask.ask}</strong><small>{nameOf(ask.memberId)} · {ask.location || 'Location open'}</small><div><button className="sv-mini" onClick={() => openConversation(ask.memberId)}>Respond</button><button className="sv-mini" onClick={() => net.requestWarmPath(ask.id)}>Warm path</button></div></li>)}</ul> : <p className="sv-empty">No needs match. Add yours so the network can act.</p>}
            <button className="sv-text-action" onClick={() => setPanel({ kind: 'need' })}>Post a need <ArrowUpRight size={13} /></button>
          </article>

          <article className="sv-module">
            <header><div><span className="sv-kicker">Memory</span><h3>Context retained</h3></div><b>{String(memory.length).padStart(2, '0')}</b></header>
            {memory.length ? <ul className="sv-plain">{memory.map(item => <li key={item.id}><span className="sv-tag">{item.category}</span><strong>{item.text}</strong><small>{item.source} · confidence {item.confidence}</small></li>)}</ul> : <p className="sv-empty">Memory fills in as you talk and act.</p>}
            <button className="sv-text-action" onClick={() => setPanel({ kind: 'memory' })}>Open Active Memory <ArrowUpRight size={13} /></button>
          </article>
        </section>

        <section className="sv-lower">
          <article className="sv-module"><header><div><span className="sv-kicker">Action log</span><h3>Signals worth attention</h3></div><b>{String(signals.length).padStart(2, '0')}</b></header>{signals.length ? <ul className="sv-log">{signals.map((signal, index) => <li key={signal.id}><span>{String(index + 1).padStart(2, '0')}</span><i /><div><strong>{signal.text}</strong><small>{signal.kind} · {signal.when}</small></div></li>)}</ul> : <p className="sv-empty">Signals appear here as relationships change.</p>}<button className="sv-text-action" onClick={() => setPanel({ kind: 'signals' })}>See all signals <ArrowUpRight size={13} /></button></article>
          <article className="sv-module"><header><div><span className="sv-kicker">Conversations</span><h3>Rooms in motion</h3></div><b>{String(threads.length).padStart(2, '0')}</b></header>{threads.length ? <ul className="sv-rooms">{threads.map(thread => <li key={thread.id}><span className="sv-room-avatar">{nameOf(thread.memberId).split(/\s+/).slice(0, 2).map(word => word[0]).join('')}</span><div><strong>{nameOf(thread.memberId)}</strong><small>{thread.messages[thread.messages.length - 1]?.text ?? thread.introContext}</small></div><button className="sv-icon-action" onClick={() => setPanel({ kind: 'thread', threadId: thread.id })} aria-label={`Open conversation with ${nameOf(thread.memberId)}`}>↗</button></li>)}</ul> : <p className="sv-empty">Start a conversation with a reason and it lands here.</p>}</article>
        </section>

        <section className="sv-lower">
          <article className="sv-module">
            <header><div><span className="sv-kicker">News</span><h3>The intelligence feed</h3></div><b>{String(headlines.length).padStart(2, '0')}</b></header>
            {news.isLoading ? <p className="sv-empty">Loading the Ask Intros feed…</p>
              : headlines.length ? <ul className="sv-news-list">{headlines.map(item => <li key={item.id}>
                <small>{item.source} · {newsAge(item.published)}</small>
                <button type="button" className="sv-news-title" onClick={() => setPanel({ kind: 'news', item })}>{item.title}</button>
              </li>)}</ul> : <p className="sv-empty">The feed is quiet right now.</p>}
          </article>
        </section>
      </main>
    </div>

    {panel && <SocialSheet panel={panel} close={() => setPanel(null)} openMember={id => setPanel({ kind: 'member', memberId: id })} openThread={id => setPanel({ kind: 'thread', threadId: id })} />}
  </div>
}

/** One in-page sheet: profiles, conversations, needs, journal, memory, signals and news all stay here. */
function SocialSheet({ panel, close, openMember, openThread }: {
  panel: Exclude<Panel, null>
  close: () => void
  openMember: (id: string) => void
  openThread: (id: string) => void
}) {
  const net = useNetwork()
  const nameOf = (id: string) => net.members.find(member => member.id === id)?.name ?? 'A member'
  const title = panel.kind === 'member' ? nameOf(panel.memberId)
    : panel.kind === 'thread' ? nameOf(net.threads.find(t => t.id === panel.threadId)?.memberId ?? '')
    : panel.kind === 'need' ? 'Post a need'
    : panel.kind === 'journal' ? 'Write a journal entry'
    : panel.kind === 'memory' ? 'Active Memory'
    : panel.kind === 'signals' ? 'Every signal'
    : 'Reading'

  return <div className="sv-sheet-wrap" role="dialog" aria-label={title}>
    <button className="sv-sheet-scrim" aria-label="Close" onClick={close} />
    <section className="sv-sheet">
      <header><span className="sv-kicker">Stays on this page</span><strong>{title}</strong><button className="sv-sheet-close" onClick={close} aria-label="Close"><X size={15} /></button></header>
      <div className="sv-sheet-body">
        {panel.kind === 'member' && <MemberSheet memberId={panel.memberId} openThread={openThread} />}
        {panel.kind === 'thread' && <ThreadSheet threadId={panel.threadId} openMember={openMember} />}
        {panel.kind === 'need' && <NeedSheet done={close} />}
        {panel.kind === 'journal' && <JournalSheet done={close} />}
        {panel.kind === 'memory' && <MemorySheet />}
        {panel.kind === 'signals' && <SignalSheet />}
        {panel.kind === 'news' && <NewsReader item={panel.item} onBack={close} />}
      </div>
    </section>
  </div>
}

function MemberSheet({ memberId, openThread }: { memberId: string; openThread: (id: string) => void }) {
  const net = useNetwork()
  const member = net.members.find(item => item.id === memberId)
  if (!member) return <p className="sv-empty">This member is no longer in view.</p>
  const connected = net.connections.includes(member.id)
  const saved = net.saved.includes(member.id)
  const requested = member.introState !== 'recommended'
  return <div className="sv-sheet-stack">
    <div className="sv-sheet-person"><Face person={member} large portrait /><div><strong>{member.name}</strong><small>{member.title} · {member.company}</small><small>{member.location}</small></div></div>
    <p>{member.thesis}</p>
    <dl className="sv-sheet-facts">
      <div><dt>Currently looking for</dt><dd>{member.needs.join(' · ') || '—'}</dd></div>
      <div><dt>Can help with</dt><dd>{member.offers.join(' · ') || '—'}</dd></div>
      <div><dt>Focus</dt><dd>{member.focus || '—'}</dd></div>
      <div><dt>Availability</dt><dd>{member.availability || '—'}</dd></div>
    </dl>
    <div className="sv-sheet-actions">
      <button className="sv-primary" onClick={() => openThread(net.openThreadWith(member.id))}>Message</button>
      <button className="sv-ghost" onClick={() => net.connect(member.id)}>{connected ? 'Connected' : 'Connect'}</button>
      <button className="sv-ghost" onClick={() => net.requestIntro(member.id)}>{requested ? 'Intro requested' : 'Request intro'}</button>
      <button className="sv-ghost" onClick={() => net.toggleSave(member.id, member.name)}>{saved ? 'Saved' : 'Save'}</button>
    </div>
  </div>
}

function ThreadSheet({ threadId, openMember }: { threadId: string; openMember: (id: string) => void }) {
  const net = useNetwork()
  const [text, setText] = useState('')
  const thread = net.threads.find(item => item.id === threadId)
  if (!thread) return <p className="sv-empty">This conversation is no longer available.</p>
  const name = net.members.find(member => member.id === thread.memberId)?.name ?? 'A member'
  function send() {
    const body = text.trim()
    if (!body) return
    net.sendMessage(thread!.id, body)
    setText('')
  }
  return <div className="sv-sheet-stack">
    <button className="sv-link" onClick={() => openMember(thread.memberId)}>Open {name}’s profile</button>
    <p className="sv-empty">{thread.introContext}</p>
    <ul className="sv-chat">
      {thread.messages.map(message => <li key={message.id} className={message.from === 'me' ? 'mine' : ''}><p>{message.text}</p><small>{message.at}</small></li>)}
    </ul>
    <div className="sv-sheet-compose">
      <textarea value={text} onChange={event => setText(event.target.value)} placeholder={`Write to ${name}…`} rows={3} aria-label="Message" />
      <button className="sv-primary" onClick={send}><Send size={12} /> Send</button>
    </div>
  </div>
}

function NeedSheet({ done }: { done: () => void }) {
  const net = useNetwork()
  const [ask, setAsk] = useState('')
  const [detail, setDetail] = useState('')
  const [whyNow, setWhyNow] = useState('')
  const [offer, setOffer] = useState('')
  const [industry, setIndustry] = useState('')
  const [location, setLocation] = useState('')
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high'>('medium')
  function post() {
    if (!ask.trim()) return
    net.addAsk({ ask: ask.trim(), detail: detail.trim(), whyNow: whyNow.trim(), offer: offer.trim(), industry: industry.trim(), location: location.trim(), urgency, visibility: 'network' })
    done()
  }
  return <div className="sv-sheet-stack">
    <p className="sv-empty">State the outcome you need. Your network sees the need, not a pitch.</p>
    <label className="sv-field"><span>What do you need?</span><textarea value={ask} onChange={e => setAsk(e.target.value)} rows={2} /></label>
    <label className="sv-field"><span>Context</span><textarea value={detail} onChange={e => setDetail(e.target.value)} rows={3} /></label>
    <label className="sv-field"><span>Why now</span><input value={whyNow} onChange={e => setWhyNow(e.target.value)} /></label>
    <label className="sv-field"><span>What you offer in return</span><input value={offer} onChange={e => setOffer(e.target.value)} /></label>
    <div className="sv-field-row">
      <label className="sv-field"><span>Industry</span><input value={industry} onChange={e => setIndustry(e.target.value)} /></label>
      <label className="sv-field"><span>Location</span><input value={location} onChange={e => setLocation(e.target.value)} /></label>
      <label className="sv-field"><span>Urgency</span><select value={urgency} onChange={e => setUrgency(e.target.value as 'low' | 'medium' | 'high')}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
    </div>
    <div className="sv-sheet-actions"><button className="sv-primary" onClick={post}>Post the need</button><button className="sv-ghost" onClick={done}>Cancel</button></div>
  </div>
}

function JournalSheet({ done }: { done: () => void }) {
  const net = useNetwork()
  const [headline, setHeadline] = useState('')
  const [note, setNote] = useState('')
  const [visibility, setVisibility] = useState<'network' | 'private'>('network')
  function post() {
    if (!headline.trim()) return
    net.addPost(headline.trim(), note.trim(), [], visibility)
    done()
  }
  return <div className="sv-sheet-stack">
    <p className="sv-empty">Journal entries attach to your profile so the right people understand what you are working on.</p>
    <label className="sv-field"><span>Headline</span><textarea value={headline} onChange={e => setHeadline(e.target.value)} rows={2} /></label>
    <label className="sv-field"><span>The note</span><textarea value={note} onChange={e => setNote(e.target.value)} rows={5} /></label>
    <label className="sv-field"><span>Who sees it</span><select value={visibility} onChange={e => setVisibility(e.target.value as 'network' | 'private')}><option value="network">My network</option><option value="private">Private</option></select></label>
    <div className="sv-sheet-actions"><button className="sv-primary" onClick={post}>Publish entry</button><button className="sv-ghost" onClick={done}>Cancel</button></div>
  </div>
}

function MemorySheet() {
  const net = useNetwork()
  if (!net.learnings.length) return <p className="sv-empty">Memory fills in as you talk and act inside Intros.</p>
  return <ul className="sv-plain">{net.learnings.map(item => <li key={item.id}><span className="sv-tag">{item.category}</span><strong>{item.text}</strong><small>{item.source} · confidence {item.confidence}</small></li>)}</ul>
}

function SignalSheet() {
  const net = useNetwork()
  if (!net.activity.length) return <p className="sv-empty">Signals appear here as relationships change.</p>
  return <ul className="sv-log">{net.activity.map((signal, index) => <li key={signal.id}><span>{String(index + 1).padStart(2, '0')}</span><i /><div><strong>{signal.text}</strong><small>{signal.kind} · {signal.when}</small></div></li>)}</ul>
}
