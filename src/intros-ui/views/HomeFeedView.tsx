// @ts-nocheck
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Users,
  Bookmark,
  Share2,
  MessageSquare,
  ThumbsUp,
  TrendingUp,
  Calendar,
  Sparkles,
  ArrowRight,
  Briefcase,
  Layers,
  Globe,
  PlusCircle,
  CheckCircle2,
  Image as ImageIcon,
  Video,
  FileText,
  Paperclip,
  Pin,
  PinOff,
  Maximize2,
} from 'lucide-react';
import { FeedPost, UPCOMING_EVENTS, SUGGESTED_CIRCLES, TRENDING_SECTORS, NetworkMember } from '../networkData';
import { ExecutivePortrait } from '../components/shared/ExecutivePortrait';
import { ConstellationGraphic } from '../components/shared/ConstellationGraphic';
import { RelationshipFieldGraph } from '../components/shared/RelationshipFieldGraph';
import { ActivePage } from '../components/layout/TopNavigation';
import { DraggableWidgetGrid, type WidgetItem } from '@/components/ui/widget-board';

const widgetIds = new Set(['network','explore','introduce','need','ask','sectors','events','circles','whynow','people','offers','conversations','saved','updates','profile']);

interface HomeFeedViewProps {
  posts: FeedPost[];
  isLive?: boolean;
  socialFeed?: React.ReactNode;
  actionQueue?: React.ReactNode;
  onNavigate: (page: ActivePage, memberId?: string) => void;
  onRequestIntro: (member: NetworkMember) => void;
  onLikePost: (postId: string) => void;
  onSavePost: (postId: string) => void;
  onAddPost: (content: string, badge?: FeedPost['badge']) => void;
  networkMembers: NetworkMember[];
  me?: { name: string; avatarUrl?: string } | null;
}

export const HomeFeedView: React.FC<HomeFeedViewProps> = ({
  posts,
  onNavigate,
  onRequestIntro,
  onLikePost,
  onSavePost,
  onAddPost,
  networkMembers,
  me,
  isLive = false,
  socialFeed,
  actionQueue,
}) => {
  const [feedFilter, setFeedFilter] = useState<'forYou' | 'network' | 'following' | 'trending'>('forYou');
  const [composerText, setComposerText] = useState('');
  const [composerType, setComposerType] = useState<FeedPost['badge']>('Insight');
  const [eventsList, setEventsList] = useState(UPCOMING_EVENTS);
  const [circlesList, setCirclesList] = useState(SUGGESTED_CIRCLES);

  // Spotlight member for "Who to Meet This Week"
  const elena = networkMembers.find((m) => m.id === 'elena-rossi') || networkMembers[2];
  const [heroVisualMode, setHeroVisualMode] = useState<'bubbles' | 'spotlight'>('bubbles');

  const [comments, setComments] = useState<Record<string, string[]>>({});
  const [commenting, setCommenting] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const visiblePosts = feedFilter === 'trending' ? [...posts].sort((a, b) => b.likes - a.likes) : feedFilter === 'network' ? posts.filter(post => networkMembers.some(member => member.id === post.authorId)) : feedFilter === 'following' ? posts.filter(post => post.isSaved) : posts;
  const portraitIds = new Set<string>(['sarah-chen', ...(heroVisualMode === 'spotlight' && elena ? [elena.id] : [])]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composerText.trim() && attachments.length === 0) return;
    const names = attachments.map((f) => `📎 ${f.name}`).join('\n');
    onAddPost([composerText.trim(), names].filter(Boolean).join('\n'), composerType);
    setComposerText('');
    setAttachments([]);
  };

  const toggleEventRegistration = (eventId: string) => {
    setEventsList((prev) =>
      prev.map((ev) => (ev.id === eventId ? { ...ev, isRegistered: !ev.isRegistered } : ev))
    );
  };

  const toggleCircleJoin = (circleId: string) => {
    setCirclesList((prev) =>
      prev.map((c) => (c.id === circleId ? { ...c, isJoined: !c.isJoined } : c))
    );
  };

  const defaultBoard: WidgetItem[] = [
    { id: 'network', size: 'sm', label: 'Your Network card' },
    { id: 'explore', size: 'sm', label: 'Explore card' },
    { id: 'introduce', size: 'sm', label: 'Introduce a colleague callout' },
    { id: 'need', size: 'sm', label: 'What do you need right now' },
    { id: 'ask', size: 'sm', label: 'Ask Intros' },
    { id: 'sectors', size: 'sm', label: 'Trending Sectors' },
    { id: 'events', size: 'wide', label: 'Upcoming Business Events' },
    { id: 'circles', size: 'sm', label: 'Suggested Circles' },
    { id: 'whynow', size: 'sm', label: 'Why now' },
    ...['people','offers','conversations','saved','updates','profile'].map(id => ({ id, size: 'sm' as const, label: id }))
  ];
  const [boardItems, setBoardItems] = useState<WidgetItem[]>(defaultBoard);
  const [boardPinned, setBoardPinned] = useState(false);
  React.useEffect(() => {
    try { setBoardPinned(localStorage.getItem('intros.home.board.pinned') === 'true'); } catch {}
    const readBoard = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('intros.home.board.v2') || 'null');
      if (Array.isArray(saved)) {
        const seen = new Set<string>();
        const valid = saved.filter(item => widgetIds.has(item.id) && !seen.has(item.id) && seen.add(item.id)).map(item => ({ ...defaultBoard.find(entry => entry.id === item.id), size: ['sm', 'wide', 'tall', 'lg'].includes(item.size) ? item.size : 'sm' }));
        return [...valid, ...defaultBoard.filter(item => !seen.has(item.id))];
      }
    } catch {}
    return defaultBoard;
    };
    setBoardItems(readBoard());
  }, []);
  const [narrow, setNarrow] = useState(false);
  React.useEffect(() => { const q = window.matchMedia('(max-width: 640px)'); const f = () => setNarrow(q.matches); f(); q.addEventListener('change', f); return () => q.removeEventListener('change', f); }, []);
  const saveBoard = (next: WidgetItem[]) => { setBoardItems(next); try { localStorage.setItem('intros.home.board.v2', JSON.stringify(next)); } catch {} };
  const boardPeople = networkMembers.filter(member => member.name !== me?.name);
  const topics = [...new Set(boardPeople.flatMap(member => member.focusAreas || []))].slice(0, 5);
  const goals = boardPeople.filter(member => member.currentObjectives?.length).slice(0, 3);
  const savedPosts = posts.filter(post => post.isSaved);
  const jumpToSocial = () => document.getElementById('home-social-board')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const tile = (label: string, title: string, content: React.ReactNode, action: string, run: () => void) => (
    <div className="home-board-tile">
      <span className="home-board-label">{label}</span><h3>{title}</h3>
      <div className="home-board-content">{content}</div>
      <Button variant="ghost" size="sm" className="home-board-link" onClick={run}>{action}<ArrowRight /></Button>
    </div>
  );
  const personRows = (people: NetworkMember[], detail: (member: NetworkMember) => string) => people.map(member => (
    <Button key={member.id} variant="ghost" className="home-board-person" onClick={() => onNavigate('profile', member.id)}>
      <span className="home-board-initials">{member.name.split(' ').map(part => part[0]).join('').slice(0, 2)}</span>
      <span><b>{member.name}</b><small>{detail(member)}</small></span><ArrowRight />
    </Button>
  ));
  const widgets: Record<string, React.ReactNode> = {
    network: tile('Your network', 'People, not contacts.', <><p>{boardPeople.length} people in this directory. Relationships begin with shared context.</p>{personRows(boardPeople.slice(0, 2), member => [member.title, member.company].filter(Boolean).join(' · '))}</>, 'Meet your network', () => onNavigate('people')),
    explore: tile('Explore', 'Find common ground.', <><p>See who is building, investing or advising in your areas of interest.</p><div className="home-board-tags">{topics.slice(0, 4).map(topic => <span key={topic}>{topic}</span>)}</div><p>{new Set(boardPeople.map(member => member.location).filter(Boolean)).size} locations represented</p></>, 'Discover people', () => onNavigate('people')),
    introduce: tile('Warm introductions', 'Make the right connection.', <><p>Bring two people together around a specific need, with context and consent on both sides.</p>{personRows(boardPeople.filter(member => member.openToIntros).slice(0, 2), member => member.introStatusText || 'Open to introductions')}</>, 'Review introductions', () => onNavigate('intros')),
    need: tile('Looking for', 'What would move you forward?', <><p>A useful ask names the person, the problem and why now.</p><div className="home-board-tags">{['Hiring', 'Customers', 'Capital', 'Advisors'].map(topic => <span key={topic}>{topic}</span>)}</div><p>Give your network something specific to respond to.</p></>, 'Share an ask', jumpToSocial),
    ask: tile('Ask Intros', 'Context before the next move.', <><p>Who can help with your current focus? Which relationship deserves attention?</p><blockquote>“Who in my network has experience with my next market?”</blockquote><p>Your people and recorded context, in one conversation.</p></>, 'Ask your butler', () => window.dispatchEvent(new CustomEvent('aetheris:open-assistant'))),
    sectors: tile('Shared interests', 'Inside your network.', <><p>Areas members have included in their profiles.</p><div className="home-board-list">{topics.map(topic => <div key={topic}><span>{topic}</span><b>{boardPeople.filter(member => member.focusAreas?.includes(topic)).length}</b></div>)}</div>{!topics.length && <p>No focus areas shared yet.</p>}</>, 'Explore interests', () => onNavigate('people')),
    events: tile('Events & conversations', 'Take the relationship beyond the feed.', isLive ? <><p>Upcoming gatherings belong here when they have been added to your account.</p><p>No event schedule is connected to this board yet.</p></> : <div className="home-board-list">{eventsList.map(event => <div key={event.id}><span><b>{event.title}</b><small>{event.dateMonth} {event.dateDay} · {event.location}</small></span><Button variant="outline" size="sm" aria-pressed={event.isRegistered} onClick={() => toggleEventRegistration(event.id)}>{event.isRegistered ? 'Registered' : 'Register'}</Button></div>)}</div>, isLive ? 'Open your workspace' : 'Meet the attendees', () => onNavigate(isLive ? 'workspace' : 'people')),
    circles: tile('Shared circles', 'A smaller room. Better context.', isLive ? <><p>Gather people around a shared interest or a real decision.</p><p>No circle membership has been loaded into this board.</p></> : <div className="home-board-list">{circlesList.slice(0, 3).map(circle => <div key={circle.id}><span><b>{circle.name}</b><small>{circle.count}</small></span><Button size="sm" variant="outline" aria-pressed={circle.isJoined} onClick={() => toggleCircleJoin(circle.id)}>{circle.isJoined ? 'Joined' : 'Join'}</Button></div>)}</div>, 'Explore your workspace', () => onNavigate('workspace')),
    whynow: tile('Active memory', 'Keep the context alive.', <><p>The last conversation. A current goal. The promise you made.</p><blockquote>Know who matters. Know why now.</blockquote><p>Return to the details that make your next message personal.</p></>, 'Open Memory', () => onNavigate('memory')),
    people: tile('People to know', 'Start with a real person.', <>{personRows(boardPeople.slice(2, 5), member => [member.company, member.location].filter(Boolean).join(' · '))}{!boardPeople.length && <p>Member profiles appear here as people join.</p>}</>, 'See all people', () => onNavigate('people')),
    offers: tile('Current focus', 'Where you could help.', <>{personRows(goals, member => member.currentObjectives[0])}{!goals.length && <p>No current objectives have been shared yet.</p>}</>, 'Find shared goals', () => onNavigate('people')),
    conversations: tile('Messages', 'Pick up the conversation.', <><p>Private, person-to-person conversations with the context close by.</p>{personRows(boardPeople.slice(0, 2), member => member.bioStatement || [member.title, member.company].filter(Boolean).join(' · '))}</>, 'Open Messages', () => onNavigate('messages')),
    saved: tile('Saved for later', 'Keep the useful things.', isLive ? <><p>Return to the updates you saved in your network.</p><p>Your saved member signals stay in your private account.</p></> : <><p>{savedPosts.length} saved {savedPosts.length === 1 ? 'post' : 'posts'} on this board.</p>{savedPosts.slice(0, 2).map(post => <blockquote key={post.id}>{post.authorName}: {post.content.slice(0, 100)}</blockquote>)}{!savedPosts.length && <p>Save a member update when you want to return with a thoughtful reply.</p>}</>, 'Read the Social Board', jumpToSocial),
    updates: tile('Network dispatch', 'What people are sharing.', <>{posts.slice(0, 2).map(post => <div key={post.id} className="home-board-update"><b>{post.authorName}</b><small>{post.timeAgo} · {post.badge || 'Update'}</small><p>{post.content.slice(0, 130)}{post.content.length > 130 ? '…' : ''}</p></div>)}{!posts.length && <p>Member updates live on the Social Board below. Be the first to share what you are working on.</p>}</>, 'Join the conversation', jumpToSocial),
    profile: tile('Your identity', me?.name || 'Make yourself known.', <><p>What you are building. Who you can help. What you need next.</p><div className="home-board-tags"><span>Current focus</span><span>Looking for</span><span>Can help with</span></div><p>Give people a reason to start a meaningful conversation.</p></>, isLive ? 'Open my profile' : 'Meet a member', () => onNavigate(isLive ? 'workspace' : 'profile', isLive ? undefined : boardPeople[0]?.id)),
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-8 animate-fadeIn">
      {/* Editorial Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0C1017] via-[#090C10] to-[#07090C] p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Hero Left: Editorial Headline & Value Proposition */}
          <div className="lg:col-span-7 space-y-5">
            <div className="text-[10px] md:text-xs font-mono uppercase tracking-[0.25em] text-[#9CA3AF] font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#F5B027]" />
              Professional Connections
            </div>

            <h1 className="font-serif-editorial text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl text-[#F2EEE6] leading-[1.08] tracking-tight">
              Where professional relationships{' '}
              <span className="text-[#F5B027]">create momentum.</span>
            </h1>

            <p className="text-sm md:text-base text-[#9CA3AF] max-w-xl leading-relaxed">
              Aetheris Intros is the exclusive professional network for ambitious people who
              build, invest, and create what's next.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={() => onNavigate('people')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#F5B027] hover:bg-[#C78522] text-white text-xs md:text-sm font-semibold transition-all shadow-lg shadow-[#F5B027]/20 cursor-pointer"
              >
                Start Connecting
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onNavigate('people')}
                className="px-5 py-2.5 rounded-lg border border-white/15 hover:border-white/30 text-[#F2EEE6] hover:text-white text-xs md:text-sm font-medium transition-colors cursor-pointer"
              >
                Explore the Network
              </button>
            </div>

            {/* Key Stats Bar */}
            <div className="flex items-center gap-6 sm:gap-10 pt-4 border-t border-white/10 text-[#F2EEE6]">
              <div>
                <div className="text-xl md:text-2xl font-serif-editorial font-bold text-white">{boardPeople.length}</div>
                <div className="text-[11px] font-mono text-[#9CA3AF] tracking-wider uppercase">Professionals</div>
              </div>
              <div className="w-[1px] h-8 bg-white/10" />
              <div>
                <div className="text-xl md:text-2xl font-serif-editorial font-bold text-white">{new Set(boardPeople.map(member => member.company).filter(Boolean)).size}</div>
                <div className="text-[11px] font-mono text-[#9CA3AF] tracking-wider uppercase">Companies</div>
              </div>
              <div className="w-[1px] h-8 bg-white/10" />
              <div>
                <div className="text-xl md:text-2xl font-serif-editorial font-bold text-white">{topics.length}</div>
                <div className="text-[11px] font-mono text-[#9CA3AF] tracking-wider uppercase">Shared interests</div>
              </div>
            </div>
          </div>

          {/* Hero Right: "Who to Meet This Week" Spotlight or Floating Connection Bubbles */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full bg-[#111622]/90 border border-white/10 rounded-xl p-5 relative overflow-hidden backdrop-blur-sm shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10">
                  <button
                    onClick={() => setHeroVisualMode('bubbles')}
                    className={`px-2.5 py-1 text-[10px] font-mono rounded transition-colors cursor-pointer ${
                      heroVisualMode === 'bubbles'
                        ? 'bg-[#F5B027] text-white font-semibold'
                        : 'text-[#9CA3AF] hover:text-white'
                    }`}
                  >
                    ✦ Relationship Field
                  </button>
                  <button
                    onClick={() => setHeroVisualMode('spotlight')}
                    className={`px-2.5 py-1 text-[10px] font-mono rounded transition-colors cursor-pointer ${
                      heroVisualMode === 'spotlight'
                        ? 'bg-[#F5B027] text-white font-semibold'
                        : 'text-[#9CA3AF] hover:text-white'
                    }`}
                  >
                    ★ Spotlight Match
                  </button>
                </div>
                <span className="text-[11px] font-mono text-[#F5B027] bg-[#F5B027]/10 border border-[#F5B027]/20 px-2 py-0.5 rounded font-medium">
                  {heroVisualMode === 'bubbles' ? (isLive ? 'Your Network' : 'Demo Network') : elena ? `${elena.matchScore}% Match` : 'No match yet'}
                </span>
              </div>

              {heroVisualMode === 'bubbles' ? (
                <div className="space-y-3">
                  <div className="ix-field-tile h-[270px] w-full rounded-lg border border-white/10 overflow-hidden bg-[#07090C]/80 relative">
                    <RelationshipFieldGraph
                      members={networkMembers}
                      onSelectMember={(id) => onNavigate('profile', id)}
                      className="w-full h-full"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-[#9CA3AF] italic">
                      Click a node to open their profile
                    </span>
                    <button
                      onClick={() => onNavigate('bubbles')}
                      className="text-[#FFC85C] hover:text-white font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      Full Screen Graph →
                    </button>
                  </div>
                </div>
              ) : elena ? (
                <>
                  {/* Spotlight Member Information */}
                  <div className="flex items-start gap-3.5 mb-3">
                    <ExecutivePortrait name={elena.name} avatarUrl={elena.avatarUrl} size="lg" />
                    <div>
                      <h3
                        onClick={() => onNavigate('profile', elena.id)}
                        className="font-serif-editorial text-lg font-bold text-white hover:text-[#F5B027] transition-colors cursor-pointer"
                      >
                        {elena.name}
                      </h3>
                      <p className="text-xs text-[#9CA3AF]">
                        {elena.title} · {elena.company}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {elena.focusAreas.slice(0, 3).map((tag, i) => (
                          <span key={i} className="text-[10px] text-[#9CA3AF] bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-[#CBD5E1] line-clamp-2 italic mb-3">
                    "{elena.bioStatement}"
                  </p>

                  <div className="text-[11px] text-[#9CA3AF] space-y-1 mb-4 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#F5B027]" />
                      <span>12 mutual connections</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
                      <span>Shared interests: AI Infrastructure, Climate Tech</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onRequestIntro(elena)}
                      className="flex-1 py-2 text-xs font-semibold text-white bg-[#F5B027] hover:bg-[#C78522] rounded-lg transition-colors cursor-pointer text-center"
                    >
                      Request Introduction
                    </button>
                    <button
                      onClick={() => onNavigate('profile', elena.id)}
                      className="px-3 py-2 text-xs text-[#9CA3AF] hover:text-white border border-white/10 hover:border-white/20 rounded-lg transition-colors cursor-pointer"
                    >
                      View Profile
                    </button>
                  </div>
                </>
              ) : <p>No member spotlight yet.</p>}
            </div>
          </div>
        </div>
      </section>



      {/* Movable widget board — drag to rearrange (Alt + arrows on keyboard) */}
      {actionQueue}

      <section className="home-board-section space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-mono tracking-widest uppercase text-[#9CA3AF] font-semibold">Your board</div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-xs text-[var(--sys-ink-dim)]">People · Context · Opportunity</span>
            <Button variant="ghost" size="sm" aria-label={boardPinned ? 'Unpin board' : 'Pin board'} aria-pressed={boardPinned} title={boardPinned ? 'Unpin board to rearrange tiles' : 'Pin board to keep tiles in place'} className="home-board-pin" onClick={() => {
              const next = !boardPinned;
              setBoardPinned(next);
              try { localStorage.setItem('intros.home.board.pinned', String(next)); } catch {}
            }}>{boardPinned ? <PinOff /> : <Pin />}{boardPinned ? 'Pinned' : 'Pin board'}</Button>
          </div>
        </div>
        <DraggableWidgetGrid
          items={boardItems}
          onChange={saveBoard}
          maxColumns={narrow ? 1 : 4}
          editable={!boardPinned}
          cellSize={280}
          gap={12}
          radius={8}
          renderItem={(item) => <div className="flex h-full min-h-0 w-full flex-col">
            <div className="flex shrink-0 justify-end border-b border-[var(--sys-line)] bg-[var(--sys-tile-inner)]">
              <Button variant="ghost" size="sm" disabled={boardPinned} aria-label={`Resize ${item.label || item.id}`} title={`Resize tile · ${item.size === 'sm' ? 'Small' : item.size === 'lg' ? 'Large' : item.size === 'wide' ? 'Wide' : 'Tall'}`} onClick={() => {
                const sizes = narrow ? ['sm', 'tall'] : ['sm', 'wide', 'tall', 'lg'];
                const size = sizes[(sizes.indexOf(item.size) + 1) % sizes.length];
                saveBoard(boardItems.map(entry => entry.id === item.id ? { ...entry, size } : entry));
              }}><Maximize2 /><span>{item.size === 'sm' ? 'Small' : item.size === 'lg' ? 'Large' : item.size === 'wide' ? 'Wide' : 'Tall'}</span></Button>
            </div>
            <div data-no-drag className="home-widget-scroll min-h-0 flex-1 overflow-y-auto touch-pan-y">{widgets[item.id]}</div>
          </div>}
        />
      </section>

      <section id="home-social-board" className="home-social-board scroll-mt-24">
        <header className="home-social-heading"><div><span className="home-board-label">Social Board</span><h2>The people. The work. The conversation.</h2><p>Share what matters now, and make room for a useful reply.</p></div><Button variant="outline" onClick={() => onNavigate('people')}><Users />Find people</Button></header>
        {socialFeed || <div className="max-w-3xl mx-auto w-full">
        {/* Center Column: Feed Post Composer & Feed Stream */}
        <main className="space-y-6">
          {/* Post Composer */}
          <div className="bg-[#0E121A] border border-white/10 rounded-xl p-4 shadow-sm">
            <form onSubmit={handleCreatePost}>
              <div className="flex items-start gap-3 mb-3">
                <ExecutivePortrait name={me?.name || 'Sarah Chen'} avatarUrl={me?.avatarUrl} size="sm" />
                <textarea
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                  placeholder="Share an insight, milestone, or opportunity..."
                  rows={2}
                  className="w-full bg-[#131722] text-xs text-white placeholder-[#6B7280] rounded-lg p-3 border border-white/10 focus:outline-none focus:border-[#F5B027] resize-none"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5">
                <div className="flex items-center gap-1.5">
                  {(['Insight', 'Hiring', 'Fund Announcement', 'Event Takeaway'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setComposerType(type)}
                      className={`px-2.5 py-1 text-[11px] rounded transition-colors cursor-pointer ${
                        composerType === type
                          ? 'bg-[#F5B027]/20 text-[#FFC85C] border border-[#F5B027]/30'
                          : 'text-[#9CA3AF] hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1">
                  {[
                    { label: 'Add image', accept: 'image/*', Icon: ImageIcon },
                    { label: 'Add video', accept: 'video/*', Icon: Video },
                    { label: 'Add document', accept: '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv', Icon: FileText },
                    { label: 'Add file', accept: '*/*', Icon: Paperclip },
                  ].map(({ label, accept, Icon }) => (
                    <label key={label} title={label} className="p-1.5 rounded-md text-[#9CA3AF] hover:text-white hover:bg-white/5 cursor-pointer focus-within:ring-1 focus-within:ring-[#F5B027]">
                      <Icon className="w-4 h-4" aria-hidden />
                      <span className="sr-only">{label}</span>
                      <input
                        type="file"
                        accept={accept}
                        multiple
                        className="sr-only"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length) setAttachments((prev) => [...prev, ...files].slice(0, 10));
                          e.target.value = '';
                        }}
                      />
                    </label>
                  ))}
                  <button
                    type="submit"
                    disabled={!composerText.trim() && attachments.length === 0}
                    className="ml-1 px-4 py-1.5 text-xs font-semibold text-white bg-[#F5B027] hover:bg-[#C78522] disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
                  >
                    Post
                  </button>
                </div>
              </div>
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {attachments.map((f, i) => (
                    <span key={i} className="flex items-center gap-1 max-w-[220px] text-[11px] text-[#CBD5E1] bg-white/5 border border-white/10 rounded px-2 py-0.5">
                      <span className="truncate">{f.name}</span>
                      <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setAttachments((p) => p.filter((_, j) => j !== i))} className="text-[#9CA3AF] hover:text-white cursor-pointer">×</button>
                    </span>
                  ))}
                </div>
              )}
              <div className="hidden">
              </div>
            </form>
          </div>

          {/* Feed Filter Tabs */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-6">
              {[
                { id: 'forYou', label: 'For You' },
                { id: 'network', label: 'Your Network' },
                { id: 'following', label: 'Following' },
                { id: 'trending', label: 'Trending' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFeedFilter(tab.id as any)}
                  className={`text-xs font-medium cursor-pointer transition-colors pb-1 ${
                    feedFilter === tab.id
                      ? 'text-white border-b-2 border-[#F5B027] font-semibold'
                      : 'text-[#9CA3AF] hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Feed Stream Posts */}
          <div className="space-y-4">
            {visiblePosts.map((post) => {
              const showPortrait = !portraitIds.has(post.authorId);
              portraitIds.add(post.authorId);
              return (
              <article
                key={post.id}
                className="bg-[#0E121A] border border-white/10 rounded-xl p-5 space-y-4 hover:border-white/20 transition-all shadow-sm"
              >
                {/* Author row */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      onClick={() => onNavigate('profile', post.authorId)}
                      className="cursor-pointer"
                    >
                      {showPortrait ? <ExecutivePortrait name={post.authorName} avatarUrl={networkMembers.find((m) => m.id === post.authorId)?.avatarUrl} size="md" /> : <span className="home-board-initials">{post.authorName.split(' ').map(part => part[0]).join('').slice(0, 2)}</span>}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4
                          onClick={() => onNavigate('profile', post.authorId)}
                          className="font-serif-editorial text-sm font-bold text-white hover:text-[#F5B027] transition-colors cursor-pointer"
                        >
                          {post.authorName}
                        </h4>
                        <span className="text-[11px] text-[#6B7280]">· {post.timeAgo}</span>
                      </div>
                      <p className="text-xs text-[#9CA3AF]">{post.authorTitle}</p>
                    </div>
                  </div>

                  {post.badge && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[#CBD5E1]">
                      {post.badge}
                    </span>
                  )}
                </div>

                {/* Content */}
                <p className="text-xs md:text-sm text-[#E2E8F0] leading-relaxed">
                  {post.content}
                </p>

                {/* Link Preview (if present) */}
                {post.linkPreview && (
                  <div className="border border-white/10 rounded-lg p-3 bg-[#131722] hover:border-white/20 transition-colors cursor-pointer">
                    <div className="text-[10px] font-mono text-[#F5B027] uppercase mb-0.5">
                      {post.linkPreview.domain}
                    </div>
                    <div className="text-xs font-semibold text-white mb-1">
                      {post.linkPreview.title}
                    </div>
                    {post.linkPreview.subtitle && (
                      <div className="text-[11px] text-[#9CA3AF]">
                        {post.linkPreview.subtitle}
                      </div>
                    )}
                  </div>
                )}

                {/* Post Actions Bar */}
                <div className="flex items-center justify-between text-xs text-[#9CA3AF] pt-2 border-t border-white/5">
                  <button
                    aria-label={`Like ${post.authorName}'s post`}
                    aria-pressed={post.isLiked || false}
                    onClick={() => onLikePost(post.id)}
                    className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                      post.isLiked ? 'text-[#F5B027]' : 'hover:text-white'
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>{post.likes}</span>
                  </button>

                  <Button variant="ghost" size="sm" aria-label={`Comment on ${post.authorName}'s post`} onClick={() => { setCommenting(commenting === post.id ? null : post.id); setReply(''); }}><MessageSquare /><span>{post.comments + (comments[post.id]?.length || 0)}</span></Button>

                  <Button variant="ghost" size="sm" aria-label={`Message about ${post.authorName}'s post`} onClick={() => onNavigate('messages')}><MessageSquare />Message</Button>

                  <button
                    aria-label={`Save ${post.authorName}'s post`}
                    aria-pressed={post.isSaved || false}
                    onClick={() => onSavePost(post.id)}
                    className={`p-1 transition-colors cursor-pointer ${
                      post.isSaved ? 'text-[#F5B027]' : 'hover:text-white'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                  </button>
                </div>
                {(commenting === post.id || comments[post.id]?.length) && <div className="home-demo-comments">{comments[post.id]?.map((text, index) => <p key={index}><b>Sarah Chen</b> {text}</p>)}{commenting === post.id && <form onSubmit={event => { event.preventDefault(); if (!reply.trim()) return; setComments(current => ({ ...current, [post.id]: [...(current[post.id] || []), reply.trim()] })); setReply(''); }}><input aria-label="Your comment" placeholder="Add a thoughtful reply…" value={reply} onChange={event => setReply(event.target.value)} /><Button size="sm" type="submit" disabled={!reply.trim()}>Reply</Button></form>}</div>}
              </article>
            ); })}
            {!visiblePosts.length && <p className="text-sm text-[var(--sys-ink-dim)]">No updates in this view yet.</p>}
          </div>
        </main>
      </div>}
      </section>
    </div>
  );
};
