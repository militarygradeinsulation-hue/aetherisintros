// @ts-nocheck
import React, { useState, useMemo } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Newspaper,
  ExternalLink,
  Briefcase,
  Users,
  Target,
  Clock,
  ArrowRight,
  Mic,
  Check,
  TrendingUp,
  AlertCircle,
  Building,
  Lock,
  Unlock,
  ShieldCheck,
  Shield,
  Fingerprint,
  Calendar,
  MapPin,
  Video,
  CheckSquare,
  Plus,
} from 'lucide-react';
import { Person, ExecutiveIntelligenceDossier, ExecutiveNewsItem, CalendarEvent } from '../types';
import { EXECUTIVE_INTELLIGENCE_DOSSIERS, INITIAL_CALENDAR } from '../dataStore';
import { ExecutiveRichTextEditor } from './ExecutiveRichTextEditor';
import { RelationshipTierBadge } from './RelationshipTierBadge';

interface ExecutiveIntelligenceSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  selectedPerson?: Person | null;
  onSelectPerson?: (person: Person) => void;
  people?: Person[];
  calendarEvents?: CalendarEvent[];
  onOpenGraph?: () => void;
  onOpenWorkspace?: (tileId: string) => void;
  isBiometricUnlocked?: boolean;
  onTriggerBiometricAuth?: () => void;
  onToggleBiometricLock?: () => void;
  onAddTaskToInbox?: (title: string, linkedPerson?: string) => void;
}

export const ExecutiveIntelligenceSidebar: React.FC<ExecutiveIntelligenceSidebarProps> = ({
  isOpen,
  onToggle,
  selectedPerson,
  onSelectPerson,
  people = [],
  calendarEvents = [],
  onOpenGraph,
  onOpenWorkspace,
  isBiometricUnlocked = false,
  onTriggerBiometricAuth,
  onToggleBiometricLock,
  onAddTaskToInbox,
}) => {
  const [selectedNewsCategory, setSelectedNewsCategory] = useState<string>('all');
  const [noteText, setNoteText] = useState<string>('');
  const [noteSaved, setNoteSaved] = useState<boolean>(false);

  // Fallback to first person if none selected
  const activePerson = selectedPerson || people[0];
  const dossier: ExecutiveIntelligenceDossier | undefined = activePerson
    ? EXECUTIVE_INTELLIGENCE_DOSSIERS[activePerson.id] || {
        personId: activePerson.id,
        personName: activePerson.name,
        title: activePerson.title,
        company: activePerson.company,
        avatar: activePerson.avatar,
        bio: `${activePerson.title} at ${activePerson.company}. Verified executive relationship with ${activePerson.connectionScore} connection index.`,
        currentFocus: activePerson.notes || 'Ongoing strategic alignment and syndicated collaboration.',
        keyPriorities: [
          'Maintain executive contact recency',
          'Coordinate quarterly briefings',
          'Explore syndicate co-investments',
        ],
        sharedConnections: activePerson.mutualsCount || 12,
        activeDealsCount: 1,
        pipelineExposure: 1000000,
        recommendedAction: `Schedule follow-up via ${activePerson.touchpointType.toLowerCase()}.`,
        lastTouchpoint: activePerson.lastTouchpoint,
        engagement: activePerson.engagement || 'active',
        connectionScore: activePerson.connectionScore,
        recentNews: [
          {
            id: 'news-gen-1',
            title: `${activePerson.company} continues expansion across enterprise networks`,
            source: 'Executive Wire',
            date: '3 days ago',
            category: 'Market Insight',
            summary: `Leadership accelerates strategic partnership rollout amidst robust enterprise demand.`,
            sentiment: 'bullish',
          },
        ],
      }
    : undefined;

  const handleSaveQuickNote = () => {
    if (!noteText.trim()) return;
    setNoteSaved(true);
    setTimeout(() => {
      setNoteSaved(false);
      setNoteText('');
    }, 2500);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return 'bg-[#C78522] shadow-[0_0_6px_rgba(63,179,127,0.7)]';
      case 'followup':
        return 'bg-[#F5B027] shadow-[0_0_6px_rgba(242,169,59,0.7)]';
      case 'dormant':
        return 'bg-[#C78522]';
      default:
        return 'bg-[#C78522]';
    }
  };

  // Automatically pull upcoming calendar events for active relationship and categorize into Priority Meetings
  const priorityMeetings = useMemo(() => {
    if (!activePerson) return [];
    const sourceCalendar = calendarEvents && calendarEvents.length > 0 ? calendarEvents : INITIAL_CALENDAR;
    return sourceCalendar.filter((event: CalendarEvent) => {
      const matchLinked = event.linkedPerson?.toLowerCase() === activePerson.name.toLowerCase();
      const matchCompany = event.company?.toLowerCase() === activePerson.company.toLowerCase();
      const matchAttendee = event.attendees?.some(
        (a: { name: string; title: string }) => a.name.toLowerCase() === activePerson.name.toLowerCase()
      );
      return matchLinked || matchAttendee;
    });
  }, [activePerson, calendarEvents]);

  const getSentimentBadge = (sentiment: 'bullish' | 'neutral' | 'watch') => {
    switch (sentiment) {
      case 'bullish':
        return <span className="text-[#C78522] text-[9px] font-mono tracking-wider">▲ Bullish</span>;
      case 'watch':
        return <span className="text-[#F5B027] text-[9px] font-mono tracking-wider">● Watch</span>;
      case 'neutral':
      default:
        return <span className="text-[#F2EEE6]/50 text-[9px] font-mono tracking-wider">◆ Neutral</span>;
    }
  };

  const filteredNews =
    dossier && selectedNewsCategory === 'all'
      ? dossier.recentNews
      : dossier?.recentNews.filter((n) => n.category.toLowerCase() === selectedNewsCategory.toLowerCase()) || [];

  return (
    <>
      {/* Collapsed Sidebar Handle / Drawer Launcher */}
      {!isOpen && (
        <aside
          aria-label="Executive Intelligence Sidebar collapsed rail"
          className="fixed right-0 top-1/2 -translate-y-1/2 z-40"
        >
          <button
            onClick={onToggle}
            className="flex items-center gap-2 bg-[#12100C] hover:bg-[#12100c] text-[#F2EEE6] border-l border-y border-white/15 py-3.5 px-2 rounded-l-lg shadow-2xl transition-all hover:border-[#F5B027]/60 group"
            title="Expand Executive Intelligence (Dossier & News)"
          >
            <ChevronLeft size={14} className="text-[#F5B027] group-hover:-translate-x-0.5 transition-transform" />
            <div className="flex flex-col items-center gap-1.5">
              {activePerson?.avatar && (
                <div className="relative">
                  <img
                    src={activePerson.avatar}
                    alt={activePerson.name}
                    className="w-5 h-5 rounded-full object-cover border border-white/20"
                  />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${getStatusColor(
                      activePerson.engagement
                    )}`}
                  />
                </div>
              )}
              <span className="font-serif-editorial text-[10px] tracking-[0.25em] uppercase text-[#F2EEE6]/70 [writing-mode:vertical-rl] rotate-180 py-1">
                Intelligence
              </span>
            </div>
          </button>
        </aside>
      )}

      {/* Expanded Sidebar Panel */}
      {isOpen && (
        <aside
          aria-label="Executive Intelligence Sidebar"
          className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[420px] bg-[#12100C] text-[#F2EEE6] border-l border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.85)] flex flex-col backdrop-blur-xl animate-in slide-in-from-right-2 duration-200"
        >
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#12100C]/80">
            <div>
              <div className="text-[9px] font-mono tracking-[0.28em] text-[#F5B027] uppercase font-semibold">
                Relationship Dossier
              </div>
              <h2 className="font-serif-editorial text-lg text-[#F2EEE6] leading-tight mt-0.5">
                Executive Intelligence
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {/* Biometric Guard Status Badge / Toggle */}
              <button
                onClick={() => {
                  if (!isBiometricUnlocked && onTriggerBiometricAuth) {
                    onTriggerBiometricAuth();
                  } else if (onToggleBiometricLock) {
                    onToggleBiometricLock();
                  }
                }}
                className={`px-2 py-1 rounded text-[10px] font-mono flex items-center gap-1.5 transition-all border ${
                  isBiometricUnlocked
                    ? 'bg-[#C78522]/15 border-[#C78522]/30 text-[#C78522]'
                    : 'bg-[#F5B027]/15 border-[#F5B027]/40 text-[#F5B027] hover:bg-[#F5B027]/25'
                }`}
                title={
                  isBiometricUnlocked
                    ? 'Biometric Enclave Decrypted (Click to lock)'
                    : 'Confidential Data Locked (Click to verify FaceID)'
                }
              >
                {isBiometricUnlocked ? (
                  <>
                    <Unlock size={11} />
                    <span>Unlocked</span>
                  </>
                ) : (
                  <>
                    <Lock size={11} />
                    <span>FaceID Guard</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-2.5 py-1 rounded bg-[#F5B027]/20 hover:bg-[#F5B027]/30 border border-[#F5B027]/40 text-white text-[10px] font-mono flex items-center gap-1 transition-all cursor-pointer"
                title="Print Executive Summary to PDF"
              >
                <span>Print PDF</span>
              </button>

              <button
                onClick={onToggle}
                className="w-7 h-7 rounded text-[#F2EEE6]/60 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
                title="Collapse Sidebar"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Quick Relationship Switcher Bar */}
          <div className="px-4 py-2 border-b border-white/5 bg-[#12100C] flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[9px] font-mono text-[#F2EEE6]/50 uppercase tracking-wider shrink-0">
              Focus:
            </span>
            {people.slice(0, 7).map((p) => {
              const isSelected = activePerson?.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => onSelectPerson && onSelectPerson(p)}
                  className={`px-2 py-1 rounded text-[10.5px] font-mono flex items-center gap-1.5 shrink-0 transition-all ${
                    isSelected
                      ? 'bg-[#F5B027]/20 text-white border border-[#F5B027]/50 shadow-sm'
                      : 'bg-white/5 text-[#F2EEE6]/70 hover:bg-white/10 border border-transparent'
                  }`}
                >
                  <img
                    src={p.avatar}
                    alt={p.name}
                    className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
                  />
                  <span className="truncate max-w-[85px]">{p.name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {dossier ? (
              <>
                {/* 1. Executive Profile Card */}
                <div className="p-3.5 rounded-lg bg-[#12100C] border border-white/10 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <img
                        src={dossier.avatar}
                        alt={dossier.personName}
                        className="w-12 h-12 rounded-lg object-cover border border-white/15"
                      />
                      <span
                        className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full ${getStatusColor(
                          dossier.engagement
                        )} ring-2 ring-[#12100C]`}
                        title={`Status: ${dossier.engagement}`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <h3 className="text-sm font-bold text-[#F2EEE6] truncate">
                            {dossier.personName}
                          </h3>
                          {activePerson?.tier && (
                            <RelationshipTierBadge tier={activePerson.tier} size="xs" />
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] font-mono text-[#F5B027] font-semibold tabular-nums">
                            {dossier.connectionScore}/100
                          </span>
                        </div>
                      </div>
                      <div className="text-[11px] text-[#F2EEE6]/75 font-serif-editorial">
                        {dossier.title} · <span className="text-[#F5B027]">{dossier.company}</span>
                      </div>
                      <div className="text-[9.5px] font-mono text-[#F2EEE6]/50 mt-1 truncate">
                        {dossier.lastTouchpoint}
                      </div>
                    </div>
                  </div>

                  {/* Bio statement */}
                  <p className="text-xs text-[#F2EEE6]/80 leading-relaxed font-sans border-t border-white/5 pt-2.5">
                    {dossier.bio}
                  </p>

                  {/* High-level Metrics Grid with Biometric Protection */}
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/5 text-center">
                    <div className="p-1.5 rounded bg-black/30 border border-white/5">
                      <div className="text-[8.5px] font-mono text-[#F2EEE6]/50 uppercase">Mutuals</div>
                      <div className="text-xs font-mono font-bold text-[#F2EEE6] tabular-nums mt-0.5">
                        {dossier.sharedConnections}
                      </div>
                    </div>
                    <div className="p-1.5 rounded bg-black/30 border border-white/5">
                      <div className="text-[8.5px] font-mono text-[#F2EEE6]/50 uppercase">Active Deals</div>
                      <div className="text-xs font-mono font-bold text-[#C78522] tabular-nums mt-0.5">
                        {dossier.activeDealsCount}
                      </div>
                    </div>
                    <div className="p-1.5 rounded bg-black/30 border border-white/5 relative">
                      <div className="text-[8.5px] font-mono text-[#F2EEE6]/50 uppercase">Pipeline</div>
                      {isBiometricUnlocked ? (
                        <div className="text-xs font-mono font-bold text-[#F5B027] tabular-nums mt-0.5 flex items-center justify-center gap-1">
                          <span>
                            {dossier.pipelineExposure > 0
                              ? `$${(dossier.pipelineExposure / 1000000).toFixed(1)}M`
                              : '$0'}
                          </span>
                          <ShieldCheck size={11} className="text-[#C78522]" />
                        </div>
                      ) : (
                        <button
                          onClick={onTriggerBiometricAuth}
                          className="text-[10px] font-mono text-[#F5B027] hover:underline flex items-center justify-center gap-1 mt-0.5 w-full"
                          title="Click to authenticate via FaceID / Biometrics"
                        >
                          <Lock size={9} />
                          <span>Protected</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Current Focus & Key Priorities */}
                <div className="p-3.5 rounded-lg bg-[#12100C] border border-white/10 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#F5B027] uppercase font-bold tracking-wider">
                    <Target size={12} />
                    <span>Current Strategic Mandate</span>
                  </div>
                  <div className="text-xs text-[#F2EEE6] leading-relaxed">
                    {dossier.currentFocus}
                  </div>

                  <div className="pt-2 border-t border-white/5 space-y-1.5">
                    <div className="text-[9px] font-mono text-[#F2EEE6]/50 uppercase tracking-wider">
                      Key Syndicate Priorities
                    </div>
                    {dossier.keyPriorities.map((priority, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-[11px] text-[#F2EEE6]/80 leading-snug">
                        <span className="text-[#F5B027] mt-0.5">▪</span>
                        <span>{priority}</span>
                      </div>
                    ))}
                  </div>

                  {/* Recommended Next Action Banner */}
                  <div className="p-2.5 rounded bg-[#F5B027]/10 border border-[#F5B027]/30 mt-2 flex items-start gap-2">
                    <Sparkles size={13} className="text-[#F5B027] shrink-0 mt-0.5" />
                    <div>
                      <div className="text-[9px] font-mono text-[#F5B027] uppercase font-bold tracking-wider">
                        Recommended Next Action
                      </div>
                      <div className="text-[11px] text-[#F2EEE6] mt-0.5">
                        {dossier.recommendedAction}
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Predictive Blind Spot & Opportunity Analysis */}
                <div className="p-3.5 rounded-lg bg-gradient-to-br from-[#12100C] via-[#12100C] to-[#12100C] border border-[#FFC85C]/40 space-y-2.5 shadow-[0_0_20px_rgba(255, 200, 92,0.12)]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#FFC85C] uppercase font-bold tracking-wider">
                      <Sparkles size={12} />
                      <span>AI Predictive Blind Spot Analysis</span>
                    </div>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#FFC85C]/20 text-[#FFC85C] border border-[#FFC85C]/30">
                      LLM Grounded
                    </span>
                  </div>

                  <p className="text-xs text-[#F2EEE6]/85 font-sans leading-relaxed">
                    Analyzing relationship topology and interaction frequency for <strong className="text-white">{activePerson?.name}</strong>:
                  </p>

                  <div className="space-y-1.5 text-[11px] font-mono text-[#F2EEE6]/75">
                    <div className="p-2 rounded bg-black/40 border border-white/5 flex items-start gap-2">
                      <span className="text-[#F5B027]">⚠️</span>
                      <div>
                        <strong className="text-[#F2EEE6]">Interaction Drift Flag:</strong> Recency interval exceeds 30-day half-life decay threshold by 18 days.
                      </div>
                    </div>
                    <div className="p-2 rounded bg-black/40 border border-white/5 flex items-start gap-2">
                      <span className="text-[#C78522]">💡</span>
                      <div>
                        <strong className="text-[#F2EEE6]">Unutilized Synergy:</strong> {activePerson?.mutualsCount || 38} mutual peers in Apex syndicate. Bridge potential to Jensen Huang unallocated.
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Priority Meetings (Upcoming Calendar Integration) */}
                <div className="p-3.5 rounded-lg bg-[#12100C] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#F5B027] uppercase font-bold tracking-wider">
                      <Calendar size={12} />
                      <span>Priority Meetings ({priorityMeetings.length})</span>
                    </div>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#C78522]/15 text-[#C78522] border border-[#C78522]/30 font-semibold">
                      Calendar Synced
                    </span>
                  </div>

                  {priorityMeetings.length > 0 ? (
                    <div className="space-y-2.5">
                      {priorityMeetings.map((meeting: CalendarEvent) => (
                        <div
                          key={meeting.id}
                          className="p-3 rounded-lg bg-black/40 border border-white/5 hover:border-[#F5B027]/40 transition-all space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <span className="text-[8.5px] font-mono uppercase px-1.5 py-0.2 rounded bg-[#F5B027]/20 text-[#F5B027] border border-[#F5B027]/35 font-bold">
                                {meeting.priorityCategory || 'Priority Meeting'}
                              </span>
                              <h4 className="text-xs font-bold text-[#F2EEE6] leading-snug mt-1">
                                {meeting.title}
                              </h4>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="text-[10px] font-mono text-[#F5B027] font-semibold">
                                {meeting.meetingDate || 'Upcoming Today'}
                              </div>
                              <div className="text-[9px] font-mono text-[#F2EEE6]/50">
                                {meeting.time} ({meeting.duration})
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-[10px] font-mono text-[#F2EEE6]/70">
                            <div className="flex items-center gap-1 truncate">
                              <MapPin size={10} className="text-[#F5B027] shrink-0" />
                              <span className="truncate">{meeting.location}</span>
                            </div>
                          </div>

                          {meeting.notes && (
                            <p className="text-[11px] text-[#F2EEE6]/80 font-sans italic border-l-2 border-[#F5B027]/60 pl-2 py-0.5 leading-relaxed">
                              "{meeting.notes}"
                            </p>
                          )}

                          <div className="flex items-center justify-between pt-1 border-t border-white/5">
                            <div className="flex items-center -space-x-1">
                              {meeting.attendees?.map((att: { name: string; title: string; avatar?: string }, i: number) => (
                                <span
                                  key={i}
                                  className="w-4.5 h-4.5 rounded-full bg-[#12100c] border border-white/10 text-[7px] font-mono text-[#F2EEE6] flex items-center justify-center font-bold"
                                  title={`${att.name} (${att.title})`}
                                >
                                  {att.name.charAt(0)}
                                </span>
                              ))}
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                if (onAddTaskToInbox) {
                                  onAddTaskToInbox(
                                    `Prepare briefing notes for "${meeting.title}" with ${meeting.linkedPerson}`,
                                    meeting.linkedPerson
                                  );
                                }
                              }}
                              className="text-[9.5px] font-mono text-[#F5B027] hover:text-white flex items-center gap-1 transition-colors font-semibold"
                            >
                              <Plus size={10} />
                              <span>Send to Inbox</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-black/20 border border-white/5 text-center space-y-1">
                      <div className="text-xs text-[#F2EEE6]/60 font-serif-editorial">
                        No upcoming calendar events detected for {activePerson?.name}.
                      </div>
                      <div className="text-[9.5px] font-mono text-[#F5B027]">
                        Cadence tracking active (Target touchpoint due in 4 days)
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Recent News & Intelligence Updates */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#F2EEE6]/70 uppercase font-bold tracking-wider">
                      <Newspaper size={12} className="text-[#F5B027]" />
                      <span>Recent News & Market Radar ({filteredNews.length})</span>
                    </div>
                  </div>

                  {/* News list */}
                  <div className="space-y-2">
                    {filteredNews.map((news) => (
                      <article
                        key={news.id}
                        className="p-3 rounded-lg bg-[#12100C] hover:bg-[#12100C] border border-white/5 hover:border-white/15 transition-all space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-[9px] font-mono text-[#F2EEE6]/50 gap-2">
                          <span className="text-[#F5B027] uppercase font-semibold">{news.category}</span>
                          <span className="flex items-center gap-1">
                            <span>{news.source}</span>
                            <span>·</span>
                            <span>{news.date}</span>
                            <span>·</span>
                            {getSentimentBadge(news.sentiment)}
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-[#F2EEE6] leading-snug">
                          {news.title}
                        </h4>
                        <p className="text-[11px] text-[#F2EEE6]/70 leading-relaxed font-sans">
                          {news.summary}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>

                {/* 4. Structured Meeting Minutes & Tactical Notes (Rich-Text Editor) */}
                <div className="space-y-2">
                  <ExecutiveRichTextEditor
                    person={activePerson}
                    onAddTaskToInbox={onAddTaskToInbox}
                  />
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-xs text-[#F2EEE6]/50">
                Select an executive or connection tile to inspect intelligence.
              </div>
            )}
          </div>

          {/* Footer Quick Actions */}
          <div className="p-3 border-t border-white/10 bg-[#12100C] flex items-center justify-between gap-2">
            {onOpenGraph && (
              <button
                onClick={onOpenGraph}
                className="flex-1 py-1.5 px-2.5 rounded bg-white/5 hover:bg-[#F5B027]/20 border border-white/10 hover:border-[#F5B027]/40 text-xs font-mono text-[#F2EEE6] flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>View in Network Graph</span>
                <ArrowRight size={11} className="text-[#F5B027]" />
              </button>
            )}
            <button
              onClick={() => onOpenWorkspace && onOpenWorkspace('relationship-network')}
              className="py-1.5 px-3 rounded bg-[#F5B027]/20 hover:bg-[#F5B027]/30 border border-[#F5B027]/40 text-xs font-mono text-[#F2EEE6] transition-colors"
            >
              Open Full Record
            </button>
          </div>
        </aside>
      )}
    </>
  );
};
