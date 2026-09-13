import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  AlertTriangle, ArrowLeftRight, ArrowRight, Bookmark, BookmarkCheck, Building2, CalendarDays, Camera, Check, CheckCircle2, ChevronLeft,
  CircleDot, Compass, Eye, Fingerprint, Handshake, Heart, Home as HomeIcon, Layers, LockKeyhole,
  MapPin, Menu, MessageSquareText, Network, Plus, Search, Send, Share2, ShieldCheck, Target,
  MessageCircle, Repeat2, Settings2, SlidersHorizontal, TrendingUp, UserRound, Users, X,
  Inbox, DoorOpen, GitMerge, Radar, Flag, FileSearch, Gauge, Mic,
  HelpCircle, BookOpen, Sparkle, Map as MapIcon, History, BadgeCheck, Lock, ScrollText, Puzzle,
  ChevronDown, LayoutGrid, Briefcase, FolderLock, GraduationCap, UsersRound, Coins, Landmark, PlaneTakeoff, ShieldAlert, Newspaper, Archive, FileText,
} from 'lucide-react'
import { rankMatches, type MatchResult } from '@/aetheris/matching'
import { AvatarImage } from './avatar'
import discoverEditorialAsset from '@/assets/editorial-discover.jpg.asset.json'
import introsEditorialAsset from '@/assets/editorial-intros.jpg.asset.json'
import messagesEditorialAsset from '@/assets/editorial-messages.jpg.asset.json'
import needsEditorialAsset from '@/assets/editorial-needs.jpg.asset.json'
import memoryEditorialAsset from '@/assets/editorial-memory.jpg.asset.json'
import insightsEditorialAsset from '@/assets/editorial-insights.jpg.asset.json'
import homeEditorialAsset from '@/assets/aetheris-home-portrait.jpg.asset.json'
import logoAsset from '@/assets/aetheris-logo.jpg.asset.json'
import worldNetworkImg from '@/assets/aetheris-world-network.jpg'
import { leaks } from './data'
import type { AutonomyLevel, DigitalYouProfile, Objective, PrivacyScope } from './types'
import {
  circles, events, howItWorks5, howIntrosWorks, introStateLabel,
  onboardingQuestions, trendingSectors,
  type Learning, type Member, type MemberRole, type NetworkAsk, type Post, type Thread,
} from './social'
import { NetworkProvider, useNetwork, type MemoryNote, type MeProfile, type NetworkMode } from './store'
import { isShowcase, setShowcaseMode, showcaseOnly } from './showcase'
import { classifyConnection, composeWarmIntro, radarLabel } from './lib/engine'
import { useGrabScroll } from './lib/dragScroll'
import { metaById, primaryPages, pageMeta, networkTabs, networkAdvanced, opportunityTabs, opportunityAdvanced } from './pageMeta'
import { MoreDrawer, rememberRecent } from './pages/MoreDrawer'
import { BriefingPanel, useBriefingMode } from './BriefingMode'
import { NavCtx, useNav, type NavApi, type Page } from './nav'
import { PlatformProvider, usePlatform } from './platform'
import { SystemsPage } from './pages/SystemsPage'
import { CirclesPage, CreateCircleModal } from './pages/CirclesPage'
import { CompaniesPage } from './pages/CompaniesPage'
import { OutcomesPage } from './pages/OutcomesPage'
import { LoopsPage } from './pages/LoopsPage'
import { OrganizationPage } from './pages/OrganizationPage'
import { HandshakeModal } from './pages/Handshake'
import { IntentBoard, IntentModal, IntentStrip } from './pages/Intents'
import { EventsPage } from './pages/EventsPage'
import { OpportunityRoomsPage } from './pages/OpportunityRoomsPage'
import { RelationshipInboxPage, InboxRow } from './pages/RelationshipInboxPage'
import { CollisionsPage, CollisionCard } from './pages/CollisionsPage'
import { SimulationPage } from './pages/SimulationPage'
import { StrategyPage, StrategyCard } from './pages/StrategyPage'
import { EvidenceLedgerPage } from './pages/EvidenceLedgerPage'
import { AutopilotPage } from './pages/AutopilotPage'
import { OSProvider, useOS } from './os-store'
import {
  AutopilotCard, EvidenceLink, IntroQualityReviewPanel, LatentPathList, PathToggle,
  TrustBudgetNote, TwinPanel, VoiceCaptureModal,
} from './os-ui'
import { homeStrips, trustAdvice as trustAdviceFor } from './domain/os-engine'
import type { IntroQualityReview, PathKind } from './domain/os-models'
import { PreferencesPage } from './pages/PreferencesPage'
import { MoatProvider } from './moat-store'
import { AvailabilityWindows, ConnectorAskGuard, DecayPrevention, PassportModule, ReciprocityNote, RepresentativeAsk, useOutreachGate } from './moat-ui'
import { AskNetworkPage } from './pages/AskNetworkPage'
import { ConstitutionPage } from './pages/ConstitutionPage'
import { SerendipityPage } from './pages/SerendipityPage'
import { EventModePage } from './pages/EventModePage'
import { GapMapPage } from './pages/GapMapPage'
import { IdentityPage } from './pages/IdentityPage'
import { ConsentLedgerPage } from './pages/ConsentLedgerPage'
import { TimeMachinePage } from './pages/TimeMachinePage'
import { AttributionPage } from './pages/AttributionPage'
import { KnowledgePage } from './pages/KnowledgePage'
import { AdvisoryBoardsPage } from './pages/AdvisoryBoardsPage'
import { IntegrationsPage } from './pages/IntegrationsPage'
import { ProProvider, usePro } from './pro-store'
import { PassportPage } from './pages/PassportPage'
import { OpportunitiesPage } from './pages/OpportunitiesPage'
import { DealRoomsPage } from './pages/DealRoomsPage'
import { DirectoryPage } from './pages/DirectoryPage'
import { ExpertisePage } from './pages/ExpertisePage'
import { TalentPage } from './pages/TalentPage'
import { CapitalPage } from './pages/CapitalPage'
import { IntelligenceRoomsPage } from './pages/IntelligenceRoomsPage'
import { PresencePage } from './pages/PresencePage'
import { PermissionPage } from './pages/PermissionPage'
import { BriefingPage } from './pages/BriefingPage'
import { VaultPage } from './pages/VaultPage'
import { KnowledgeAssetsPage } from './pages/KnowledgeAssetsPage'
import { portraitFor } from './portraits'



type OptIn = 'pending' | 'yes' | 'no'

const nav: Array<{ id: Page; label: string; icon: typeof HomeIcon }> = primaryPages.map(id => {
  const meta = metaById[id]!
  return { id, label: meta.label, icon: meta.icon }
})
const allNav: Array<{ id: Page; label: string; icon: typeof HomeIcon }> = pageMeta.map(p => ({ id: p.id, label: p.label, icon: p.icon }))
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
  return <div className="brand-mark"><img className="brand-logo" src={logoAsset.url} alt="Aetheris Intros logo" /><span className="brand-name">Aetheris<em>Intros</em></span></div>
}
function AetherisGlyph({ size = 18 }: { size?: number }) {
  return <span className="aetheris-glyph" style={{ width: size, height: size }} aria-hidden="true"><i /><b /></span>
}
function Avatar({ person, large = false, portrait = false }: { person: Member; large?: boolean; portrait?: boolean }) {
  const image = person.avatarUrl ?? portraitFor(person.id)
  return <span className={`person-avatar ${large ? 'large' : ''} ${portrait ? 'portrait' : ''}`} data-person-portrait={person.id} aria-label={person.name}>
    <span className="avatar-initials" aria-hidden="true">{person.initials}</span>
    {image && <AvatarImage source={image} alt="" width={1024} height={1280} />}
  </span>
}
function SelfAvatar({ portrait = false, large = false, image = true }: { portrait?: boolean; large?: boolean; image?: boolean }) {
  const net = useNetwork()
  return <span className={`person-avatar ${large ? 'large' : ''} ${portrait ? 'portrait' : ''}`} {...(image ? { 'data-person-portrait': 'me' } : {})} aria-label={net.profile.name || 'Your profile'}>
    <span className="avatar-initials" aria-hidden="true">{net.profile.initials || 'M'}</span>
    {image && net.profile.avatarUrl && <AvatarImage source={net.profile.avatarUrl} alt="" width={1024} height={1280} />}
  </span>
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
function EditorialHero({ folio, title, statement, copy, caption, focus = 'center 30%', stats, action, image }: {
  folio: string; title: React.ReactNode; statement: string; copy: string; caption: string
  focus?: string; stats?: Array<{ k: string; v: string }>; action?: React.ReactNode; image: string
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

/** The signature Aetheris Intros masthead: ivory brand field, editorial portrait, dark intelligence panel, live deck. */
function HomeMasthead({ people, select, setPage, openNeed, openThread }: {
  people: Member[]; select: (p: Member) => void; setPage: (p: Page) => void
  openNeed: () => void; openThread: (id: string) => void
}) {
  const net = useNetwork()
  const nav = useNav()
  const ranked = useMemo(() => [...people].sort((a, b) => b.scoreTotal - a.scoreTotal), [people])
  const lead = ranked[0]
  const counterpart = ranked[1]
  const thread = net.threads[0]
  const threadMember = thread ? people.find(p => p.id === thread.memberId) : undefined
  const companies = new Set(people.map(p => p.company)).size
  return <section className="masthead">
    <div className="masthead-brand">
      <span className="folio">THE BUSINESS NETWORK WITHOUT THE NOISE</span>
      <h1 className="masthead-title">Aetheris<br /><em>Intros</em></h1>
      <h2>Real business networking.<br />No selling. No spam.</h2>
      <p>The professional network built around trusted context instead of reach—where human judgment and quiet intelligence work as one. Meet people because the relationship makes sense for both sides, never because someone bought your attention.</p>

      <div className="masthead-actions">
        <Button onClick={openNeed}>Get started <ArrowRight size={14} /></Button>
        <Button kind="secondary" onClick={() => setPage('intros')}>See how it works</Button>
      </div>
      <dl className="masthead-stats">
        <div><dd>{people.length}</dd><dt>Professionals</dt></div>
        <div><dd>{companies}</dd><dt>Companies</dt></div>
        <div><dd>{net.connections.length}</dd><dt>Your connections</dt></div>
      </dl>
      <span className="masthead-kicker">PEOPLE × CONTEXT × OPPORTUNITY</span>
    </div>

    <figure className="masthead-plate" aria-label="A professional in thought — real business networking without the noise">
      <img src={homeEditorialAsset.url} alt="Fictional professional in quiet thought beside hard window light" width={1024} height={1280} />
      <figcaption>BETTER<br />CONTEXT.<br />BETTER<br />RELATIONSHIPS.</figcaption>
    </figure>

    <aside className="masthead-intel">
      <header>
        <span>RELATIONSHIPS<br />COMPOUND</span>
        <small>A SMARTER<br />WORLD IS A<br />MORE CONNECTED ONE.</small>
      </header>
      <div className="masthead-intel-head">
        <div><h3>WHY AETHERIS INTROS</h3><p>People. Context. Possibilities.</p></div>
        <ul><li><b>{people.length}</b> PEOPLE</li><li><b>{companies}</b> COMPANIES</li><li><b>{net.learnings.length}</b> LEARNED THEMES</li></ul>
      </div>
      <div className="masthead-callout standalone">MORE CONTEXT<br />BETTER INTROS<br />STRONGER OUTCOMES</div>

      <footer>
        <div><b>87%</b><small>Match accuracy</small></div>
        <div><b>3.2x</b><small>Warmer replies</small></div>
        <div><b>28%</b><small>Faster conversations</small></div>
        <blockquote>“It feels like having a world-class connector on my team.”<cite>— EARLY MEMBER</cite></blockquote>
      </footer>
    </aside>

    <div className="masthead-deck">
      {lead && <article className="deck-card deck-profile">
        <div className="deck-profile-portrait"><Avatar person={lead} large portrait /></div>
        <div>
          <h4>{lead.name} <em>{lead.scoreTotal}% match</em></h4>
          <span className="deck-role">{lead.title}</span>
          <p>{lead.thesis}</p>
          <small><MapPin size={11} /> {lead.location}</small>
          <ul className="deck-chips">{lead.tags.slice(0, 4).map(t => <li key={t}>{t}</li>)}</ul>
          <blockquote>“{lead.whyThem}”</blockquote>
        </div>
      </article>}

      {lead && counterpart && <article className="deck-card deck-intro">
        <header><span><AetherisGlyph size={13} /> WHY THIS INTRODUCTION</span><em>EVIDENCE</em></header>
        <p>Intros found a relevant introduction based on mutual context, goals and conversation history.</p>
        <div className="deck-pair">
          <span><span className="person-avatar portrait" aria-hidden="true">{lead.initials}</span><b>{lead.name}</b><small>{lead.title}</small></span>
          <ArrowLeftRight size={14} />
          <span><Avatar person={counterpart} portrait /><b>{counterpart.name}</b><small>{counterpart.title}</small></span>
        </div>
        <div className="deck-reason">{lead.whyNow}</div>
        <footer>
          <Button onClick={() => select(lead)}>Request introduction</Button>
          <Button kind="secondary" onClick={() => setPage('intros')}>View reasoning</Button>
        </footer>
        <ul className="deck-chips">
          <li>Mutual connections ({lead.mutuals.length})</li>
          <li>Shared interests ({lead.tags.length})</li>
          <li>Complementary goals</li>
        </ul>
      </article>}

      {thread && <article className="deck-card deck-thread">
        <header><span>CONVERSATION THREAD</span><button className="text-action" onClick={() => openThread(thread.id)}>Open</button></header>
        <ul>{thread.messages.slice(-3).map(m => <li key={m.id}>
          {m.from === 'them' && threadMember ? <Avatar person={threadMember} portrait /> : <SelfAvatar portrait />}
          <div><b>{m.from === 'them' ? threadMember?.name ?? 'Member' : 'You'}</b><small>{m.at}</small><p>{m.text}</p></div>
        </li>)}</ul>
        <button className="deck-compose" onClick={() => openThread(thread.id)}><span>Write a message…</span><Send size={14} /></button>
      </article>}

      {lead && <article className="deck-card deck-insights">
        <header><span>MEMBER INSIGHTS</span></header>
        <ul>
          <li><Target size={14} /><div><small>Looking for</small><b>{lead.needs[0] ?? 'Strategic investors'}</b></div></li>
          <li><Users size={14} /><div><small>Open to</small><b>{lead.availability}</b></div></li>
          <li><TrendingUp size={14} /><div><small>Exploring</small><b>{lead.focus}</b></div></li>
          <li><AetherisGlyph size={14} /><div><small>Can help with</small><b>{lead.offers[0] ?? 'Operating experience'}</b></div></li>
        </ul>
        <button className="text-action" onClick={() => nav.messageMember(lead.id)}>Message {lead.name.split(' ')[0]} <ArrowRight size={13} /></button>
      </article>}
    </div>
    <footer className="masthead-footer"><span>THE SOCIAL NETWORK FOR REAL BUSINESS RELATIONSHIPS — NEVER MASS OUTREACH</span><b>AETHERIS INTROS</b></footer>
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
  const net = useNetwork()
  const positions = [[16, 22], [40, 12], [74, 16], [87, 44], [78, 74], [52, 86], [24, 78], [11, 52], [33, 40], [64, 36], [60, 64], [36, 62]]
  const matches = useMemo(
    () => rankMatches(net.profile, people, net.connections)
      .filter(({ match }) => match.total >= 25)
      .slice(0, compact ? 6 : 12),
    [net.profile, people, net.connections, compact],
  )
  return <div className={`memory-graph ${compact ? 'compact' : ''}`}>
    <div className="graph-live-status"><span className="live-dot" />{matches.length} POTENTIAL FITS</div>
    <div className="graph-rings"><i /><i /><i /></div><div className="graph-lines" />
    <button className="graph-origin" aria-label="Your current context"><Eye size={18} /><small>YOU</small></button>
    {matches.map(({ member: p, match }, i) => {
      const pos = positions[i % positions.length] ?? [50, 50]
      return <button key={p.id} className={`graph-node ${i === 0 ? 'selected' : ''} ${match.total >= 55 || p.radar === 'hot_now' ? 'signal' : ''}`} style={{ left: `${pos[0]}%`, top: `${pos[1]}%`, animationDelay: `${i * 120}ms` }} onClick={() => onSelect(p)} title={`${match.total}% fit · ${match.headline}`} aria-label={`Open ${p.name}'s introduction profile, ${match.total} percent fit`}>
        <i /><span>{p.name.split(' ')[0]}<b>{match.total}</b></span><small>{p.title}</small>
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
  const liked = net.likedPosts.includes(post.id)
  const reposted = net.repostedPosts.includes(post.id)
  const comments = net.postComments[post.id] ?? []
  const mine = post.memberId === 'me'
  const [commenting, setCommenting] = useState(false)
  const [comment, setComment] = useState('')
  const submitComment = () => {
    if (!comment.trim()) return
    net.addPostComment(post.id, comment.trim(), post.memberId)
    setComment('')
  }
  return <article className="post-card">
    <header>
      {member
        ? <button className="post-author" onClick={onOpen}><Avatar person={member} portrait /><span><strong>{member.name}</strong><small>{member.title} · {member.company}</small></span></button>
        : <div className="post-author"><SelfAvatar portrait /><span><strong>{net.profile.name || 'You'}</strong><small>{net.profile.title}</small></span></div>}
      <span className="post-kind">{member?.industry ?? net.profile.industries[0] ?? post.kind}</span>
    </header>
    <h3>{post.text}</h3>
    <p>{post.detail}</p>
    <footer>
      <small>{post.when} · {post.responses + comments.length + (responded ? 1 : 0)} responses</small>
      <div className="post-actions">
        <Button kind="quiet" onClick={() => net.togglePostLike(post.id)}><Heart size={14} fill={liked ? 'currentColor' : 'none'} /> {liked ? 'Liked' : 'Like'}</Button>
        <Button kind="quiet" onClick={() => setCommenting(value => !value)}><MessageCircle size={14} /> Comment</Button>
        {!mine && <Button kind="quiet" onClick={() => net.togglePostRepost(post.id, post.memberId)}><Repeat2 size={14} /> {reposted ? 'Reposted' : 'Repost'}</Button>}
        <SaveButton saved={net.saved.includes(post.id)} onToggle={() => net.toggleSave(post.id, 'this post')} />
        {!mine && member && <Button kind="secondary" onClick={() => { const id = net.respondToPost(post.id, member.id); if (id) nav.goToThread(id) }}>
          {responded ? <><Check size={14} /> Responded</> : <><MessageSquareText size={14} /> Message privately</>}
        </Button>}
        {mine && <small className="post-own">Shared with your network · added to Active Memory</small>}
      </div>
    </footer>
    {(commenting || comments.length > 0) && <section className="post-discussion">
      {comments.map(item => <div key={item.id}><SelfAvatar /><p><strong>{net.profile.name || 'You'}</strong>{item.text}<small>{item.when}</small></p></div>)}
      {commenting && <div className="comment-composer"><SelfAvatar /><input value={comment} onChange={event => setComment(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') submitComment() }} placeholder="Add useful context to the discussion…" /><Button disabled={!comment.trim()} onClick={submitComment}><Send size={13} /></Button></div>}
    </section>}
  </article>
}

function OSStrip({ people, select }: { people: Member[]; select: (p: Member) => void }) {
  const os = useOS()
  const net = useNetwork()
  const platform = usePlatform()
  const nav = useNav()
  const strips = useMemo(() => homeStrips({
    inbox: os.inbox, collisions: os.collisions, rooms: os.rooms, strategies: os.strategies,
    evidence: os.evidence, autopilot: os.autopilot, people,
  }), [os.inbox, os.collisions, os.rooms, os.strategies, os.evidence, os.autopilot, people])
  const loops = platform.loops.filter(l => l.status === 'open').slice(0, 3)
  const meetings = platform.meetings.filter(m => !m.closed).slice(0, 2)

  return <section className="os-strip">
    <header className="os-strip-head">
      <div><Label signal>WHAT DESERVES YOUR ATTENTION</Label>
        <h2>Eight things are moving. Three of them need you.</h2></div>
      <div className="os-strip-actions">
        <Button kind="secondary" onClick={() => nav.captureConversation()}><Mic size={14} /> Capture conversation</Button>
        <Button kind="quiet" onClick={() => nav.setPage('inbox')}>Open the full list <ArrowRight size={14} /></Button>
      </div>
    </header>

    <div className="os-attention">{strips.attention.map(i => <InboxRow key={i.id} item={i} compact />)}
      {!strips.attention.length && <p className="quiet-empty">Nothing outstanding. Rare, and worth protecting.</p>}</div>

    {strips.collisions.map(c => <CollisionCard key={c.id} collision={c} compact />)}

    <div className="os-strip-grid">
      <article className="module">
        <header><Label>PEOPLE YOU CAN HELP TODAY</Label><h3>Give before you ask.</h3></header>
        <ul className="module-people">{strips.canHelp.map(p => <li key={p.id}>
          <button onClick={() => select(p)}><Avatar person={p} /><span><strong>{p.name}</strong><small>{p.needs[0]}</small></span></button>
        </li>)}</ul>
      </article>
      <article className="module">
        <header><Label>SYSTEMS WORTH PLACING</Label><h3>Work that has somewhere to go.</h3></header>
        <ul className="module-sectors">{strips.systemsWorthPlacing.map(r => <li key={r.id}>
          <span><strong>{r.name}</strong><small>{r.nextAction}</small></span>
          <button className="text-action" onClick={() => nav.openRoom(r.id)}>Open</button>
        </li>)}
        {!strips.systemsWorthPlacing.length && <li className="quiet-empty">No placement in motion.</li>}</ul>
      </article>
      <article className="module">
        <header><Label>STRATEGY PROGRESS</Label><h3>Relationships, not follower counts.</h3></header>
        <ul className="module-sectors">{strips.strategies.map(st => <li key={st.id}>
          <span><strong>{st.goal}</strong><small>{st.progressPersonIds.length} of {st.targetCount} held</small></span>
          <button className="text-action" onClick={() => nav.setPage('strategy')}>View</button>
        </li>)}
        {!strips.strategies.length && <li className="quiet-empty">No strategy set yet.</li>}</ul>
      </article>
      <article className="module">
        <header><Label signal>CONTEXT JUST BECAME RELEVANT</Label><h3>New evidence in your graph.</h3></header>
        <ul className="module-sectors">{strips.newContext.map(e => <li key={e.id}>
          <span><strong>{e.statement}</strong><small>{e.sourceLabel} · {e.date}</small></span>
        </li>)}</ul>
        <EvidenceLink ids={strips.newContext.map(e => e.id)} label="Open the ledger" />
      </article>
      <article className="module">
        <header><Label>OPEN LOOPS</Label><h3>Commitments still owed.</h3></header>
        <ul className="module-sectors">{loops.map(l => <li key={l.id}>
          <span><strong>{l.title}</strong><small>{l.source}</small></span>
        </li>)}
        {!loops.length && <li className="quiet-empty">Nothing owed either way.</li>}</ul>
      </article>
      <article className="module">
        <header><Label>MEETINGS TO CLOSE THE LOOP</Label><h3>What has not been written down.</h3></header>
        <ul className="module-sectors">{meetings.map(m => <li key={m.id}>
          <span><strong>{m.purpose}</strong><small>{m.when}</small></span>
        </li>)}
        {!meetings.length && <li className="quiet-empty">Every meeting is closed out.</li>}</ul>
      </article>
    </div>

    <footer className="os-strip-foot">
      <span><b>{strips.autopilotCount} considered moves prepared.</b> Nothing sends without your approval.</span>
      <Button kind="quiet" onClick={() => nav.setPage('autopilot')}>Review Autopilot <ArrowRight size={14} /></Button>
    </footer>
  </section>
}


function HomeIdentityCard({ openNeed, setPage }: { openNeed: () => void; setPage: (p: Page) => void }) {
  const net = useNetwork()
  const me = net.profile
  const fields: Array<[string, string]> = [
    ['Role', me.title], ['Company', me.company], ['Location', me.location],
    ['Looking for', me.lookingFor], ['Can help with', me.canHelpWith], ['Photo', me.avatarUrl ? 'Added' : ''],
  ]
  const done = fields.filter(([, v]) => Boolean(v && v.trim())).length
  const pct = Math.round((done / fields.length) * 100)
  return <section className="side-card identity-card">
    <button className="identity-card-head" onClick={() => setPage('profile')}>
      <SelfAvatar portrait />
      <span><b>{me.name || 'Your profile'}</b><small>{[me.title, me.company].filter(Boolean).join(' · ') || 'Add your role and company'}</small></span>
    </button>
    <div className="completion"><span>Profile strength</span><i><em style={{ width: `${pct}%` }} /></i><b>{pct}%</b></div>
    {pct < 100 && <ul className="completion-todo">{fields.filter(([, v]) => !v || !v.trim()).slice(0, 3).map(([k]) =>
      <li key={k}>Add your {k.toLowerCase()}</li>)}</ul>}
    <div className="side-card-avail"><span>AVAILABILITY</span><p>{me.availability || 'Not stated yet.'}</p></div>
    <Button onClick={openNeed}><Plus size={14} /> Post what you need</Button>
  </section>
}

function HomeAttention({ ranked, activeNeed, select, setPage, openThread }: {
  ranked: Member[]; activeNeed: Objective | undefined; select: (p: Member) => void
  setPage: (p: Page) => void; openThread: (id: string) => void
}) {
  const net = useNetwork()
  const top = ranked[0]
  const waiting = net.threads.find(t => t.unread)
  const loop = net.learnings[0]
  return <section className="side-card attention-card">
    <header><Label signal>WHAT DESERVES YOUR ATTENTION</Label><h3>A short list, not a dashboard.</h3></header>
    <ul>
      {activeNeed && <li><span>YOUR ACTIVE NEED</span><b>{activeNeed.title}</b><small>{activeNeed.success}</small></li>}
      {top && <li><button onClick={() => select(top)}><span>STRONGEST FIT</span><b>{top.name}</b><small>{top.whyNow}</small></button></li>}
      {waiting && <li><button onClick={() => openThread(waiting.id)}><span>WAITING ON YOU</span><b>Unanswered conversation</b><small>{waiting.commitment}</small></button></li>}
      {loop && <li><span>RECENTLY LEARNED</span><b>{loop.text}</b><small>{loop.source}</small></li>}
      {!activeNeed && !top && !waiting && !loop && <li><span>NOTHING URGENT</span><b>Your network is quiet.</b><small>Post what you need, or add context to your profile.</small></li>}
    </ul>
    <button className="text-action" onClick={() => setPage('briefing')}>Open the full briefing <ArrowRight size={13} /></button>
  </section>
}

function Home({ people, select, setPage, openNeed, openThread }: {
  people: Member[]; select: (p: Member) => void; setPage: (p: Page) => void; openNeed: () => void
  openThread: (id: string) => void
}) {
  const net = useNetwork()
  const platform = usePlatform()
  const [tab, setTab] = useState<'feed' | 'people' | 'asks' | 'signals'>('feed')
  const [homeMode, setHomeMode] = useState<'social' | 'briefing'>('social')
  const [composer, setComposer] = useState('')
  const [customizing, setCustomizing] = useState(false)
  const ranked = useMemo(() => [...people].sort((a, b) => b.scoreTotal - a.scoreTotal), [people])
  const industries = useMemo(() => Array.from(new Set(people.map(person => person.industry))).sort(), [people])
  const joinedCircles = useMemo(() => platform.circles.filter(circle => circle.memberIds.includes('me')), [platform.circles])
  const visiblePosts = useMemo(() => {
    const industryFor = (post: Post) => people.find(person => person.id === post.memberId)?.industry ?? net.profile.industries[0] ?? ''
    const filtered = net.posts.filter(post => {
      const industry = industryFor(post)
      if (net.feedPreferences.scope === 'saved') return net.saved.includes(post.id)
      if (net.feedPreferences.scope === 'circle') {
        const circle = joinedCircles.find(item => item.id === net.feedPreferences.circleId) ?? joinedCircles[0]
        return Boolean(circle?.memberIds.includes(post.memberId))
      }
      if (net.feedPreferences.scope === 'industry') {
        const chosen = net.feedPreferences.industries.length ? net.feedPreferences.industries : net.profile.industries
        return chosen.some(value => value.toLowerCase() === industry.toLowerCase())
      }
      return true
    })
    if (net.feedPreferences.scope !== 'all') return filtered
    const interests = new Set([...net.feedPreferences.industries, ...net.profile.industries].map(value => value.toLowerCase()))
    return [...filtered].sort((a, b) => {
      const relevance = (post: Post) => (net.connections.includes(post.memberId) ? 5 : 0)
        + (net.follows.includes(post.memberId) ? 4 : 0)
        + (interests.has(industryFor(post).toLowerCase()) ? 3 : 0)
        + (post.memberId === 'me' ? 6 : 0)
      return relevance(b) - relevance(a)
    })
  }, [joinedCircles, net.connections, net.feedPreferences, net.follows, net.posts, net.profile.industries, net.saved, people])
  const activeNeed = net.objectives[0]
  const share = () => {
    if (!composer.trim()) return
    net.addPost(composer.trim())
    setComposer('')
  }
  return <>
    <nav className="home-mode-switch" role="tablist" aria-label="Home mode">
      {([['social', 'Social'], ['briefing', 'Daily Briefing']] as const).map(([id, label]) =>
        <button key={id} role="tab" aria-selected={homeMode === id} className={homeMode === id ? 'on' : ''} onClick={() => setHomeMode(id)}>{label}</button>)}
      <small>{homeMode === 'social' ? 'The professional network, as it is moving today.' : 'What needs you today, composed rather than counted.'}</small>
    </nav>

    {homeMode === 'briefing' && <BriefingPage />}

    {homeMode === 'social' && <>
    {isShowcase() && <HomeMasthead people={people} select={select} setPage={setPage} openNeed={openNeed} openThread={openThread} />}

    <div className="home-3col">
    <aside className="home-side home-side-left">
      <HomeIdentityCard openNeed={openNeed} setPage={setPage} />
    </aside>
    <div className="home-center">
    <section className="composer">
      <SelfAvatar portrait />
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

    {tab === 'feed' && <section className="feed-controls">
      <div className="feed-scope" aria-label="Feed view">
        {([['all', 'For you'], ['circle', 'My circles'], ['industry', 'Industries'], ['saved', 'Saved']] as const).map(([scope, label]) =>
          <button key={scope} className={net.feedPreferences.scope === scope ? 'active' : ''} onClick={() => net.setFeedPreferences({ ...net.feedPreferences, scope })}>{label}</button>)}
      </div>
      <Button kind="quiet" onClick={() => setCustomizing(value => !value)}><SlidersHorizontal size={14} /> Customize</Button>
      {customizing && <div className="feed-customizer">
        <div><Label>INDUSTRIES YOU FOLLOW</Label><div className="topic-chips">{industries.map(industry => {
          const active = net.feedPreferences.industries.includes(industry)
          return <button key={industry} className={active ? 'active' : ''} onClick={() => net.setFeedPreferences({ ...net.feedPreferences, industries: active ? net.feedPreferences.industries.filter(value => value !== industry) : [...net.feedPreferences.industries, industry] })}>{industry}</button>
        })}</div></div>
        <label><Label>ACTIVE CIRCLE</Label><select value={net.feedPreferences.circleId} onChange={event => net.setFeedPreferences({ ...net.feedPreferences, circleId: event.target.value })}><option value="">Choose a circle</option>{joinedCircles.map(circle => <option key={circle.id} value={circle.id}>{circle.name}</option>)}</select></label>
        <p>Your choices persist with your profile and shape what appears first.</p>
      </div>}
      <div className="live-topic-line"><span className="live-dot" /> Live topics: {(net.feedPreferences.industries.length ? net.feedPreferences.industries : net.profile.industries).slice(0, 4).join(' · ') || 'Your professional network'}</div>
    </section>}

    <div className="feed">
      {tab === 'feed' && visiblePosts.map(post =>
        <PostCard key={post.id} post={post} member={people.find(p => p.id === post.memberId) ?? undefined}
          onOpen={() => { const m = people.find(p => p.id === post.memberId); if (m) select(m) }} />)}
      {tab === 'feed' && visiblePosts.length === 0 && <section className="feed-empty"><Label>YOUR FEED IS READY TO LEARN</Label><h3>No posts match this view yet.</h3><p>Choose more industries, join a circle, or return to For you.</p><Button onClick={() => net.setFeedPreferences({ ...net.feedPreferences, scope: 'all' })}>Show my full network</Button></section>}
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
    </div>
    <aside className="home-side home-side-right">
      <HomeAttention ranked={ranked} activeNeed={activeNeed} select={select} setPage={setPage} openThread={openThread} />
    </aside>
    </div>

    <OSStrip people={people} select={select} />

    {isShowcase() && <section className="home-modules">
      <article className="module">
        <header><Label signal>WHO TO MEET THIS WEEK</Label><h3>Three relationships with real timing.</h3></header>
        <ul className="module-people">{ranked.slice(0, 3).map(p => <li key={p.id}>
          <button onClick={() => select(p)}><Avatar person={p} portrait /><span><strong>{p.name}</strong><small>{p.title} · {p.company}</small><em>{p.whyNow}</em></span><span className="module-score">{p.scoreTotal}</span></button>
        </li>)}</ul>
        {!ranked.length && <p className="empty-state">No members to suggest yet. As founding members complete their profiles, the strongest current fits appear here.</p>}
      </article>
      <article className="module">
        <header><Label>TRENDING IN YOUR SECTORS</Label><h3>Where the network is moving.</h3></header>
        <ul className="module-sectors">{showcaseOnly(trendingSectors).map(s => <li key={s.sector}>
          <span><strong>{s.sector}</strong><small>{s.note}</small></span><em className={s.move.startsWith('−') ? 'down' : ''}>{s.move}</em>
        </li>)}</ul>
        {!showcaseOnly(trendingSectors).length && <p className="empty-state">Sector movement is calculated from what members actually post. Nothing has been posted yet.</p>}
      </article>
      <article className="module">
        <header><Label><CalendarDays size={11} /> UPCOMING BUSINESS EVENTS</Label><h3>Rooms your graph is already in.</h3></header>
        <ul className="module-events">{showcaseOnly(events).map(e => <li key={e.id}>
          <strong>{e.name}</strong><small>{e.when} · {e.where}</small><em>{e.who}</em>
        </li>)}</ul>
        {!showcaseOnly(events).length && <p className="empty-state">No member events scheduled yet.</p>}
      </article>
      <article className="module">
        <header><Label><Users size={11} /> SUGGESTED CIRCLES</Label><h3>Groups that match your focus.</h3></header>
        <ul className="module-circles">{showcaseOnly(circles).map(c => <li key={c.id}>
          <span><strong>{c.name}</strong><small>{c.members}</small><em>{c.why}</em></span><Button kind="quiet">Join</Button>
        </li>)}</ul>
        {!showcaseOnly(circles).length && <p className="empty-state">Circles appear once members create them. You can start one from Circles.</p>}
      </article>

    </section>}

    {isShowcase() && <section className="home-education">
      <div><Label>BUSINESS NETWORKING, REBUILT</Label><h2>A professional network without pitches, spam or performative reach.</h2>
        <p>Aetheris Intros reads needs, offers, timing and trust paths, then shows only relationships where a conversation creates credible value for both people.</p>
        <button className="text-action" onClick={() => setPage('intros')}>See the reasoning behind a match <ArrowRight size={14} /></button></div>
      <div className="home-education-panel">
        <blockquote>“Every introduction here arrives with a reason, a shared context and a moment that makes sense for both people.”</blockquote>
        <ul>
          <li><b>No mass outreach.</b> Nobody can buy your attention.</li>
          <li><b>Both sides opt in.</b> An introduction only exists if two people agree to it.</li>
          <li><b>Explainable, always.</b> You see the evidence behind every recommendation.</li>
        </ul>
        <button className="text-action" onClick={() => setPage('memory')}>Open Active Memory <ArrowRight size={14} /></button>
      </div>
    </section>}

    {isShowcase() && <HowItWorks />}

    <section className="home-mobile-rail">
      <Label signal>ON YOUR DESK</Label>
      <div>
        {activeNeed && <article><span>ACTIVE NEED</span><strong>{activeNeed.title}</strong><small>{activeNeed.success}</small></article>}
        {ranked[0] && <button onClick={() => select(ranked[0]!)}><span>STRONGEST MATCH</span><strong>{ranked[0]!.name}</strong><small>{ranked[0]!.whyNow}</small></button>}
        <button onClick={() => openThread('t1')}><span>CONVERSATION COOLING</span><strong>Nolan Pierce</strong><small>Waiting on the observation you promised.</small></button>
      </div>
    </section>
    </>}
  </>
}


/* ----------------------------------------------------------------- discover */

const memberRoles: MemberRole[] = ['Founder', 'Operator', 'Investor', 'Advisor', 'Executive', 'Specialist', 'Connector']
const signalFilters = ['Warm path available', 'High match', 'Available now']

function Discover({ people, select }: { people: Member[]; select: (p: Member) => void }) {
  const [pathKind, setPathKind] = useState<PathKind | 'all'>('all')
  const [q, setQ] = useState('')
  const [roles, setRoles] = useState<string[]>([])
  const [active, setActive] = useState<string[]>([])
  const [company, setCompany] = useState('')
  const [expertise, setExpertise] = useState('')
  const [location, setLocation] = useState('')
  const [industry, setIndustry] = useState('')
  const [profession, setProfession] = useState('')
  const [investmentStage, setInvestmentStage] = useState('')
  const [strength, setStrength] = useState('')
  const [tab, setTab] = useState<'Top Locations' | 'Top Industries' | 'Top Roles'>('Top Locations')
  const uniq = (xs: string[]) => [...new Set(xs)].sort()
  const toggle = (o: string) => setActive(a => a.includes(o) ? a.filter(x => x !== o) : [...a, o])
  const toggleRole = (o: string) => setRoles(a => a.includes(o) ? a.filter(x => x !== o) : [...a, o])
  const clearAll = () => { setQ(''); setRoles([]); setActive([]); setCompany(''); setExpertise(''); setProfession(''); setLocation(''); setIndustry(''); setInvestmentStage(''); setStrength('') }
  const filtered = people.filter(p => {
    const hay = `${p.name} ${p.title} ${p.company} ${p.location} ${p.role} ${p.industry} ${p.tags.join(' ')} ${p.expertise.join(' ')} ${p.needs.join(' ')} ${p.offers.join(' ')} ${p.focus}`.toLowerCase()
    if (q.trim() && !q.toLowerCase().split(/\s+/).some(w => w.length > 2 && hay.includes(w))) return false
    if (company && p.company !== company) return false
    if (expertise && !p.expertise.includes(expertise)) return false
    if (profession && p.role !== profession) return false
    if (location && p.location !== location) return false
    if (industry && p.industry !== industry) return false
    if (investmentStage && !`${p.tags.join(' ')} ${p.focus} ${p.needs.join(' ')}`.toLowerCase().includes(investmentStage.toLowerCase())) return false
    if (roles.length && !roles.includes(p.role)) return false
    if (strength === 'Strong' && p.score.relationshipStrength < 70) return false
    if (strength === 'Building' && p.score.relationshipStrength >= 70) return false
    return active.every(f => {
      if (f === 'Warm path available') return p.bestPath.length > 2
      if (f === 'High match') return p.scoreTotal >= 80
      if (f === 'Available now') return /open|weekly|two|always|fortnightly/i.test(p.availability)
      return hay.includes(f.toLowerCase())
    })
  })
  const counts = (key: (p: Member) => string) => {
    const map = new Map<string, number>()
    people.forEach(p => map.set(key(p), (map.get(key(p)) ?? 0) + 1))
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  }
  const rows = tab === 'Top Locations' ? counts(p => p.location) : tab === 'Top Industries' ? counts(p => p.industry) : counts(p => p.role)
  const max = Math.max(1, ...rows.map(r => r[1]))
  const selects: Array<{ icon: React.ReactNode; label: string; value: string; set: (v: string) => void; options: string[]; any: string }> = [
    { icon: <Layers size={14} />, label: 'Company', value: company, set: setCompany, options: uniq(people.map(p => p.company)), any: 'All Companies' },
    { icon: <Fingerprint size={14} />, label: 'Expertise', value: expertise, set: setExpertise, options: uniq(people.flatMap(p => p.expertise)), any: 'Select Expertise' },
    { icon: <Users size={14} />, label: 'Profession', value: profession, set: setProfession, options: memberRoles, any: 'All Professions' },
    { icon: <UserRound size={14} />, label: 'Location', value: location, set: setLocation, options: uniq(people.map(p => p.location)), any: 'Any Location' },
    { icon: <Network size={14} />, label: 'Industry', value: industry, set: setIndustry, options: uniq(people.map(p => p.industry)), any: 'All Industries' },
    { icon: <CircleDot size={14} />, label: 'Investment Stage', value: investmentStage, set: setInvestmentStage, options: ['Seed', 'Series A', 'Series B', 'Growth'], any: 'Any Stage' },
    { icon: <ShieldCheck size={14} />, label: 'Relationship Strength', value: strength, set: setStrength, options: ['Strong', 'Building'], any: 'Any Strength' },
  ]
  return <>
    <EditorialHero
      folio="DISCOVER / PROFESSIONAL NETWORK"
      title={<>Find the person,<br /><em>not the job title.</em></>}
      statement="Search the way you would brief a trusted friend."
      copy="Describe the outcome you want and Intros reads needs, offers, expertise, location, availability and the trust paths already open to you."
      caption="Members are surfaced with reasoning, never as an anonymous list."
       image={discoverEditorialAsset.url}
      focus="center 22%"
    />
    <div className="discover-shell">
      <aside className="filter-panel">
        <header><span>FILTER PEOPLE</span><button className="mod-link" onClick={clearAll}>Clear All</button></header>
        <div className="filter-search"><Search size={16} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Name, title, company, or keyword…" /></div>
        {selects.map(s => <div className="filter-field" key={s.label}>
          <label>{s.icon}{s.label}</label>
          <select value={s.value} onChange={e => s.set(e.target.value)} aria-label={s.label}>
            <option value="">{s.any}</option>
            {s.options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>)}
        <ul className="filter-checks">{memberRoles.slice(0, 5).map(r => <li key={r}>
          <label><input type="checkbox" checked={roles.includes(r)} onChange={() => toggleRole(r)} /><span />{r}s</label>
        </li>)}</ul>
        <ul className="filter-signals">{signalFilters.map(f =>
          <li key={f}><button className={active.includes(f) ? 'active' : ''} onClick={() => toggle(f)}>{f}</button></li>)}</ul>
        <Button className="filter-apply">Apply Filters <ArrowRight size={15} /></Button>
        <small className="filter-count">{filtered.length} of {people.length} members</small>
      </aside>
      <div className="discover-main">
        <PageHead label="DISCOVER" title="Browse the people, not a database."
          copy="Search in your own words. Intros reads needs, offers, expertise, location and the paths already open to you."
          proof="Try: “manufacturing CEO in Indiana looking for AI help.”" />
        <section className="invisible-layer">
          <header className="section-line">
            <Label signal>THE INVISIBLE LAYER</Label>
            <PathToggle value={pathKind} onChange={setPathKind} />
          </header>
          <p className="invisible-lede">You do not know these people, but you are one credible relationship away. Every path below is built from context already in your graph — work history, boards, investments, events, geography, shared circles.</p>
          <LatentPathList kind={pathKind} />
        </section>
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
      </div>
    </div>

    <section className="global-network">
      <header><span>A GLOBAL NETWORK<br />OF POSSIBILITY</span>
        <p>PEOPLE<br />IDEAS<br />CAPITAL<br />INFRASTRUCTURE<br />A MORE<br />CONNECTED<br />TOMORROW.</p></header>
      <div className="globe-plate"><img src={worldNetworkImg} alt="Global Aetheris network connections across cities and regions" width={1600} height={720} loading="lazy" /></div>
      <dl className="global-stats">
        <div><dd>10K+</dd><dt>Professionals</dt></div><div><dd>312</dd><dt>Companies</dt></div>
        <div><dd>28</dd><dt>Countries</dt></div><div><dd>92%</dd><dt>Relevant Matches</dt></div>
      </dl>
      <div className="network-insight-cards">
        <section className="mod">
          <header><span>NETWORK INSIGHTS</span><small>Global</small></header>
          <div className="insight-tabs">{(['Top Locations', 'Top Industries', 'Top Roles'] as const).map(t =>
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>)}</div>
          <ul className="insight-bars">{rows.map(([k, v]) => <li key={k}><span>{k}</span>
            <i><b style={{ width: `${(v / max) * 100}%` }} /></i><em>{v}</em></li>)}</ul>
        </section>
        <section className="mod">
          <header><span>PEOPLE ON AETHERIS</span><button className="mod-link">View All <ArrowRight size={12} /></button></header>
          <ul className="joined-list">{[...people].sort((a, b) => b.joined.localeCompare(a.joined)).slice(0, 3).map(p =>
            <li key={p.id}><button onClick={() => select(p)}><Avatar person={p} portrait />
              <div><strong>{p.name}</strong><small>{p.title}, {p.company}</small></div>
              <span className="joined-flag"><i className="live-dot" />Joined this week</span></button></li>)}</ul>
        </section>
      </div>
      <blockquote className="global-quote">“The best opportunities come from the right people.”<small>— AETHERIS MEMBER</small></blockquote>
      <footer className="member-footer"><span>THE INTELLIGENCE LAYER FOR MEANINGFUL CONNECTIONS</span><b>AETHERIS INTROS</b></footer>
    </section>
  </>
}

/* -------------------------------------------------------------------- intros */

function MatchReport({ person, match, onOpen, onIntro }: { person: Member; match?: MatchResult | undefined; onOpen: () => void; onIntro: () => void }) {
  const net = useNetwork()
  const nav = useNav()
  return <article className="match-report">
    <header>
      <Avatar person={person} large portrait />
      <div className="match-identity">
        <Label>{radarLabel[person.radar]} · {introStateLabel[person.introState]}</Label>
        <h3>{person.name}</h3><p>{person.title} · {person.company} · {person.location}</p>
      </div>
      <Score value={match?.total ?? person.scoreTotal} />
    </header>
    <div className="match-thesis"><span>WHY THIS PERSON</span><p>{match?.headline ?? person.whyThem}</p></div>
    <div className="match-columns">
      <div><span>LOOKING FOR</span><p>{person.needs.join(' · ')}</p></div>
      <div><span>CAN HELP WITH</span><p>{person.offers.join(' · ')}</p></div>
    </div>
    <div className="match-reasons">
      <div><span>WHY YOU MATTER TO THEM</span><p>{person.whyYou}</p></div>
      <div><span>WHY NOW</span><p>{person.whyNow}</p></div>
    </div>
    {match && <div className="match-breakdown">
      <span>COMPATIBILITY, COMPONENT BY COMPONENT</span>
      <ul>{match.components.map(component => <li key={component.label}>
        <b>{component.label}</b>
        <i><em style={{ width: `${Math.round(component.score)}%` }} /></i>
        <strong>{Math.round(component.score)}</strong>
        <small>{component.evidence}</small>
      </li>)}</ul>
    </div>}
    <div className="match-mutual">
      <div><span>MUTUAL INTERESTS</span><p>{(match?.sharedInterests.length ? match.sharedInterests : person.tags).join(' · ')}</p></div>
      <div><span>MUTUAL CONNECTIONS</span><p>{match?.mutualConnections.length ? `${match.mutualConnections.join(' · ')} (in your connections)` : person.mutuals.length ? person.mutuals.join(' · ') : 'None yet — path built from context'}</p></div>
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
  const net = useNetwork()
  const [state, setState] = useState<'all' | Member['introState']>('all')
  const scored = useMemo(() => rankMatches(net.profile, people, net.connections), [net.profile, people, net.connections])
  const matchOf = (id: string) => scored.find(entry => entry.member.id === id)?.match
  const ranked = scored.map(entry => entry.member)
  const shown = state === 'all' ? ranked.slice(0, 6) : ranked.filter(p => p.introState === state)
  return <>
    <EditorialHero folio="INTROS / MUTUAL VALUE" title={<>A warm path is<br /><em>earned context.</em></>} statement="The right conversation, with a reason for both sides." copy="Each report explains the mutual value, live timing and trust path before anyone asks for an introduction." caption="Both people retain agency. Nothing moves until both choose the conversation." image={introsEditorialAsset.url} />
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
      {shown.map(p => <MatchReport key={p.id} person={p} match={matchOf(p.id)} onOpen={() => select(p)} onIntro={() => draft(p)} />)}
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
  const pro = usePro()
  const [text, setText] = useState('')
  const [blocked, setBlocked] = useState<{ explanation: string; rerouteTo?: string } | null>(null)
  const [contextOpen, setContextOpen] = useState(false)
  const nav = useNav()
  const { gate, modal: outreachModal } = useOutreachGate()
  const threads = net.threads
  const thread: Thread | undefined = threads.find(t => t.id === activeId) ?? threads[0]
  const person = people.find(p => p.id === thread?.memberId)
  if (!thread || !person) return null
  return <>
    {isShowcase() && <EditorialHero folio="MESSAGES / RELATIONSHIP CONTEXT" title={<>Conversation with<br /><em>memory beside it.</em></>} statement="People speak to people. Context stays quietly available." copy="Commitments, mutual connections and the reason for the introduction remain beside the thread—not inside the conversation." caption="A professional exchange remains human when intelligence knows when to stay quiet." image={messagesEditorialAsset.url} />}
    {outreachModal}
    <div className={`messages-layout ${contextOpen ? 'context-open' : 'context-closed'}`}>
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
          <button className="context-toggle" onClick={() => setContextOpen(v => !v)} aria-expanded={contextOpen}>
            <AetherisGlyph size={13} /> {contextOpen ? 'Hide context' : 'Context'}
          </button>
          <button className="icon-btn" onClick={() => select(person)} aria-label="Open this person's profile"><UserRound size={17} /></button>
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
            <button onClick={() => {
              const t = text.trim()
              if (!t) return
              const commercial = /demo|pricing|proposal|our (product|platform|software|solution)|quick call|book a|vendor/i.test(t)
              const verdict = pro.boundaryCheck(commercial ? 'Software vendor' : 'Any outreach', {
                recipientId: person.id, warmPath: net.connections.includes(person.id),
              })
              if (!verdict.allowed) {
                setBlocked({ explanation: verdict.explanation, ...(verdict.rerouteTo ? { rerouteTo: verdict.rerouteTo } : {}) })
                return
              }
              setBlocked(null)
              gate(t, { channel: 'message', authorId: 'me', recipient: person }, final => { net.sendMessage(thread.id, final); setText('') })
            }} disabled={!text.trim()} aria-label="Send"><Send size={17} /></button>
          </div>
          {blocked && <p className="composer-blocked"><b>Held.</b> {blocked.explanation}{blocked.rerouteTo ? ` Referred elsewhere: ${blocked.rerouteTo}.` : ''} <button className="text-action" onClick={() => nav.setPage('permission')}>Request permission properly</button></p>}
        </div>
      </section>
      {contextOpen && <aside className="conversation-intel">
        <header className="intel-head"><Label>RELATIONSHIP CONTEXT</Label>
          <button className="icon-btn" onClick={() => setContextOpen(false)} aria-label="Close context"><X size={15} /></button></header>
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
        <TwinPanel person={person} compact />
        <button className="text-action" onClick={() => nav.captureConversation()}><Mic size={13} /> Capture this conversation</button>
      </aside>}
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
    <EditorialHero folio="NEEDS / PROFESSIONAL ASKS" title={<>State the outcome.<br /><em>Find who can move it.</em></>} statement="Serious asks create useful professional context." copy="A need is not a broadcast. It is a concise case for why the right person should care, why now matters and what value moves both ways." caption="Specific needs produce considered responses—not noisy outreach." image={needsEditorialAsset.url} />
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
      <figure><img src={memoryEditorialAsset.url} alt="Thoughtful professional in architectural window light" width={1024} height={1280} /><figcaption>ACTIVE MEMORY / CONTEXT HELD WITH INTENT</figcaption></figure>
    </section>
    <section className="memory-dark-intro">
      <div><Label signal>ACTIVE MEMORY GRAPH</Label><h2>Not a contact list.<br />A living record of <em>why.</em></h2></div>
    </section>
    <div className="memory-map-row">
      <section className="memory-stage">
        <MemoryGraph people={people} onSelect={select} />
        <div className="memory-legend">
          <span><i className="cobalt" />Current context</span>
          <span><i className="amber" />Live signal</span>
          <span><LockKeyhole size={12} />Private memory</span>
        </div>
      </section>
      <aside className="memory-quote-rail">
        <blockquote>“Intros remembers the context people normally lose between conversations.”</blockquote>
        <span>NOT JUST WHAT PEOPLE SAID. BUT WHAT THEY CARE ABOUT. WHAT THEY’RE BUILDING. AND WHERE THINGS LEFT OFF.</span>
        <dl>
          <div><dt>Conversations remembered</dt><dd>4,892</dd></div>
          <div><dt>People in memory</dt><dd>1,246</dd></div>
          <div><dt>Contextual connections</dt><dd>3,281</dd></div>
        </dl>
      </aside>
    </div>
    <div className="memory-layout">
      <section className="memory-changes">
        <header className="mod-head"><span>WHAT INTROS LEARNED RECENTLY</span><button className="mod-link">View all <ArrowRight size={12} /></button></header>
        <div className="memory-cats">{(['All', ...memoryCategories] as const).map(c =>
          <button key={c} className={cat === c ? 'active' : ''} onClick={() => setCat(c)}>{c}</button>)}</div>
        <div className="learned-table">
          {shown.map((l, index) => {
            const relatedPerson = people[index % people.length]
            return <article key={l.id} className="learned-row">
              {relatedPerson && <button onClick={() => relatedPerson && select(relatedPerson)} aria-label={relatedPerson.name}><Avatar person={relatedPerson} portrait /></button>}
              <div className="learned-text">
                <p>{l.text}</p>
                <small>{relatedPerson?.name} · From: {l.source}</small>
              </div>
              <div className="learned-cell"><strong>{l.confidence}%</strong><small>Confidence</small></div>
              <div className="learned-cell"><strong>{scopeLabel[l.scope]}</strong><small>{l.scope === 'private' ? 'Only you' : l.scope === 'team' ? 'With your team' : 'Cleared for intros'}</small></div>
              <span className="learned-when">{l.when}</span>
            </article>
          })}
          {!shown.length && <p className="empty-state">Nothing learned in this category yet.</p>}
        </div>
      </section>
    </div>
    <div className="memory-modules">
      <section className="mod">
        <header><span>RELATIONSHIP PATTERNS</span><button className="mod-link">View all <ArrowRight size={12} /></button></header>
        <div className="pattern-body">
          <div className="pattern-faces">{people.slice(0, 3).map(p => <Avatar key={p.id} person={p} portrait />)}</div>
          <p>You often connect operators, founders and investors working on the same industrial and AI problems.</p>
        </div>
        <strong className="pattern-stat">19 successful introductions</strong>
        <small>in the last 6 months.</small>
      </section>
      <section className="mod">
        <header><span>NEWLY LEARNED NEEDS</span><button className="mod-link">View all <ArrowRight size={12} /></button></header>
        <ul className="need-signals">
          <li><Target size={15} /><p>2 people need design partners in the next 3 months.</p></li>
          <li><TrendingUp size={15} /><p>3 founders are exploring Series A or B funding.</p></li>
          <li><Network size={15} /><p>4 people are looking for introductions in APAC.</p></li>
        </ul>
      </section>
      <section className="mod">
        <header><span>RECONNECT OPPORTUNITIES</span><button className="mod-link">View all <ArrowRight size={12} /></button></header>
        <ul className="reconnect-list">{[...people].sort((a, b) => b.lastInteractionDays - a.lastInteractionDays).slice(0, 3).map(p =>
          <li key={p.id}><button onClick={() => select(p)}><Avatar person={p} portrait />
            <div><strong>{p.name}</strong><small>Last conversation {Math.max(1, Math.round(p.lastInteractionDays / 30))} months ago</small>
              <small>{p.whyNow}</small></div></button></li>)}</ul>
      </section>
      <section className="mod">
        <header><span>COOLING CONVERSATIONS</span><button className="mod-link">View all <ArrowRight size={12} /></button></header>
        <ul className="reconnect-list">{people.filter(p => p.score.timing < 70).slice(0, 3).map(p =>
          <li key={p.id}><button onClick={() => select(p)}><Avatar person={p} portrait />
            <div><strong>{p.name}</strong><small>Last message {Math.max(1, Math.round(p.lastInteractionDays / 7))} weeks ago</small>
              <small>{p.nextAction}</small></div></button></li>)}</ul>
      </section>
    </div>
  </>
}

/* ------------------------------------------------------------------ insights */

function InsightCollisions() {
  const os = useOS()
  const nav = useNav()
  const live = os.collisions.filter(c => c.status === 'new').slice(0, 2)
  if (!live.length) return null
  return <section className="insight-collisions">
    <header className="section-line">
      <Label signal>OPPORTUNITY COLLISIONS</Label>
      <button className="text-action" onClick={() => nav.setPage('collisions')}>See all <ArrowRight size={13} /></button>
    </header>
    {live.map(c => <CollisionCard key={c.id} collision={c} compact />)}
  </section>
}

/** Counts read from the member's real graph — never invented. */
function insightCounts(net: ReturnType<typeof useNetwork>, people: Member[]): Array<[string, string]> {
  return [
    [String(net.saved.length), 'people you saved to revisit'],
    [String(net.connections.length), 'connections in your graph'],
    [String(net.threads.length), 'conversations open'],
    [String(people.filter(p => (p.scoreTotal ?? 0) >= 60).length), 'members with strong current fit'],
    [String(net.asks.length), 'needs your network posted'],
  ]
}

function Insights({ people, select, setPage }: { people: Member[]; select: (p: Member) => void; setPage: (p: Page) => void }) {
  const net = useNetwork()
  const nav = useNav()
  const [dismissed, setDismissed] = useState<string[]>([])
  return <>
    <EditorialHero folio="INSIGHTS / RELATIONSHIP MOVEMENT" title={<>Notice what changed.<br /><em>Act while it matters.</em></>} statement="Signals become useful only when they change the next move." copy="Role changes, cooling conversations, matching needs and warm paths are organized around action—not analytics theater." caption="The strongest signal is often a small change in a relationship you already trust." image={insightsEditorialAsset.url} />
    <PageHead label="INSIGHTS" title="Signals worth acting on."
      copy="No vanity metrics. Only relationship changes that could alter an outcome, each with an action attached."
      proof={isShowcase() ? '$486K influenced across 46 introductions in 90 days.' : `${people.length} members in your network · ${net.connections.length} connections`} />
    <InsightCollisions />
    <div className="insight-numbers">
      {insightCounts(net, people).map(([n, c]) =>
        <div key={c}><strong>{n}</strong><small>{c}</small></div>)}
    </div>
    <div className="insight-list">
      {showcaseOnly(leaks).filter(l => !dismissed.includes(l.id)).map((leak, i) => {
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
      {showcaseOnly(leaks).length === dismissed.length && <p className="empty-state">No relationship signals yet. As members join, message and update what they are working on, changes worth acting on appear here.</p>}
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
  const [identityEditing, setIdentityEditing] = useState(false)
  const [nameDraft, setNameDraft] = useState(me.name)
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [identitySaving, setIdentitySaving] = useState(false)
  const [identityMessage, setIdentityMessage] = useState('')
  const sliders: [keyof DigitalYouProfile, string, string, string][] = [
    ['directness', 'Directness', 'Soft', 'Direct'], ['formality', 'Formality', 'Casual', 'Formal'],
    ['warmth', 'Warmth', 'Reserved', 'Warm'], ['brevity', 'Brevity', 'Detailed', 'Tight'],
  ]
  const nameParts = me.name.trim().split(/\s+/).filter(Boolean)
  const firstName = nameParts[0] ?? 'Your'
  const restName = nameParts.slice(1).join(' ') || 'Profile'

  useEffect(() => { setNameDraft(me.name) }, [me.name])
  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview) }, [photoPreview])

  const choosePhoto = (file: File | null) => {
    setIdentityMessage('')
    if (!file) return
    if (!file.type.startsWith('image/')) { setIdentityMessage('Choose an image file.'); return }
    if (file.size > 5 * 1024 * 1024) { setIdentityMessage('Profile photos must be 5 MB or smaller.'); return }
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const saveIdentity = async () => {
    setIdentitySaving(true)
    setIdentityMessage('')
    try {
      await net.updateIdentity({ name: nameDraft, photo })
      setPhoto(null)
      if (photoPreview) URL.revokeObjectURL(photoPreview)
      setPhotoPreview(null)
      setIdentityEditing(false)
      setIdentityMessage('Profile updated.')
    } catch (error) {
      setIdentityMessage(error instanceof Error ? error.message : 'Could not save your profile.')
    } finally {
      setIdentitySaving(false)
    }
  }

  return <>
    <section className="identity-header">
      <div className="identity-portrait" data-person-portrait="me" data-portrait-primary="true">
        {me.avatarUrl
          ? <AvatarImage source={me.avatarUrl} alt={`${me.name || 'Member'} profile portrait`} width={1024} height={1280} loading="eager" />
          : isShowcase() && portraitFor('me')
            ? <AvatarImage source={portraitFor('me')} alt="Fictional Aetheris member in architectural window light" width={1024} height={1280} loading="eager" />
            : <span className="identity-placeholder" aria-hidden="true">{me.initials || 'M'}</span>}
        <small>AETHERIS MEMBER PROFILE</small>
      </div>
      <div className="identity-copy">
        <Label>MEMBER PROFILE</Label>
        <h1>{firstName}<br /><em>{restName}</em></h1>
        <p className="identity-role">{me.title || 'Add your role'}<br />{[me.company, me.location].filter(Boolean).join(' · ') || 'Add your company and location'}</p>
        <p className="identity-thesis">{me.thesis || 'Your professional thesis will appear here after onboarding.'}</p>
        <blockquote>“Evidence, mutual value, good timing and human judgment.”</blockquote>
        {identityMessage && !identityEditing && <p className="identity-saved">{identityMessage}</p>}
        <div className="identity-actions">
          <Button onClick={() => { setIdentityEditing(value => !value); setIdentityMessage('') }}><Camera size={14} /> Edit name or photo</Button>
          <Button onClick={openOnboarding}><Fingerprint size={14} /> {me.onboarded ? 'Update your profile' : 'Complete your profile'}</Button>
          <details className="identity-more">
            <summary>More actions <ChevronDown size={13} /></summary>
            <div>
              <button onClick={() => setPage('messages')}><MessageSquareText size={14} /> Conversations</button>
              <button onClick={() => setPage('intros')}><Handshake size={14} /> Your introductions</button>
              <button onClick={() => setPage('needs')}><Bookmark size={14} /> Saved · {net.saved.length}</button>
              <button onClick={() => { void navigator.clipboard?.writeText(window.location.href).catch(() => {}); setCopied(true) }}><Share2 size={14} /> {copied ? 'Link copied' : 'Share profile'}</button>
            </div>
          </details>
        </div>
      </div>
    </section>

    {identityEditing && <section className="identity-editor" aria-label="Edit profile identity">
      <div className="identity-preview">
        {photoPreview
          ? <img src={photoPreview} alt="Selected profile preview" />
          : me.avatarUrl
            ? <AvatarImage source={me.avatarUrl} alt="Current profile portrait" />
            : <span>{me.initials || 'M'}</span>}
      </div>
      <div className="identity-edit-fields">
        <Label>YOUR PUBLIC IDENTITY</Label>
        <h2>Make sure people recognize the right person.</h2>
        <label><span>Full name</span><input value={nameDraft} onChange={event => setNameDraft(event.target.value)} placeholder="Your full name" autoFocus /></label>
        <label className="identity-file"><span>Profile photo</span><input type="file" accept="image/*" onChange={event => choosePhoto(event.target.files?.[0] ?? null)} /><em><Camera size={14} /> {photo ? photo.name : 'Choose a clear photo'} · up to 5 MB</em></label>
        <p>Your name and photo appear on your profile, posts, comments, messages and introduction requests. Photos stay visible only to signed-in members.</p>
        {identityMessage && <small className="identity-error">{identityMessage}</small>}
        <footer>
          <Button onClick={() => { void saveIdentity() }} disabled={identitySaving || !nameDraft.trim()}>{identitySaving ? 'Saving…' : 'Save identity'}</Button>
          <Button kind="secondary" onClick={() => { setIdentityEditing(false); setPhoto(null); setNameDraft(me.name); setIdentityMessage('') }}>Cancel</Button>
        </footer>
      </div>
    </section>}

    <div className="profile-facts">
      {[['ABOUT MEMBER', 'Founder building relationship systems for consequential business decisions.'], ['FOCUS AREAS', me.focus], ['GOALS', 'Place Aetheris with serious operators and document the outcomes.'], ['CAN HELP WITH', me.canHelpWith], ['CURRENTLY LOOKING FOR', me.lookingFor],
      ['INDUSTRIES', me.industries.join(' · ')], ['EXPERTISE', me.expertise.join(' · ')], ['VALUES', me.values],
      ['AVAILABILITY', me.availability], ['WHO YOU WANT TO MEET', me.wantToMeet ?? 'Not stated yet — complete your profile.'],
      ['VALUABLE INTROS', me.introPreferences ?? 'Not stated yet.'], ['BOUNDARIES', me.boundaries ?? 'No boundaries recorded yet.'],
      ['RECENT ASK', net.objectives[0]?.title ?? 'No active need posted yet.']].map(([k, v]) =>
        <div key={k}><span>{k}</span><p>{v}</p></div>)}
    </div>

    <details className="profile-deep">
      <summary>Relationship intelligence, proof and history</summary>
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
        <ol><li><strong>Introduction accepted</strong><small>Darius Cole · Sep 2026</small></li><li><strong>Shared operating thesis</strong><small>Private note · Aug 2026</small></li><li><strong>First mapped warm path</strong><small>via Mina Park · Jun 2026</small></li></ol>
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
    </details>

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
    <div className="ring-dial">
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="42" className="ring-track" />
        <circle cx="50" cy="50" r="42" className="ring-value" strokeDasharray={`${(c * value) / 100} ${c}`} />
      </svg>
      <strong>{value}%</strong>
    </div>
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
      <figure className="member-plate" data-person-portrait={person.id} data-portrait-primary="true">
        {(person.avatarUrl ?? portraitFor(person.id)) && <AvatarImage source={person.avatarUrl ?? portraitFor(person.id)} alt={`${person.name}, monochrome editorial portrait`} />}
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

      <PassportModule memberId={person.id} />
      <ProCredibilityModule memberId={person.id} />
      <DecayPrevention person={person} />
      <RepresentativeAsk person={person} />
      <AvailabilityWindows memberId={person.id} />
      <ReciprocityNote memberId={person.id} />
      <ConnectorAskGuard memberId={person.id} />

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

      <TwinPanel person={person} />

      <section className="mod">
        <header><span>PATHS TO {person.name.split(' ')[0]!.toUpperCase()}</span><small>direct · warm · contextual</small></header>
        <LatentPathList personId={person.id} />
      </section>

      <ProfileRooms personId={person.id} />

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

function ProfileRooms({ personId }: { personId: string }) {
  const os = useOS()
  const nav = useNav()
  const rooms = os.rooms.filter(r => !r.archived && r.peopleIds.includes(personId))
  if (!rooms.length) return null
  return <section className="mod">
    <header><span>OPPORTUNITY ROOMS</span><small>{rooms.length} live</small></header>
    <ul className="profile-rooms">{rooms.map(r => <li key={r.id}>
      <button onClick={() => nav.openRoom(r.id)}><b>{r.name}</b><em>{r.stage} · {r.nextAction}</em></button>
    </li>)}</ul>
  </section>
}

function IntroModal({ person, onClose, onMessage }: { person: Member | null; onClose: () => void; onMessage: (id: string) => void }) {
  const net = useNetwork()
  const [text, setText] = useState('')
  const [you, setYou] = useState<OptIn>('pending')
  const [them, setThem] = useState<OptIn>('pending')
  const [review, setReview] = useState<IntroQualityReview | null>(null)
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
  const blocked = review?.verdict === 'Do Not Send Yet'
  const rows: Array<{ label: string; value: OptIn; set: (v: OptIn) => void }> = [
    { label: 'You', value: you, set: setYou }, { label: person.name, value: them, set: setThem },
  ]
  return <div className="modal-wrap" onMouseDown={onClose}>
    <div className="modal editorial-modal" onMouseDown={e => e.stopPropagation()}>
      <header><div><Label>DOUBLE OPT-IN</Label><h2>A considered introduction.</h2><p>Both sides protect the connector’s credibility.</p></div>
        <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={17} /></button></header>
      <div className="intro-person"><Avatar person={person} /><span><strong>{person.name}</strong><small>{person.title} · {person.company}</small></span></div>
      <textarea rows={8} value={text} onChange={e => setText(e.target.value)} />
      <IntroQualityReviewPanel person={person} mutualValueText={`${person.whyThem} ${person.whyYou}`} contextText={text} onVerdict={setReview} />
      <TrustBudgetNote candidateIds={person.bestPath.length > 1 ? [person.id] : []} />
      {blocked && <p className="intro-blocked">This introduction is not ready. Fix the missing context above before sending — an unearned intro costs the connector, not you.</p>}
      {rows.map(r => <div className="opt-row" key={r.label}>
        <span><strong>{r.label}</strong><small>Confirm this conversation is worth making.</small></span>
        <div><button className={r.value === 'yes' ? 'active' : ''} onClick={() => { r.set('yes'); if (r.value !== 'yes') net.requestIntro(person.id) }}>Interested</button>
          <button className={r.value === 'no' ? 'declined' : ''} onClick={() => { r.set('no'); net.declineIntro(person.id) }}>Not now</button></div>
      </div>)}
      <div className={`authorization ${ok ? 'ready' : ''}`}>{ok ? <CheckCircle2 size={17} /> : <LockKeyhole size={17} />}
        <span>{ok ? 'Introduction authorized. Both parties agreed.' : 'Waiting for both parties before anything is sent.'}</span></div>
      <footer><Button kind="quiet" onClick={onClose}>Cancel</Button>
        <Button disabled={!ok || blocked} onClick={() => {
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
  const os = useOS()
  const nav = useNav()
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
      {asked && <AskOSAnswer query={query} onGo={page => { onClose(); nav.setPage(page) }} />}
      {asked && <div className="ask-results">
        <p>{cooling
          ? 'These relationships are cooling: real prior strength, no recent contact. Reactivate with something useful before asking for anything.'
          : 'Three relationships justify attention now. They combine strategic fit with a current timing signal; the rest of the graph should stay untouched.'}</p>
        {ranked.map(p => <button key={p.id} onClick={() => { onClose(); select(p) }}>
          <Avatar person={p} /><span><strong>{p.name}</strong><small>{p.whyNow}</small></span><Score value={p.scoreTotal} /></button>)}
        <div className="ask-unknown"><AlertTriangle size={14} /><span><b>Unknown:</b> whether any are currently evaluating another option.</span></div>
      </div>}
      <div className="quick-questions">{['What deserves my attention?', 'What opportunities just formed?', 'Where should I place this system?', 'Which connector should I avoid overusing?', 'What are my next five moves?', 'Who should I talk to this week?'].map(q =>
        <button key={q} onClick={() => { setQuery(q); setAsked(true) }}>{q}</button>)}</div>
    </div>
  </div>
}

function AskOSAnswer({ query, onGo }: { query: string; onGo: (p: Page) => void }) {
  const os = useOS()
  const q = query.toLowerCase()
  const advice = trustAdviceFor(os.trustBudgets, [])

  if (/attention|deserve|today|priorit/.test(q)) {
    const items = os.inbox.filter(i => i.status === 'open').sort((a, b) => b.priority - a.priority).slice(0, 3)
    return <div className="ask-os">
      <p>Three things carry consequence right now. Everything else can wait.</p>
      <ul>{items.map(i => <li key={i.id}><b>{i.title}</b><em>{i.whyNow}</em><span>{i.nextMove}</span></li>)}</ul>
      <button className="text-action" onClick={() => onGo('inbox')}>Open the relationship inbox <ArrowRight size={14} /></button>
    </div>
  }
  if (/collision|just formed|opportunit(y|ies) (just|form)/.test(q)) {
    const items = os.collisions.filter(c => c.status === 'new').slice(0, 2)
    return <div className="ask-os">
      <p>Separate signals combined into openings with a limited window.</p>
      <ul>{items.map(c => <li key={c.id}><b>{c.headline}</b><em>{c.timingEvent}</em><span>{c.recommendedAction}</span></li>)}</ul>
      <button className="text-action" onClick={() => onGo('collisions')}>Review collisions <ArrowRight size={14} /></button>
    </div>
  }
  if (/place (this )?system|placement|where should i place/.test(q)) {
    const rooms = os.rooms.filter(r => r.systemIds.length && !r.archived).slice(0, 3)
    return <div className="ask-os">
      <p>Placement follows an owned outcome, not a target list. These rooms already have an owner and a reason.</p>
      <ul>{rooms.map(r => <li key={r.id}><b>{r.name}</b><em>{r.stage}</em><span>{r.nextAction}</span></li>)}</ul>
      <button className="text-action" onClick={() => onGo('rooms')}>Open opportunity rooms <ArrowRight size={14} /></button>
    </div>
  }
  if (/connector|overus|avoid|trust budget/.test(q)) {
    return <div className="ask-os">
      <p>{advice.sentence}</p>
      <ul>{advice.caution.map(c => <li key={c}><b>{c}</b></li>)}</ul>
    </div>
  }
  if (/next five|next 5|moves|strategy/.test(q)) {
    const strategy = os.strategies[0]
    if (!strategy) return null
    return <div className="ask-os">
      <p>Toward “{strategy.goal}”.</p>
      <ul>{strategy.nextMoves.filter(m => !m.done).slice(0, 5).map(m => <li key={m.id}><b>{m.text}</b></li>)}</ul>
      <button className="text-action" onClick={() => onGo('strategy')}>Open strategy <ArrowRight size={14} /></button>
    </div>
  }
  if (/simulate|how do i reach|what happens if/.test(q)) {
    return <div className="ask-os">
      <p>That is a simulation, not a search. Intros will map the paths, the connectors, the friction and where the data is thin — in bands, never invented percentages.</p>
      <button className="text-action" onClick={() => onGo('simulation')}>Run a network simulation <ArrowRight size={14} /></button>
    </div>
  }
  if (/changed in this relationship|what changed/.test(q)) {
    return <div className="ask-os">
      <p>Open a member profile and read the Relationship Twin — it records what changed recently, what usually works, and what to avoid.</p>
      <button className="text-action" onClick={() => onGo('discover')}>Find the person <ArrowRight size={14} /></button>
    </div>
  }
  return null
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

function GlobalSearch({ open, onClose, people }: { open: boolean; onClose: () => void; people: Member[] }) {
  const platform = usePlatform()
  const nav = useNav()
  const [query, setQuery] = useState('')
  if (!open) return null
  const term = query.trim().toLowerCase()
  const matches = <T extends { id: string }>(rows: T[], text: (row: T) => string) => term ? rows.filter(row => text(row).toLowerCase().includes(term)).slice(0, 5) : rows.slice(0, 3)
  const personRows = matches(people, person => `${person.name} ${person.title} ${person.company} ${person.industry} ${person.expertise.join(' ')}`)
  const systemRows = matches(platform.systems, system => `${system.name} ${system.thesis} ${system.category} ${system.industries.join(' ')}`)
  const circleRows = matches(platform.circles, circle => `${circle.name} ${circle.purpose} ${circle.sharedIntents.join(' ')}`)
  const companyRows = matches(platform.companies, company => `${company.name} ${company.industry} ${company.location}`)
  const pageRows = (term
    ? pageMeta.filter(meta => `${meta.label} ${meta.blurb} ${meta.group} ${meta.keywords.join(' ')}`.toLowerCase().includes(term))
    : pageMeta.filter(meta => primaryPages.includes(meta.id))).slice(0, 6)
  const closeThen = (action: () => void) => { onClose(); setQuery(''); action() }
  return <div className="modal-wrap global-search-wrap" onMouseDown={onClose}>
    <section className="global-search-panel" onMouseDown={event => event.stopPropagation()}>
      <header><Search size={20} /><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Search people, companies, systems, circles, or ideas…" /><button className="icon-btn" onClick={onClose} aria-label="Close search"><X size={17} /></button></header>
      <div className="global-results">
        <section><Label>PEOPLE</Label>{personRows.map(person => <button key={person.id} onClick={() => closeThen(() => nav.openMember(person))}><Avatar person={person} /><span><b>{person.name}</b><small>{person.title} · {person.company}</small></span><ArrowRight size={14} /></button>)}</section>
        <section><Label>SYSTEMS</Label>{systemRows.map(system => <button key={system.id} onClick={() => closeThen(() => nav.openSystem(system.id))}><Layers size={17} /><span><b>{system.name}</b><small>{system.thesis}</small></span><ArrowRight size={14} /></button>)}</section>
        <section><Label>CIRCLES</Label>{circleRows.map(circle => <button key={circle.id} onClick={() => closeThen(() => nav.openCircle(circle.id))}><Users size={17} /><span><b>{circle.name}</b><small>{circle.purpose}</small></span><ArrowRight size={14} /></button>)}</section>
        <section><Label>PAGES</Label>{pageRows.map(meta => {
          const Icon = meta.icon
          return <button key={meta.id} onClick={() => closeThen(() => nav.setPage(meta.id))}><Icon size={17} /><span><b>{meta.label}</b><small>{meta.blurb}</small></span><ArrowRight size={14} /></button>
        })}</section>
        <section><Label>COMPANIES</Label>{companyRows.map(company => <button key={company.id} onClick={() => closeThen(() => nav.openCompany(company.id))}><Building2 size={17} /><span><b>{company.name}</b><small>{company.industry} · {company.location}</small></span><ArrowRight size={14} /></button>)}</section>
      </div>
    </section>
  </div>
}

/* ---------------------------------------------------------------------- app */

export default function App({ startPage, mode = 'live' }: { startPage?: Page | undefined; mode?: NetworkMode }) {
  // The live network may only ever render real member-created records.
  setShowcaseMode(mode === 'demo')
  return <NetworkProvider mode={mode}><PlatformProvider><OSProvider><MoatProvider><ProProvider><Shell startPage={startPage} /></ProProvider></MoatProvider></OSProvider></PlatformProvider></NetworkProvider>
}


/* --------------------------------------------------------------------- hubs */

function Hub({ storeKey, title, blurb, tabs, advanced, onNavigate }: {
  storeKey: string; title: string; blurb: string
  tabs: Array<{ id: Page; label: string; node: ReactNode }>
  advanced: Page[]; onNavigate: (p: Page) => void
}) {
  const first = tabs[0]
  const [tab, setTab] = useState<string>(() => {
    if (typeof window === 'undefined') return first?.id ?? ''
    return localStorage.getItem(storeKey) ?? first?.id ?? ''
  })
  if (!first) return null
  const current = tabs.find(t => t.id === tab) ?? first
  const go = (id: string) => { setTab(id); try { localStorage.setItem(storeKey, id) } catch { /* ignore */ } }
  return <>
    <header className="hub-head">
      <div><Label>{title.toUpperCase()}</Label><h1>{blurb}</h1></div>
      <p>{metaById[current.id]?.blurb}</p>
    </header>
    <nav className="hub-tabs" role="tablist" aria-label={`${title} sections`}>
      {tabs.map(t => <button key={t.id} role="tab" aria-selected={t.id === current.id}
        className={t.id === current.id ? 'active' : ''} onClick={() => go(t.id)}>{t.label}</button>)}
    </nav>
    <details className="hub-advanced">
      <summary>Advanced in {title}</summary>
      <div>{advanced.map(id => {
        const meta = metaById[id]
        if (!meta) return null
        const Icon = meta.icon
        return <button key={id} onClick={() => onNavigate(id)}><Icon size={14} />
          <span><b>{meta.label}</b><small>{meta.blurb}</small></span></button>
      })}</div>
    </details>
    <section className="hub-panel" key={current.id}>{current.node}</section>
  </>
}

function Shell({ startPage }: { startPage?: Page | undefined }) {
  const net = useNetwork()
  const stored = typeof window !== 'undefined' ? localStorage.getItem('aetheris-intros-page') : null
  const initial = startPage ?? (stored && allNav.some(n => n.id === stored) ? stored : legacyPage[stored ?? ''] ?? 'home') as Page
  const [page, setPageState] = useState<Page>(initial)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [topMenuOpen, setTopMenuOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [contextOpen, setContextOpen] = useState(false)
  const briefing = useBriefingMode()
  const [selected, setSelected] = useState<Member | null>(null)
  const [draft, setDraft] = useState<Member | null>(null)
  const [needOpen, setNeedOpen] = useState(false)
  const [askOpen, setAskOpen] = useState(false)
  const [onboardOpen, setOnboardOpen] = useState(false)
  const [systemId, setSystemId] = useState<string | null>(null)
  const [circleId, setCircleId] = useState<string | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [handshakeId, setHandshakeId] = useState<string | null>(null)
  const [intentOpen, setIntentOpen] = useState(false)
  const [circleFormOpen, setCircleFormOpen] = useState(false)
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [captureOpen, setCaptureOpen] = useState(false)
  const setPage = (p: Page) => { setSelected(null); setPageState(p) }
  const [threadId, setThreadIdState] = useState(() => (typeof window === 'undefined' ? '' : localStorage.getItem('aetheris-intros-thread') ?? ''))
  const setThreadId = (id: string) => { setThreadIdState(id); localStorage.setItem('aetheris-intros-thread', id) }
  const people = net.members
  const me = net.profile

  useEffect(() => { localStorage.setItem('aetheris-intros-page', page) }, [page])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setGlobalSearchOpen(true) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  useEffect(() => {
    const enforceUniquePortraits = () => {
      const seenPeople = new Set<string>()
      const seenSources = new Set<string>()
      const portraits = Array.from(document.querySelectorAll<HTMLElement>('[data-person-portrait]'))
        .sort((a, b) => Number(b.dataset['portraitPrimary'] === 'true') - Number(a.dataset['portraitPrimary'] === 'true'))
      portraits.forEach(node => {
        const id = node.dataset['personPortrait']
        if (!id) return
        const image = node.querySelector<HTMLImageElement>('img')
        const source = image?.currentSrc || image?.getAttribute('src')
        const repeated = seenPeople.has(id) || Boolean(source && seenSources.has(source))
        node.classList.toggle('portrait-repeat', repeated)
        seenPeople.add(id)
        if (source) seenSources.add(source)
      })
    }
    enforceUniquePortraits()
    const observer = new MutationObserver(enforceUniquePortraits)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [page, selected, draft, askOpen, needOpen, onboardOpen, threadId])

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
    openSystem: id => { setSystemId(id); setPage('systems') },
    openCircle: id => { setCircleId(id); setPage('circles') },
    openCompany: id => { setCompanyId(id); setPage('companies') },
    openHandshake: id => setHandshakeId(id),
    openIntent: () => setIntentOpen(true),
    openRoom: id => { setRoomId(id); setPage('rooms') },
    captureConversation: () => setCaptureOpen(true),
  }

  const pageNode: Partial<Record<Page, ReactNode>> = {
      home: <>
        <IntentStrip onCreate={() => setIntentOpen(true)} />
        <Home people={people} select={setSelected} setPage={setPage} openNeed={() => setNeedOpen(true)} openThread={goToThread} />
        <IntentBoard />
      </>,
      discover: <Discover people={people} select={setSelected} />,
      systems: <SystemsPage openId={systemId} setOpenId={setSystemId} />,
      circles: <CirclesPage openId={circleId} setOpenId={setCircleId} />,
      companies: <CompaniesPage openId={companyId} setOpenId={setCompanyId} />,
      outcomes: <OutcomesPage />,
      loops: <LoopsPage />,
      organization: <OrganizationPage />,
      intros: <Intros people={people} select={setSelected} draft={setDraft} />,
      messages: <Messages people={people} select={setSelected} activeId={threadId} setActiveId={setThreadId} />,
      needs: <><Needs onNew={() => setNeedOpen(true)} people={people} select={setSelected} setPage={setPage} /><IntentBoard /></>,
      memory: <Memory people={people} select={setSelected} />,
      events: <EventsPage />,
      insights: <Insights people={people} select={setSelected} setPage={setPage} />,
      profile: <Profile people={people} setPage={setPage} openOnboarding={() => setOnboardOpen(true)} />,
      preferences: <PreferencesPage />,
      inbox: <RelationshipInboxPage />,
      rooms: <OpportunityRoomsPage openId={roomId} setOpenId={setRoomId} />,
      collisions: <CollisionsPage />,
      simulation: <SimulationPage />,
      strategy: <StrategyPage />,
      evidence: <EvidenceLedgerPage />,
      autopilot: <AutopilotPage />,
      ask: <AskNetworkPage />,
      constitution: <ConstitutionPage />,
      serendipity: <SerendipityPage />,
      eventmode: <EventModePage />,
      gaps: <GapMapPage />,
      identity: <IdentityPage />,
      consent: <ConsentLedgerPage />,
      timemachine: <TimeMachinePage />,
      attribution: <AttributionPage />,
      knowledge: <KnowledgePage />,
      boards: <AdvisoryBoardsPage />,
      integrations: <IntegrationsPage />,
      passport: <PassportPage />,
      opportunities: <OpportunitiesPage />,
      dealrooms: <DealRoomsPage />,
      directory: <DirectoryPage />,
      expertise: <ExpertisePage />,
      talent: <TalentPage />,
      capital: <CapitalPage />,
      intelrooms: <IntelligenceRoomsPage />,
      presence: <PresencePage />,
      permission: <PermissionPage />,
      briefing: <BriefingPage />,
      vault: <VaultPage />,
      knowledgeassets: <KnowledgeAssetsPage />,
    }
  const hubLabel: Partial<Record<Page, string>> = {
    directory: 'People', opportunities: 'Active', rooms: 'Rooms', dealrooms: 'Deal rooms', discover: 'Discover',
  }
  const hubTabs = (ids: Page[]) => ids.flatMap(id => {
    const node = pageNode[id]
    return node ? [{ id, label: hubLabel[id] ?? metaById[id]?.label ?? id, node }] : []
  })
  const content = selected
    ? <MemberProfile person={selected} people={people} onClose={() => setSelected(null)} onDraft={p => { setSelected(null); setDraft(p) }} onMessage={messageMember} />
    : page === 'network'
      ? <Hub storeKey="aetheris.hub.network" title="Network" blurb="People, companies and introductions worth knowing."
          tabs={hubTabs(networkTabs)} advanced={networkAdvanced} onNavigate={setPage} />
      : page === 'opportunities'
        ? <Hub storeKey="aetheris.hub.opportunities" title="Opportunities" blurb="What you are moving, and what it needs next."
            tabs={hubTabs(opportunityTabs)} advanced={opportunityAdvanced} onNavigate={setPage} />
        : pageNode[page]

  useGrabScroll()
  useEffect(() => { rememberRecent(page) }, [page])

  return <NavCtx.Provider value={navApi}>
    <div className={`app-shell ${collapsed ? 'rail-collapsed' : ''} ${contextOpen ? 'show-context' : ''}`}>
      <aside className={`nav-rail ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="rail-head"><Brand /><button className="rail-toggle" onClick={() => setCollapsed(!collapsed)} aria-label="Collapse navigation"><ChevronLeft size={16} /></button></div>
        <nav>{nav.map(item => {
          const Icon = item.icon
          return <button key={item.id} className={page === item.id ? 'active' : ''} title={item.label} onClick={() => { setPage(item.id); setMobileOpen(false) }}>
            <Icon size={18} /><span>{item.label}</span></button>
        })}
          <span className="rail-divider">EVERYTHING ELSE</span>
          <button className={`rail-more ${moreOpen ? 'active' : ''}`} title="All tools" onClick={() => { setMoreOpen(true); setMobileOpen(false) }}>
            <LayoutGrid size={18} /><span>More</span></button>
        </nav>
        <div className="rail-foot"><span className="live-dot" /><span>Memory live</span>
          <button onClick={() => setPage('profile')} aria-label="Your profile"><SelfAvatar image={false} /></button></div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button className="icon-btn mobile-menu" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu"><Menu size={19} /></button>
          <span className="topbar-title">Aetheris Intros <i>/</i> {metaById[page]?.label ?? allNav.find(n => n.id === page)?.label}</span>
          <div className="topbar-actions">
            <button className="topbar-search" aria-label="Search people, companies, topics, or ideas…" onClick={() => setGlobalSearchOpen(true)}><Search size={15} /><span>Search people, companies, topics, or ideas…</span><kbd>⌘K</kbd></button>
            <div className="topbar-dropdown">
              <button className="topbar-dropbtn" aria-expanded={topMenuOpen} onClick={() => setTopMenuOpen(!topMenuOpen)}>
                <SlidersHorizontal size={14} /><span>Actions</span><ChevronDown size={13} />
              </button>
              {topMenuOpen && <>
                <div className="topbar-dropmenu" role="menu">
                  <span className="drop-label">CREATE</span>
                  <button role="menuitem" onClick={() => { setNeedOpen(true); setTopMenuOpen(false) }}><Plus size={14} /> Post a need</button>
                  <button role="menuitem" onClick={() => { setIntentOpen(true); setTopMenuOpen(false) }}><Layers size={14} /> Post live intent</button>
                  <button role="menuitem" onClick={() => { setCaptureOpen(true); setTopMenuOpen(false) }}><Mic size={14} /> Capture conversation</button>
                  <button role="menuitem" onClick={() => { setAskOpen(true); setTopMenuOpen(false) }}><AetherisGlyph size={14} /> Ask Intros</button>
                  <span className="drop-label">VIEW</span>
                  <button role="menuitem" className={briefing.on ? 'active' : ''} onClick={() => { briefing.toggle(); setTopMenuOpen(false) }}><Newspaper size={14} /> Briefing mode <small>{briefing.on ? 'On' : 'Off'}</small></button>
                  <button role="menuitem" className={contextOpen ? 'active' : ''} onClick={() => { setContextOpen(value => !value); setTopMenuOpen(false) }}><Eye size={14} /> Context panel <small>{contextOpen ? 'Shown' : 'Hidden'}</small></button>
                  <button role="menuitem" onClick={() => { setPage('profile'); setTopMenuOpen(false) }}><UserRound size={14} /> Profile</button>
                  <button role="menuitem" onClick={() => { setPage('preferences'); setTopMenuOpen(false) }}><Settings2 size={14} /> Preferences</button>
                </div>
              </>}
            </div>
          </div>
        </header>
        <div className="workspace-grid">
          <main className="content">
            {briefing.on && <BriefingPanel key={page} page={page} />}
            {content}
          </main>
          {contextOpen && <ContextRail page={page} people={people} select={setSelected} onAsk={() => setAskOpen(true)} />}
        </div>
      </div>
      <nav className="mobile-nav">
        {(['home', 'network', 'opportunities', 'messages'] as Page[]).map(id => {
          const meta = metaById[id]!
          const Icon = meta.icon
          return <button key={id} className={page === id ? 'active' : ''} onClick={() => setPage(id)}><Icon size={18} /><span>{meta.label}</span></button>
        })}
        <button className={moreOpen ? 'active' : ''} onClick={() => setMoreOpen(true)}><LayoutGrid size={18} /><span>More</span></button>
      </nav>

      <IntroModal person={draft} onClose={() => setDraft(null)} onMessage={messageMember} />
      <NeedModal open={needOpen} onClose={() => setNeedOpen(false)} onCreate={addNeed} />
      <AskModal open={askOpen} onClose={() => setAskOpen(false)} people={people} select={setSelected} />
      <Onboarding open={onboardOpen} onClose={() => setOnboardOpen(false)} />
      <GlobalSearch open={globalSearchOpen} onClose={() => setGlobalSearchOpen(false)} people={people} />
      {intentOpen && <IntentModal onClose={() => setIntentOpen(false)} />}
      {circleFormOpen && <CreateCircleModal onClose={() => setCircleFormOpen(false)} />}
      {handshakeId && <HandshakeModal memberId={handshakeId} onClose={() => setHandshakeId(null)} />}
      {captureOpen && <VoiceCaptureModal onClose={() => setCaptureOpen(false)} />}
      <MoreDrawer open={moreOpen} page={page} onClose={() => setMoreOpen(false)} onNavigate={setPage} />
      {mobileOpen && <button className="rail-scrim" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}
    </div>
  </NavCtx.Provider>
}

/* ------------------------------------ professional proof on a member profile */

function ProCredibilityModule({ memberId }: { memberId: string }) {
  const pro = usePro()
  const credibility = pro.credibility(memberId)
  const graph = pro.proofGraph(memberId)
  const reputations = pro.reputationFor(memberId)
  const bare = !graph.nodes.length && !reputations.length && !credibility.verified
  return <section className="module pro-credibility">
    <header>
      <div><Label>PROOF OF WORK AND CONTEXTUAL REPUTATION</Label>
        <h3>What is verified, what is self-stated, and what has evidence behind it.</h3>
        <p>{credibility.reasoning}</p></div>
      <div className="pro-cred-score"><strong>{credibility.score}</strong><span>/100</span><em>{credibility.verdict}</em></div>
    </header>
    {bare && <p className="pro-cred-answer">No delivered work, verified credential or contextual reputation has been recorded here yet. Everything on this profile should be read as self-stated until it carries evidence.</p>}
    {!!graph.nodes.length && <>
      <p className="pro-cred-answer">{graph.answer}</p>
      <ul className="mod-list">{graph.nodes.slice(0, 5).map(n => <li key={n.id}>
        <b>{n.kind}</b> {n.label} <small>{n.evidence ? `Evidence: ${n.evidence}` : 'No named evidence — treated as self-stated.'}</small>
      </li>)}</ul>
    </>}
    {!!reputations.length && <div className="pro-cred-reputation">
      {reputations.map(r => <article key={r.id}>
        <span>{r.context.toUpperCase()}</span>
        <strong>{r.bestFor}</strong>
        <small>Trusted in {r.trustedIn.join(' · ')} · proven with {r.provenWith.join(' · ')}</small>
        <em>{r.outcomesCreated} recorded outcome{r.outcomesCreated === 1 ? '' : 's'} · intro quality {r.introQuality} · referral strength {r.referralStrength}</em>
      </article>)}
    </div>}
  </section>
}
