Warning: truncated output (original token count: 48454)
Total output lines: 2917

import { AttachButton, MessageBody, attachmentPreview } from './MessageAttachments'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import {
  AlertTriangle, ArrowLeftRight, ArrowRight, Bell, Bookmark, BookmarkCheck, Building2, CalendarDays, Camera, Check, CheckCircle2, ChevronLeft, ChevronRight,
  CircleDot, Compass, Eye, Fingerprint, Handshake, Heart, Home as HomeIcon, Layers, LockKeyhole,
  MapPin, Menu, MessageSquareText, Network, Plus, Search, Send, Share2, ShieldCheck, Target,
  MessageCircle, Moon, Repeat2, Settings2, SlidersHorizontal, Sun, TrendingUp, UserRound, Users, X,
  Inbox, DoorOpen, GitMerge, Radar, Flag, FileSearch, Gauge, Mic,
  HelpCircle, BookOpen, Sparkle, Map as MapIcon, History, BadgeCheck, Lock, ScrollText, Puzzle,
  ChevronDown, LayoutGrid, Briefcase, FolderLock, GraduationCap, UsersRound, Coins, Landmark, PlaneTakeoff, Play, ShieldAlert, Newspaper, Archive, FileText, LogIn, LogOut, Volume2, VolumeX,
} from 'lucide-react'
import { FaLinkedin, FaMicrosoft, FaSalesforce } from 'react-icons/fa'
import { BsMicrosoftTeams, BsSlack } from 'react-icons/bs'
import { PiMicrosoftOutlookLogoFill } from 'react-icons/pi'
import { SiGmail, SiGooglecalendar, SiHubspot, SiNotion, SiZoom } from 'react-icons/si'
import { rankMatches, type MatchResult } from '@/aetheris/matching'
import { AvatarImage } from './avatar'
import { journalKindFor, journalUrl, uploadJournalMedia } from './live'
import { supabase } from '@/integrations/supabase/client'
import { signOutMember } from './sync/workspace-sync'
import { useAccess } from './access'
import { InviteCard } from './InviteCard'
import { AskIntrosLockup } from './AskIntrosLockup'
import { NetworkBubbles } from './NetworkBubbles'
import { applyTextScale, readTextScale, setTextScale, textScales, type TextScale } from './textScale'
import { applyCursorScale, readCursorScale, setCursorScale, cursorScales, type CursorScale } from './cursorScale'
import { AskIntrosDock, type AskIntrosAction } from './AskIntrosDock'
import { CapabilityWorkspaceHost } from './capabilities/CapabilityWorkspace'
import { VoiceBar } from './VoiceBar'
import { SelectionReader } from './SelectionReader'
import { currentPagePassages, readAloud, readPageOrSelection, setVoiceSettings, stopReading, readerSnapshot, useVoiceSettings, voiceOutputSupported } from './voice'
import { VOICE_PAGES } from './voice-commands'

import discoverEditorialAsset from '@/assets/editorial-discover.jpg.asset.json'
import introsEditorialAsset from '@/assets/editorial-intros.jpg.asset.json'
import needsEditorialAsset from '@/assets/editorial-needs.jpg.asset.json'
import memoryEditorialAsset from '@/assets/editorial-memory.jpg.asset.json'
import insightsEditorialAsset from '@/assets/editorial-insights.jpg.asset.json'
import homeEditorialAsset from '@/assets/aetheris-home-portrait.jpg.asset.json'
import overviewFilmAsset from '@/assets/aetheris-intros-overview.mp4.asset.json'
import introVideoAsset from '@/assets/aetheris-intro-video.mp4.asset.json'
import logoAsset from '@/assets/aetheris-logo.jpg.asset.json'
import worldNetworkImg from '@/assets/aetheris-world-network.jpg'
import { leaks } from './data'
import type { AutonomyLevel, DigitalYouProfile, Objective, PrivacyScope } from './types'
import {
  circles, events, howItWorks5, howIntrosWorks, introStateLabel,
  onboardingQuestions, trendingSectors,
  type JournalAttachment, type Learning, type Member, type MemberRole, type NetworkAsk, type Post, type Thread,
} from './social'
import { useNetwork, type MemoryNote, type MeProfile, type NetworkMode } from './store'
import { isShowcase, showcaseOnly } from './showcase'
import { classifyConnection, composeWarmIntro, radarLabel } from './lib/engine'
import { useGrabScroll } from './lib/dragScroll'
import { metaById, primaryPages, pageMeta, networkTabs, networkAdvanced, workTabs, workAdvanced, meTabs, meAdvanced } from './pageMeta'
import { MoreDrawer, rememberRecent } from './pages/MoreDrawer'
import { BriefingPanel, useBriefingMode } from './BriefingMode'
import { NavCtx, useNav, type NavApi, type Page } from './nav'
import { useOps } from './crm/store'
import { PocketWorkspace } from './pocket/PocketWorkspace'
import { CompanyDiagnosticReport } from './capabilities/CompanyDiagnosticReport'
import { VerifiedBadge } from './badge'
import CrmPage from './pages/CrmPage'
import GridPage from './pages/GridPage'
import { usePlatform } from './platform'
import { SystemsPage } from './pages/SystemsPage'
import { CirclesPage, CreateCircleModal } from './pages/CirclesPage'
import { CompaniesPage } from './pages/CompaniesPage'
import { OutcomesPage } from './pages/OutcomesPage'
import { LoopsPage } from './pages/LoopsPage'
import { OrganizationPage } from './pages/OrganizationPage'
import { HandshakeModal } from './pages/Handshake'
import { IntentBoard, IntentModal, IntentStrip } from './pages/Intents'
import { EventsPage } from './pages/EventsPage'
import { CalendarPage } from './pages/CalendarPage'
import { OpportunityRoomsPage } from './pages/OpportunityRoomsPage'
import { RelationshipInboxPage, InboxRow } from './pages/RelationshipInboxPage'
import { CollisionsPage, CollisionCard } from './pages/CollisionsPage'
import { SimulationPage } from './pages/SimulationPage'
import { StrategyPage, StrategyCard } from './pages/StrategyPage'
import { EvidenceLedgerPage } from './pages/EvidenceLedgerPage'
import { AutopilotPage } from './pages/AutopilotPage'
import { useOS } from './os-store'
import {
  AutopilotCard, EvidenceLink, IntroQualityReviewPanel, LatentPathList, PathToggle,
  TrustBudgetNote, TwinPanel, VoiceCaptureModal,
} from './os-ui'
import { homeStrips, trustAdvice as trustAdviceFor } from './domain/os-engine'
import type { IntroQualityReview, PathKind } from './domain/os-models'
import { PreferencesPage } from './pages/PreferencesPage'
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
import { usePro } from './pro-store'
import { PassportPage } from './pages/PassportPage'
import { OpportunitiesPage } from './pages/OpportunitiesPage'
import { AskReplies, DealsPage, OpenDealRoomButton } from './deals-ui'
import { draftTitle, queueDealDraft } from './deals-core'
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
import SimpleViewPage from './pages/SimpleViewPage'
import { NewsPage } from './pages/NewsPage'
import { portraitFor } from './portraits'
import { ExecutiveHome } from './pages/ExecutiveHome'
import { HubIntro, RadarMini, SignalPath, TileShell } from './hub-ui'
import { badgeLabel, useVerification } from './verification'
import { ExecutiveIdentityEditor, ExecutivePage } from './ExecutivePage'
import { useGraph } from './graph-store'
import { OutcomeCheckins } from './outcomes-ui'
import { IntroRequestInbox } from './intro-inbox'
import { MeetingsPage } from './meetings-ui'
import { PeerGroupsPage } from './peer-groups-ui'
import { ProvidersPage } from './providers-ui'
import { WarmPathsPage } from './warm-paths-ui'
import { WorkspacesPage } from './workspaces/WorkspacesPage'
import { ExecutiveWorkPage } from './pages/ExecutiveWorkPage'
import { AgentInboxPage } from './agent-ui'
import { LeakCheckPanel } from './leak-check-ui'
import { SentIntroRequests } from './sent-requests-ui'
import { CompanyWorkspacePanel } from './company-ui'
import { AetherisProviderRoot } from './AetherisProviderRoot'
import { InsightBar } from './ceo-insights-ui'
import { ApprovalQueuePanel, CalendarMeetingBar, CeoActions, CeoHost, ForecastConfidencePanel, NetworkRoiPanel, TrustPassportSummary, WorkCeoBar } from './ceo-ui'
import { openCeo } from './ceo-store'
import { DelegatesPanel, DigitalYouRulesPanel, IntentExchangePanel, OrganizationRelationshipView, PassportManager, ReverseDiscoveryPanel } from './opportunity-ui'
import { activeMission, missionFit, missionTypeLabel } from './opportunity-graph'
import { EditorialFeed, NotificationsDrawer } from './SocialExperience'
import { newsAge, useAetherisNews } from './news'
import { IntrosSystemBento, BentoGridItem } from './IntrosSystemGrid'



type OptIn = 'pending' | 'yes' | 'no'

const nav: Array<{ id: Page; label: string; icon: typeof HomeIcon }> = primaryPages.map(id => {
  const meta = metaById[id]!
  return { id, label: meta.label, icon: meta.icon }
})
const allNav: Array<{ id: Page; label: string; icon: typeof HomeIcon }> = pageMeta.map(p => ({ id: p.id, label: p.label, icon: p.icon }))
const legacyPage: Record<string, Page> = {
  command: 'home', people: 'network', forensics: 'insights', simple: 'home',
  'digital-you': 'me', roi: 'insights', settings: 'me', dealrooms: 'deals',
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
  return <AskIntrosLockup variant="compact" />
}
function AetherisGlyph({ size = 18 }: { size?: number }) {
  return <span className="aetheris-glyph" style={{ width: size, height: size }} aria-hidden="true"><i /><b /></span>
}
function Avatar({ person, large = false, portrait = false, primary = false }: { person: Member; large?: boolean; portrait?: boolean; primary?: boolean }) {
  const image = person.avatarUrl ?? portraitFor(person.id)
  return <span className={`person-avatar ${large ? 'large' : ''} ${portrait ? 'portrait' : ''}`} data-person-portrait={person.id} {...(primary ? { 'data-portrait-primary': 'true' } : {})} aria-label={person.name}>
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
function EditorialHero({ folio, title, statement, copy, caption, focus = 'center 30%', stats, action, image, compact = false }: {
  folio: string; title: React.ReactNode; statement: string; copy: string; caption: string
  focus?: string; stats?: Array<{ k: string; v: string }>; action?: React.ReactNode; image: string; compact?: boolean
}) {
  return <section className={`editorial-hero${compact ? ' compact' : ''}`}>
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

/** The signature Ask Intros masthead: ivory brand field, editorial portrait, dark intelligence panel, live deck. */
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
       <span className="folio">THE RELATIONSHIP NETWORK FOR CEOs</span>
      <h1 className="masthead-title">Ask<br /><em>Intros</em></h1>
       <h2>Who matters.<br />Why they matter. Why now.</h2>
       <p>A relationship network for CEOs, built around trusted context and timely introductions—so every connection has a clear reason to matter.</p>

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
         <div><h3>ASK INTROS</h3><p>The Relationship Network for CEOs.</p></div>
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
    <footer className="masthead-footer"><span>THE SOCIAL NETWORK FOR REAL BUSINESS RELATIONSHIPS — NEVER MASS OUTREACH</span><b>ASK INTROS</b></footer>
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

/* ------------------------------------------------------------------ journal */

function JournalFile({ item }: { item: JournalAttachment }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    void journalUrl(item.path).then(resolved => { if (active) setUrl(resolved) })
    return () => { active = false }
  }, [item.path])

  if (item.kind === 'image') {
    return <figure className="journal-image">{url ? <img src={url} alt={item.name} loading="lazy" /> : <span>{item.name}</span>}</figure>
  }
  if (item.kind === 'video') {
    return <figure className="journal-video">{url
      ? <video src={url} controls preload="metadata" playsInline><track kind="captions" /></video>
      : <span>{item.name}</span>}</figure>
  }
  return <a className="journal-doc" href={url ?? undefined} target="_blank" rel="noreferrer">
    <FileText size={15} /><span>{item.name}</span><small>{Math.max(1, Math.round(item.size / 1024))} KB</small>
  </a>
}

function JournalMedia({ media }: { media?: JournalAttachment[] | undefined }) {
  if (!media?.length) return null
  const images = media.filter(m => m.kind === 'image')
  const rest = media.filter(m => m.kind !== 'image')
  return <div className="journal-media">
    {images.length > 0 && <div className={`journal-gallery count-${Math.min(images.length, 4)}`}>{images.map(item => <JournalFile key={item.path} item={item} />)}</div>}
    {rest.map(item => <JournalFile key={item.path} item={item} />)}
  </div>
}

/** Write a Journal entry: a headline, a note, attachments and who can see it. */
function JournalComposer({ compact = false }: { compact?: boolean }) {
  const net = useNetwork()
  const [text, setText] = useState('')
  const [detail, setDetail] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [visibility, setVisibility] = useState<'network' | 'private'>('network')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const choose = (chosen: FileList | null) => {
    setMessage('')
    if (!chosen?.length) return
    const next = [...files]
    for (const file of Array.from(chosen)) {
      if (next.length >= 6) { setMessage('Up to 6 attachments per entry.'); break }
      const kind = journalKindFor(file)
      if (!kind) { setMessage(`${file.name} is not a supported picture, video or document.`); continue }
      const limit = kind === 'video' ? 200 * 1024 * 1024 : 25 * 1024 * 1024
      if (file.size > limit) { setMessage(`${file.name} is too large — ${kind === 'video' ? 'videos up to 200 MB' : 'pictures and documents up to 25 MB'}.`); continue }
      next.push(file)
    }
    setFiles(next)
  }

  const publish = async () => {
    if (!text.trim()) return
    setSaving(true)
    setMessage('')
    try {
      let media: JournalAttachment[] = []
      if (files.length) {
        const { data } = await supabase.auth.getUser()
        const userId = data.user?.id
        if (!userId) throw new Error('Sign in again to attach files.')
        media = await Promise.all(files.map(file => uploadJournalMedia(userId, file)))
      }
      await net.addPost(text.trim(), detail.trim() || (visibility === 'private' ? 'Private to you.' : 'Shared with your network.'), media, visibility)
      setText(''); setDetail(''); setFiles([]); setMessage('Journal entry added.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save this entry.')
    } finally {
      setSaving(false)
    }
  }

  return <section className={`journal-composer${compact ? ' compact' : ''}`}>
    <header><Label>YOUR JOURNAL</Label><h3>Write what you are working on.</h3>
      <p>Entries sit on your profile so members understand your current focus. Attach pictures, video or documents when they help.</p></header>
    <input className="journal-headline" value={text} onChange={event => setText(event.target.value)} placeholder="A clear headline — what happened or what you are building" />
    <textarea rows={compact ? 3 : 4} value={detail} onChange={event => setDetail(event.target.value)} placeholder="The detail worth knowing: context, outcome, what you need next…" />
    {files.length > 0 && <ul className="journal-queue">{files.map((file, index) => <li key={`${file.name}-${index}`}>
      <span>{journalKindFor(file) === 'image' ? <Camera size={13} /> : journalKindFor(file) === 'video' ? <Play size={13} /> : <FileText size={13} />}</span>
      <b>{file.name}</b><small>{Math.max(1, Math.round(file.size / 1024))} KB</small>
      <button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles(files.filter((_, i) => i !== index))}><X size={13} /></button>
    </li>)}</ul>}
    <footer>
      <label className="journal-attach"><input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv" onChange={event => { choose(event.target.files); event.target.value = '' }} /><span><Plus size={14} /> Add pictures, video or documents</span></label>
      <div className="journal-visibility">
        <button type="button" className={visibility === 'network' ? 'on' : ''} onClick={() => setVisibility('network')}><Users size={13} /> My network</button>
        <button type="button" className={visibility === 'private' ? 'on' : ''} onClick={() => setVisibility('private')}><LockKeyhole size={13} /> Private to me</button>
      </div>
      <Button disabled={saving || !text.trim()} onClick={() => { void publish() }}>{saving ? 'Saving…' : 'Add Journal entry'}</Button>
    </footer>
    {message && <small className="journal-message">{message}</small>}
  </section>
}

/** A member's Journal entries, newest first. */
function JournalFeed({ member, name }: { member?: Member | undefined; name: string }) {
  const net = useNetwork()
  const nav = useNav()
  const memberId = member?.id ?? 'me'
  const mine = !member
  const entries = net.posts.filter(post => post.memberId === memberId)
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? entries : entries.slice(0, 3)

  return <section className="journal-feed">
    <header><Label>JOURNAL</Label><h3>{mine ? 'Your entries' : `${name.split(' ')[0]}’s entries`}</h3>
      {entries.length > 3 && <button className="text-action" onClick={() => setShowAll(value => !value)}>{showAll ? 'Show less' : `See all ${entries.length}`}</button>}</header>
    {visible.length
      ? visible.map(post => <PostCard key={post.id} post={post} member={member} onOpen={() => { if (member) nav.openMember(member) }} />)
      : <p className="empty-state">{mine
        ? 'No entries yet. A Journal is where you record what you are building, what changed and what you need next — members read it on your profile.'
        : `No Journal entries yet from ${name.split(' ')[0]}.`}</p>}
  </section>
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
    <JournalMedia media={post.media} />
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
        {mine && <small className="post-own">{post.visibility === 'private' ? <><LockKeyhole size={12} /> Private to you · added to Active Memory</> : 'Shared with your network · added to Active Memory'}</small>}
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

function PremiumHome({ people, select, setPage, openNeed, openThread }: {
  people: Member[]; select: (p: Member) => void; setPage: (p: Page) => void; openNeed: () => void; openThread: (id: string) => void
}) {
  const net = useNetwork()
  const graph = useGraph()
  const { data: news } = useAetherisNews()
  const ranked = useMemo(() => [...people].sort((a, b) => b.scoreTotal - a.scoreTotal), [people])
  const lead = ranked[0]
  const second = ranked[1]
  const thread = net.threads.find(item => item.unread) ?? net.threads[0]
  const threadPerson = people.find(person => person.id === thread?.memberId)
  const mission = activeMission(graph.missions)
  const story = news?.items[0]
  return <div className="premium-home"><section className="premium-home-stage">
    <div className="premium-home-copy"><HomeBrand /><Label>RELATIONSHIP INTELLIGENCE FOR EXECUTIVES</Label><h1>Know who matters.<br />Know <em>why now.</em></h1><p>Your relationships, current mission, conversations and live signals—held in one private operating system.</p><div className="premium-home-actions"><Button onClick={openNeed}>State what you need <ArrowRight size={14} /></Button><Button kind="secondary" onClick={() => setPage('briefing')}>Open Executive Brief</Button></div><dl><div><dt>Relationships</dt><dd>{net.connections.length}</dd></div><div><dt>Open conversations</dt><dd>{net.threads.length}</dd></div><div><dt>Active missions</dt><dd>{graph.missions.filter(item => item.status === 'active').length}</dd></div></dl></div>
    <figure className="premium-home-portrait"><img src={net.profile.avatarUrl || homeEditorialAsset.url} alt={net.profile.avatarUrl ? `${net.profile.name || 'Member'} executive portrait` : 'Executive in architectural window light'} /><figcaption>{net.profile.name || 'YOUR EXECUTIVE PAGE'}<small>{[net.profile.title, net.profile.company].filter(Boolean).join(' · ') || 'Complete your executive identity'}</small></figcaption></figure>
    <aside className="premium-home-intel"><header><Label signal>ACTIVE RELATIONSHIP FIELD</Label><h2>Who matters now.</h2></header><MemoryGraph people={ranked.slice(0, 6)} onSelect={select} compact />{lead ? <button className="premium-home-person" onClick={() => select(lead)}><Avatar person={lead} portrait /><span><b>{lead.name}</b><small>{lead.whyNow || lead.nextAction}</small></span><ArrowRight size={14} /></button> : <p className="quiet-empty">Your relationship field will form as verified people enter your network.</p>}<div className="premium-home-mission"><span>ACTIVE MISSION / WHY NOW</span><h3>{mission?.title ?? 'No active mission yet.'}</h3><p>{mission?.objective || mission?.successDefinition || 'State the outcome that should shape who and what rises to the surface.'}</p><button onClick={() => setPage('work')}>Open Work <ArrowRight size={13} /></button></div></aside>
  </section><IntrosSystemBento className="premium-home-deck md:grid-cols-4">
    <BentoGridItem className="premium-home-module" header={lead ? <button onClick={() => select(lead)}><Avatar person={lead} portrait /><span><h3>{lead.name}</h3><p>{lead.title} · {lead.company}</p></span></button> : null} title="Suggested person" description={lead?.whyThem || 'Add current context to sharpen who appears.'} onClick={lead ? () => select(lead) : undefined} />
    <BentoGridItem className="premium-home-module" header={second ? <div><Label signal>INTRO RECOMMENDATION</Label><h3>{second.name}</h3></div> : null} title="Warm path" description={second?.whyYou || 'Recommendations appear only when there is evidence for both sides.'} onClick={() => setPage('intros')} />
    <BentoGridItem className="premium-home-module" header={thread && threadPerson ? <button onClick={() => openThread(thread.id)}><Avatar person={threadPerson} /><span><h3>{threadPerson.name}</h3></span></button> : null} title="Conversation" description={thread?.commitment || thread?.messages.at(-1)?.text || 'Your private threads will appear here.'} />
    <BentoGridItem className="premium-home-module" header={story ? <div><Label>EXECUTIVE NEWS</Label><h3>{story.title}</h3></div> : null} title="Executive news" description={story ? `${story.source} · ${newsAge(story.published)}` : 'News will appear when the provider responds.'} onClick={() => setPage('news')} />
  </IntrosSystemBento><EditorialFeed onBrief={() => setPage('briefing')} /><ExecutiveHome embedded /></div>
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

function HomeBrand({ compact = false }: { compact?: boolean }) {
  return <div className={`home-ai-brand ${compact ? 'compact' : ''}`} aria-label="Ask Intros">
    <span className="home-ai-monogram">AI<i /></span>
    <span className="home-ai-namestack"><b>ASK INTROS</b>{!compact && <small className="home-ai-tagline"><span className="t-orange">WHY ME</span> · <span className="t-blue">WHY THEM</span> · <span className="t-orange">WHY NOW</span></small>}</span>
  </div>
}

type HomeConnectionFilter = 'all' | 'hot_now' | 'emerging' | 'strategic' | 'dormant' | 'at_risk'
type HomeConnectionSort = 'score' | 'timing' | 'relationship' | 'contact'

function Home({ people, select, setPage, openNeed, openThread }: {
  people: Member[]; select: (p: Member) => void; setPage: (p: Page) => void; openNeed: () => void
  openThread: (id: string) => void
}) {
  const net = useNetwork()
  const platform = usePlatform()
  const os = useOS()
  const nav = useNav()
  const [filter, setFilter] = useState<HomeConnectionFilter>('all')
  const [sort, setSort] = useState<HomeConnectionSort>('score')
  const [query, setQuery] = useState('')
  const [darkHome, setDarkHome] = useState(true)
  useEffect(() => {
    const saved = window.localStorage.getItem('aetheris.home.theme')
    if (saved === 'light') setDarkHome(false)
  }, [])
  const toggleHomeTheme = () => setDarkHome(current => {
    const next = !current
    window.localStorage.setItem('aetheris.home.theme', next ? 'dark' : 'light')
    return next
  })
  const ranked = useMemo(() => [...people].sort((a, b) => b.scoreTotal - a.scoreTotal), [people])
  const connections = useMemo(() => ranked.filter(person => {
    const text = `${person.name} ${person.title} ${person.company} ${person.whyYou} ${person.whyThem} ${person.whyNow}`.toLowerCase()
    if (query.trim() && !text.includes(query.trim().toLowerCase())) return false
    if (filter === 'at_risk') return person.relationshipStatus === 'at-risk'
    if (filter !== 'all' && person.radar !== filter) return false
    return true
  }).sort((a, b) => {
    if (sort === 'timing') return b.score.timing - a.score.timing
    if (sort === 'relationship') return b.score.relationshipStrength - a.score.relationshipStrength
    if (sort === 'contact') return a.lastInteractionDays - b.lastInteractionDays
    return b.scoreTotal - a.scoreTotal
  }), [filter, people, query, ranked, sort])
  const needingAttention = people.filter(person => person.relationshipStatus === 'at-risk' || person.lastInteractionDays > 60).length
  const highValuePaths = people.filter(person => person.scoreTotal >= 75).length
  const activeOpportunities = os.rooms.filter(room => !room.archived && room.stage !== 'Lost/Not Now').length + platform.placements.filter(placement => !['Adopted', 'Referred', 'Not Now'].includes(placement.stage)).length
  const coldConversations = net.threads.filter(thread => thread.unread).length
  const firstName = net.profile.name.trim().split(/\s+/)[0] || 'Joseph'
  const statusLabel = (person: Member) => person.relationshipStatus === 'at-risk' ? 'AT RISK' : radarLabel[person.radar].toUpperCase()
  const filters: Array<[HomeConnectionFilter, string]> = [['all', 'All'], ['hot_now', 'Hot Now'], ['emerging', 'Emerging'], ['strategic', 'Strategic'], ['dormant', 'Dormant'], ['at_risk', 'At Risk']]
  const dashboardNav: Array<[string, Page]> = [['Home', 'home'], ['Network', 'network'], ['Opportunities', 'opportunities'], ['Introductions', 'intros'], ['Meetings', 'messages'], ['Analytics', 'insights'], ['Settings', 'preferences']]
  const integrations = [
    { name: 'LinkedIn', icon: FaLinkedin, tone: 'linkedin' },
    { name: 'Gmail', icon: SiGmail, tone: 'gmail' },
    { name: 'Outlook', icon: PiMicrosoftOutlookLogoFill, tone: 'outlook' },
    { name: 'Google Calendar', icon: SiGooglecalendar, tone: 'calendar' },
    { name: 'Slack', icon: BsSlack, tone: 'slack' },
    { name: 'Zoom', icon: SiZoom, tone: 'zoom' },
    { name: 'Microsoft Teams', icon: BsMicrosoftTeams, tone: 'teams' },
    { name: 'HubSpot', icon: SiHubspot, tone: 'hubspot' },
    { name: 'Salesforce', icon: FaSalesforce, tone: 'salesforce' },
    { name: 'Notion', icon: SiNotion, tone: 'notion' },
  ]
  const draftMessage = (person: Member) => openThread(net.openThreadWith(person.id))

  return <div className={`editorial-home ${darkHome ? 'home-theme-dark' : 'home-theme-light'}`}>
    <header className="eh-brandbar"><HomeBrand /><div className="eh-brand-actions"><button type="button" onClick={toggleHomeTheme} aria-label={`Use ${darkHome ? 'light' : 'dark'} Home theme`} title={`Use ${darkHome ? 'light' : 'dark'} theme`}>{darkHome ? <Sun size={16} /> : <Moon size={16} />}</button><span>RELATIONSHIP<br />INTELLIGENCE AT WORK</span><i /></div></header>

    <section className="eh-hero">
      <div className="eh-hero-copy">
        <span>ASK INTROS</span>
        <h1>The Relationship Network<br /><em>for CEOs.</em></h1>
        <p>Who matters. Why they matter. Why now.</p>
        <div><button className="eh-primary" onClick={openNeed}>GET STARTED <ArrowRight size={15} /></button><button className="eh-secondary" onClick={() => setPage('intros')}><Play size={13} /> SEE HOW IT WORKS</button></div>
      </div>
      <div className="eh-hero-art">
        <img src={homeEditorialAsset.url} alt="A professional in quiet thought beside hard window light" width={597} height={804} />
        <p>REAL PEOPLE. REAL OPPORTUNITIES. A BRIGHTER TOMORROW.</p>
      </div>
    </section>

    <dl className="eh-metrics">
      <div><dd>{net.connections.length}</dd><dt>Relationships</dt></div>
      <div><dd>{highValuePaths}</dd><dt>High-Value Paths</dt></div>
      <div><dd>{activeOpportunities}</dd><dt>Active Opportunities</dt></div>
      <div><dd>{coldConversations}</dd><dt>Conversations Needing Attention</dt></div>
    </dl>

    <section className="eh-dashboard">
      <header><HomeBrand compact /><button onClick={() => setPage('discover')}><Search size={14} /><span>Search for people, companies, or opportunities…</span></button><button className="eh-icon" aria-label="Notifications" onClick={() => setPage('inbox')}><Bell size={17} />{coldConversations > 0 && <i />}</button><button className="eh-dash-avatar" aria-label="Open your profile" onClick={() => setPage('profile')}><SelfAvatar /></button></header>
      <div className="eh-dash-body">
        <nav>{dashboardNav.map(([label, id]) => <button key={id} className={id === 'home' ? 'active' : ''} onClick={() => setPage(id)}>{label}<ChevronRight size={13} /></button>)}</nav>
        <main>
          <div className="eh-greeting"><span>YOUR RELATIONSHIP INTELLIGENCE</span><h2>Good morning, {firstName}.</h2><p>Here’s what matters today.</p></div>
          <div className="eh-summary">
            <button onClick={() => setPage('inbox')}><b>{needingAttention}</b><span>Relationships<br />need attention</span></button>
            <button onClick={() => setPage('intros')}><b>{highValuePaths}</b><span>High-value<br />paths available</span></button>
            <button onClick={() => setPage('messages')}><b>{coldConversations}</b><span>Conversations<br />going cold</span></button>
            <button onClick={() => setPage('opportunities')}><b>{activeOpportunities}</b><span>Opportunity<br />changed</span></button>
          </div>
          <div className="eh-priority-head"><div><span>PRIORITY RELATIONSHIPS</span><h3>Where timing and fit converge.</h3></div><button onClick={() => setPage('network')}>View network <ArrowRight size={13} /></button></div>
          <div className="eh-priority-list">
            {ranked.slice(0, 5).map(person => <button key={person.id} onClick={() => select(person)}><span className="eh-initials">{person.initials}</span><span><b>{person.name}</b><small>{person.title} · {person.company}</small></span><em className={`status-${person.radar}`}>{statusLabel(person)}</em><strong>{person.scoreTotal}<small>CONNECTION SCORE</small></strong><ChevronRight size={16} /></button>)}
            {!ranked.length && <p>No relationships yet. Complete your profile and connect with members to build this view.</p>}
          </div>
        </main>
      </div>
    </section>

    <section className="eh-why">
      <article className="orange"><span>WHY ME</span><i /><p>Built with business, AI, and real-world execution in mind.</p></article>
      <article className="blue"><span>WHY THEM</span><i /><p>Focused on the people, context, and opportunity that actually matter.</p></article>
      <article className="orange"><span>WHY NOW</span><i /><p>The best relationships are built before the market catches up.</p></article>
    </section>

    <section className="eh-founder-story">
      <span>FOUNDER CONTEXT / WHY ME</span>
      <h2>The Architect Behind the Operator</h2>
      <p>Before Aetheris was software, it was a lifetime of learning how people, systems, pressure, failure, and responsibility connect.</p>
      <Link to="/founder-story">Read My Story <ArrowRight size={14} /></Link>
    </section>

    <section className="eh-film">
      <div className="eh-film-copy">
        <span>WATCH FIRST</span>
        <h2>See how Ask Intros works.</h2>
        <p>A short walk through the platform: how context is captured, how the right people surface at the right time, and how introductions happen with both sides agreeing.</p>
        <ul><li>Why this person, why you, why now</li><li>Double opt-in introductions, never cold outreach</li><li>Memory that keeps relationships alive</li></ul>
      </div>
      <div className="eh-film-videos">
        <figure>
          <video src={overviewFilmAsset.url} controls preload="metadata" playsInline poster={homeEditorialAsset.url}>
            <track kind="captions" />
          </video>
          <figcaption>Platform overview · 2 min</figcaption>
        </figure>
        <figure>
          <video src={introVideoAsset.url} controls preload="metadata" playsInline>
            <track kind="captions" />
          </video>
          <figcaption>Ask Intros · from the founder</figcaption>
        </figure>
      </div>
    </section>

    <section className="eh-connections">
      <header><div><span>RELATIONSHIP INTELLIGENCE</span><h2>Connections</h2><p>The people Ask Intros thinks matter most right now.</p></div><strong>{connections.length}<small>VISIBLE CONNECTIONS</small></strong></header>
      <div className="eh-connection-tools"…18454 tokens truncated…
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
function NeedModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (o: Objective) => Promise<void> }) {
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
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
        {error && <small role="alert">{error}</small>}<Button disabled={!ready || saving} onClick={() => void (async () => {
          setSaving(true); setError('')
          try {
            await onCreate({ id: `o${Date.now()}`, title: form.goal, outcome: form.outcome || form.goal, target: form.who, whyNow: form.whyNow, valueOffer: form.valueOffer, success: form.success || 'A qualified next conversation', priority: 'high' })
            setForm(blank); onClose()
          } catch (caught) { setError(caught instanceof Error ? caught.message : 'Your need could not be posted.') }
          finally { setSaving(false) }
        })()}>{saving ? 'Posting…' : 'Post to the network'} <ArrowRight size={15} /></Button></footer>
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
  const ops = useOps()
  const nav = useNav()
  const [query, setQuery] = useState('')
  if (!open) return null
  const term = query.trim().toLowerCase()
  const looksLikeQuestion = /^(who|what|which|where|when|why|how|show|find|open|run|prepare|help|should|can)\b/.test(term) || query.includes('?')
  const matches = <T extends { id: string }>(rows: T[], text: (row: T) => string) => term ? rows.filter(row => text(row).toLowerCase().includes(term)).slice(0, 5) : rows.slice(0, 3)
  const personRows = matches(people, person => `${person.name} ${person.title} ${person.company} ${person.industry} ${person.expertise.join(' ')}`)
  const systemRows = matches(platform.systems, system => `${system.name} ${system.thesis} ${system.category} ${system.industries.join(' ')}`)
  const circleRows = matches(platform.circles, circle => `${circle.name} ${circle.purpose} ${circle.sharedIntents.join(' ')}`)
  const companyRows = matches(platform.companies, company => `${company.name} ${company.industry} ${company.location}`)
  const crmPeople = matches(ops.people.filter(p => !p.archived), p => `${p.fullName} ${p.title} ${p.companyName} ${p.email} ${p.lifecycle}`)
  const crmCompanies = matches(ops.companies.filter(c => !c.archived), c => `${c.name} ${c.industry} ${c.location}`)
  const crmOpps = matches(ops.opportunities.filter(o => !o.archived), o => `${o.name} ${o.stageName} ${o.nextAction}`)
  const gridRows = matches(ops.sheets.filter(s => !s.archived), s => `${s.name} ${s.mode} ${s.entityType ?? ''}`)
  const pageRows = (term
    ? pageMeta.filter(meta => `${meta.label} ${meta.blurb} ${meta.hub} ${meta.keywords.join(' ')}`.toLowerCase().includes(term))
    : pageMeta.filter(meta => primaryPages.includes(meta.id))).slice(0, 6)
  const closeThen = (action: () => void) => { onClose(); setQuery(''); action() }
  const quickCreate = [
    { label: 'New person', run: () => { void ops.createPerson({ fullName: query.trim() || 'Untitled person' }); nav.setPage('crm') } },
    { label: 'New company', run: () => { void ops.createCompany({ name: query.trim() || 'Untitled company' }); nav.setPage('crm') } },
    { label: 'New opportunity', run: () => { void ops.createOpportunity({ name: query.trim() || 'Untitled opportunity' }); nav.setPage('crm') } },
    { label: 'New task', run: () => { void ops.createTask({ title: query.trim() || 'Untitled task' }); nav.setPage('crm') } },
    { label: 'New workbook', run: () => { void ops.createWorkbook(query.trim() || 'New workbook'); nav.setPage('grid') } },
  ]
  return <div className="modal-wrap global-search-wrap" onMouseDown={onClose}>
    <section className="global-search-panel" onMouseDown={event => event.stopPropagation()}>
      <header><Search size={20} /><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Search people, CRM records, companies, sheets, systems…" /><button className="icon-btn" onClick={onClose} aria-label="Close search"><X size={17} /></button></header>
      <div className="global-results">
        {looksLikeQuestion && <section><Label>ASK INTROS</Label><button onClick={() => closeThen(() => window.dispatchEvent(new CustomEvent('aetheris:open-assistant', { detail: query.trim() })))}><AetherisGlyph size={17} /><span><b>Ask “{query.trim()}”</b><small>Use your relationship context and deterministic operating-system analysis.</small></span><ArrowRight size={14} /></button></section>}
        <section><Label>PEOPLE</Label>{personRows.map(person => <button key={person.id} onClick={() => closeThen(() => nav.openMember(person))}><Avatar person={person} /><span><b>{person.name}</b><small>{person.title} · {person.company}</small></span><ArrowRight size={14} /></button>)}</section>
        <section><Label>CRM RECORDS</Label>
          {crmPeople.map(p => <button key={p.id} onClick={() => closeThen(() => nav.setPage('crm'))}><UserRound size={17} /><span><b>{p.fullName}</b><small>{p.lifecycle}{p.companyName ? ` · ${p.companyName}` : ''}</small></span><ArrowRight size={14} /></button>)}
          {crmCompanies.map(c => <button key={c.id} onClick={() => closeThen(() => nav.setPage('crm'))}><Building2 size={17} /><span><b>{c.name}</b><small>{c.industry || 'Company'}</small></span><ArrowRight size={14} /></button>)}
          {crmOpps.map(o => <button key={o.id} onClick={() => closeThen(() => nav.setPage('crm'))}><Target size={17} /><span><b>{o.name}</b><small>{o.stageName || 'Opportunity'}</small></span><ArrowRight size={14} /></button>)}
        </section>
        <section><Label>GRID SHEETS</Label>{gridRows.map(s => <button key={s.id} onClick={() => closeThen(() => nav.setPage('grid'))}><Layers size={17} /><span><b>{s.name}</b><small>{s.mode === 'linked' ? 'Linked to your records' : 'Freeform sheet'}</small></span><ArrowRight size={14} /></button>)}</section>
        <section><Label>QUICK CREATE</Label>{quickCreate.map(item => <button key={item.label} onClick={() => closeThen(item.run)}><Plus size={17} /><span><b>{item.label}</b><small>{query.trim() ? `Named “${query.trim()}”` : 'Create and open'}</small></span><ArrowRight size={14} /></button>)}</section>
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

/**
 * Explicit sign in / sign out control.
 *
 * Signing out clears every locally cached Aetheris record so the next person
 * on this device can never see the previous member's network.
 */
function AccountControl() {
  const { access } = useAccess()
  const [busy, setBusy] = useState(false)

  if (access.loading) return null

  if (!access.signedIn) {
    return <><a className="topbar-auth" href="/auth" title="Members log in"><LogIn size={13} /><span>Log in</span></a>
      <a className="topbar-auth" href="/early-access" title="Launching soon — join the whitelist for a founding place">
      <span>Join whitelist</span></a></>
  }


  const signOut = async () => {
    setBusy(true)
    await signOutMember('/auth')
  }

  return <button className="topbar-auth" disabled={busy} title={access.email ? `Signed in as ${access.email}` : 'Sign out'}
    onClick={() => { void signOut() }}>
    <LogOut size={13} /><span>{busy ? 'Signing out…' : 'Sign out'}</span></button>
}

/* ---------------------------------------------------------------------- app */

export function AetherisAppSurface({ startPage, feedOnly = false }: { startPage?: Page | undefined; feedOnly?: boolean }) {
  return <Shell startPage={startPage} feedOnly={feedOnly} />
}

export default function App({ startPage, mode = 'live', feedOnly = false }: { startPage?: Page | undefined; mode?: NetworkMode; feedOnly?: boolean }) {
  return <AetherisProviderRoot mode={mode}><AetherisAppSurface startPage={startPage} feedOnly={feedOnly} /></AetherisProviderRoot>
}

/** Ask Intros butler + capability workspace, mounted natively on the new shell. */
/** What the live shell lets the assistant (and voice mode) do. */
export interface AssistantShellApi {
  /** Go to a shell page (home, people, intros…) or any workspace tool (events, crm, settings…). */
  onNavigate: (page: string) => void
  onOpenMember?: (id: string) => void
  onMessageMember?: (id: string) => void
  onRequestIntro?: (id: string) => void
  onSearch?: (text: string) => void
}

export function AetherisAssistantSurface({ page, ...api }: { page: string } & AssistantShellApi) {
  return <AssistantLayer page={page} {...api} />
}

export function AetherisAssistant({ mode = 'live', page, ...api }: { mode?: NetworkMode; page: string } & AssistantShellApi) {
  return <AetherisProviderRoot mode={mode}><AetherisAssistantSurface page={page} {...api} /></AetherisProviderRoot>
}

function AssistantLayer({ page, onNavigate, onOpenMember, onMessageMember, onRequestIntro, onSearch }: { page: string } & AssistantShellApi) {
  const net = useNetwork()
  const people = net.members
  const find = (name: string | null) => {
    if (!name) return null
    const needle = name.toLowerCase()
    return people.find(p => p.name.toLowerCase() === needle) ?? people.find(p => p.name.toLowerCase().includes(needle)) ?? null
  }
  const shellPages: Record<string, string> = { home: 'home', network: 'bubbles', people: 'people', discover: 'people', intros: 'intros', messages: 'messages', news: 'news', insights: 'insights' }
  useEffect(() => {
    const go = () => onNavigate('workspace')
    window.addEventListener('aetheris:navigate', go)
    return () => window.removeEventListener('aetheris:navigate', go)
  }, [onNavigate])
  const run = (action: AskIntrosAction): string | null => {
    switch (action.kind) {
      case 'navigate': {
        const target = action.page ?? ''
        if (!target) return null
        onNavigate(shellPages[target] ?? target)
        const label = VOICE_PAGES.find(v => v.page === target)?.label ?? metaById[target as Page]?.label ?? target
        return `Opened ${label}`
      }
      case 'open-member': case 'message-member': case 'request-intro': {
        const person = find(action.value)
        if (!person) return null
        if (action.kind === 'open-member') { if (onOpenMember) onOpenMember(person.id); else onNavigate('people'); return `Opened ${person.name}` }
        if (action.kind === 'message-member') { if (onMessageMember) onMessageMember(person.id); else onNavigate('messages'); return `Opened messages for ${person.name}` }
        if (onRequestIntro) { onRequestIntro(person.id); return `Started an introduction request to ${person.name}` }
        onNavigate('intros'); return 'Opened introductions'
      }
      case 'open-search': case 'open-tools': {
        if (onSearch) { onSearch(action.value ?? ''); return action.value ? `Searched members for “${action.value}”` : 'Opened member search' }
        onNavigate('people'); return 'Opened people'
      }
      case 'post-need': onNavigate('needs'); return action.value ? `Opened the ask composer — describe “${action.value}”` : 'Opened asks'
      case 'open-profile': onNavigate('profile'); return 'Opened your profile'
      case 'open-preferences': onNavigate('preferences'); return 'Opened settings'
      case 'capture-conversation': onNavigate('memory'); return 'Opened Memory'
      case 'read-page': {
        const passages = currentPagePassages()
        if (!passages.length) return null
        readAloud(passages, 'Reading this page')
        return 'Reading this page to you'
      }
      case 'stop-reading': stopReading(); return 'Stopped reading'
      case 'voice-off': setVoiceSettings({ speakReplies: false, conversation: false }); stopReading(); return 'Spoken replies off'
      case 'voice-on': setVoiceSettings({ speakReplies: true }); return 'Spoken replies on'
      case 'text-size': { const v = action.value as TextScale | null; if (!v || !textScales.includes(v)) return null; setTextScale(v); return `Text size set to ${v}` }
      case 'cursor-size': { const v = action.value as CursorScale | null; if (!v || !cursorScales.includes(v)) return null; setCursorScale(v); return `Pointer size set to ${v}` }
      default: return null
    }
  }
  return <div className="ix-assistant">
    <VoiceBar />
    <SelectionReader />
    <CapabilityWorkspaceHost />
    <AskIntrosDock page={page} peopleNames={people.map(p => p.name)} memberName={net.profile.name}
      briefing={false} contextPanel={false} run={run} />
  </div>
}



/* --------------------------------------------------------------------- hubs */

function MyTrustPassport() {
  const graph = useGraph()
  return graph.userId ? <TrustPassportSummary memberId={graph.userId} own /> : <p>Sign in to see your verification passport.</p>
}

function HubPrelude({ kind, onNavigate }: { kind: 'network' | 'work' | 'me'; onNavigate: (page: Page) => void }) {
  const net = useNetwork()
  const ops = useOps()
  const { verification } = useVerification()
  if (kind === 'network') {
    const lead = [...net.members].sort((a, b) => b.scoreTotal - a.scoreTotal)[0]
    return <section className="hub-prelude network-prelude">
      <TileShell label="PEOPLE WHO MATTER" title={lead?.name ?? 'Your trusted network starts here.'} variant="hero">
        <RadarMini values={net.members.slice(0, 5).map(member => member.scoreTotal)} />
        <p>{lead?.whyNow ?? 'Discover verified members through context, not vanity metrics.'}</p>
      </TileShell>
      <TileShell label="WARM PATHS" title={`${net.connections.length} trusted connections`} variant="graph"><SignalPath points={5} active={Math.min(4, net.connections.length)} /></TileShell>
      <TileShell label="INTRODUCTIONS" title="Why me. Why them. Why now." variant="action"><p>Every request stays double opt-in and carries the evidence for timing.</p><button className="tile-cta" onClick={() => onNavigate('intros')}>Review introductions <ArrowRight size={14} /></button></TileShell>
      <TileShell label="WHO CAN CHANGE THIS?" title="Name the problem. See who can move it." variant="action"><p>Ranked from people actually available to you, with the evidence, the warmest path and one next move.</p><button className="tile-cta" onClick={() => openCeo({ view: 'who' })}>Who can change this? <ArrowRight size={14} /></button></TileShell>
      <TileShell label="NETWORK ROI" title="What intros produced." variant="data"><p>Accepted intros, meetings, linked and won deals — value only when it is recorded.</p><button className="tile-cta" onClick={() => openCeo({ view: 'roi' })}>Open Network ROI <ArrowRight size={14} /></button></TileShell>
      <InsightBar where="network" />
    </section>
  }
  if (kind === 'work') {
    const active = ops.opportunities.filter(item => !item.archived && item.status === 'open')
    const tasks = ops.tasks.filter(item => item.status !== 'done' && item.status !== 'cancelled')
    return <section className="hub-prelude work-prelude">
      <TileShell label="ONE OPERATING SYSTEM" title="Records become movement." variant="hero"><div className="work-flow"><span>CRM</span><i /><span>PIPELINE</span><i /><span>GRID</span><i /><span>TIME</span></div><p>Every view reads and updates the same private working record.</p></TileShell>
      <TileShell label="PIPELINE" title={`${active.length} active`} variant="data"><div className="pipeline-mini">{ops.stages.slice(0, 5).map(stage => <span key={stage.id}><i style={{ height: `${Math.max(10, active.filter(item => item.stageId === stage.id).length * 22)}px` }} /><b>{stage.name}</b></span>)}</div></TileShell>
      <TileShell label="OPEN LOOPS" title={`${tasks.length} tasks`} variant="action"><p>Tasks stay connected to the people, companies and work that created them.</p></TileShell>
      <WorkCeoBar />
      <InsightBar where="work" />
    </section>
  }
  const verified = verification.status === 'verified'
  return <section className="hub-prelude me-prelude">
    <TileShell label="MY EXECUTIVE IDENTITY" title={net.profile.name || 'Complete your identity'} variant="hero"><p>{net.profile.title || 'Add your role'}{net.profile.company ? ` · ${net.profile.company}` : ''}</p><div className={`verification-mark ${verified ? 'verified' : ''}`}><ShieldCheck size={18} /> {verified ? badgeLabel(verification.verifiedRole) : 'Verification required'}</div></TileShell>
    <TileShell label="VISIBILITY" title="You control the context." variant="data"><div className="lock-stack" aria-hidden="true"><i /><i /><i /></div><p>Privacy, permissions and double opt-in remain enforced underneath every view.</p></TileShell>
    <TileShell label="CONNECTED SYSTEMS" title="Bring context, not chaos." variant="action"><p>Review the services connected to your private relationship system.</p><button className="tile-cta" onClick={() => onNavigate('integrations')}>Connected apps <ArrowRight size={14} /></button></TileShell>
    <TileShell label="TRUST + APPROVALS" title="Your passport and your queue." variant="data"><MyTrustPassport /><button className="tile-cta" onClick={() => openCeo({ view: 'approvals' })}>Approval queue <ArrowRight size={14} /></button></TileShell>
  </section>
}

function Hub({ storeKey, title, blurb, tabs, advanced, onNavigate, kind }: {
  storeKey: string; title: string; blurb: string
  tabs: Array<{ id: Page; label: string; node: ReactNode }>; kind: 'network' | 'work' | 'me'
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
    {kind === 'work' && <section className="work-editorial-masthead"><div><HomeBrand /><Label>PRIVATE EXECUTIVE WORKSPACE</Label><h1>Turn relationships<br />into <em>movement.</em></h1><p>CRM, pipeline, Grid, calendar and forecast share one canonical working record—with relationship context beside the work.</p></div><figure><img src={needsEditorialAsset.url} alt="Executive reviewing consequential work in architectural light" /><figcaption><Label signal>ONE OPERATING SYSTEM</Label><p>People. Commitments. Opportunities. Time.</p></figcaption></figure></section>}
    <header className={`hub-head ${kind}-hub-head`}>
      <div><Label>{title.toUpperCase()}</Label><h1>{blurb}</h1></div>
      <p>{metaById[current.id]?.blurb}</p>
    </header>
    <HubPrelude kind={kind} onNavigate={onNavigate} />
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

function MessageHub({ people, select, activeId, setActiveId }: { people: Member[]; select: (member: Member) => void; activeId: string; setActiveId: (id: string) => void }) {
  const net = useNetwork()
  return <div className="core-hub messages-hub">
    <HubIntro label="PRIVATE COMMUNICATION" title={<>Conversations with<br /><em>relationship context.</em></>} copy="Threads, introductions, meetings and commitments stay together—so a message never arrives without the history that gives it meaning." aside={<div className="hub-now"><strong>{net.threads.filter(thread => thread.unread).length}</strong><span>unread<br />conversations</span></div>} />
    <div className="message-context-line"><span>PRIVATE THREADS</span><i /><span>INTRO CONTEXT</span><i /><span>OPEN LOOPS</span><i /><span>FOLLOW-UP</span></div>
    <Messages people={people} select={select} activeId={activeId} setActiveId={setActiveId} />
  </div>
}

/** Read the page you are on — or just what you highlighted — from the top bar. */
function TopbarVoice() {
  const [speaking, setSpeaking] = useState(false)
  useEffect(() => {
    const timer = window.setInterval(() => setSpeaking(readerSnapshot().state !== 'idle'), 400)
    return () => window.clearInterval(timer)
  }, [])
  const [voice] = useVoiceSettings()
  if (!voiceOutputSupported() || !voice.readAloud) return null
  return <button className={`topbar-voice ${speaking ? 'active' : ''}`} data-voice-skip="true"
    aria-label={speaking ? 'Stop reading aloud' : 'Read this page aloud'}
    title={speaking ? 'Stop reading aloud' : 'Read this page aloud — or highlight text first'}
    onClick={() => { if (speaking) { stopReading(); setSpeaking(false) } else { readPageOrSelection(); setSpeaking(true) } }}>
    {speaking ? <VolumeX size={15} /> : <Volume2 size={15} />}
  </button>
}

function Shell({ startPage, feedOnly = false }: { startPage?: Page | undefined; feedOnly?: boolean }) {
  const net = useNetwork()
  const stored = typeof window !== 'undefined' ? localStorage.getItem('aetheris-intros-page') : null
  const initial = startPage ?? (stored && allNav.some(n => n.id === stored) ? stored : legacyPage[stored ?? ''] ?? 'home') as Page
  const [page, setPageState] = useState<Page>(initial)
  const [topMenuOpen, setTopMenuOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
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
  const setPage = (p: Page) => { setSelected(null); setPageState(p === 'dealrooms' ? 'deals' : p) }
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

  const addNeed = async (o: Objective) => {
    await net.addAsk({ ask: o.title, detail: o.outcome, whyNow: o.whyNow, offer: o.valueOffer, industry: 'Cross-industry', location: me.location, urgency: 'high', visibility: 'network' })
    net.addObjective(o)
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

  /** Ask Intros operates the product: every action it may take runs through here. */
  const runAssistantAction = (action: AskIntrosAction): string | null => {
    const find = (name: string | null) => {
      if (!name) return null
      const needle = name.toLowerCase()
      return people.find(p => p.name.toLowerCase() === needle)
        ?? people.find(p => p.name.toLowerCase().includes(needle)) ?? null
    }
    switch (action.kind) {
      case 'navigate': {
        const aliases: Record<string, Page> = { people: 'discover' as Page }
        const target = (aliases[action.page ?? ''] ?? action.page) as Page | null
        if (!target || !allNav.some(n => n.id === target)) return null
        setPage(target)
        return `Opened ${metaById[target]?.label ?? target}`
      }
      case 'text-size': {
        const value = action.value as TextScale | null
        if (!value || !textScales.includes(value)) return null
        setTextScale(value)
        return `Text size set to ${value}`
      }
      case 'cursor-size': {
        const value = action.value as CursorScale | null
        if (!value || !cursorScales.includes(value)) return null
        setCursorScale(value)
        return `Pointer size set to ${value}`
      }
      case 'open-deals': setPage('deals'); return 'Opened Deals'
      case 'start-deal': {
        // Prefills the form only; the member checks it and presses Create.
        const person = find(action.value)
        if (!person) return null
        queueDealDraft({ sourceKind: 'manual', sourceId: null, title: draftTitle('manual', person.name), need: '', counterpartId: person.id, counterpartName: person.name })
        setPage('deals')
        return `Opened a new deal room with ${person.name} — check it and press Create deal room to open it`
      }
      case 'open-tools': setGlobalSearchOpen(true); return 'Opened capability search'
      case 'open-search': setGlobalSearchOpen(true); return 'Opened search'
      case 'post-need': setNeedOpen(true); return 'Opened the need composer'
      case 'post-intent': setIntentOpen(true); return 'Opened live intent'
      case 'capture-conversation': setCaptureOpen(true); return 'Opened conversation capture'
      case 'toggle-briefing': briefing.toggle(); return briefing.on ? 'Briefing mode off' : 'Briefing mode on'
      case 'toggle-context': setContextOpen(value => !value); return contextOpen ? 'Context rail hidden' : 'Context rail shown'
      case 'open-profile': setPage('me'); return 'Opened Me'
      case 'open-preferences': setPage('me'); return 'Opened Me controls'
      case 'open-member': {
        const person = find(action.value)
        if (!person) return null
        setSelected(person)
        return `Opened ${person.name}`
      }
      case 'message-member': {
        const person = find(action.value)
        if (!person) return null
        messageMember(person.id)
        return `Opened your conversation with ${person.name}`
      }
      case 'request-intro': {
        const person = find(action.value)
        if (!person) return null
        setSelected(person)
        return `Opened ${person.name} — press Request intro to send it`
      }
      case 'read-page': {
        const passages = currentPagePassages()
        if (!passages.length) return null
        readAloud(passages, 'Reading this page')
        return 'Reading this page to you'
      }
      case 'stop-reading': stopReading(); return 'Stopped reading'
      case 'voice-off': setVoiceSettings({ speakReplies: false, conversation: false }); stopReading(); return 'Spoken replies off'
      case 'voice-on': setVoiceSettings({ speakReplies: true }); return 'Spoken replies on'
      default: return null
    }
  }


  const pageNode: Partial<Record<Page, ReactNode>> = {
       home: <PremiumHome people={people} select={setSelected} setPage={setPage} openNeed={() => setNeedOpen(true)} openThread={goToThread} />,
      network: <><NetworkBubbles people={people} select={setSelected} /><Discover people={people} select={setSelected} /></>,
      discover: <Discover people={people} select={setSelected} />,
      systems: <SystemsPage openId={systemId} setOpenId={setSystemId} />,
      circles: <CirclesPage openId={circleId} setOpenId={setCircleId} />,
      companies: <CompaniesPage openId={companyId} setOpenId={setCompanyId} />,
      outcomes: <><div className="og-stack"><ForecastConfidencePanel /><NetworkRoiPanel /></div><OutcomesPage /></>,
      loops: <LoopsPage />,
      organization: <><OrganizationPage /><div className="og-stack"><LeakCheckPanel /><CompanyWorkspacePanel /><OrganizationRelationshipView /><DelegatesPanel /></div></>,
      intros: <Intros people={people} select={setSelected} draft={setDraft} />,
      messages: <MessageHub people={people} select={setSelected} activeId={threadId} setActiveId={setThreadId} />,
      meetings: <MeetingsPage />,
      peergroups: <PeerGroupsPage />,
      providers: <ProvidersPage />,
      warmpaths: <WarmPathsPage />,
      workspaces: <WorkspacesPage />,
      executivework: <ExecutiveWorkPage />,
      needs: <><IntentExchangePanel /><Needs onNew={() => setNeedOpen(true)} people={people} select={setSelected} setPage={setPage} /><IntentBoard /></>,
      memory: <Memory people={people} select={setSelected} />,
      events: <EventsPage />,
      calendar: <><CalendarMeetingBar /><CalendarPage /></>,
      insights: <Insights people={people} select={setSelected} setPage={setPage} />,
      profile: <><InviteCard /><Profile people={people} setPage={setPage} openOnboarding={() => setOnboardOpen(true)} /></>,
      preferences: <PreferencesPage />,
      inbox: <RelationshipInboxPage />,
      rooms: <OpportunityRoomsPage openId={roomId} setOpenId={setRoomId} />,
      collisions: <CollisionsPage />,
      simulation: <SimulationPage />,
      strategy: <StrategyPage />,
      evidence: <EvidenceLedgerPage />,
      agentinbox: <AgentInboxPage />,
      autopilot: <><div className="og-stack"><section className="og-tile"><h3>Approval queue</h3><ApprovalQueuePanel /></section><DigitalYouRulesPanel /></div><AutopilotPage /></>,
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
      passport: <><div className="og-stack"><PassportManager /></div><PassportPage /></>,
      opportunities: <OpportunitiesPage />,
      deals: <DealsPage />,
      dealrooms: <DealsPage />,
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
      simple: <SimpleViewPage />,
      crm: <CrmPage />,
      pocket: <PocketWorkspace />,
      diagnostic: <><LeakCheckPanel /><CompanyDiagnosticReport /></>,
      grid: <GridPage />,
      news: <NewsPage />,
    }
  const hubLabel: Partial<Record<Page, string>> = {
    discover: 'People', opportunities: 'Pipeline', outcomes: 'Forecast', rooms: 'Rooms', deals: 'Deals',
    profile: 'Identity', passport: 'Passport', permission: 'Privacy', preferences: 'Controls', integrations: 'Apps',
  }
  const hubTabs = (ids: Page[]) => ids.flatMap(id => {
    const node = pageNode[id]
    return node ? [{ id, label: hubLabel[id] ?? metaById[id]?.label ?? id, node }] : []
  })
  const content = selected
    ? <ExecutivePage person={selected} onClose={() => setSelected(null)} onIntro={p => { setSelected(null); setDraft(p) }} onMessage={messageMember} />
    : page === 'work'
        ? <Hub storeKey="aetheris.hub.work" title="Work" blurb="One system for relationships, movement and time."
            tabs={hubTabs(workTabs)} advanced={workAdvanced} onNavigate={setPage} kind="work" />
        : page === 'me'
          ? <Hub storeKey="aetheris.hub.me" title="Me" blurb="Your executive identity and your controls."
              tabs={hubTabs(meTabs)} advanced={meAdvanced} onNavigate={setPage} kind="me" />
          : pageNode[page]

  useGrabScroll()
  useEffect(() => { applyTextScale(readTextScale()) }, [])
  useEffect(() => { applyCursorScale(readCursorScale()) }, [])

  useEffect(() => { rememberRecent(page) }, [page])
  useEffect(() => {
    const go = (e: Event) => { const p = (e as CustomEvent<Page>).detail; if (p) { setSelected(null); setPage(p) } }
    window.addEventListener('aetheris:navigate', go)
    return () => window.removeEventListener('aetheris:navigate', go)
  }, [])
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }) }, [page, selected?.id])

  return <NavCtx.Provider value={navApi}>
    <div className={`app-shell social-shell ${feedOnly ? 'home-social-only' : ''} ${contextOpen ? 'show-context' : ''}`}>
      <header className="social-topnav">
        <button className="social-brand" onClick={() => setPage('home')} aria-label={isShowcase() ? 'Ask Intros Home — Demo' : 'Ask Intros Home'}><Brand />{isShowcase() && <span className="demo-flag">Demo</span>}</button>
        <nav aria-label="Primary navigation">{nav.map(item => {
          const Icon = item.icon
          return <button key={item.id} className={page === item.id ? 'active' : ''} title={item.label} onClick={() => setPage(item.id)}>
            <Icon size={18} /><span>{item.label}</span></button>
        })}</nav>
        <button className="social-nav-search" aria-label="Search" onClick={() => setGlobalSearchOpen(true)}><Search size={17} /><span>Search</span><kbd>⌘K</kbd></button>
        <div className="social-nav-actions"><button className="icon-btn" onClick={() => setNotificationsOpen(true)} aria-label="Notifications"><Bell size={18} /></button><button className="icon-btn" onClick={() => window.dispatchEvent(new CustomEvent('aetheris:open-assistant'))} aria-label="Ask Intros"><AetherisGlyph size={18} /></button><button className={`icon-btn ${moreOpen ? 'active' : ''}`} onClick={() => setMoreOpen(true)} aria-label="More"><Settings2 size={18} /></button><AccountControl /><button className="topbar-avatar" aria-label="Your profile" onClick={() => setPage('me')}><SelfAvatar /></button></div>
      </header>
      <div className="workspace">
        <header className="topbar">
          <span className="topbar-title">Ask Intros <i>/</i> {metaById[page]?.label ?? allNav.find(n => n.id === page)?.label}</span>
          <div className="topbar-actions">
            {isShowcase() && <span className="demo-flag demo-flag-mobile">Demo</span>}
            <button className="topbar-search" aria-label="Search people, companies, topics, or ideas…" onClick={() => setGlobalSearchOpen(true)}><Search size={15} /><span>Search people, companies, topics, or ideas…</span><kbd>⌘K</kbd></button>
            <TopbarVoice />
            <div className="topbar-dropdown">
              <button className="topbar-dropbtn" aria-label="Actions" aria-expanded={topMenuOpen} onClick={() => setTopMenuOpen(!topMenuOpen)}>
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
                  <button role="menuitem" onClick={() => { setPage('me'); setTopMenuOpen(false) }}><UserRound size={14} /> Me</button>
                  <button role="menuitem" onClick={() => { setPage('preferences'); setTopMenuOpen(false) }}><Settings2 size={14} /> Preferences</button>
                </div>
              </>}
            </div>
            <button className="icon-btn mobile-notifications" onClick={() => setNotificationsOpen(true)} aria-label="Notifications"><Bell size={18} /></button>
            <button className="icon-btn mobile-more" onClick={() => setMoreOpen(true)} aria-label="More"><Settings2 size={18} /></button>
          </div>

        </header>
        <div className="workspace-grid">
          <main className="content">
            {briefing.on && <BriefingPanel key={page} page={page} />}
            {feedOnly ? <EditorialFeed /> : content}
          </main>
          {contextOpen && <ContextRail page={page} people={people} select={setSelected} onAsk={() => setAskOpen(true)} />}
        </div>
      </div>
       <nav className="mobile-nav">
         {(['home', 'network', 'messages', 'news', 'work', 'me'] as Page[]).map(id => {
          const meta = metaById[id]!
          const Icon = meta.icon
          return <button key={id} className={page === id ? 'active' : ''} onClick={() => setPage(id)}><Icon size={18} /><span>{meta.label}</span></button>
        })}
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
      <NotificationsDrawer open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
      <VoiceBar />
      <SelectionReader />
      <CeoHost />
      <CapabilityWorkspaceHost />
      <AskIntrosDock page={page} peopleNames={people.map(p => p.name)} memberName={me.name}
        briefing={briefing.on} contextPanel={contextOpen} run={runAssistantAction} />
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
