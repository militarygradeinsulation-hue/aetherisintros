import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle, ArrowRight, Bookmark, BookmarkCheck, BrainCircuit, Check, CheckCircle2, ChevronLeft,
  ChevronRight, CircleDot, Compass, Eye, Fingerprint, Handshake, Home as HomeIcon, LockKeyhole,
  Menu, MessageSquareText, Network, Plus, Search, Send, Share2, ShieldCheck, Sparkles, Target,
  TrendingUp, UserRound, X,
} from 'lucide-react'
import { defaultDigitalYou, leaks, objectives as seedObjectives } from './data'
import type { AutonomyLevel, DigitalYouProfile, Objective, PrivacyScope } from './types'
import {
  howIntrosWorks, introStateLabel, learnings, me, members, networkAsks, onboardingQuestions, signals, threads,
  type Learning, type Member, type NetworkAsk, type Thread,
} from './social'
import { classifyConnection, composeWarmIntro, radarLabel } from './lib/engine'

type Page = 'home' | 'discover' | 'intros' | 'messages' | 'needs' | 'memory' | 'insights' | 'profile'
type MemoryNote = { id: string; personId: string; text: string; scope: PrivacyScope; createdAt: string }
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

/* ---------------------------------------------------------------- primitives */

function Brand() {
  return <div className="brand-mark"><span className="brand-monogram">AI</span><span className="brand-name">Aetheris<em>Intros</em></span></div>
}
function Avatar({ person, large = false, portrait = false }: { person: Member; large?: boolean; portrait?: boolean }) {
  return <span className={`person-avatar ${large ? 'large' : ''} ${portrait ? 'portrait' : ''}`}>{person.initials}</span>
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
    <div><Label>{label}</Label><h1>{title}</h1><p>{copy}</p>{proof && <small className="page-proof"><Sparkles size={11} />{proof}</small>}</div>
    {action}
  </header>
}
function SaveButton({ saved, onToggle }: { saved: boolean; onToggle: () => void }) {
  return <button className={`save-btn ${saved ? 'saved' : ''}`} onClick={onToggle} aria-label={saved ? 'Saved' : 'Save member'}>
    {saved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
  </button>
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

function MemberCard({ person, onOpen, onMessage, onIntro, saved, onSave }: { person: Member; onOpen: () => void; onMessage: () => void; onIntro: () => void; saved: boolean; onSave: () => void }) {
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
      <div>
        <SaveButton saved={saved} onToggle={onSave} />
        <Button kind="secondary" onClick={onMessage}><MessageSquareText size={14} /> Message</Button>
        <Button onClick={onIntro}><Handshake size={14} /> Request intro</Button>
      </div>
    </footer>
  </article>
}

function AskCard({ ask, member, onMessage, onOpen, saved, onSave }: { ask: NetworkAsk; member?: Member; onMessage: () => void; onOpen: () => void; saved: boolean; onSave: () => void }) {
  return <article className="feed-card ask-card">
    <header>
      <button className="ask-author" onClick={onOpen}>{member && <Avatar person={member} />}<span><strong>{member?.name ?? 'Member'}</strong><small>{member?.title} · {member?.company}</small></span></button>
      <span className={`urgency ${ask.urgency}`}>{ask.urgency === 'high' ? 'Time sensitive' : ask.urgency === 'medium' ? 'Active' : 'Open'}</span>
    </header>
    <h3>{ask.ask}</h3>
    <p>{ask.detail}</p>
    <dl>
      <div><dt>WHY NOW</dt><dd>{ask.whyNow}</dd></div>
      <div><dt>WHAT THEY OFFER</dt><dd>{ask.offer}</dd></div>
    </dl>
    <footer>
      <small>{ask.industry} · {ask.location} · {ask.posted} · {ask.responses} responses</small>
      <div>
        <SaveButton saved={saved} onToggle={onSave} />
        <Button kind="quiet" onClick={onOpen}>Ask for a warm path</Button>
        <Button kind="secondary" onClick={onMessage}>Respond</Button>
      </div>
    </footer>
  </article>
}

function Home({ people, select, setPage, openNeed, openThread, saved, toggleSave, objectives }: {
  people: Member[]; select: (p: Member) => void; setPage: (p: Page) => void; openNeed: () => void
  openThread: (id: string) => void; saved: string[]; toggleSave: (id: string) => void; objectives: Objective[]
}) {
  const [tab, setTab] = useState<'people' | 'asks' | 'signals'>('people')
  const ranked = useMemo(() => [...people].sort((a, b) => b.scoreTotal - a.scoreTotal), [people])
  const activeNeed = objectives[0]
  return <>
    <header className="home-question">
      <Label>PEOPLE × CONTEXT × OPPORTUNITY</Label>
      <h1>What do you need<br /><em>right now?</em></h1>
      <button className="need-input" onClick={openNeed}><span>Describe the outcome you want to create…</span><ArrowRight size={20} /></button>
      <p>Tell Intros the outcome. It will find the people, context and path.</p>
    </header>

    <div className="feed-tabs">
      {([['people', 'People to know now'], ['asks', 'Network asks'], ['signals', 'Professional signals']] as const).map(([id, label]) =>
        <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}
      <button className="text-action feed-tab-action" onClick={() => setPage('discover')}>Browse the network <ArrowRight size={13} /></button>
    </div>

    <div className="feed">
      {tab === 'people' && ranked.slice(0, 4).map(p =>
        <MemberCard key={p.id} person={p} onOpen={() => select(p)} onMessage={() => setPage('messages')} onIntro={() => select(p)} saved={saved.includes(p.id)} onSave={() => toggleSave(p.id)} />)}
      {tab === 'asks' && networkAsks.map(a =>
        <AskCard key={a.id} ask={a} member={people.find(p => p.id === a.memberId)} onMessage={() => setPage('messages')} onOpen={() => { const m = people.find(p => p.id === a.memberId); if (m) select(m) }} saved={saved.includes(a.id)} onSave={() => toggleSave(a.id)} />)}
      {tab === 'signals' && <section className="signal-list">{signals.map(s => {
        const m = people.find(p => p.id === s.memberId)
        return <button key={s.id} onClick={() => { if (m) select(m) }}>
          <span className="signal-dot" />
          <span className="signal-kind">{s.kind}</span>
          <span className="signal-copy"><strong>{s.text}</strong><small>{s.when}</small></span>
          <ArrowRight size={15} />
        </button>
      })}</section>}
    </div>

    <section className="home-education">
      <div><Label>WHY THIS FEED LOOKS LIKE THIS</Label><h2>Your network already contains opportunities.</h2>
        <p>Intros reads needs, offers, timing and trust paths, then shows only the relationships where a conversation is justified now.</p>
        <button className="text-action" onClick={() => setPage('intros')}>See the reasoning behind a match <ArrowRight size={14} /></button></div>
      <MemoryGraph people={people} onSelect={select} compact />
    </section>

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

function Discover({ people, select, saved, toggleSave, setPage }: { people: Member[]; select: (p: Member) => void; saved: string[]; toggleSave: (id: string) => void; setPage: (p: Page) => void }) {
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
        <footer>
          <SaveButton saved={saved.includes(p.id)} onToggle={() => toggleSave(p.id)} />
          <Button kind="secondary" onClick={() => setPage('messages')}><MessageSquareText size={14} /> Message</Button>
          <Button onClick={() => select(p)}><Handshake size={14} /> Intro</Button>
        </footer>
      </article>)}
      {!filtered.length && <p className="empty-state">No members match that yet. Broaden the filters or describe the outcome instead of the title.</p>}
    </div>
  </>
}

/* -------------------------------------------------------------------- intros */

function MatchReport({ person, onOpen, onIntro, onMessage }: { person: Member; onOpen: () => void; onIntro: () => void; onMessage: () => void }) {
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
      <Button kind="secondary" onClick={onMessage}><MessageSquareText size={15} /> Message</Button>
      <Button onClick={onIntro}><Handshake size={15} /> Request introduction</Button>
    </footer>
  </article>
}

function Intros({ people, select, draft, setPage }: { people: Member[]; select: (p: Member) => void; draft: (p: Member) => void; setPage: (p: Page) => void }) {
  const [state, setState] = useState<'all' | Member['introState']>('all')
  const ranked = [...people].sort((a, b) => b.scoreTotal - a.scoreTotal)
  const shown = state === 'all' ? ranked.slice(0, 6) : ranked.filter(p => p.introState === state)
  return <>
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
      {shown.map(p => <MatchReport key={p.id} person={p} onOpen={() => select(p)} onIntro={() => draft(p)} onMessage={() => setPage('messages')} />)}
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
  const [sent, setSent] = useState<Record<string, string[]>>({})
  const [text, setText] = useState('')
  const thread: Thread = threads.find(t => t.id === activeId) ?? threads[0]!
  const person = people.find(p => p.id === thread.memberId)
  if (!person) return null
  const extra = sent[thread.id] ?? []
  return <>
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
          <button className="icon-btn" onClick={() => select(person)} aria-label="Open relationship intelligence"><BrainCircuit size={17} /></button>
        </header>
        <div className="intro-context"><Label>INTRODUCTION CONTEXT</Label><p>{thread.introContext}</p></div>
        <div className="messages">
          {thread.messages.map(m => <div key={m.id} className={`message ${m.from === 'me' ? 'outgoing' : 'incoming'}`}>{m.text}<small>{m.at}</small></div>)}
          {extra.map((t, i) => <div key={i} className="message outgoing">{t}<small>Just now</small></div>)}
          <div className="shared-context"><Sparkles size={12} /><span>Shared context: {person.needs[0]} · {person.offers[0]}</span></div>
        </div>
        <div className="composer-wrap">
          <button className="suggested" onClick={() => setText(thread.suggested)}><Sparkles size={13} /> Use suggested reply</button>
          <div className="composer">
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Write with the relationship in mind…" />
            <button onClick={() => { if (text.trim()) { setSent(s => ({ ...s, [thread.id]: [...(s[thread.id] ?? []), text.trim()] })); setText('') } }} disabled={!text.trim()} aria-label="Send"><Send size={17} /></button>
          </div>
        </div>
      </section>
      <aside className="conversation-intel">
        <Label>RELATIONSHIP CONTEXT</Label>
        <h3>Why you’re connected</h3>
        <p>{person.whyThem}</p>
        <dl>
          <div><dt>THEY ARE LOOKING FOR</dt><dd>{person.needs.join(' · ')}</dd></div>
          <div><dt>YOU CAN HELP WITH</dt><dd>{me.canHelpWith}</dd></div>
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

function Needs({ objectives, onNew, people, select, saved, toggleSave, setPage }: {
  objectives: Objective[]; onNew: () => void; people: Member[]; select: (p: Member) => void
  saved: string[]; toggleSave: (id: string) => void; setPage: (p: Page) => void
}) {
  const [tab, setTab] = useState<'for-you' | 'yours' | 'network' | 'saved'>('for-you')
  const forYou = networkAsks.filter(a => ['a1', 'a4', 'a3'].includes(a.id))
  const list = tab === 'network' ? networkAsks : tab === 'saved' ? networkAsks.filter(a => saved.includes(a.id)) : forYou
  return <>
    <PageHead label="NEEDS" title="Tell the network what you need."
      copy="State the outcome you are trying to create. Intros finds who can move it forward and why they would want to."
      proof="Network-visible asks feed matching. Private asks stay private."
      action={<Button onClick={onNew}><Plus size={15} />Post a need</Button>} />
    <div className="feed-tabs">
      {([['for-you', 'For you'], ['yours', 'Your needs'], ['network', 'Network needs'], ['saved', 'Saved']] as const).map(([id, label]) =>
        <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}
    </div>
    {tab === 'yours' ? <div className="feed">
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
      {!objectives.length && <p className="empty-state">You have not posted a need yet. Start with the outcome, not a list of people.</p>}
    </div> : <div className="feed">
      {list.map(a => <AskCard key={a.id} ask={a} member={people.find(p => p.id === a.memberId)} onMessage={() => setPage('messages')}
        onOpen={() => { const m = people.find(p => p.id === a.memberId); if (m) select(m) }} saved={saved.includes(a.id)} onSave={() => toggleSave(a.id)} />)}
      {!list.length && <p className="empty-state">Nothing saved yet. Save an ask to keep it beside your own needs.</p>}
    </div>}
  </>
}

/* -------------------------------------------------------------------- memory */

const memoryCategories: Learning['category'][] = ['People', 'Companies', 'Needs', 'Messages', 'Introductions', 'Decisions', 'Interests', 'Commitments']

function Memory({ people, select, notes }: { people: Member[]; select: (p: Member) => void; notes: MemoryNote[] }) {
  const [cat, setCat] = useState<Learning['category'] | 'All'>('All')
  const items: Learning[] = [
    ...notes.slice(0, 4).map((n, i): Learning => ({
      id: `n${i}`, category: 'People', text: n.text, source: 'Recorded by you', confidence: 100, scope: n.scope, when: n.createdAt,
    })),
    ...learnings,
  ]
  const shown = cat === 'All' ? items : items.filter(l => l.category === cat)
  return <>
    <PageHead label="ACTIVE MEMORY" title="Intros remembers the context people lose."
      copy="Every signal keeps its source, confidence, privacy scope and the moment it was learned."
      proof="Nothing private is ever quoted in an introduction." />
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
        {shown.map(l => <article key={l.id}>
          <span>{l.category}</span>
          <p>{l.text}</p>
          <small>{l.source} · {l.confidence}% confidence · {scopeLabel[l.scope]} · {l.when}</small>
        </article>)}
        {!shown.length && <p className="empty-state">Nothing learned in this category yet.</p>}
      </aside>
    </div>
  </>
}

/* ------------------------------------------------------------------ insights */

function Insights({ people, select, setPage, saved, toggleSave }: { people: Member[]; select: (p: Member) => void; setPage: (p: Page) => void; saved: string[]; toggleSave: (id: string) => void }) {
  const [dismissed, setDismissed] = useState<string[]>([])
  return <>
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
            <Button kind="secondary" onClick={() => setPage('messages')}>Message</Button>
            <Button onClick={() => select(p)}>Ask for intro</Button>
            <SaveButton saved={saved.includes(p.id)} onToggle={() => toggleSave(p.id)} />
            <button className="dismiss" onClick={() => setDismissed(d => [...d, leak.id])}>Dismiss</button>
          </div>
        </article>
      })}
      {leaks.length === dismissed.length && <p className="empty-state">All signals handled. Intros will surface the next change as the graph moves.</p>}
    </div>
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

function Profile({ profile, setProfile, autonomy, setAutonomy, people, setPage, notes }: {
  profile: DigitalYouProfile; setProfile: (x: DigitalYouProfile) => void; autonomy: AutonomyLevel
  setAutonomy: (x: AutonomyLevel) => void; people: Member[]; setPage: (p: Page) => void; notes: MemoryNote[]
}) {
  const sliders: [keyof DigitalYouProfile, string, string, string][] = [
    ['directness', 'Directness', 'Soft', 'Direct'], ['formality', 'Formality', 'Casual', 'Formal'],
    ['warmth', 'Warmth', 'Reserved', 'Warm'], ['brevity', 'Brevity', 'Detailed', 'Tight'],
  ]
  return <>
    <section className="identity-header">
      <div className="identity-portrait"><span>{me.initials}</span><small>AETHERIS MEMBER SINCE 2024</small></div>
      <div className="identity-copy">
        <Label>MEMBER PROFILE</Label>
        <h1>{me.name}</h1>
        <p className="identity-role">{me.title}<br />{me.company} · {me.location}</p>
        <p className="identity-thesis">{me.thesis}</p>
        <div className="identity-actions">
          <Button kind="secondary" onClick={() => setPage('messages')}><MessageSquareText size={14} /> Message</Button>
          <Button onClick={() => setPage('intros')}><Handshake size={14} /> Request intro</Button>
          <Button kind="quiet" onClick={() => setPage('discover')}><Bookmark size={14} /> Save</Button>
          <Button kind="quiet" onClick={() => navigator.clipboard?.writeText('https://aetheris-intros.app/joseph-toney')}><Share2 size={14} /> Share profile</Button>
        </div>
      </div>
    </section>

    <div className="profile-facts">
      {[['CURRENT FOCUS', me.focus], ['LOOKING FOR', me.lookingFor], ['CAN HELP WITH', me.canHelpWith],
      ['INDUSTRIES', me.industries.join(' · ')], ['EXPERTISE', me.expertise.join(' · ')], ['VALUES', me.values],
      ['AVAILABILITY', me.availability], ['RECENT ASK', 'Founder & PE introductions · 5 qualified conversations']].map(([k, v]) =>
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

/* ------------------------------------------------------- drawer and modals */

function PersonDrawer({ person, onClose, onDraft, notes, onAdd, saved, onSave, onMessage }: {
  person: Member | null; onClose: () => void; onDraft: (p: Member) => void; notes: MemoryNote[]
  onAdd: (id: string, text: string, scope: PrivacyScope) => void; saved: boolean; onSave: () => void; onMessage: () => void
}) {
  const [text, setText] = useState('')
  const [scope, setScope] = useState<PrivacyScope>('private')
  if (!person) return null
  return <div className="drawer-wrap" onMouseDown={onClose}>
    <aside className="intel-drawer" onMouseDown={e => e.stopPropagation()}>
      <header><button className="icon-btn" onClick={onClose} aria-label="Close"><X size={17} /></button><Label>MEMBER INTELLIGENCE</Label><Score value={person.scoreTotal} /></header>
      <div className="drawer-person">
        <Avatar person={person} large portrait />
        <div><h2>{person.name}</h2><p>{person.title} · {person.company}</p><p>{person.location} · {person.role} · {person.industry}</p></div>
      </div>
      <div className="drawer-thesis"><Label>WHY THIS INTRO</Label><h3>{classifyConnection(person.scoreTotal)}</h3><p>{person.whyThem}</p></div>
      {([['PROFESSIONAL THESIS', person.thesis], ['CURRENT FOCUS', person.focus], ['LOOKING FOR', person.needs.join(' · ')],
      ['CAN HELP WITH', person.offers.join(' · ')], ['WHY YOU MATTER TO THEM', person.whyYou], ['WHY NOW', person.whyNow],
      ['MUTUAL CONNECTIONS', person.mutuals.join(' · ') || 'None yet'], ['AVAILABILITY', person.availability],
      ['RECOMMENDED NEXT MOVE', person.nextAction], ['AVOID', person.dontDo]] as const).map(([a, b]) =>
        <section key={a}><span>{a}</span><p>{b}</p></section>)}
      <section><span>TRUST PATH</span><div className="drawer-path">{person.bestPath.join(' → ')}</div></section>
      <section className="drawer-memory">
        <div className="section-heading"><span>ACTIVE MEMORY</span><small><LockKeyhole size={11} />privacy scoped</small></div>
        {notes.filter(n => n.personId === person.id).map(n => <article key={n.id}><b>{scopeLabel[n.scope]}</b><p>{n.text}</p><small>{n.createdAt}</small></article>)}
        <textarea rows={3} value={text} onChange={e => setText(e.target.value)} placeholder="Record what changed in this relationship…" />
        <div className="scope-picker">{scopes.map(s => <button className={scope === s ? 'active' : ''} onClick={() => setScope(s)} key={s}>{scopeLabel[s]}</button>)}</div>
        <small>{scopeText[scope]}</small>
        <Button kind="secondary" disabled={!text.trim()} onClick={() => { onAdd(person.id, text.trim(), scope); setText('') }}>Record intelligence</Button>
      </section>
      <footer>
        <SaveButton saved={saved} onToggle={onSave} />
        <Button kind="quiet" onClick={onMessage}>Message</Button>
        <Button onClick={() => onDraft(person)}>Request introduction <ArrowRight size={14} /></Button>
      </footer>
    </aside>
  </div>
}

function IntroModal({ person, onClose }: { person: Member | null; onClose: () => void }) {
  const [text, setText] = useState('')
  const [you, setYou] = useState<OptIn>('pending')
  const [them, setThem] = useState<OptIn>('pending')
  useEffect(() => { if (person) { setText(composeWarmIntro(person)); setYou('pending'); setThem('pending') } }, [person])
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
        <div><button className={r.value === 'yes' ? 'active' : ''} onClick={() => r.set('yes')}>Interested</button>
          <button className={r.value === 'no' ? 'declined' : ''} onClick={() => r.set('no')}>Not now</button></div>
      </div>)}
      <div className={`authorization ${ok ? 'ready' : ''}`}>{ok ? <CheckCircle2 size={17} /> : <LockKeyhole size={17} />}
        <span>{ok ? 'Introduction authorized. Both parties agreed.' : 'Waiting for both parties before anything is sent.'}</span></div>
      <footer><Button kind="quiet" onClick={onClose}>Cancel</Button>
        <Button disabled={!ok} onClick={() => { navigator.clipboard?.writeText(text); onClose() }}><Send size={15} />Copy authorized intro</Button></footer>
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
  const ranked = [...people].sort((a, b) => b.scoreTotal - a.scoreTotal).slice(0, 3)
  return <div className="modal-wrap" onMouseDown={onClose}>
    <div className="modal ask-modal" onMouseDown={e => e.stopPropagation()}>
      <header><div><Label>ASK INTROS</Label><h2>Ask the relationship graph.</h2><p>Answers use relationship context, timing, trust and stated unknowns.</p></div>
        <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={17} /></button></header>
      <div className="ask-input"><Search size={17} />
        <input autoFocus value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && query.trim()) setAsked(true) }} placeholder="Who should I talk to this week?" />
        <Button disabled={!query.trim()} onClick={() => setAsked(true)}>Ask</Button></div>
      {asked && <div className="ask-results">
        <p>Three relationships justify attention now. They combine strategic fit with a current timing signal; the rest of the graph should stay untouched.</p>
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
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
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
        <Button onClick={() => last ? onClose() : setStep(step + 1)}>{last ? 'Enter Intros' : 'Continue'} <ArrowRight size={15} /></Button>
      </footer>
    </div>
  </div>
}

function ContextRail({ page, people, select, onAsk, objectives, openThread }: {
  page: Page; people: Member[]; select: (p: Member) => void; onAsk: () => void; objectives: Objective[]; openThread: () => void
}) {
  const ranked = [...people].sort((a, b) => b.scoreTotal - a.scoreTotal)
  const p = ranked[0]
  const warm = people.filter(x => x.bestPath.length > 2).slice(0, 2)
  if (!p) return null
  return <aside className="context-rail">
    <div className="context-label"><span>CONTEXT / {page.toUpperCase()}</span><CircleDot size={12} /></div>
    {objectives[0] && <div className="rail-need"><span>ACTIVE NEED</span><strong>{objectives[0].title}</strong><small>{objectives[0].success}</small></div>}
    <div className="context-number"><strong>{p.scoreTotal}</strong><span>strongest<br />active match</span></div>
    <button className="context-person" onClick={() => select(p)}><Avatar person={p} /><span><strong>{p.name}</strong><small>{p.company}</small></span><ArrowRight size={14} /></button>
    <div className="rail-block"><span>NEW WARM PATHS</span>{warm.map(w =>
      <button key={w.id} onClick={() => select(w)}><b>{w.name}</b><small>via {w.bestPath[1]}</small></button>)}</div>
    <button className="rail-cooling" onClick={openThread}><span className="signal-dot" /><div><strong>Conversation cooling</strong><small>Scott Kelley · commitment open</small></div></button>
    <div className="context-signal"><span className="signal-dot" /><div><strong>Active Memory</strong><small>{learnings.length} signals · 3 new this week</small></div></div>
    <button className="ask-button" onClick={onAsk}><BrainCircuit size={16} /><span>Ask Intros</span><kbd>⌘K</kbd></button>
  </aside>
}

/* ---------------------------------------------------------------------- app */

export default function App() {
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
  const [threadId, setThreadId] = useState('t1')
  const [profile, setProfileState] = useState<DigitalYouProfile>(() => { try { return JSON.parse(localStorage.getItem('aetheris-intros-dy') || '') || defaultDigitalYou } catch { return defaultDigitalYou } })
  const [autonomy, setAutonomyState] = useState<AutonomyLevel>(() => Number(localStorage.getItem('aetheris-intros-autonomy') || '2') as AutonomyLevel)
  const [objectives, setObjectives] = useState<Objective[]>(() => { try { return JSON.parse(localStorage.getItem('aetheris-nexus-objectives') || '') || seedObjectives } catch { return seedObjectives } })
  const [notes, setNotes] = useState<MemoryNote[]>(() => { try { return JSON.parse(localStorage.getItem('aetheris-nexus-memory') || '') || [] } catch { return [] } })
  const [saved, setSaved] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('aetheris-intros-saved') || '') || [] } catch { return [] } })
  const people = members

  useEffect(() => { localStorage.setItem('aetheris-intros-page', page) }, [page])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setAskOpen(true) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const saveProfile = (x: DigitalYouProfile) => { setProfileState(x); localStorage.setItem('aetheris-intros-dy', JSON.stringify(x)) }
  const saveAutonomy = (x: AutonomyLevel) => { setAutonomyState(x); localStorage.setItem('aetheris-intros-autonomy', String(x)) }
  const addNeed = (o: Objective) => { const x = [o, ...objectives]; setObjectives(x); localStorage.setItem('aetheris-nexus-objectives', JSON.stringify(x)); setPage('needs') }
  const addNote = (personId: string, text: string, scope: PrivacyScope) => {
    const x = [{ id: `m${Date.now()}`, personId, text, scope, createdAt: new Date().toLocaleDateString() }, ...notes]
    setNotes(x); localStorage.setItem('aetheris-nexus-memory', JSON.stringify(x))
  }
  const toggleSave = (id: string) => {
    const x = saved.includes(id) ? saved.filter(s => s !== id) : [...saved, id]
    setSaved(x); localStorage.setItem('aetheris-intros-saved', JSON.stringify(x))
  }
  const openThread = (id: string) => { setThreadId(id); setPage('messages') }

  const content = useMemo(() => ({
    home: <Home people={people} select={setSelected} setPage={setPage} openNeed={() => setNeedOpen(true)} openThread={openThread} saved={saved} toggleSave={toggleSave} objectives={objectives} />,
    discover: <Discover people={people} select={setSelected} saved={saved} toggleSave={toggleSave} setPage={setPage} />,
    intros: <Intros people={people} select={setSelected} draft={setDraft} setPage={setPage} />,
    messages: <Messages people={people} select={setSelected} activeId={threadId} setActiveId={setThreadId} />,
    needs: <Needs objectives={objectives} onNew={() => setNeedOpen(true)} people={people} select={setSelected} saved={saved} toggleSave={toggleSave} setPage={setPage} />,
    memory: <Memory people={people} select={setSelected} notes={notes} />,
    insights: <Insights people={people} select={setSelected} setPage={setPage} saved={saved} toggleSave={toggleSave} />,
    profile: <Profile profile={profile} setProfile={saveProfile} autonomy={autonomy} setAutonomy={saveAutonomy} people={people} setPage={setPage} notes={notes} />,
  })[page], [page, people, notes, objectives, profile, autonomy, saved, threadId])

  return <div className={`app-shell ${collapsed ? 'rail-collapsed' : ''}`}>
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
          <button className="icon-btn" title="Build your profile" onClick={() => setOnboardOpen(true)} aria-label="Build your profile"><Sparkles size={17} /></button>
          <button className="icon-btn" title="Post a need" onClick={() => setNeedOpen(true)} aria-label="Post a need"><Plus size={18} /></button>
          <button className="icon-btn" title="Ask Intros" onClick={() => setAskOpen(true)} aria-label="Ask Intros"><BrainCircuit size={18} /></button>
        </div>
      </header>
      <div className="workspace-grid">
        <main className="content">{content}</main>
        <ContextRail page={page} people={people} select={setSelected} onAsk={() => setAskOpen(true)} objectives={objectives} openThread={() => openThread('t1')} />
      </div>
    </div>
    <nav className="mobile-nav">{nav.slice(0, 5).map(item => {
      const Icon = item.icon
      return <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => setPage(item.id)}><Icon size={18} /><span>{item.label}</span></button>
    })}</nav>
    <PersonDrawer person={selected} onClose={() => setSelected(null)} onDraft={p => { setSelected(null); setDraft(p) }} notes={notes} onAdd={addNote}
      saved={selected ? saved.includes(selected.id) : false} onSave={() => selected && toggleSave(selected.id)}
      onMessage={() => { setSelected(null); setPage('messages') }} />
    <IntroModal person={draft} onClose={() => setDraft(null)} />
    <NeedModal open={needOpen} onClose={() => setNeedOpen(false)} onCreate={addNeed} />
    <AskModal open={askOpen} onClose={() => setAskOpen(false)} people={people} select={setSelected} />
    <Onboarding open={onboardOpen} onClose={() => setOnboardOpen(false)} />
    {mobileOpen && <button className="rail-scrim" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}
  </div>
}
