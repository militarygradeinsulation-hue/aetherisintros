import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle, ArrowRight, Bookmark, BookmarkCheck, CalendarDays, Check, CheckCircle2, ChevronLeft,
  CircleDot, Compass, Eye, Fingerprint, Handshake, Home as HomeIcon, Layers, LockKeyhole,
  Menu, MessageSquareText, Network, Plus, Search, Send, Share2, ShieldCheck, Target,
  TrendingUp, UserRound, Users, X,
} from 'lucide-react'
import portraitImg from '@/assets/aetheris-editorial-portrait.jpg'
import marcusPortrait from '@/assets/member-marcus.jpg'
import priyaPortrait from '@/assets/member-priya.jpg'
import sarahPortrait from '@/assets/member-sarah.jpg'
import elliotPortrait from '@/assets/member-elliot.jpg'
import { leaks } from './data'
import type { AutonomyLevel, DigitalYouProfile, Objective, PrivacyScope } from './types'
import {
  circles, events, howItWorks5, howIntrosWorks, introStateLabel,
  onboardingQuestions, trendingSectors,
  type Learning, type Member, type NetworkAsk, type Post, type Thread,
} from './social'
import { NetworkProvider, useNetwork, type MemoryNote, type MeProfile } from './store'
import { classifyConnection, composeWarmIntro, radarLabel } from './lib/engine'


type Page = 'home' | 'discover' | 'intros' | 'messages' | 'needs' | 'memory' | 'insights' | 'profile'
type OptIn = 'pending' | 'yes' | 'no'

const nav: Array<{ id: Page; label: string; icon: typeof HomeIcon }> = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'discover', label: 'Discover', icon: Compass },
  { id: 'intros', label: 'Intros', icon: Handshake },
  { id: 'messages', label: 'Messages', icon: MessageSquareText },
  { id: 'needs', label: 'Needs', icon: Target },
  { id: 'memory', label: 'Memory', icon: Network },
  { id: 'insights', label: 'Insights', icon: TrendingUp },
  { id: 'profile', label: 'Profile', icon: UserRound },
]
const legacyPage: Record<string, Page> = {
  command: 'home', people: 'discover', network: 'memory', forensics: 'insights',
  meetings: 'messages', 'digital-you': 'profile', roi: 'insights', settings: 'profile',
}
const scopeLabel: Record<PrivacyScope, string> = { private: 'Private', team: 'Team', organization: 'Organization', shareable: 'Shareable', public: 'Public' }
const scopeText: Record<PrivacyScope, string> = {
  private: 'Only you. It informs relevance but is never quoted.',
  team: 'Visible to your trusted team.',
  organization: 'Visible across your organization.',
  shareable: 'Cleared for an introduction.',
  public: 'Already public context.',
}
const scopes: PrivacyScope[] = ['private', 'team', 'organization', 'shareable', 'public']

/** Navigation intents any member surface can trigger. */
interface NavApi {
  setPage: (p: Page) => void
  openMember: (m: Member) => void
  openIntro: (m: Member) => void
  messageMember: (memberId: string) => void
  goToThread: (threadId: string) => void
  postNeed: () => void
}
const NavCtx = createContext<NavApi | null>(null)
function useNav() {
  const ctx = useContext(NavCtx)
  if (!ctx) throw new Error('useNav must be used inside the Intros shell')
  return ctx
}

/* ---------------------------------------------------------------- primitives */

function Brand() {
  return <div className="brand-mark"><span className="brand-monogram">AI</span><span className="brand-name">Aetheris<em>Intros</em></span></div>
}
function AetherisGlyph({ size = 18 }: { size?: number }) {
  return <span className="aetheris-glyph" style={{ width: size, height: size }} aria-hidden="true"><i /><b /></span>
}
const memberPortraits: Record<string, string> = { p7: sarahPortrait, p8: marcusPortrait, p11: priyaPortrait, p14: elliotPortrait }
function Avatar({ person, large = false, portrait = false }: { person: Member; large?: boolean; portrait?: boolean }) {
  const image = memberPortraits[person.id]
  return <span className={`person-avatar ${large ? 'large' : ''} ${portrait ? 'portrait' : ''}`}>{image ? <img src={image} alt="" width={1024} height={1280} loading="lazy" /> : person.initials}</span>
}
function Button({ children, kind = 'primary', onClick, disabled = false, className = '' }: { children: React.ReactNode; kind?: 'primary' | 'secondary' | 'quiet'; onClick?: () => void; disabled?: boolean; className?: string }) {
  return <button className={`btn ${kind} ${className}`} onClick={onClick} disabled={disabled}>{children}</button>
}
function Label({ children, signal = false }: { children: React.ReactNode; signal?: boolean }) {
  return <span className={`eyebrow ${signal ? 'signal' : ''}`}>{children}</span>
}
function Score({ value }: { value: number }) {
  return <div className="editorial-score"><strong>{value}</strong><span>/100</span></div>
}
function PageHead({ label, title, copy, proof, action }: { label: string; title: string; copy: string; proof?: string; action?: React.ReactNode }) {
  return <header className="page-title">
    <div><Label>{label}</Label><h1>{title}</h1><p>{copy}</p>{proof && <small className="page-proof"><AetherisGlyph size={12} />{proof}</small>}</div>
    {action}
  </header>
}
function SaveButton({ saved, onToggle }: { saved: boolean; onToggle: () => void }) {
  return <button className={`save-btn ${saved ? 'saved' : ''}`} onClick={onToggle} aria-label={saved ? 'Saved' : 'Save member'}>
    {saved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
  </button>
}

/** Editorial ivory field beside a monochrome portrait — the signature Aetheris page opening. */
function EditorialHero({ folio, title, statement, copy, caption, focus = 'center 30%', stats, action, image = portraitImg }: {
  folio: string; title: React.ReactNode; statement: string; copy: string; caption: string
  focus?: string; stats?: Array<{ k: string; v: string }>; action?: React.ReactNode; image?: string
}) {
  return <section className="editorial-hero">
    <div className="editorial-field">
      <span className="folio">{folio}</span>
      <h1>{title}</h1>
      <h2>{statement}</h2>
      <p>{copy}</p>
      {action && <div className="editorial-hero-actions">{action}</div>}
      {stats && <dl className="editorial-stats">{stats.map(s => <div key={s.k}><dt>{s.k}</dt><dd>{s.v}</dd></div>)}</dl>}
      <div className="blueprint-cross">+</div>
    </div>
    <figure className="editorial-plate">
       <img src={image} alt="A composed professional in architectural window light" style={{ objectPosition: focus }} loading="lazy" />
      <figcaption><span>ACTIVE MEMORY</span><p>{caption}</p></figcaption>
    </figure>
  </section>
}

function HowItWorks() {
  return <section className="how-block">
    <header><Label>HOW INTROS WORKS</Label><h2>Context becomes a conversation worth having.</h2></header>
    <ol className="how-sequence">
      {howItWorks5.map((s, i) => <li key={s.step}><span>{String(i + 1).padStart(2, '0')}</span><h3>{s.step}</h3><p>{s.copy}</p></li>)}
    </ol>
  </section>
}



function MemoryGraph({ people, onSelect, compact = false }: { people: Member[]; onSelect: (p: Member) => void; compact?: boolean }) {
  const positions = [[16, 22], [40, 12], [74, 16], [87, 44], [78, 74], [52, 86], [24, 78], [11, 52], [33, 40], [64, 36], [60, 64], [36, 62]]
  return <div className={`memory-graph ${compact ? 'compact' : ''}`}>
    <div className="graph-rings"><i /><i /><i /></div><div className="graph-lines" />
    <button className="graph-origin" aria-label="Your current context"><Eye size={18} /><small>YOU</small></button>
    {people.slice(0, compact ? 6 : 12).map((p, i) => {
      const pos = positions[i % positions.length] ?? [50, 50]
      return <button key={p.id} className={`graph-node ${i === 1 ? 'selected' : ''} ${p.radar === 'hot_now' ? 'signal' : ''}`} style={{ left: `${pos[0]}%`, top: `${pos[1]}%` }} onClick={() => onSelect(p)}>
        <i /><span>{p.name.split(' ')[0]}</span>
      </button>
    })}
    <div className="graph-taxonomy">{['PEOPLE', 'COMPANIES', 'NEEDS', 'MESSAGES', 'INTRODUCTIONS', 'DECISIONS', 'INTERESTS', 'COMMITMENTS'].map(t => <span key={t}>{t}</span>)}</div>
  </div>
}

/* --------------------------------------------------------------------- home */

/** Relationship actions shared by every member surface, so each click changes the graph. */
function MemberActions({ person, compact = false }: { person: Member; compact?: boolean }) {
  const net = useNetwork()
  const nav = useNav()
  const connected = net.connections.includes(person.id)
  const following = net.follows.includes(person.id)
  return <>
    <SaveButton saved={net.saved.includes(person.id)} onToggle={() => net.toggleSave(person.id)} />
    <Button kind="quiet" onClick={() => net.connect(person.id)}>
      {connected ? <><Check size={14} /> Connected</> : <><Plus size={14} /> Connect</>}
    </Button>
    {!compact && <Button kind="quiet" onClick={() => net.follow(person.id)}>{following ? 'Following' : 'Follow'}</Button>}
    <Button kind="secondary" onClick={() => nav.messageMember(person.id)}><MessageSquareText size={14} /> Message</Button>
    <Button onClick={() => nav.openIntro(person)}><Handshake size={14} /> Request intro</Button>
  </>
}

function MemberCard({ person, onOpen }: { person: Member; onOpen: () => void }) {
  return <article className="feed-card member-card">
    <header>
      <button className="card-identity" onClick={onOpen}>
        <Avatar person={person} large portrait />
        <span><Label>{person.role} · {person.industry}</Label><strong>{person.name}</strong><small>{person.title} · {person.company}</small><small>{person.location}</small></span>
      </button>
      <div className="card-score"><Score value={person.scoreTotal} /><span>{classifyConnection(person.scoreTotal)}</span></div>
    </header>
    <div className="card-columns">
      <div><span>LOOKING FOR</span><p>{person.needs.join(' · ')}</p></div>
      <div><span>CAN HELP WITH</span><p>{person.offers.join(' · ')}</p></div>
    </div>
    <div className="card-why"><span>WHY NOW</span><p>{person.whyNow}</p></div>
    <footer>
      <small>{person.mutuals.length ? `Mutual: ${person.mutuals.join(', ')}` : 'Path available through the graph'}</small>
      <div><MemberActions person={person} /></div>
    </footer>
  </article>
}

function AskCard({ ask, member, onOpen }: { ask: NetworkAsk; member: Member | undefined; onOpen: () => void }) {
  const net = useNetwork()
  const nav = useNav()
  const [reply, setReply] = useState('')
  const [open, setOpen] = useState(false)
  const responded = (net.askResponses[ask.id]?.length ?? 0) > 0
  const warm = net.warmPaths.includes(ask.id)
  const mine = ask.memberId === 'me'
  const send = () => {
    const threadId = net.respondToAsk(ask.id, reply.trim())
    setReply(''); setOpen(false)
    if (threadId) nav.goToThread(threadId)
  }
  return <article className="feed-card ask-card">
    <header>
      <button className="ask-author" onClick={onOpen}>{member && <Avatar person={member} />}<span><strong>{mine ? 'You' : member?.name ?? 'Member'}</strong><small>{mine ? 'Your ask · visible to the network' : `${member?.title} · ${member?.company}`}</small></span></button>
      <span className={`urgency ${ask.urgency}`}>{ask.urgency === 'high' ? 'Time sensitive' : ask.urgency === 'medium' ? 'Active' : 'Open'}</span>
    </header>
    <h3>{ask.ask}</h3>
    <p>{ask.detail}</p>
    <dl>
      <div><dt>WHY NOW</dt><dd>{ask.whyNow}</dd></div>
      <div><dt>WHAT THEY OFFER</dt><dd>{ask.offer}</dd></div>
    </dl>
    {open && !mine && <div className="ask-reply">
      <textarea rows={3} autoFocus value={reply} onChange={e => setReply(e.target.value)}
        placeholder={`Answer ${member?.name.split(' ')[0] ?? 'them'} with something specific and useful…`} />
      <div><Button kind="quiet" onClick={() => setOpen(false)}>Cancel</Button>
        <Button disabled={!reply.trim()} onClick={send}><Send size={14} /> Send response</Button></div>
    </div>}
    <footer>
      <small>{ask.industry} · {ask.location} · {ask.posted} · {ask.responses} responses{warm ? ' · warm path requested' : ''}{responded ? ' · you responded' : ''}</small>
      <div>
        <SaveButton saved={net.saved.includes(ask.id)} onToggle={() => net.toggleSave(ask.id, `the ask from ${mine ? 'you' : member?.name ?? 'a member'}`)} />
        {!mine && <Button kind="quiet" disabled={warm} onClick={() => net.requestWarmPath(ask.id)}>{warm ? <><Check size={14} /> Warm path requested</> : 'Ask for a warm path'}</Button>}
        {!mine && member && <Button kind="quiet" onClick={() => nav.messageMember(member.id)}><MessageSquareText size={14} /> Message</Button>}
        {mine
          ? <Button kind="secondary" onClick={onOpen}>See who matches</Button>
          : <Button kind="secondary" onClick={() => setOpen(true)}>{responded ? 'Respond again' : 'Respond'}</Button>}
      </div>
    </footer>
  </article>
}

function PostCard({ post, member, onOpen }: { post: Post; member: Member | undefined; onOpen: () => void }) {
  const net = useNetwork()
  const nav = useNav()
  const responded = net.postResponses.includes(post.id)
  const mine = post.memberId === 'me'
  return <article className="post-card">
    <header>
      {member
        ? <button className="post-author" onClick={onOpen}><Avatar person={member} portrait /><span><strong>{member.name}</strong><small>{member.title} · {member.company}</small></span></button>
        : <div className="post-author"><span className="person-avatar portrait">{net.profile.initials}</span><span><strong>You</strong><small>{net.profile.title}</small></span></div>}
      <span className="post-kind">{post.kind}</span>
    </header>
    <h3>{post.text}</h3>
    <p>{post.detail}</p>
    <footer>
      <small>{post.when} · {post.responses + (responded ? 1 : 0)} responses</small>
      <div>
        {!mine && member && <>
          <Button kind="quiet" onClick={() => { const id = net.respondToPost(post.id, member.id); if (id) nav.goToThread(id) }}>
            {responded ? <><Check size={14} /> Responded</> : <>Respond</>}
          </Button>
          <Button kind="secondary" onClick={() => nav.messageMember(member.id)}><MessageSquareText size={14} /> Message</Button>
        </>}
        {mine && <small className="post-own">Shared with your network · added to Active Memory</small>}
      </div>
    </footer>
  </article>
}

function Home({ people, select, setPage, openNeed, openThread }: {
  people: Member[]; select: (p: Member) => void; setPage: (p: Page) => void; openNeed: () => void
  openThread: (id: string) => void
}) {
  const net = useNetwork()
  const [tab, setTab] = useState<'feed' | 'people' | 'asks' | 'signals'>('feed')
  const [composer, setComposer] = useState('')
  const ranked = useMemo(() => [...people].sort((a, b) => b.scoreTotal - a.scoreTotal), [people])
  const activeNeed = net.objectives[0]
  const share = () => {
    if (!composer.trim()) return
    net.addPost(composer.trim())
    setComposer('')
  }
  return <>
    <EditorialHero
      folio="MEMBER HOME / NETWORK PULSE"
      title={<>Know who matters.<br /><em>Know why now.</em></>}
      statement="Your network already contains opportunities."
      copy="This is what changed in your professional network: people worth meeting, what they need, what they can move, and where a conversation is justified today."
      caption="Every signal here comes from context you or the network already shared."
      image={sarahPortrait}
      stats={[{ k: 'Members in graph', v: String(people.length) }, { k: 'Connections', v: String(net.connections.length) }, { k: 'Active asks', v: String(net.asks.length) }]}
      action={<><Button onClick={openNeed}><Plus size={14} /> Post a need</Button><button className="text-action" onClick={() => setPage('discover')}>Browse the network <ArrowRight size={13} /></button></>}
    />

    <header className="home-question">
      <Label>PEOPLE × CONTEXT × OPPORTUNITY</Label>
      <h1>What do you need<br /><em>right now?</em></h1>
      <button className="need-input" onClick={openNeed}><span>Describe the outcome you want to create…</span><ArrowRight size={20} /></button>
      <p>Tell Intros the outcome. It will find the people, context and path.</p>
    </header>

    <section className="composer">
      <span className="person-avatar portrait">{net.profile.initials}</span>
      <div>
        <textarea value={composer} onChange={e => setComposer(e.target.value)} rows={2}
          placeholder="Share something useful — an insight, a milestone, a partnership you are looking for…" />
        <footer>
          <small>Visible to your network · Intros learns from what you share</small>
          <Button onClick={share} disabled={!composer.trim()}><Send size={14} /> Share</Button>
        </footer>
      </div>
    </section>

    <div className="feed-tabs">
      {([['feed', 'Network feed'], ['people', 'Who to meet'], ['asks', 'Network asks'], ['signals', 'Professional signals']] as const).map(([id, label]) =>
        <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}
      <button className="text-action feed-tab-action" onClick={() => setPage('discover')}>Browse the network <ArrowRight size={13} /></button>
    </div>

    <div className="feed">
      {tab === 'feed' && net.posts.map(post =>
        <PostCard key={post.id} post={post} member={people.find(p => p.id === post.memberId) ?? undefined}
          onOpen={() => { const m = people.find(p => p.id === post.memberId); if (m) select(m) }} />)}
      {tab === 'people' && ranked.slice(0, 4).map(p =>
        <MemberCard key={p.id} person={p} onOpen={() => select(p)} />)}
      {tab === 'asks' && net.asks.map(a =>
        <AskCard key={a.id} ask={a} member={people.find(p => p.id === a.memberId)} onOpen={() => { const m = people.find(p => p.id === a.memberId); if (m) select(m); else setPage('needs') }} />)}
      {tab === 'signals' && <section className="signal-list">{net.activity.map(s => {
        const m = people.find(p => p.id === s.memberId)
        return <button key={s.id} onClick={() => { if (m) select(m) }}>
          <span className="signal-dot" />
          <span className="signal-kind">{s.kind}</span>
          <span className="signal-copy"><strong>{s.text}</strong><small>{s.when}</small></span>
          <ArrowRight size={15} />
        </button>
      })}</section>}
    </div>

    <section className="home-modules">
      <article className="module">
        <header><Label signal>WHO TO MEET THIS WEEK</Label><h3>Three relationships with real timing.</h3></header>
        <ul className="module-people">{ranked.slice(0, 3).map(p => <li key={p.id}>
          <button onClick={() => select(p)}><Avatar person={p} portrait /><span><strong>{p.name}</strong><small>{p.title} · {p.company}</small><em>{p.whyNow}</em></span><span className="module-score">{p.scoreTotal}</span></button>
        </li>)}</ul>
      </article>
      <article className="module">
        <header><Label>TRENDING IN YOUR SECTORS</Label><h3>Where the network is moving.</h3></header>
        <ul className="module-sectors">{trendingSectors.map(s => <li key={s.sector}>
          <span><strong>{s.sector}</strong><small>{s.note}</small></span><em className={s.move.startsWith('−') ? 'down' : ''}>{s.move}</em>
        </li>)}</ul>
      </article>
      <article className="module">
        <header><Label><CalendarDays size={11} /> UPCOMING BUSINESS EVENTS</Label><h3>Rooms your graph is already in.</h3></header>
        <ul className="module-events">{events.map(e => <li key={e.id}>
          <strong>{e.name}</strong><small>{e.when} · {e.where}</small><em>{e.who}</em>
        </li>)}</ul>
      </article>
      <article className="module">
        <header><Label><Users size={11} /> SUGGESTED CIRCLES</Label><h3>Groups that match your focus.</h3></header>
        <ul className="module-circles">{circles.map(c => <li key={c.id}>
          <span><strong>{c.name}</strong><small>{c.members}</small><em>{c.why}</em></span><Button kind="quiet">Join</Button>
        </li>)}</ul>
      </article>
    </section>

    <section className="home-education">
      <div><Label>WHY THIS FEED LOOKS LIKE THIS</Label><h2>Your network already contains opportunities.</h2>
        <p>Intros reads needs, offers, timing and trust paths, then shows only the relationships where a conversation is justified now.</p>
        <button className="text-action" onClick={() => setPage('intros')}>See the reasoning behind a match <ArrowRight size={14} /></button></div>
      <MemoryGraph people={people} onSelect={select} compact />
    </section>

    <HowItWorks />

    <section className="home-mobile-rail">
      <Label signal>ON YOUR DESK</Label>
      <div>
        {activeNeed && <article><span>ACTIVE NEED</span><strong>{activeNeed.title}</strong><small>{activeNeed.success}</small></article>}
        {ranked[0] && <button onClick={() => select(ranked[0]!)}><span>STRONGEST MATCH</span><strong>{ranked[0]!.name}</strong><small>{ranked[0]!.whyNow}</small></button>}
        <button onClick={() => openThread('t1')}><span>CONVERSATION COOLING</span><strong>Scott Kelley</strong><small>Waiting on the observation you promised.</small></button>
      </div>
    </section>
  </>
}


/* ----------------------------------------------------------------- discover */

const filterGroups: Array<{ label: string; options: string[] }> = [
  { label: 'Role', options: ['Founder', 'Investor', 'Operator', 'Executive', 'Advisor', 'Specialist', 'Connector'] },
  { label: 'Industry', options: ['Manufacturing', 'SaaS', 'Finance', 'Construction', 'Healthcare', 'Logistics', 'AI', 'Professional services', 'Consumer brands', 'Field services', 'Private equity', 'Energy', 'Fintech', 'Executive search'] },
  { label: 'Signal', options: ['Warm path available', 'High match', 'Available now'] },
]

function Discover({ people, select }: { people: Member[]; select: (p: Member) => void }) {
  const [q, setQ] = useState('')
  const [active, setActive] = useState<string[]>([])
  const toggle = (o: string) => setActive(a => a.includes(o) ? a.filter(x => x !== o) : [...a, o])
  const filtered = people.filter(p => {
    const hay = `${p.name} ${p.title} ${p.company} ${p.location} ${p.role} ${p.industry} ${p.tags.join(' ')} ${p.expertise.join(' ')} ${p.needs.join(' ')} ${p.offers.join(' ')} ${p.focus}`.toLowerCase()
    if (q.trim() && !q.toLowerCase().split(/\s+/).some(w => w.length > 2 && hay.includes(w))) return false
    return active.every(f => {
      if (f === 'Warm path available') return p.bestPath.length > 2
      if (f === 'High match') return p.scoreTotal >= 80
      if (f === 'Available now') return /open|weekly|two|always|fortnightly/i.test(p.availability)
      return hay.includes(f.toLowerCase())
    })
  })
  return <>
    <EditorialHero
      folio="DISCOVER / PROFESSIONAL NETWORK"
      title={<>Find the person,<br /><em>not the job title.</em></>}
      statement="Search the way you would brief a trusted friend."
      copy="Describe the outcome you want and Intros reads needs, offers, expertise, location, availability and the trust paths already open to you."
      caption="Members are surfaced with reasoning, never as an anonymous list."
      image={marcusPortrait}
      focus="center 22%"
    />
    <PageHead label="DISCOVER" title="Browse the people, not a database."
      copy="Search in your own words. Intros reads needs, offers, expertise, location and the paths already open to you."
      proof="Try: “manufacturing CEO in Indiana looking for AI help.”" />
    <div className="discover-search">
      <Search size={18} />
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Describe who you want to meet…" />
      <span>{filtered.length} members</span>
    </div>
    <div className="filter-bank">{filterGroups.map(g => <div key={g.label}><span>{g.label.toUpperCase()}</span><div>{g.options.map(o =>
      <button key={o} className={active.includes(o) ? 'active' : ''} onClick={() => toggle(o)}>{o}</button>)}</div></div>)}</div>
    <div className="discover-grid">
      {filtered.map(p => <article className="discover-tile" key={p.id}>
        <button className="tile-open" onClick={() => select(p)}>
          <div className="tile-portrait"><Avatar person={p} large portrait /><span className="tile-score">{p.scoreTotal}</span></div>
          <Label>{p.role} · {p.location}</Label>
          <h3>{p.name}</h3>
          <p className="tile-role">{p.title}<br />{p.company}</p>
          <p className="tile-focus">{p.focus}</p>
          <dl>
            <div><dt>LOOKING FOR</dt><dd>{p.needs[0]}</dd></div>
            <div><dt>CAN HELP WITH</dt><dd>{p.offers[0]}</dd></div>
          </dl>
          <ul className="tile-tags">{p.expertise.slice(0, 3).map(t => <li key={t}>{t}</li>)}</ul>
          <small className="tile-path">{p.bestPath.length > 2 ? `Warm path via ${p.bestPath[1]}` : 'Direct relationship'} · {p.availability}</small>
        </button>
        <footer><MemberActions person={p} compact /></footer>
      </article>)}
      {!filtered.length && <p className="empty-state">No members match that yet. Broaden the filters or describe the outcome instead of the title.</p>}
    </div>
    <section className="network-insight-strip">
      <header><Label signal>NETWORK INSIGHT</Label><h2>What this search tells Intros.</h2></header>
      <div>
        <article><span>STRONGEST MATCH IN VIEW</span><strong>{[...filtered].sort((a, b) => b.scoreTotal - a.scoreTotal)[0]?.name ?? '—'}</strong><small>Ranked on mutual value, timing and trust — not keyword overlap.</small></article>
        <article><span>WARM PATHS AVAILABLE</span><strong>{filtered.filter(p => p.bestPath.length > 2).length} of {filtered.length}</strong><small>Someone in your graph can make the introduction credible.</small></article>
        <article><span>AVAILABLE NOW</span><strong>{filtered.filter(p => /open|weekly|two|always|fortnightly/i.test(p.availability)).length} members</strong><small>Availability is member-stated, so timing stays honest.</small></article>
        <article><span>MOST COMMON NEED</span><strong>{filtered[0]?.needs[0] ?? '—'}</strong><small>Needs shape the feed you see on Home.</small></article>
      </div>
    </section>
  </>
}

/* -------------------------------------------------------------------- intros */

function MatchReport({ person, onOpen, onIntro }: { person: Member; onOpen: () => void; onIntro: () => void }) {
  const net = useNetwork()
  const nav = useNav()
  return <article className="match-report">
    <header>
      <Avatar person={person} large portrait />
      <div className="match-identity">
        <Label>{radarLabel[person.radar]} · {introStateLabel[person.introState]}</Label>
        <h3>{person.name}</h3><p>{person.title} · {person.company} · {person.location}</p>
      </div>
      <Score value={person.scoreTotal} />
    </header>
    <div className="match-thesis"><span>WHY THIS PERSON</span><p>{person.whyThem}</p></div>
    <div className="match-columns">
      <div><span>LOOKING FOR</span><p>{person.needs.join(' · ')}</p></div>
      <div><span>CAN HELP WITH</span><p>{person.offers.join(' · ')}</p></div>
    </div>
    <div className="match-reasons">
      <div><span>WHY YOU MATTER TO THEM</span><p>{person.whyYou}</p></div>
      <div><span>WHY NOW</span><p>{person.whyNow}</p></div>
    </div>
    <div className="match-mutual">
      <div><span>MUTUAL INTERESTS</span><p>{person.tags.join(' · ')}</p></div>
      <div><span>MUTUAL CONNECTIONS</span><p>{person.mutuals.length ? person.mutuals.join(' · ') : 'None yet — path built from context'}</p></div>
    </div>
    <div className="trust-path"><span>TRUST PATH</span>{person.bestPath.map((x, i) => <span key={x}><b>{x}</b>{i < person.bestPath.length - 1 && <ArrowRight size={12} />}</span>)}</div>
    <div className="match-move"><span>RECOMMENDED NEXT MOVE</span><p>{person.nextAction}</p></div>
    <footer>
      <Button kind="quiet" onClick={onOpen}>View reasoning</Button>
      <SaveButton saved={net.saved.includes(person.id)} onToggle={() => net.toggleSave(person.id)} />
      <Button kind="secondary" onClick={() => nav.messageMember(person.id)}><MessageSquareText size={15} /> Message</Button>
      <Button onClick={onIntro}><Handshake size={15} /> {person.introState === 'requested' ? 'Review opt-in' : 'Request introduction'}</Button>
    </footer>
  </article>
}

function Intros({ people, select, draft }: { people: Member[]; select: (p: Member) => void; draft: (p: Member) => void }) {
  const [state, setState] = useState<'all' | Member['introState']>('all')
  const ranked = [...people].sort((a, b) => b.scoreTotal - a.scoreTotal)
  const shown = state === 'all' ? ranked.slice(0, 6) : ranked.filter(p => p.introState === state)
  return <>
    <EditorialHero folio="INTROS / MUTUAL VALUE" title={<>A warm path is<br /><em>earned context.</em></>} statement="The right conversation, with a reason for both sides." copy="Each report explains the mutual value, live timing and trust path before anyone asks for an introduction." caption="Both people retain agency. Nothing moves until both choose the conversation." image={priyaPortrait} />
    <PageHead label="CURATED INTRODUCTIONS" title="People worth knowing now."
      copy="Every introduction carries mutual value, timing and a credible path. Nothing is sent until both sides agree."
      proof="46 introductions made · 24 became working conversations." />
    <div className="state-filters">
      {(['all', 'recommended', 'requested', 'waiting', 'accepted', 'introduced', 'conversing', 'closed'] as const).map(s =>
        <button key={s} className={state === s ? 'active' : ''} onClick={() => setState(s)}>
          {s === 'all' ? 'All' : introStateLabel[s]}
          <em>{s === 'all' ? ranked.length : ranked.filter(p => p.introState === s).length}</em>
        </button>)}
    </div>
    <div className="reports-list">
      {shown.map(p => <MatchReport key={p.id} person={p} onOpen={() => select(p)} onIntro={() => draft(p)} />)}
      {!shown.length && <p className="empty-state">No introductions in this state yet.</p>}
    </div>
    <section className="how-it-works">
      <div className="how-head"><Label>HOW INTROS WORKS</Label><h2>More context. Better intros. Stronger outcomes.</h2></div>
      <div className="how-steps">{howIntrosWorks.map((s, i) => <article key={s.step}><span>0{i + 1}</span><h3>{s.step}</h3><p>{s.copy}</p></article>)}</div>
    </section>
  </>
}

/* ------------------------------------------------------------------ messages */

function Messages({ people, select, activeId, setActiveId }: { people: Member[]; select: (p: Member) => void; activeId: string; setActiveId: (id: string) => void }) {
  const net = useNetwork()
  const [text, setText] = useState('')
  const threads = net.threads
  const thread: Thread | undefined = threads.find(t => t.id === activeId) ?? threads[0]
  const person = people.find(p => p.id === thread?.memberId)
  if (!thread || !person) return null
  return <>
    <EditorialHero folio="MESSAGES / RELATIONSHIP CONTEXT" title={<>Conversation with<br /><em>memory beside it.</em></>} statement="People speak to people. Context stays quietly available." copy="Commitments, mutual connections and the reason for the introduction remain beside the thread—not inside the conversation." caption="A professional exchange remains human when intelligence knows when to stay quiet." image={elliotPortrait} />
    <PageHead label="MESSAGES" title="Context before contact."
      copy="Real conversations between members. Intros keeps the relationship context beside the thread, never in the middle of it."
      proof="Every thread remembers the last commitment made." />
    <div className="messages-layout">
      <aside className="thread-list">
        <div className="thread-search"><Search size={15} /> Conversations</div>
        {threads.map(t => {
          const m = people.find(p => p.id === t.memberId)
          if (!m) return null
          return <button className={thread.id === t.id ? 'active' : ''} key={t.id} onClick={() => setActiveId(t.id)}>
            <Avatar person={m} />
            <span><strong>{m.name}</strong><small>{t.messages[t.messages.length - 1]?.text.slice(0, 38)}…</small></span>
            {t.unread && <i />}
          </button>
        })}
      </aside>
      <section className="conversation">
        <header>
          <Avatar person={person} />
          <div><strong>{person.name}</strong><small>{person.title} · {person.company}</small></div>
           <button className="icon-btn" onClick={() => select(person)} aria-label="Open relationship intelligence"><AetherisGlyph size={17} /></button>
        </header>
        <div className="intro-context"><Label>INTRODUCTION CONTEXT</Label><p>{thread.introContext}</p></div>
        <div className="messages">
          {thread.messages.map(m => <div key={m.id} className={`message ${m.from === 'me' ? 'outgoing' : 'incoming'}`}>{m.text}<small>{m.at}</small></div>)}
          {!thread.messages.length && <p className="empty-state">New conversation. Open with the reason this matters to both sides.</p>}
           <div className="shared-context"><AetherisGlyph size={12} /><span>Shared context: {person.needs[0]} · {person.offers[0]}</span></div>
        </div>
        <div className="composer-wrap">
           <button className="suggested" onClick={() => setText(thread.suggested)}><AetherisGlyph size={13} /> Use contextual draft</button>
          <div className="composer">
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Write with the relationship in mind…" />
            <button onClick={() => { if (text.trim()) { net.sendMessage(thread.id, text.trim()); setText('') } }} disabled={!text.trim()} aria-label="Send"><Send size={17} /></button>
          </div>
        </div>
      </section>
      <aside className="conversation-intel">
        <Label>RELATIONSHIP CONTEXT</Label>
        <h3>Why you’re connected</h3>
        <p>{person.whyThem}</p>
        <dl>
          <div><dt>THEY ARE LOOKING FOR</dt><dd>{person.needs.join(' · ')}</dd></div>
          <div><dt>YOU CAN HELP WITH</dt><dd>{net.profile.canHelpWith}</dd></div>
          <div><dt>MUTUAL PATH</dt><dd>{person.bestPath.join(' → ')}</dd></div>
          <div><dt>LAST COMMITMENT</dt><dd>{thread.commitment}</dd></div>
          <div><dt>RECOMMENDED NEXT STEP</dt><dd>{person.nextAction}</dd></div>
          <div><dt>RELATIONSHIP MEMORY</dt><dd>{person.focus}</dd></div>
        </dl>
      </aside>
    </div>
  </>
}

/* --------------------------------------------------------------------- needs */

function Needs({ onNew, people, select, setPage }: {
  onNew: () => void; people: Member[]; select: (p: Member) => void; setPage: (p: Page) => void
}) {
  const net = useNetwork()
  const [tab, setTab] = useState<'for-you' | 'yours' | 'network' | 'saved'>('for-you')
  const objectives = net.objectives
  const asks = net.asks
  const mine = asks.filter(a => a.memberId === 'me')
  const focus = `${net.profile.focus} ${net.profile.lookingFor} ${objectives.map(o => o.title).join(' ')}`.toLowerCase()
  const forYou = asks.filter(a => a.memberId !== 'me' && (
    focus.includes(a.industry.toLowerCase()) ||
    a.ask.toLowerCase().split(/\s+/).some(w => w.length > 5 && focus.includes(w)) ||
    a.urgency === 'high'
  )).slice(0, 6)
  const list = tab === 'network' ? asks.filter(a => a.memberId !== 'me')
    : tab === 'saved' ? asks.filter(a => net.saved.includes(a.id))
      : forYou
  return <>
    <EditorialHero folio="NEEDS / PROFESSIONAL ASKS" title={<>State the outcome.<br /><em>Find who can move it.</em></>} statement="Serious asks create useful professional context." copy="A need is not a broadcast. It is a concise case for why the right person should care, why now matters and what value moves both ways." caption="Specific needs produce considered responses—not noisy outreach." image={sarahPortrait} />
    <PageHead label="NEEDS" title="Tell the network what you need."
      copy="State the outcome you are trying to create. Intros finds who can move it forward and why they would want to."
      proof="Network-visible asks feed matching. Private asks stay private."
      action={<Button onClick={onNew}><Plus size={15} />Post a need</Button>} />
    <div className="feed-tabs">
      {([['for-you', 'For you'], ['yours', 'Your needs'], ['network', 'Network needs'], ['saved', 'Saved']] as const).map(([id, label]) =>
        <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}
    </div>
    {tab === 'yours' ? <div className="feed">
      {mine.map(a => <AskCard key={a.id} ask={a} member={undefined} onOpen={() => setPage('intros')} />)}
      {objectives.map((o, i) => <article className="need-case" key={o.id}>
        <header><Label signal>ACTIVE · {o.priority}</Label><span>CASE {String(i + 1).padStart(2, '0')} / {new Date().getFullYear()}</span></header>
        <h2>{o.title}</h2>
        <p className="case-outcome">{o.outcome}</p>
        <div className="case-grid">
          <div><span>WHO COULD HELP</span><p>{o.target}</p></div>
          <div><span>WHY NOW</span><p>{o.whyNow}</p></div>
          <div><span>WHAT YOU OFFER</span><p>{o.valueOffer}</p></div>
          <div><span>SUCCESS</span><p>{o.success}</p></div>
        </div>
        <footer>
          <Button kind="secondary" onClick={() => setPage('intros')}>See who matches <ArrowRight size={14} /></Button>
          <Button kind="quiet" onClick={() => setPage('discover')}>Browse the network</Button>
        </footer>
      </article>)}
      {!objectives.length && !mine.length && <p className="empty-state">You have not posted a need yet. Start with the outcome, not a list of people.</p>}
    </div> : <div className="feed">
      {list.map(a => <AskCard key={a.id} ask={a} member={people.find(p => p.id === a.memberId)}
        onOpen={() => { const m = people.find(p => p.id === a.memberId); if (m) select(m) }} />)}
      {!list.length && <p className="empty-state">{tab === 'saved' ? 'Nothing saved yet. Save an ask to keep it beside your own needs.' : 'No matching asks yet. Post your own need or browse every network ask.'}</p>}
    </div>}
  </>
}

/* -------------------------------------------------------------------- memory */

const memoryCategories: Learning['category'][] = ['People', 'Companies', 'Needs', 'Messages', 'Introductions', 'Decisions', 'Interests', 'Commitments']

function Memory({ people, select }: { people: Member[]; select: (p: Member) => void }) {
  const net = useNetwork()
  const [cat, setCat] = useState<Learning['category'] | 'All'>('All')
  const items: Learning[] = [
    ...net.notes.slice(0, 4).map((n, i): Learning => ({
      id: `n${i}`, category: 'People', text: n.text, source: 'Recorded by you', confidence: 100, scope: n.scope, when: n.createdAt,
    })),
    ...net.learnings,
  ]
  const shown = cat === 'All' ? items : items.filter(l => l.category === cat)
  return <>
    <section className="memory-editorial">
      <div className="memory-editorial-copy">
        <Brand />
        <Label>PEOPLE CREATE POSSIBILITIES</Label>
        <h1>Memory that keeps<br />relationships <em>alive.</em></h1>
        <p>A professional memory for builders, backed by real people, real context, and real intent.</p>
        <blockquote>“Most opportunities aren’t lost because people say no. They’re lost because context is forgotten.”</blockquote>
        <dl>
          <div><dt>Relationships</dt><dd>10K+</dd></div><div><dt>Companies</dt><dd>312</dd></div>
          <div><dt>Countries</dt><dd>28</dd></div><div><dt>Years of context</dt><dd>06</dd></div>
        </dl>
        <button className="memory-cta">Your Network Remembers <ArrowRight size={15} /></button>
      </div>
      <figure><img src={portraitImg} alt="Thoughtful professional in architectural window light" width={1280} height={1600} /><figcaption>ACTIVE MEMORY / CONTEXT HELD WITH INTENT</figcaption></figure>
    </section>
    <section className="memory-dark-intro">
      <div><Label signal>ACTIVE MEMORY GRAPH</Label><h2>Not a contact list.<br />A living record of <em>why.</em></h2></div>
      <blockquote>“Intros remembers the context people normally lose between conversations.”<small>NOT JUST WHAT PEOPLE SAID. BUT WHAT THEY CARE ABOUT. WHAT THEY’RE BUILDING. AND WHERE THINGS LEFT OFF.</small></blockquote>
    </section>
    <div className="memory-layout">
      <section className="memory-stage">
        <MemoryGraph people={people} onSelect={select} />
        <div className="memory-legend">
          <span><i className="cobalt" />Current context</span>
          <span><i className="amber" />Live signal</span>
          <span><LockKeyhole size={12} />Private memory</span>
        </div>
      </section>
      <aside className="memory-changes">
        <Label signal>WHAT INTROS LEARNED RECENTLY</Label>
        <h2>The graph changed.</h2>
        <div className="memory-cats">{(['All', ...memoryCategories] as const).map(c =>
          <button key={c} className={cat === c ? 'active' : ''} onClick={() => setCat(c)}>{c}</button>)}</div>
        {shown.map((l, index) => {
          const relatedPerson = people[index % people.length]
          return <article key={l.id} className="learning-row">
            {relatedPerson && <Avatar person={relatedPerson} portrait />}
            <div>
              <span>{l.category}</span>
              <p>{l.text}</p>
              <small>{l.source} · {l.confidence}% confidence · {scopeLabel[l.scope]} · {l.when}</small>
            </div>
          </article>
        })}
        {!shown.length && <p className="empty-state">Nothing learned in this category yet.</p>}
      </aside>
    </div>
    <section className="memory-totals">
      <div><strong>10,428</strong><span>relationship facts retained</span></div><div><strong>816</strong><span>commitments remembered</span></div>
      <div><strong>147</strong><span>warm paths with live context</span></div><div><strong>93%</strong><span>source-attributed memory</span></div>
    </section>
    <section className="memory-modules">
      <article><Label signal>RELATIONSHIP PATTERNS</Label><h3>You create the strongest outcomes through operator-to-operator introductions.</h3><p>11 of your last 14 successful conversations began with shared operating context.</p></article>
      <article><Label signal>NEWLY LEARNED NEEDS</Label><h3>Five members now need people already inside your trusted graph.</h3><p>Industrial AI, operating partners and regional expansion appear most often.</p></article>
      <article><Label signal>RECONNECT OPPORTUNITIES</Label><h3>Tomás Bergeron has relevant timing after 168 quiet days.</h3><p>Reconnect around bid qualification. Do not reference the time gap.</p></article>
      <article><Label signal>COOLING CONVERSATIONS</Label><h3>Scott Kelley is waiting on one promised pipeline observation.</h3><p>A short, specific follow-up will close the loop without forcing a meeting.</p></article>
    </section>
  </>
}

/* ------------------------------------------------------------------ insights */

function Insights({ people, select, setPage }: { people: Member[]; select: (p: Member) => void; setPage: (p: Page) => void }) {
  const net = useNetwork()
  const nav = useNav()
  const [dismissed, setDismissed] = useState<string[]>([])
  return <>
    <EditorialHero folio="INSIGHTS / RELATIONSHIP MOVEMENT" title={<>Notice what changed.<br /><em>Act while it matters.</em></>} statement="Signals become useful only when they change the next move." copy="Role changes, cooling conversations, matching needs and warm paths are organized around action—not analytics theater." caption="The strongest signal is often a small change in a relationship you already trust." image={marcusPortrait} />
    <PageHead label="INSIGHTS" title="Signals worth acting on."
      copy="No vanity metrics. Only relationship changes that could alter an outcome, each with an action attached."
      proof="$486K influenced across 46 introductions in 90 days." />
    <div className="insight-numbers">
      {[['4', 'people worth reconnecting with'], ['3', 'warm paths opened this week'], ['2', 'conversations cooling'], ['1', 'contact moved into a relevant role'], ['5', 'needs now match your network']].map(([n, c]) =>
        <div key={c}><strong>{n}</strong><small>{c}</small></div>)}
    </div>
    <div className="insight-list">
      {leaks.filter(l => !dismissed.includes(l.id)).map((leak, i) => {
        const p = people.find(x => x.id === leak.personId)
        if (!p) return null
        return <article key={leak.id}>
          <span className="insight-index">0{i + 1}</span>
          <div className="insight-main">
            <Label signal={leak.urgency === 'high'}>{leak.type}</Label>
            <h3>{p.name}</h3>
            <p>{leak.businessReason}</p>
            <small>Evidence: {leak.evidence}{leak.estimatedValue ? ` · ${leak.estimatedValue}` : ''}</small>
          </div>
          <div className="insight-confidence"><strong>{leak.confidence}</strong><small>confidence</small></div>
          <div className="insight-actions">
            <Button kind="quiet" onClick={() => select(p)}>Open profile</Button>
            <Button kind="secondary" onClick={() => nav.messageMember(p.id)}>Message</Button>
            <Button onClick={() => nav.openIntro(p)}>Ask for intro</Button>
            <SaveButton saved={net.saved.includes(p.id)} onToggle={() => net.toggleSave(p.id)} />
            <button className="dismiss" onClick={() => setDismissed(d => [...d, leak.id])}>Dismiss</button>
          </div>
        </article>
      })}
      {leaks.length === dismissed.length && <p className="empty-state">All signals handled. Intros will surface the next change as the graph moves.</p>}
    </div>
    <section className="opportunity-clusters">
      <header><Label><Layers size={11} /> OPPORTUNITY CLUSTERS</Label><h2>Where several relationships point the same way.</h2></header>
      <div>
        {[
          { name: 'Industrial AI adoption', people: people.filter(p => /Manufacturing|AI/i.test(p.industry)).slice(0, 4), why: 'Four members are solving the same operational problem within a quarter of each other.' },
          { name: 'Capital & operating partners', people: people.filter(p => /equity|capital|Fintech/i.test(p.industry)).slice(0, 4), why: 'Three raise conversations and two operating-partner mandates overlap with your offer.' },
          { name: 'Field and logistics operators', people: people.filter(p => /Logistics|Field|Construction|Energy/i.test(p.industry)).slice(0, 4), why: 'Repeated pipeline-visibility asks across services businesses you already understand.' },
        ].map(c => <article key={c.name}>
          <h3>{c.name}</h3>
          <p>{c.why}</p>
          <ul>{c.people.map(p => <li key={p.id}><button onClick={() => select(p)}><Avatar person={p} />{p.name}</button></li>)}</ul>
          <button className="text-action" onClick={() => setPage('intros')}>See the introductions <ArrowRight size={13} /></button>
        </article>)}
      </div>
    </section>

    <section className="intelligence-map">
      <div><Label signal>RELATIONSHIP INTELLIGENCE MAP</Label><h2>The same graph, read for opportunity.</h2>
        <p>Amber nodes carry a live signal. Selecting one opens the reasoning, the trust path and the smallest next action.</p>
        <button className="text-action" onClick={() => setPage('memory')}>Open Active Memory <ArrowRight size={13} /></button></div>
      <MemoryGraph people={people} onSelect={select} compact />
    </section>

    <section className="evidence-line">
      <div><Label>90 DAY RELATIONSHIP RETURN</Label><h2>More context. Better intros. Stronger outcomes.</h2></div>
      <div className="line-chart">
        <svg viewBox="0 0 600 120" preserveAspectRatio="none" aria-hidden="true"><path d="M0 100 C80 95 90 75 165 80 S250 30 330 55 S450 25 600 12" /><circle cx="600" cy="12" r="5" /></svg>
        <span>$486K influenced · 46 introductions · 24 meetings</span>
      </div>
    </section>
  </>
}

/* ------------------------------------------------------------------- profile */

function Profile({ people, setPage, openOnboarding }: {
  people: Member[]; setPage: (p: Page) => void; openOnboarding: () => void
}) {
  const net = useNetwork()
  const me: MeProfile = net.profile
  const notes: MemoryNote[] = net.notes
  const profile: DigitalYouProfile = net.digitalYou
  const setProfile = net.setDigitalYou
  const autonomy: AutonomyLevel = net.autonomy
  const setAutonomy = net.setAutonomy
  const [copied, setCopied] = useState(false)
  const sliders: [keyof DigitalYouProfile, string, string, string][] = [
    ['directness', 'Directness', 'Soft', 'Direct'], ['formality', 'Formality', 'Casual', 'Formal'],
    ['warmth', 'Warmth', 'Reserved', 'Warm'], ['brevity', 'Brevity', 'Detailed', 'Tight'],
  ]
  return <>
    <section className="identity-header">
      <div className="identity-portrait"><img src={portraitImg} alt="Joseph Toney in architectural window light" width={1280} height={1600} /><small>AETHERIS MEMBER SINCE 2024</small></div>
      <div className="identity-copy">
        <Label>MEMBER PROFILE</Label>
        <h1>Joseph<br /><em>Toney</em></h1>
        <p className="identity-role">{me.title}<br />{me.company} · {me.location}</p>
        <p className="identity-thesis">{me.thesis}</p>
        <blockquote>“Evidence, mutual value, good timing and human judgment.”</blockquote>
        <div className="identity-actions">
          <Button onClick={openOnboarding}><Fingerprint size={14} /> {me.onboarded ? 'Update your profile' : 'Complete your profile'}</Button>
          <Button kind="secondary" onClick={() => setPage('messages')}><MessageSquareText size={14} /> Conversations</Button>
          <Button kind="secondary" onClick={() => setPage('intros')}><Handshake size={14} /> Your introductions</Button>
          <Button kind="quiet" onClick={() => setPage('needs')}><Bookmark size={14} /> Saved · {net.saved.length}</Button>
          <Button kind="quiet" onClick={() => { void navigator.clipboard?.writeText('https://aetheris-intros.app/joseph-toney').catch(() => {}); setCopied(true) }}><Share2 size={14} /> {copied ? 'Link copied' : 'Share profile'}</Button>
        </div>
      </div>
    </section>

    <div className="profile-facts">
      {[['ABOUT MEMBER', 'Founder building relationship systems for consequential business decisions.'], ['FOCUS AREAS', me.focus], ['GOALS', 'Place Aetheris with serious operators and document the outcomes.'], ['CAN HELP WITH', me.canHelpWith], ['CURRENTLY LOOKING FOR', me.lookingFor],
      ['INDUSTRIES', me.industries.join(' · ')], ['EXPERTISE', me.expertise.join(' · ')], ['VALUES', me.values],
      ['AVAILABILITY', me.availability], ['WHO YOU WANT TO MEET', me.wantToMeet ?? 'Not stated yet — complete your profile.'],
      ['VALUABLE INTROS', me.introPreferences ?? 'Not stated yet.'], ['BOUNDARIES', me.boundaries ?? 'No boundaries recorded yet.'],
      ['RECENT ASK', net.objectives[0]?.title ?? 'No active need posted yet.']].map(([k, v]) =>
        <div key={k}><span>{k}</span><p>{v}</p></div>)}
    </div>

    <section className="private-panel">
      <header><Label signal>PRIVATE RELATIONSHIP INTELLIGENCE</Label><small><LockKeyhole size={12} /> Visible only to you</small></header>
      <div>
        <article><span>WHY THESE PEOPLE, WHY NOW</span><p>Three relationships combine strategic fit with a live timing signal. The rest of the graph is deliberately quiet.</p></article>
        <article><span>RELATIONSHIP HISTORY</span><p>{people.length} members mapped · 46 introductions · 24 working conversations.</p></article>
        <article><span>STRONGEST TRUST PATH</span><p>{people[0]?.bestPath.join(' → ')}</p></article>
        <article><span>SAVED NOTES</span><p>{notes[0]?.text ?? 'No private notes recorded yet. Open any member to record what changed.'}</p></article>
      </div>
    </section>

    <section className="profile-social">
      <article className="module">
        <header><Label>SHARED CONNECTIONS</Label><h3>Who you both already trust.</h3></header>
        <ul className="module-people">{people.slice(0, 4).map(p => <li key={p.id}>
          <button onClick={() => setPage('discover')}><Avatar person={p} portrait /><span><strong>{p.name}</strong><small>{p.company}</small><em>{p.mutuals.length ? `Mutual: ${p.mutuals.join(', ')}` : 'Direct relationship'}</em></span></button>
        </li>)}</ul>
      </article>
      <article className="module">
        <header><Label>RECENT ACTIVITY</Label><h3>What this profile has been doing.</h3></header>
        <ul className="module-activity">
          {(net.learnings.slice(0, 5).map(l => [l.text, `${l.source} · ${l.when}`]) as Array<[string, string]>).map(([t, w]) =>
            <li key={t}><CircleDot size={12} /><span><strong>{t}</strong><small>{w}</small></span></li>)}
        </ul>
      </article>
      <article className="module compat">
        <header><Label signal>COMPATIBILITY INSIGHTS</Label><h3>How Aetheris reads the fit.</h3></header>
        <div className="compat-rings">
          {[['Strategic alignment', 86], ['Shared interests', 78], ['Network value', 71]].map(([k, v]) => <div key={String(k)}>
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <circle cx="50" cy="50" r="42" className="ring-track" />
              <circle cx="50" cy="50" r="42" className="ring-value" strokeDasharray={`${(Number(v) / 100) * 264} 264`} />
            </svg>
            <strong>{v}</strong><small>{k}</small>
          </div>)}
        </div>
        <dl className="compat-rows"><div><dt>Mutual Connections</dt><dd>4 trusted paths</dd></div><div><dt>Conversation Potential</dt><dd>High</dd></div><div><dt>Long-Term Impact</dt><dd>Strong</dd></div><div><dt>Complementary Expertise</dt><dd>Revenue systems × capital</dd></div></dl>
      </article>
      <article className="module relationship-history">
        <header><Label>RELATIONSHIP HISTORY</Label><h3>Context across time.</h3></header>
        <ol><li><strong>Introduction accepted</strong><small>Marcus Adeyemi · Sep 2026</small></li><li><strong>Shared operating thesis</strong><small>Private note · Aug 2026</small></li><li><strong>First mapped warm path</strong><small>via Maya Chen · Jun 2026</small></li></ol>
      </article>
      <article className="module availability-panel">
        <header><Label>AVAILABILITY</Label><h3><i /> Open for three considered conversations.</h3></header><p>Best for founders, operators and investors with a specific outcome and credible mutual value.</p><Button kind="secondary" onClick={() => setPage('messages')}><CalendarDays size={14} /> Book a 30 min call</Button>
      </article>
    </section>

    <section className="intro-recommendation">
      <header><Label signal><AetherisGlyph size={13} /> AETHERIS INTRODUCTION RECOMMENDATION</Label><h2>You and {people[0]?.name ?? 'this member'} should compare operating notes.</h2></header>
      <p>{people[0] ? `${people[0].whyThem} ${people[0].whyYou}` : 'No recommendation yet.'}</p>
      <div className="why-now-block"><span>WHY NOW</span><p>{people[0]?.whyNow}</p></div>
      <footer>
        <Button onClick={() => setPage('intros')}><Handshake size={14} /> Request introduction</Button>
        <Button kind="secondary" onClick={() => setPage('memory')}><AetherisGlyph size={14} /> View reasoning</Button>
        <small><LockKeyhole size={12} /> Nothing is sent without both sides opting in.</small>
      </footer>
    </section>

    <div className="profile-settings">
      <section>
        <div className="section-heading"><div><Label>DIGITAL YOU</Label><h2>Relationship mode.</h2></div><Fingerprint size={20} /></div>
        <p className="settings-copy">How Intros drafts on your behalf. Tone stays yours.</p>
        {sliders.map(([key, label, low, high]) => <label className="slider-row" key={key}>
          <span><b>{label}</b><em>{Number(profile[key])}</em></span>
          <input type="range" min="0" max="100" value={Number(profile[key])} onChange={e => setProfile({ ...profile, [key]: Number(e.target.value) })} />
          <small>{low}<i>{high}</i></small>
        </label>)}
      </section>
      <section>
        <div className="section-heading"><div><Label>PRIVACY & AUTONOMY</Label><h2>Intelligence, permissioned.</h2></div><ShieldCheck size={20} /></div>
        <p className="settings-copy">Private context can inform relevance without becoming shareable content.</p>
        <div className="autonomy-levels">{['Observe', 'Recommend', 'Draft', 'Approve', 'Authorized'].map((x, i) =>
          <button className={autonomy === i ? 'active' : ''} key={x} onClick={() => setAutonomy(i as AutonomyLevel)}>
            <span>{i}</span><div><strong>{x}</strong><small>{i < 3 ? 'No external action' : 'Explicit permission required'}</small></div>
            {autonomy === i && <Check size={15} />}
          </button>)}</div>
      </section>
    </div>
  </>
}

/* ------------------------------------------------ member profile and modals */

function Ring({ value, label }: { value: number; label: string }) {
  const c = 2 * Math.PI * 42
  return <div className="compat-ring">
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="42" className="ring-track" />
      <circle cx="50" cy="50" r="42" className="ring-value" strokeDasharray={`${(c * value) / 100} ${c}`} />
    </svg>
    <strong>{value}%</strong>
    <span>{label}</span>
  </div>
}

/** Full member profile: editorial ivory identity beside the dark relationship record. */
function MemberProfile({ person, people, onClose, onDraft, onMessage }: {
  person: Member; people: Member[]; onClose: () => void; onDraft: (p: Member) => void; onMessage: (id: string) => void
}) {
  const net = useNetwork()
  const [text, setText] = useState('')
  const [scope, setScope] = useState<PrivacyScope>('private')
  const [reasoning, setReasoning] = useState(false)
  const [copied, setCopied] = useState(false)
  const connected = net.connections.includes(person.id)
  const following = net.follows.includes(person.id)
  const notes = net.notes.filter(n => n.personId === person.id)
  const named = people.filter(p => person.mutuals.includes(p.name))
  const shared = (named.length ? named : people.filter(p => p.id !== person.id).slice(0, 3)).slice(0, 3)
  const activity = net.posts.filter(p => p.memberId === person.id).slice(0, 2)
  const history = [
    { text: `You both engaged with ${person.industry.toLowerCase()} conversations on Intros`, when: `Joined ${person.joined}` },
    ...(person.bestPath.length > 2 ? [{ text: `Warm path opened through ${person.bestPath[1]}`, when: 'Trust path active' }] : []),
    { text: person.mutuals.length ? `Shared connections: ${person.mutuals.join(', ')}` : 'No shared connections yet', when: `${person.mutuals.length} mutual` },
    { text: `${person.name.split(' ')[0]} last interacted with your network`, when: `${person.lastInteractionDays} days ago` },
  ]
  return <article className="member-page">
    <button className="member-back" onClick={onClose}><ChevronLeft size={16} /> Back to the network</button>

    <section className="member-identity">
      <div className="member-identity-copy">
        <Brand />
        <Label>MEMBER PROFILE / {person.role.toUpperCase()}</Label>
        <h1>{person.name}</h1>
        <p className="member-role">{person.title}<br />{person.company}</p>
        <p className="member-meta">{person.location} · {person.industry} · Member since {person.joined}</p>
        <blockquote>“{person.thesis}”</blockquote>
        <dl className="member-metrics">
          <div><dt>Match</dt><dd>{person.scoreTotal}</dd></div>
          <div><dt>Mutual</dt><dd>{String(person.mutuals.length).padStart(2, '0')}</dd></div>
          <div><dt>Trust path</dt><dd>{person.bestPath.length > 2 ? '2nd' : '1st'}</dd></div>
          <div><dt>Confidence</dt><dd>{person.confidence}%</dd></div>
        </dl>
        <div className="member-cta-row">
          <Button kind="secondary" onClick={() => onMessage(person.id)}><MessageSquareText size={14} /> Message</Button>
          <Button kind="quiet" onClick={() => net.connect(person.id)}>{connected ? <><Check size={14} /> Connected</> : <><Plus size={14} /> Connect</>}</Button>
          <Button onClick={() => onDraft(person)}><Handshake size={14} /> Request Intro</Button>
          <SaveButton saved={net.saved.includes(person.id)} onToggle={() => net.toggleSave(person.id)} />
          <button className="save-btn" aria-label="Share profile" onClick={() => {
            void navigator.clipboard?.writeText(`https://aetheris-intros.app/${person.id}`).catch(() => {})
            setCopied(true); window.setTimeout(() => setCopied(false), 1600)
          }}><Share2 size={15} /></button>
          <Button kind="quiet" onClick={() => net.follow(person.id)}>{following ? 'Following' : 'Follow'}</Button>
        </div>
        {copied && <small className="copied-note">Profile link copied.</small>}
      </div>
      <figure className="member-plate">
        <Avatar person={person} large portrait />
        <figcaption><span>{classifyConnection(person.scoreTotal).toUpperCase()}</span><p>{person.focus}</p></figcaption>
      </figure>
    </section>

    <div className="member-dark">
      <div className="member-search"><Search size={18} /><input placeholder="Search people, companies, or ideas…" aria-label="Search Aetheris" /></div>

      <section className="intro-reco">
        <header><AetherisGlyph size={16} /><Label signal>INTRODUCTION RECOMMENDATION</Label><b className="beta">BETA</b></header>
        <h2>{classifyConnection(person.scoreTotal)} fit. {person.score.mutualValue >= 80 ? 'High potential value.' : 'Clear mutual value.'}</h2>
        <p>{person.whyThem} {person.mutuals.length ? `${person.name.split(' ')[0]} is also connected to ${person.mutuals.length} ${person.mutuals.length === 1 ? 'person' : 'people'} in your network.` : ''}</p>
        <div className="why-now"><AetherisGlyph size={15} /><div><strong>Why now</strong><p>{person.whyNow}</p></div></div>
        {reasoning && <div className="reasoning-panel">
          <div><span>WHY YOU MATTER TO THEM</span><p>{person.whyYou}</p></div>
          <div><span>TRUST PATH</span><p>{person.bestPath.join(' → ')}</p></div>
          <div><span>RECOMMENDED NEXT MOVE</span><p>{person.nextAction}</p></div>
          <div><span>AVOID</span><p>{person.dontDo}</p></div>
        </div>}
        <footer>
          <Button onClick={() => onDraft(person)}><Send size={15} /> Request Introduction</Button>
          <Button kind="quiet" onClick={() => setReasoning(r => !r)}>{reasoning ? 'Hide Reasoning' : 'View Reasoning'}</Button>
        </footer>
      </section>

      <div className="member-modules four">
        <section className="mod">
          <header><span>ABOUT {person.name.split(' ')[0]?.toUpperCase()}</span></header>
          <p>{person.thesis} {person.focus}</p>
          <ul className="mod-facts">
            <li><Layers size={13} />{person.company}</li>
            <li><Target size={13} />{person.industry}</li>
            <li><UserRound size={13} />{person.role} · {person.location}</li>
          </ul>
        </section>
        <section className="mod">
          <header><span>FOCUS AREAS</span></header>
          <ul className="mod-chips">{[...person.expertise, ...person.tags].slice(0, 6).map(t => <li key={t}>{t}</li>)}</ul>
        </section>
        <section className="mod">
          <header><span>GOALS</span></header>
          <ul className="mod-goals">
            <li><Target size={14} />{person.needs[0]}</li>
            <li><Users size={14} />{person.whyYou}</li>
            <li><TrendingUp size={14} />{person.focus}</li>
          </ul>
        </section>
        <section className="mod">
          <header><span>CAN HELP WITH</span></header>
          <ul className="mod-list"><Handshake size={16} className="mod-icon" />{person.offers.map(o => <li key={o}>{o}</li>)}</ul>
          <header className="mod-second"><span>CURRENTLY LOOKING FOR</span></header>
          <ul className="mod-list"><Search size={16} className="mod-icon" />{person.needs.map(o => <li key={o}>{o}</li>)}</ul>
        </section>
      </div>

      <div className="member-modules three">
        <section className="mod">
          <header><span>COMPATIBILITY INSIGHTS</span></header>
          <div className="compat-rings">
            <Ring value={person.score.strategicFit} label="Strategic Alignment" />
            <Ring value={person.score.mutualValue} label="Shared Interests" />
            <Ring value={person.score.decisionInfluence} label="Network Value" />
          </div>
          <ul className="compat-rows">
            <li><Users size={14} /><b>{person.mutuals.length}</b>Mutual Connections</li>
            <li><MessageSquareText size={14} /><b>{person.score.timing >= 75 ? 'High' : 'Steady'}</b>Conversation Potential</li>
            <li><Fingerprint size={14} /><b>{person.score.trust >= 75 ? 'Aligned' : 'Building'}</b>On Long-Term Impact</li>
            <li><ShieldCheck size={14} /><b>{person.score.opportunityValue >= 75 ? 'Strong' : 'Emerging'}</b>Complementary Expertise</li>
          </ul>
        </section>
        <section className="mod">
          <header><span>SHARED CONNECTIONS ({shared.length})</span><button className="mod-link">View All</button></header>
          <ul className="shared-list">{shared.map(p => <li key={p.id}>
            <Avatar person={p} portrait />
            <div><strong>{p.name}</strong><small>{p.title}, {p.company}</small></div>
            <span className="degree">{net.connections.includes(p.id) ? '1st' : '2nd'}</span>
          </li>)}</ul>
        </section>
        <section className="mod">
          <header><span>RELATIONSHIP HISTORY</span></header>
          <ol className="history-line">{history.map(h => <li key={h.text}><i />
            <div><p>{h.text}</p><small>{h.when}</small></div></li>)}</ol>
        </section>
      </div>

      <div className="member-modules two">
        <section className="mod">
          <header><span>RECENT ACTIVITY</span><button className="mod-link">View All</button></header>
          {activity.length ? activity.map(a => <article className="activity-row" key={a.id}>
            <Avatar person={person} portrait />
            <div><strong>{person.name}</strong><em>{a.kind}</em><p>{a.text}</p>
              <small>♡ {a.responses * 8} · ◇ {a.responses} · ↗ {Math.max(1, Math.round(a.responses / 2))}</small></div>
            <span className="activity-when">{a.when}</span>
          </article>) : <p className="empty-state">No public activity yet. Context will appear as {person.name.split(' ')[0]} posts or responds.</p>}
        </section>
        <section className="mod availability-mod">
          <header><span>AVAILABILITY</span></header>
          <p className="avail-state"><i className="live-dot" />{person.availability}</p>
          <p>Actively meeting operators, founders and specialists aligned with {person.focus.toLowerCase()}</p>
          <button className="book-call" onClick={() => onMessage(person.id)}><CalendarDays size={17} /> Book a 30 min call <ArrowRight size={15} /></button>
        </section>
      </div>

      <section className="mod member-notes">
        <header><span>ACTIVE MEMORY</span><small><LockKeyhole size={11} /> privacy scoped</small></header>
        {notes.map(n => <article key={n.id} className="note-row"><b>{scopeLabel[n.scope]}</b><p>{n.text}</p><small>{n.createdAt}</small></article>)}
        <textarea rows={3} value={text} onChange={e => setText(e.target.value)} placeholder="Record what changed in this relationship…" />
        <div className="scope-picker">{scopes.map(s => <button className={scope === s ? 'active' : ''} onClick={() => setScope(s)} key={s}>{scopeLabel[s]}</button>)}</div>
        <small>{scopeText[scope]}</small>
        <Button kind="secondary" disabled={!text.trim()} onClick={() => { net.addNote(person.id, text.trim(), scope); setText('') }}>Record intelligence</Button>
      </section>

      <footer className="member-footer"><span>THE INTELLIGENCE LAYER FOR MEANINGFUL CONNECTIONS</span><b>AETHERIS INTROS</b></footer>
    </div>
  </article>
}

function IntroModal({ person, onClose, onMessage }: { person: Member | null; onClose: () => void; onMessage: (id: string) => void }) {
  const net = useNetwork()
  const [text, setText] = useState('')
  const [you, setYou] = useState<OptIn>('pending')
  const [them, setThem] = useState<OptIn>('pending')
  useEffect(() => {
    if (person) {
      setText(composeWarmIntro(person))
      setYou(person.introState === 'requested' || person.introState === 'introduced' ? 'yes' : 'pending')
      setThem(person.introState === 'introduced' ? 'yes' : 'pending')
      if (person.introState === 'recommended') net.requestIntro(person.id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person])
  if (!person) return null
  const ok = you === 'yes' && them === 'yes'
  const rows: Array<{ label: string; value: OptIn; set: (v: OptIn) => void }> = [
    { label: 'You', value: you, set: setYou }, { label: person.name, value: them, set: setThem },
  ]
  return <div className="modal-wrap" onMouseDown={onClose}>
    <div className="modal editorial-modal" onMouseDown={e => e.stopPropagation()}>
      <header><div><Label>DOUBLE OPT-IN</Label><h2>A considered introduction.</h2><p>Both sides protect the connector’s credibility.</p></div>
        <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={17} /></button></header>
      <div className="intro-person"><Avatar person={person} /><span><strong>{person.name}</strong><small>{person.title} · {person.company}</small></span></div>
      <textarea rows={8} value={text} onChange={e => setText(e.target.value)} />
      {rows.map(r => <div className="opt-row" key={r.label}>
        <span><strong>{r.label}</strong><small>Confirm this conversation is worth making.</small></span>
        <div><button className={r.value === 'yes' ? 'active' : ''} onClick={() => { r.set('yes'); if (r.value !== 'yes') net.requestIntro(person.id) }}>Interested</button>
          <button className={r.value === 'no' ? 'declined' : ''} onClick={() => { r.set('no'); net.declineIntro(person.id) }}>Not now</button></div>
      </div>)}
      <div className={`authorization ${ok ? 'ready' : ''}`}>{ok ? <CheckCircle2 size={17} /> : <LockKeyhole size={17} />}
        <span>{ok ? 'Introduction authorized. Both parties agreed.' : 'Waiting for both parties before anything is sent.'}</span></div>
      <footer><Button kind="quiet" onClick={onClose}>Cancel</Button>
        <Button disabled={!ok} onClick={() => {
          net.authorizeIntro(person.id)
          net.sendMessage(net.openThreadWith(person.id), text)
          void navigator.clipboard?.writeText(text).catch(() => {})
          onClose(); onMessage(person.id)
        }}><Send size={15} />Send authorized intro</Button></footer>
    </div>
  </div>
}

const blank = { goal: '', who: '', outcome: '', whyNow: '', valueOffer: '', success: '' }
function NeedModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (o: Objective) => void }) {
  const [form, setForm] = useState(blank)
  if (!open) return null
  const ready = form.goal && form.who && form.whyNow && form.valueOffer
  return <div className="modal-wrap light-modal-wrap" onMouseDown={onClose}>
    <div className="modal need-modal" onMouseDown={e => e.stopPropagation()}>
      <header><div><Label>POST A NEED</Label><h2>What outcome are you trying to create?</h2><p>Intros begins with the need, not a list of people.</p></div>
        <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={17} /></button></header>
      <div className="need-form">{([['goal', 'What do you need right now?', 'Open five serious conversations…'],
      ['who', 'Who could change the outcome?', 'Operating partners, founders, trusted connectors…'],
      ['outcome', 'What would progress look like?', 'A working pilot inside one portfolio company…'],
      ['whyNow', 'Why now?', 'The timing signal that makes this relevant…'],
      ['valueOffer', 'What can you offer them?', 'A useful perspective, access or capability…'],
      ['success', 'What does success mean?', 'A second meeting with the right owner…']] as const).map(([key, label, placeholder], i) =>
        <label key={key}><span>0{i + 1} / {label}</span>
          <textarea rows={i === 0 ? 2 : 1} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder} /></label>)}</div>
      <footer><Button kind="quiet" onClick={onClose}>Cancel</Button>
        <Button disabled={!ready} onClick={() => {
          onCreate({ id: `o${Date.now()}`, title: form.goal, outcome: form.outcome || form.goal, target: form.who, whyNow: form.whyNow, valueOffer: form.valueOffer, success: form.success || 'A qualified next conversation', priority: 'high' })
          setForm(blank); onClose()
        }}>Post to the network <ArrowRight size={15} /></Button></footer>
    </div>
  </div>
}

function AskModal({ open, onClose, people, select }: { open: boolean; onClose: () => void; people: Member[]; select: (p: Member) => void }) {
  const [query, setQuery] = useState('')
  const [asked, setAsked] = useState(false)
  if (!open) return null
  const q = query.toLowerCase()
  const terms = q.split(/\s+/).filter(t => t.length > 3)
  const cooling = /cool|dormant|risk|lost|quiet/.test(q)
  const ranked = [...people]
    .map(p => {
      const text = `${p.name} ${p.title} ${p.company} ${p.industry} ${p.role} ${p.focus} ${p.needs.join(' ')} ${p.offers.join(' ')} ${p.location}`.toLowerCase()
      const match = terms.filter(t => text.includes(t)).length * 14
      const timing = cooling ? Math.min(p.lastInteractionDays, 120) : p.score.timing / 4
      return { p, rank: p.scoreTotal + match + timing }
    })
    .sort((a, b) => b.rank - a.rank).slice(0, 3).map(x => x.p)
  return <div className="modal-wrap" onMouseDown={onClose}>
    <div className="modal ask-modal" onMouseDown={e => e.stopPropagation()}>
      <header><div><Label>ASK INTROS</Label><h2>Ask the relationship graph.</h2><p>Answers use relationship context, timing, trust and stated unknowns.</p></div>
        <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={17} /></button></header>
      <div className="ask-input"><Search size={17} />
        <input autoFocus value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && query.trim()) setAsked(true) }} placeholder="Who should I talk to this week?" />
        <Button disabled={!query.trim()} onClick={() => setAsked(true)}>Ask</Button></div>
      {asked && <div className="ask-results">
        <p>{cooling
          ? 'These relationships are cooling: real prior strength, no recent contact. Reactivate with something useful before asking for anything.'
          : 'Three relationships justify attention now. They combine strategic fit with a current timing signal; the rest of the graph should stay untouched.'}</p>
        {ranked.map(p => <button key={p.id} onClick={() => { onClose(); select(p) }}>
          <Avatar person={p} /><span><strong>{p.name}</strong><small>{p.whyNow}</small></span><Score value={p.scoreTotal} /></button>)}
        <div className="ask-unknown"><AlertTriangle size={14} /><span><b>Unknown:</b> whether any are currently evaluating another option.</span></div>
      </div>}
      <div className="quick-questions">{['Who should I talk to this week?', 'Which relationships are cooling?', 'Who can open a trusted path into PE?'].map(q =>
        <button key={q} onClick={() => { setQuery(q); setAsked(true) }}>{q}</button>)}</div>
    </div>
  </div>
}

function Onboarding({ open, onClose }: { open: boolean; onClose: () => void }) {
  const net = useNetwork()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const p = net.profile
    return { who: p.title, focus: p.focus, need: p.lookingFor, help: p.canHelpWith, industries: p.industries.join(', '), where: p.location, meet: p.wantToMeet ?? '', valuable: p.introPreferences ?? '', never: p.boundaries ?? '' }
  })
  if (!open) return null
  const q = onboardingQuestions[step]!
  const learned = onboardingQuestions.slice(0, step).filter(x => answers[x.key]?.trim())
  const last = step === onboardingQuestions.length - 1
  return <div className="modal-wrap light-modal-wrap" onMouseDown={onClose}>
    <div className="modal onboarding-modal" onMouseDown={e => e.stopPropagation()}>
      <header><div><Label>BUILD YOUR PROFILE · {String(step + 1).padStart(2, '0')} / {onboardingQuestions.length}</Label>
        <h2>{q.label}</h2><p>Answer in your own words. Nothing is shared until you choose to share it.</p></div>
        <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={17} /></button></header>
      <div className="onboarding-body">
        <textarea rows={3} autoFocus value={answers[q.key] ?? ''} onChange={e => setAnswers({ ...answers, [q.key]: e.target.value })} placeholder={q.placeholder} />
        <aside>
          <span className="forming"><span className="signal-dot" />Your Active Memory is forming</span>
          <ul>{learned.map(x => <li key={x.key}><Check size={12} />{x.learns}</li>)}
            {!learned.length && <li className="pending">Nothing learned yet.</li>}</ul>
        </aside>
      </div>
      <footer>
        <Button kind="quiet" onClick={() => step ? setStep(step - 1) : onClose()}>{step ? 'Back' : 'Later'}</Button>
        <Button onClick={() => {
          if (last) { net.completeOnboarding(answers); onClose() } else setStep(step + 1)
        }}>{last ? 'Save profile & enter Intros' : 'Continue'} <ArrowRight size={15} /></Button>
      </footer>
    </div>
  </div>
}

function ContextRail({ page, people, select, onAsk }: {
  page: Page; people: Member[]; select: (p: Member) => void; onAsk: () => void
}) {
  const net = useNetwork()
  const nav = useNav()
  const objectives = net.objectives
  const ranked = [...people].sort((a, b) => b.scoreTotal - a.scoreTotal)
  const p = ranked[0]
  const cool = [...people].sort((a, b) => b.lastInteractionDays - a.lastInteractionDays)[0]
  const warm = people.filter(x => x.bestPath.length > 2).slice(0, 2)
  if (!p) return null
  return <aside className="context-rail">
    <div className="context-label"><span>CONTEXT / {page.toUpperCase()}</span><CircleDot size={12} /></div>
    {objectives[0] && <div className="rail-need"><span>ACTIVE NEED</span><strong>{objectives[0].title}</strong><small>{objectives[0].success}</small></div>}
    <div className="context-number"><strong>{p.scoreTotal}</strong><span>strongest<br />active match</span></div>
    <button className="context-person" onClick={() => select(p)}><Avatar person={p} /><span><strong>{p.name}</strong><small>{p.company}</small></span><ArrowRight size={14} /></button>
    <div className="rail-block"><span>NEW WARM PATHS</span>{warm.map(w =>
      <button key={w.id} onClick={() => select(w)}><b>{w.name}</b><small>via {w.bestPath[1]}</small></button>)}</div>
    {cool && <button className="rail-cooling" onClick={() => nav.messageMember(cool.id)}><span className="signal-dot" />
      <div><strong>Conversation cooling</strong><small>{cool.name} · {cool.lastInteractionDays} days quiet</small></div></button>}
    <div className="context-signal"><span className="signal-dot" /><div><strong>Active Memory</strong><small>{net.learnings.length} signals · {net.connections.length} connections</small></div></div>
    <button className="ask-button" onClick={onAsk}><AetherisGlyph size={16} /><span>Ask Intros</span><kbd>⌘K</kbd></button>
  </aside>
}

/* ---------------------------------------------------------------------- app */

export default function App() {
  return <NetworkProvider><Shell /></NetworkProvider>
}

function Shell() {
  const net = useNetwork()
  const stored = typeof window !== 'undefined' ? localStorage.getItem('aetheris-intros-page') : null
  const initial = (stored && nav.some(n => n.id === stored) ? stored : legacyPage[stored ?? ''] ?? 'home') as Page
  const [page, setPage] = useState<Page>(initial)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [selected, setSelected] = useState<Member | null>(null)
  const [draft, setDraft] = useState<Member | null>(null)
  const [needOpen, setNeedOpen] = useState(false)
  const [askOpen, setAskOpen] = useState(false)
  const [onboardOpen, setOnboardOpen] = useState(false)
  const [threadId, setThreadIdState] = useState(() => (typeof window === 'undefined' ? '' : localStorage.getItem('aetheris-intros-thread') ?? ''))
  const setThreadId = (id: string) => { setThreadIdState(id); localStorage.setItem('aetheris-intros-thread', id) }
  const people = net.members
  const me = net.profile

  useEffect(() => { localStorage.setItem('aetheris-intros-page', page) }, [page])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setAskOpen(true) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const addNeed = (o: Objective) => {
    net.addObjective(o)
    net.addAsk({ ask: o.title, detail: o.outcome, whyNow: o.whyNow, offer: o.valueOffer, industry: 'Cross-industry', location: me.location, urgency: 'high', visibility: 'network' })
    setPage('needs')
  }
  const goToThread = (id: string) => { setThreadId(id); setPage('messages') }
  const messageMember = (memberId: string) => {
    setSelected(null); setDraft(null)
    goToThread(net.openThreadWith(memberId))
  }
  const navApi: NavApi = {
    setPage, openMember: setSelected, openIntro: p => { setSelected(null); setDraft(p) },
    messageMember, goToThread, postNeed: () => setNeedOpen(true),
  }

  const content = selected
    ? <MemberProfile person={selected} people={people} onClose={() => setSelected(null)} onDraft={p => { setSelected(null); setDraft(p) }} onMessage={messageMember} />
    : {
      home: <Home people={people} select={setSelected} setPage={setPage} openNeed={() => setNeedOpen(true)} openThread={goToThread} />,
      discover: <Discover people={people} select={setSelected} />,
      intros: <Intros people={people} select={setSelected} draft={setDraft} />,
      messages: <Messages people={people} select={setSelected} activeId={threadId} setActiveId={setThreadId} />,
      needs: <Needs onNew={() => setNeedOpen(true)} people={people} select={setSelected} setPage={setPage} />,
      memory: <Memory people={people} select={setSelected} />,
      insights: <Insights people={people} select={setSelected} setPage={setPage} />,
      profile: <Profile people={people} setPage={setPage} openOnboarding={() => setOnboardOpen(true)} />,
    }[page]

  return <NavCtx.Provider value={navApi}>
    <div className={`app-shell ${collapsed ? 'rail-collapsed' : ''}`}>
      <aside className={`nav-rail ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="rail-head"><Brand /><button className="rail-toggle" onClick={() => setCollapsed(!collapsed)} aria-label="Collapse navigation"><ChevronLeft size={16} /></button></div>
        <nav>{nav.map(item => {
          const Icon = item.icon
          return <button key={item.id} className={page === item.id ? 'active' : ''} title={item.label} onClick={() => { setPage(item.id); setMobileOpen(false) }}>
            <Icon size={18} /><span>{item.label}</span></button>
        })}</nav>
        <div className="rail-foot"><span className="live-dot" /><span>Memory live</span>
          <button onClick={() => setPage('profile')} aria-label="Your profile"><span>{me.initials}</span></button></div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button className="icon-btn mobile-menu" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu"><Menu size={19} /></button>
          <span className="topbar-title">Aetheris Intros <i>/</i> {nav.find(n => n.id === page)?.label}</span>
          <div>
            <button className="icon-btn" title="Build your profile" onClick={() => setOnboardOpen(true)} aria-label="Build your profile"><Fingerprint size={17} /></button>
            <button className="icon-btn" title="Post a need" onClick={() => setNeedOpen(true)} aria-label="Post a need"><Plus size={18} /></button>
            <button className="icon-btn" title="Ask Intros" onClick={() => setAskOpen(true)} aria-label="Ask Intros"><AetherisGlyph size={18} /></button>
          </div>
        </header>
        <div className="workspace-grid">
          <main className="content">{content}</main>
          <ContextRail page={page} people={people} select={setSelected} onAsk={() => setAskOpen(true)} />
        </div>
      </div>
      <nav className="mobile-nav">{nav.map(item => {
        const Icon = item.icon
        return <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => setPage(item.id)}><Icon size={18} /><span>{item.label}</span></button>
      })}</nav>
      
      <IntroModal person={draft} onClose={() => setDraft(null)} onMessage={messageMember} />
      <NeedModal open={needOpen} onClose={() => setNeedOpen(false)} onCreate={addNeed} />
      <AskModal open={askOpen} onClose={() => setAskOpen(false)} people={people} select={setSelected} />
      <Onboarding open={onboardOpen} onClose={() => setOnboardOpen(false)} />
      {mobileOpen && <button className="rail-scrim" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}
    </div>
  </NavCtx.Provider>
}
