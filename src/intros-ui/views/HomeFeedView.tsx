// @ts-nocheck
import React, { useState } from 'react';
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
} from 'lucide-react';
import { FeedPost, UPCOMING_EVENTS, SUGGESTED_CIRCLES, TRENDING_SECTORS, NetworkMember } from '../networkData';
import { ExecutivePortrait } from '../components/shared/ExecutivePortrait';
import { ConstellationGraphic } from '../components/shared/ConstellationGraphic';
import { FloatingConnectionField } from '../components/shared/FloatingConnectionField';
import { ActivePage } from '../components/layout/TopNavigation';
import { DraggableWidgetGrid, type WidgetItem } from '@/components/ui/widget-board';

const widgetIds = new Set(['network','explore','introduce','need','ask','sectors','events','circles','whynow']);

interface HomeFeedViewProps {
  posts: FeedPost[];
  onNavigate: (page: ActivePage, memberId?: string) => void;
  onRequestIntro: (member: NetworkMember) => void;
  onLikePost: (postId: string) => void;
  onSavePost: (postId: string) => void;
  onAddPost: (content: string, badge?: FeedPost['badge']) => void;
  networkMembers: NetworkMember[];
}

export const HomeFeedView: React.FC<HomeFeedViewProps> = ({
  posts,
  onNavigate,
  onRequestIntro,
  onLikePost,
  onSavePost,
  onAddPost,
  networkMembers,
}) => {
  const [feedFilter, setFeedFilter] = useState<'forYou' | 'network' | 'following' | 'trending'>('forYou');
  const [composerText, setComposerText] = useState('');
  const [composerType, setComposerType] = useState<FeedPost['badge']>('Insight');
  const [eventsList, setEventsList] = useState(UPCOMING_EVENTS);
  const [circlesList, setCirclesList] = useState(SUGGESTED_CIRCLES);

  // Spotlight member for "Who to Meet This Week"
  const elena = networkMembers.find((m) => m.id === 'elena-rossi') || networkMembers[2];
  const [heroVisualMode, setHeroVisualMode] = useState<'bubbles' | 'spotlight'>('bubbles');

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
    { id: 'whynow', size: 'sm', label: 'Why now' }
  ];
  const [boardItems] = useState<WidgetItem[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('intros.home.board.v2') || 'null');
      if (Array.isArray(saved) && saved.length === defaultBoard.length && saved.every((x) => widgetIds.has(x.id))) return saved;
    } catch {}
    return defaultBoard;
  });
  const [narrow, setNarrow] = useState(false);
  React.useEffect(() => { const q = window.matchMedia('(max-width: 640px)'); const f = () => setNarrow(q.matches); f(); q.addEventListener('change', f); return () => q.removeEventListener('change', f); }, []);
  const saveBoard = (next: WidgetItem[]) => { try { localStorage.setItem('intros.home.board.v2', JSON.stringify(next)); } catch {} };
  const widgets: Record<string, React.ReactNode> = {
    network: (
          <div className="bg-[#12100C] border border-white/10 rounded-xl p-4 space-y-4">
            <div className="text-[11px] font-mono tracking-widest uppercase text-[#9CA3AF] font-semibold">
              Your Network
            </div>
            <nav className="space-y-1 text-xs">
              <button
                onClick={() => setFeedFilter('forYou')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                  feedFilter === 'forYou' ? 'bg-[#F5B027]/20 text-[#FFC85C] font-semibold' : 'text-[#9CA3AF] hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Users className="w-4 h-4" />
                  Feed
                </span>
              </button>
              <button
                onClick={() => onNavigate('people')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[#9CA3AF] hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4" />
                  My Connections
                </span>
                <span className="text-[10px] font-mono text-[#6B7280]">1,246</span>
              </button>
              <button
                onClick={() => onNavigate('intros')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[#9CA3AF] hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4" />
                  My Introduction Requests
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[#F5B027] text-white font-semibold">
                  3
                </span>
              </button>
              <button
                onClick={() => setFeedFilter('network')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[#9CA3AF] hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <Bookmark className="w-4 h-4" />
                  Saved
                </span>
              </button>
            </nav>
          </div>
    ),
    explore: (
          <div className="bg-[#12100C] border border-white/10 rounded-xl p-4 space-y-3">
            <div className="text-[11px] font-mono tracking-widest uppercase text-[#9CA3AF] font-semibold">
              Explore
            </div>
            <nav className="space-y-1 text-xs">
              <button
                onClick={() => onNavigate('people')}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[#9CA3AF] hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
              >
                <Users className="w-4 h-4" />
                Discover People
              </button>
              <button
                onClick={() => onNavigate('insights')}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[#9CA3AF] hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
              >
                <Layers className="w-4 h-4" />
                Trending Sectors
              </button>
              <button
                onClick={() => onNavigate('insights')}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[#9CA3AF] hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
              >
                <TrendingUp className="w-4 h-4" />
                Content & Insights
              </button>
            </nav>
          </div>
    ),
    introduce: (
          <div
            onClick={() => onNavigate('intros')}
            className="p-4 rounded-xl border border-[#F5B027]/30 bg-gradient-to-br from-[#12100C] to-[#12100C] cursor-pointer hover:border-[#F5B027] transition-colors group"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-white mb-1">
              <span>Introduce a colleague</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#F5B027] group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-[11px] text-[#9CA3AF]">
              Help your network grow stronger with high-value warm introductions.
            </p>
          </div>
    ),
    need: (
          <div className="bg-[#12100C] border border-white/10 rounded-xl p-4 space-y-3">
            <div className="text-[11px] font-mono tracking-widest uppercase text-[#9CA3AF] font-semibold">What do you need right now?</div>
            <p className="text-[11px] text-[#9CA3AF]">Post an ask — a hire, an investor, a customer. Intros finds the people who can help.</p>
            <div className="flex flex-wrap gap-1.5">
              {['Hiring', 'Fundraising', 'Customers', 'Advisors'].map((t) => (
                <button key={t} onClick={() => onNavigate('people')} className="text-[11px] px-2.5 py-1 rounded-full border border-white/10 text-[#F2EEE6] hover:border-[#F5B027] cursor-pointer">{t}</button>
              ))}
            </div>
          </div>
    ),
    ask: (
          <div onClick={() => onNavigate('workspace')} className="p-4 rounded-xl border border-white/10 bg-[#12100C] cursor-pointer hover:border-[#F5B027] transition-colors">
            <div className="text-[11px] font-mono tracking-widest uppercase text-[#F4A125] font-semibold mb-1">Ask Intros</div>
            <p className="text-xs text-[#F2EEE6]">"Who in my network can open a door at a Fortune 500 buyer?"</p>
          </div>
    ),
    sectors: (
          <div className="bg-[#12100C] border border-white/10 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-[11px] font-mono tracking-widest uppercase text-[#9CA3AF] font-semibold">
              <span>Trending Sectors</span>
              <button
                onClick={() => onNavigate('insights')}
                className="text-[#F5B027] hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>
            <div className="space-y-2">
              {TRENDING_SECTORS.map((sector) => (
                <div
                  key={sector.id}
                  onClick={() => onNavigate('people')}
                  className="flex items-center justify-between py-1 text-xs text-[#FFC85C] hover:text-[#F5B027] transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-white/5 text-[10px] flex items-center justify-center font-mono text-[#9CA3AF]">
                      {sector.rank}
                    </span>
                    <span>{sector.name}</span>
                  </span>
                  <TrendingUp className="w-3 h-3 text-[#C78522]" />
                </div>
              ))}
            </div>
          </div>
    ),
    events: (
          <div className="bg-[#12100C] border border-white/10 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-[11px] font-mono tracking-widest uppercase text-[#9CA3AF] font-semibold">
              <span>Upcoming Business Events</span>
              <span className="text-[#F5B027] text-[10px]">Curated</span>
            </div>
            <div className="space-y-3">
              {eventsList.map((evt) => (
                <div key={evt.id} className="flex items-start justify-between gap-2 text-xs">
                  <div className="flex items-start gap-2.5">
                    <div className="w-9 h-9 rounded bg-[#12100c] border border-white/10 flex flex-col items-center justify-center font-mono shrink-0">
                      <span className="text-[8px] text-[#9CA3AF] leading-none">{evt.dateMonth}</span>
                      <span className="text-xs font-bold text-white leading-tight">{evt.dateDay}</span>
                    </div>
                    <div>
                      <div className="font-semibold text-white leading-tight">{evt.title}</div>
                      <div className="text-[11px] text-[#9CA3AF]">{evt.location}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleEventRegistration(evt.id)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer shrink-0 ${
                      evt.isRegistered
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-[#F5B027] hover:bg-[#C78522] text-white'
                    }`}
                  >
                    {evt.isRegistered ? 'Registered' : 'Register'}
                  </button>
                </div>
              ))}
            </div>
          </div>
    ),
    circles: (
          <div className="bg-[#12100C] border border-white/10 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-[11px] font-mono tracking-widest uppercase text-[#9CA3AF] font-semibold">
              <span>Suggested Circles</span>
            </div>
            <div className="space-y-2.5">
              {circlesList.map((circle) => (
                <div key={circle.id} className="flex items-center justify-between text-xs">
                  <div>
                    <div className="font-medium text-white">{circle.name}</div>
                    <div className="text-[10px] text-[#9CA3AF]">{circle.count}</div>
                  </div>
                  <button
                    onClick={() => toggleCircleJoin(circle.id)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                      circle.isJoined
                        ? 'bg-white/10 text-white'
                        : 'border border-white/15 hover:border-white/30 text-white'
                    }`}
                  >
                    {circle.isJoined ? 'Joined' : 'Join'}
                  </button>
                </div>
              ))}
            </div>
          </div>
    ),
    whynow: (
          <div className="bg-[#12100C] border border-white/10 rounded-xl p-4 space-y-3">
            <div className="text-[11px] font-mono tracking-widest uppercase text-[#9CA3AF] font-semibold">Why now</div>
            <p className="font-serif text-lg leading-snug text-[#F2EEE6]">Know who matters. Know why now.</p>
            <p className="text-[11px] text-[#9CA3AF]">Intros watches role changes, open asks and cooling conversations so the right moment doesn't pass.</p>
            <button onClick={() => onNavigate('memory')} className="w-full text-xs font-medium px-3 py-2 rounded-md border border-white/15 hover:border-[#F5B027] text-white cursor-pointer">Open Memory</button>
          </div>
    )
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-8 animate-fadeIn">
      {/* Editorial Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#12100C] via-[#12100C] to-[#12100C] p-6 lg:p-8">
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
                <div className="text-xl md:text-2xl font-serif-editorial font-bold text-white">10K+</div>
                <div className="text-[11px] font-mono text-[#9CA3AF] tracking-wider uppercase">Professionals</div>
              </div>
              <div className="w-[1px] h-8 bg-white/10" />
              <div>
                <div className="text-xl md:text-2xl font-serif-editorial font-bold text-white">3.2x</div>
                <div className="text-[11px] font-mono text-[#9CA3AF] tracking-wider uppercase">Stronger Outcomes</div>
              </div>
              <div className="w-[1px] h-8 bg-white/10" />
              <div>
                <div className="text-xl md:text-2xl font-serif-editorial font-bold text-white">92%</div>
                <div className="text-[11px] font-mono text-[#9CA3AF] tracking-wider uppercase">Would Recommend</div>
              </div>
            </div>
          </div>

          {/* Hero Right: "Who to Meet This Week" Spotlight or Floating Connection Bubbles */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full bg-[#12100c]/90 border border-white/10 rounded-xl p-5 relative overflow-hidden backdrop-blur-sm shadow-xl">
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
                    ✦ Floating Bubbles
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
                  {heroVisualMode === 'bubbles' ? 'Live Network' : `${elena.matchScore}% Match`}
                </span>
              </div>

              {heroVisualMode === 'bubbles' ? (
                <div className="space-y-3">
                  <div className="h-[270px] w-full rounded-lg border border-white/10 overflow-hidden bg-[#12100C]/80 relative">
                    <FloatingConnectionField
                      members={networkMembers}
                      onSelectMember={(id) => onNavigate('profile', id)}
                      onRequestIntro={onRequestIntro}
                      speedMultiplier={0.16}
                      className="w-full h-full"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-[#9CA3AF] italic">
                      Click to open · Click & hold for dossier
                    </span>
                    <button
                      onClick={() => onNavigate('bubbles')}
                      className="text-[#FFC85C] hover:text-white font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      Full Screen Graph →
                    </button>
                  </div>
                </div>
              ) : (
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

                  <p className="text-xs text-[#FFC85C] line-clamp-2 italic mb-3">
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
              )}
            </div>
          </div>
        </div>
      </section>



      {/* Movable widget board — drag to rearrange (Alt + arrows on keyboard) */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-mono tracking-widest uppercase text-[#9CA3AF] font-semibold">Your board</div>
          <span className="text-[10px] text-[#6B7280]">Drag widgets to arrange · Alt + arrows on keyboard</span>
        </div>
        <DraggableWidgetGrid
          key={narrow ? 'narrow' : 'wide'}
          items={narrow ? boardItems.map((i) => ({ ...i, size: 'sm' })) : boardItems}
          onChange={(next) => saveBoard(narrow ? next.map((i) => ({ ...i, size: defaultBoard.find((d) => d.id === i.id)?.size ?? 'sm' })) : next)}
          maxColumns={narrow ? 1 : 4}
          cellSize={300}
          gap={16}
          radius={12}
          renderItem={(item) => <div className="h-full w-full overflow-y-auto [&>*]:min-h-full">{widgets[item.id]}</div>}
        />
      </section>

      <div className="max-w-3xl mx-auto w-full">
        {/* Center Column: Feed Post Composer & Feed Stream */}
        <main className="space-y-6">
          {/* Post Composer */}
          <div className="bg-[#12100C] border border-white/10 rounded-xl p-4 shadow-sm">
            <form onSubmit={handleCreatePost}>
              <div className="flex items-start gap-3 mb-3">
                <ExecutivePortrait name="Sarah Chen" size="sm" />
                <textarea
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                  placeholder="Share an insight, milestone, or opportunity..."
                  rows={2}
                  className="w-full bg-[#12100c] text-xs text-white placeholder-[#6B7280] rounded-lg p-3 border border-white/10 focus:outline-none focus:border-[#F5B027] resize-none"
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
                    <span key={i} className="flex items-center gap-1 max-w-[220px] text-[11px] text-[#FFC85C] bg-white/5 border border-white/10 rounded px-2 py-0.5">
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
            {posts.map((post) => (
              <article
                key={post.id}
                className="bg-[#12100C] border border-white/10 rounded-xl p-5 space-y-4 hover:border-white/20 transition-all shadow-sm"
              >
                {/* Author row */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      onClick={() => onNavigate('profile', post.authorId)}
                      className="cursor-pointer"
                    >
                      <ExecutivePortrait
                        name={post.authorName}
                        avatarUrl={networkMembers.find((m) => m.id === post.authorId)?.avatarUrl}
                        size="md"
                      />
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
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[#FFC85C]">
                      {post.badge}
                    </span>
                  )}
                </div>

                {/* Content */}
                <p className="text-xs md:text-sm text-[#FFC85C] leading-relaxed">
                  {post.content}
                </p>

                {/* Link Preview (if present) */}
                {post.linkPreview && (
                  <div className="border border-white/10 rounded-lg p-3 bg-[#12100c] hover:border-white/20 transition-colors cursor-pointer">
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
                    onClick={() => onLikePost(post.id)}
                    className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                      post.isLiked ? 'text-[#F5B027]' : 'hover:text-white'
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>{post.likes}</span>
                  </button>

                  <button className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{post.comments}</span>
                  </button>

                  <button className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer">
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{post.shares}</span>
                  </button>

                  <button
                    onClick={() => onSavePost(post.id)}
                    className={`p-1 transition-colors cursor-pointer ${
                      post.isSaved ? 'text-[#F5B027]' : 'hover:text-white'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};
