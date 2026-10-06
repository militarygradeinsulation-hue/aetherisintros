// @ts-nocheck
import React, { useState } from 'react';
import {
  Search,
  Plus,
  Send,
  Star,
  MoreVertical,
  Paperclip,
  Smile,
  Calendar,
  CheckCircle,
  Sparkles,
  Users,
  ArrowRight,
  Shield,
  Clock,
  Check,
} from 'lucide-react';
import {
  ConversationThread,
  IntroRequest,
  ChatMessage,
  NetworkMember,
} from '../networkData';
import { ExecutivePortrait } from '../components/shared/ExecutivePortrait';
import { ConstellationGraphic } from '../components/shared/ConstellationGraphic';
import { ActivePage } from '../components/layout/TopNavigation';

interface MessagesViewProps {
  conversations: ConversationThread[];
  introRequests: IntroRequest[];
  onNavigate: (page: ActivePage, memberId?: string) => void;
  onReviewIntroRequest: (req: IntroRequest) => void;
  onDismissIntroRequest: (reqId: string) => void;
  onScheduleMeeting: (memberName: string, memberTitle: string) => void;
  onSendMessage: (threadId: string, text: string) => void;
}

export const MessagesView: React.FC<MessagesViewProps> = ({
  conversations,
  introRequests,
  onNavigate,
  onReviewIntroRequest,
  onDismissIntroRequest,
  onScheduleMeeting,
  onSendMessage,
}) => {
  const [selectedThreadId, setSelectedThreadId] = useState<string>(
    conversations[0]?.id || 'conv-marcus-lee'
  );
  const [activeFolder, setActiveFolder] = useState<
    'inbox' | 'introductions' | 'starred' | 'sent' | 'archived'
  >('inbox');
  const [searchFilter, setSearchFilter] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const [showBriefModal, setShowBriefModal] = useState(false);

  const activeThread =
    conversations.find((c) => c.id === selectedThreadId) || conversations[0];

  const filteredThreads = conversations.filter((c) => {
    if (activeFolder === 'introductions' && c.folder !== 'introductions') return false;
    if (activeFolder === 'starred' && !c.isStarred) return false;
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      return (
        c.memberName.toLowerCase().includes(q) ||
        c.memberCompany.toLowerCase().includes(q) ||
        c.lastMessageSnippet.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftMessage.trim() || !activeThread) return;
    onSendMessage(activeThread.id, draftMessage.trim());
    setDraftMessage('');
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6 animate-fadeIn">
      {/* Editorial Hero Banner (Matching Image 3) */}
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0C1017] via-[#090C10] to-[#07090C] p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Hero Left: Headline & Metrics */}
          <div className="lg:col-span-8 space-y-4">
            <div className="text-[10px] md:text-xs font-mono uppercase tracking-[0.25em] text-[#9CA3AF] font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#F5B027]" />
              Messages / Introductions
            </div>

            <h1 className="font-serif-editorial text-3xl sm:text-4xl md:text-5xl lg:text-5xl text-[#F2EEE6] leading-[1.1] tracking-tight">
              Every conversation should move business{' '}
              <span className="text-[#F5B027]">forward.</span>
            </h1>

            <p className="text-sm md:text-base text-[#9CA3AF] max-w-xl">
              Meaningful introductions. Real conversations. Greater outcomes.
            </p>

            <div className="flex items-center gap-6 sm:gap-10 pt-3 border-t border-white/10 font-mono">
              <div>
                <div className="text-xl md:text-2xl font-serif-editorial font-bold text-white">
                  1,248
                </div>
                <div className="text-[10px] text-[#9CA3AF] uppercase">Active Professionals</div>
              </div>
              <div className="w-[1px] h-8 bg-white/10" />
              <div>
                <div className="text-xl md:text-2xl font-serif-editorial font-bold text-white">
                  312
                </div>
                <div className="text-[10px] text-[#9CA3AF] uppercase">Companies</div>
              </div>
              <div className="w-[1px] h-8 bg-white/10" />
              <div>
                <div className="text-xl md:text-2xl font-serif-editorial font-bold text-white">
                  92%
                </div>
                <div className="text-[10px] text-[#9CA3AF] uppercase">Intro Lead to Chat</div>
              </div>
            </div>
          </div>

          {/* Hero Right: Constellation & Quote Callout (Matching Image 3) */}
          <div className="lg:col-span-4 flex flex-col items-center text-center space-y-3">
            <div className="w-36 h-36 relative">
              <ConstellationGraphic variant="hero-nodes" />
            </div>
            <p className="text-xs italic text-[#CBD5E1] max-w-xs">
              “The right people turn conversations into compound opportunity.”
            </p>
          </div>
        </div>
      </section>

      {/* Active Introduction Requests Bar (Matching Image 3) */}
      {introRequests.length > 0 && (
        <section className="bg-[#0E121A] border border-white/10 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-[11px] font-mono tracking-widest uppercase text-[#9CA3AF] font-semibold">
            <span>Active Introduction Requests</span>
            <span className="text-[#F5B027]">{introRequests.length} Pending</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {introRequests.map((req) => (
              <div
                key={req.id}
                className="bg-[#131722] border border-white/5 rounded-lg p-3.5 flex flex-col justify-between space-y-3 hover:border-white/20 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between text-[10px] font-mono text-[#6B7280] mb-2">
                    <span>{req.date}</span>
                    <span className="text-[#F5B027]">Warm Request</span>
                  </div>

                  <div className="flex items-center gap-2 mb-2 p-1.5 bg-black/20 rounded-lg border border-white/5">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <ExecutivePortrait name={req.requesterName} size="sm" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">{req.requesterName}</div>
                        <div className="text-[10px] text-[#9CA3AF] truncate">{req.requesterCompany}</div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[#F5B027] shrink-0" />
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <ExecutivePortrait name={req.targetName} size="sm" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">{req.targetName}</div>
                        <div className="text-[10px] text-[#9CA3AF] truncate">{req.targetCompany}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                  <button
                    onClick={() => onReviewIntroRequest(req)}
                    className="flex-1 py-1 text-xs font-semibold text-white bg-[#F5B027] hover:bg-[#C78522] rounded transition-colors cursor-pointer text-center"
                  >
                    Review
                  </button>
                  <button
                    onClick={() => onDismissIntroRequest(req.id)}
                    className="px-2.5 py-1 text-xs text-[#9CA3AF] hover:text-white border border-white/10 rounded transition-colors cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Main 3-Column Messaging Suite (Matching Image 3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[640px]">
        {/* Column 1: Conversations List & Folders */}
        <aside className="lg:col-span-3 bg-[#0E121A] border border-white/10 rounded-xl p-4 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif-editorial text-base font-bold text-white tracking-wide">
                Messages
              </h3>
              <button
                onClick={() => {
                  if (conversations[1]) setSelectedThreadId(conversations[1].id);
                }}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-[#F5B027] hover:bg-[#C78522] rounded-md transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                New
              </button>
            </div>

            {/* Folders */}
            <nav className="space-y-1 text-xs">
              {[
                { id: 'inbox', label: 'Inbox', count: 12 },
                { id: 'introductions', label: 'Introductions', count: 5 },
                { id: 'starred', label: 'Starred', count: 3 },
                { id: 'sent', label: 'Sent' },
                { id: 'archived', label: 'Archived' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFolder(f.id as any)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    activeFolder === f.id
                      ? 'bg-[#F5B027]/20 text-[#FFC85C] font-medium'
                      : 'text-[#9CA3AF] hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span>{f.label}</span>
                  {f.count !== undefined && (
                    <span className="font-mono text-[10px] text-[#6B7280]">{f.count}</span>
                  )}
                </button>
              ))}
            </nav>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6B7280]" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search conversations..."
                className="w-full bg-[#131722] text-xs text-white placeholder-[#6B7280] rounded-lg pl-8 pr-3 py-1.5 border border-white/10 focus:outline-none focus:border-[#F5B027]"
              />
            </div>

            {/* Conversation Threads List */}
            <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
              {filteredThreads.map((thread) => {
                const isSelected = thread.id === selectedThreadId;
                return (
                  <div
                    key={thread.id}
                    onClick={() => setSelectedThreadId(thread.id)}
                    className={`p-2.5 rounded-lg cursor-pointer transition-all flex items-start gap-2.5 ${
                      isSelected
                        ? 'bg-[#151D2C] border border-[#F5B027]/40 shadow-sm'
                        : 'hover:bg-white/[0.04] border border-transparent'
                    }`}
                  >
                    <ExecutivePortrait name={thread.memberName} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white truncate">
                          {thread.memberName}
                        </span>
                        <span className="text-[10px] font-mono text-[#6B7280] shrink-0">
                          {thread.lastMessageTime}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#9CA3AF] truncate mt-0.5">
                        {thread.lastMessageSnippet}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Column 2: Active Chat Thread (Matching Image 3 Center) */}
        <main className="lg:col-span-5 bg-[#0E121A] border border-white/10 rounded-xl flex flex-col justify-between overflow-hidden shadow-sm">
          {/* Active Chat Header */}
          {activeThread && (
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#11151E]">
              <div className="flex items-center gap-3">
                <div
                  onClick={() => onNavigate('profile', activeThread.memberId)}
                  className="cursor-pointer"
                >
                  <ExecutivePortrait name={activeThread.memberName} size="md" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3
                      onClick={() => onNavigate('profile', activeThread.memberId)}
                      className="font-serif-editorial text-sm font-bold text-white hover:text-[#F5B027] transition-colors cursor-pointer"
                    >
                      {activeThread.memberName}
                    </h3>
                    {activeThread.verified && (
                      <CheckCircle className="w-3.5 h-3.5 text-[#F5B027]" />
                    )}
                  </div>
                  <p className="text-xs text-[#9CA3AF]">
                    {activeThread.memberTitle}, {activeThread.memberCompany}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {activeThread.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="text-[9px] text-[#9CA3AF] bg-white/5 px-1.5 py-0.2 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('profile', activeThread.memberId)}
                  className="px-3 py-1.5 text-xs text-[#9CA3AF] hover:text-white border border-white/10 hover:border-white/20 rounded-lg transition-colors cursor-pointer"
                >
                  View Profile
                </button>
                <button className="p-1.5 text-[#9CA3AF] hover:text-white transition-colors cursor-pointer">
                  <Star className="w-4 h-4" />
                </button>
                <button className="p-1.5 text-[#9CA3AF] hover:text-white transition-colors cursor-pointer">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Chat Messages History */}
          <div className="flex-1 p-5 space-y-4 overflow-y-auto max-h-[460px]">
            <div className="text-center">
              <span className="text-[10px] font-mono text-[#6B7280] uppercase tracking-wider">
                Direct Thread · End-to-End Verified
              </span>
            </div>

            {activeThread?.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-end gap-2.5 ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
              >
                {!msg.isOwn && (
                  <ExecutivePortrait name={msg.senderName} size="sm" />
                )}

                <div className={`max-w-[80%] space-y-1 ${msg.isOwn ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`rounded-2xl p-3.5 text-xs leading-relaxed ${
                      msg.isOwn
                        ? 'bg-[#F5B027] text-white rounded-br-xs'
                        : 'bg-[#151923] text-[#E2E8F0] border border-white/10 rounded-bl-xs'
                    }`}
                  >
                    {msg.text}
                  </div>

                  <div className={`flex items-center gap-2 text-[10px] text-[#6B7280] px-1 ${msg.isOwn ? 'justify-end' : 'justify-start'}`}>
                    <span>{msg.timestamp}</span>
                    {msg.reactions && (
                      <span className="bg-white/5 border border-white/10 px-1.5 py-0.2 rounded text-[10px] text-white">
                        {msg.reactions.join(' ')}
                      </span>
                    )}
                  </div>
                </div>

                {msg.isOwn && (
                  <ExecutivePortrait name="Sarah Chen" size="sm" />
                )}
              </div>
            ))}
          </div>

          {/* Message Input Box (Matching Image 3) */}
          <form onSubmit={handleSend} className="p-3 border-t border-white/10 bg-[#11151E]">
            <div className="flex items-center gap-2 bg-[#151A24] border border-white/10 rounded-xl px-3 py-1.5">
              <button
                type="button"
                className="text-[#9CA3AF] hover:text-white p-1 cursor-pointer"
                title="Add attachment"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <input
                type="text"
                value={draftMessage}
                onChange={(e) => setDraftMessage(e.target.value)}
                placeholder="Write a message..."
                className="flex-1 bg-transparent text-xs text-white placeholder-[#6B7280] focus:outline-none py-1.5"
              />
              <button
                type="button"
                className="text-[#9CA3AF] hover:text-white p-1 cursor-pointer"
                title="Add emoji"
              >
                <Smile className="w-4 h-4" />
              </button>
              <button
                type="submit"
                disabled={!draftMessage.trim()}
                className="p-1.5 text-white bg-[#F5B027] hover:bg-[#C78522] disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </main>

        {/* Column 3: Shared Context & AI Brief Panel (Matching Image 3 Right) */}
        <aside className="lg:col-span-4 bg-[#0E121A] border border-white/10 rounded-xl p-5 space-y-5 flex flex-col justify-between">
          <div className="space-y-5">
            {/* Shared Context */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-mono tracking-widest uppercase text-[#9CA3AF] font-semibold mb-2">
                <span>Shared Context</span>
                <span className="text-[#F5B027] text-[10px]">Verified Fit</span>
              </div>
              <p className="text-xs text-[#CBD5E1] leading-relaxed mb-3">
                {activeThread?.sharedContext.summary}
              </p>

              <div className="space-y-2 text-xs pt-2 border-t border-white/5">
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#9CA3AF] block">
                    Shared Interests:
                  </span>
                  <span className="text-[#E2E8F0]">
                    {activeThread?.sharedContext.sharedInterests.join(', ')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#9CA3AF] block">
                    Shared Goals:
                  </span>
                  <span className="text-[#E2E8F0]">
                    {activeThread?.sharedContext.sharedGoals.join(', ')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#9CA3AF] block">
                    Relevant Topics:
                  </span>
                  <span className="text-[#E2E8F0]">
                    {activeThread?.sharedContext.relevantTopics.join(', ')}
                  </span>
                </div>
              </div>
            </div>

            {/* Mutual Connections (3) */}
            <div className="pt-2 border-t border-white/5">
              <div className="flex items-center justify-between text-[11px] font-mono tracking-widest uppercase text-[#9CA3AF] font-semibold mb-2">
                <span>Mutual Connections (3)</span>
                <button
                  onClick={() => onNavigate('people')}
                  className="text-[#F5B027] hover:underline cursor-pointer"
                >
                  View All →
                </button>
              </div>

              <div className="flex items-center gap-2">
                {['Priya Desai', 'Daniel Kim', 'Elena Rossi'].map((name) => (
                  <div key={name} className="flex items-center gap-1.5 p-1 bg-white/[0.03] rounded-lg">
                    <ExecutivePortrait name={name} size="sm" />
                    <span className="text-[10px] text-white truncate max-w-[65px]">{name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Suggested Next Step (AI) */}
            <div className="p-4 bg-[#111622] border border-[#F5B027]/30 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#F5B027] font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Suggested Next Step
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#F5B027]/20 text-[#FFC85C]">
                  AI
                </span>
              </div>

              <p className="text-xs text-[#CBD5E1] leading-relaxed">
                {activeThread?.suggestedNextStep.reasoning}
              </p>

              <button
                onClick={() =>
                  onScheduleMeeting(
                    activeThread?.memberName || 'Marcus Lee',
                    activeThread?.memberTitle || 'General Partner'
                  )
                }
                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-white bg-[#F5B027] hover:bg-[#C78522] rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                Schedule Meeting
              </button>
            </div>

            {/* AI Introduction Brief (BETA) */}
            <div className="p-4 bg-white/[0.02] border border-white/10 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] font-semibold">
                  AI Introduction Brief
                </span>
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-white/5 text-[#CBD5E1]">
                  BETA
                </span>
              </div>
              <p className="text-xs text-[#9CA3AF] line-clamp-3 leading-relaxed">
                {activeThread?.aiIntroductionBrief}
              </p>
              <button
                onClick={() => setShowBriefModal(true)}
                className="text-xs text-[#F5B027] hover:underline cursor-pointer flex items-center gap-1 font-medium pt-1"
              >
                View Full Brief →
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Full Brief Modal */}
      {showBriefModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-[#0E1218] border border-white/10 rounded-2xl p-6 text-[#F2EEE6]">
            <h3 className="font-serif-editorial text-2xl font-bold mb-3">Executive Intro Brief</h3>
            <p className="text-xs text-[#CBD5E1] leading-relaxed mb-6">
              {activeThread?.aiIntroductionBrief}
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowBriefModal(false)}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#F5B027] rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
