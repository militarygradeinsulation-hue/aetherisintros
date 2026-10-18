// @ts-nocheck
import React, { useState } from 'react';
import '../message-thread-contrast.css';
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
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6 animate-fadeIn ix-messages">
      {/* Editorial Hero Banner (Matching Image 3) */}
      <section className="relative overflow-hidden rounded-2xl border border-[var(--msg-border)] msg-hero p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Hero Left: Headline & Metrics */}
          <div className="lg:col-span-8 space-y-4">
            <div className="text-[10px] md:text-xs font-mono uppercase tracking-[0.25em] text-[var(--msg-muted)] font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--msg-accent)]" />
              Messages / Introductions
            </div>

            <h1 className="font-serif-editorial text-3xl sm:text-4xl md:text-5xl lg:text-5xl text-[var(--msg-ink)] leading-[1.1] tracking-tight">
              Every conversation should move business{' '}
              <span className="text-[var(--msg-copper)]">forward.</span>
            </h1>

            <p className="text-sm md:text-base text-[var(--msg-muted)] max-w-xl">
              Meaningful introductions. Real conversations. Greater outcomes.
            </p>

            <div className="flex items-center gap-6 sm:gap-10 pt-3 border-t border-[var(--msg-border)] font-mono">
              <div>
                <div className="text-xl md:text-2xl font-serif-editorial font-bold text-[var(--msg-ink)]">
                  1,248
                </div>
                <div className="text-[10px] text-[var(--msg-muted)] uppercase">Active Professionals</div>
              </div>
              <div className="w-[1px] h-8 bg-[var(--msg-border)]" />
              <div>
                <div className="text-xl md:text-2xl font-serif-editorial font-bold text-[var(--msg-ink)]">
                  312
                </div>
                <div className="text-[10px] text-[var(--msg-muted)] uppercase">Companies</div>
              </div>
              <div className="w-[1px] h-8 bg-[var(--msg-border)]" />
              <div>
                <div className="text-xl md:text-2xl font-serif-editorial font-bold text-[var(--msg-ink)]">
                  92%
                </div>
                <div className="text-[10px] text-[var(--msg-muted)] uppercase">Intro Lead to Chat</div>
              </div>
            </div>
          </div>

          {/* Hero Right: Constellation & Quote Callout (Matching Image 3) */}
          <div className="lg:col-span-4 flex flex-col items-center text-center space-y-3">
            <div className="w-36 h-36 relative">
              <ConstellationGraphic variant="hero-nodes" />
            </div>
            <p className="text-xs italic text-[var(--msg-body)] max-w-xs">
              “The right people turn conversations into compound opportunity.”
            </p>
          </div>
        </div>
      </section>

      {/* Active Introduction Requests Bar (Matching Image 3) */}
      {introRequests.length > 0 && (
        <section className="bg-[var(--msg-panel)] border border-[var(--msg-border)] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-[11px] font-mono tracking-widest uppercase text-[var(--msg-muted)] font-semibold">
            <span>Active Introduction Requests</span>
            <span className="text-[var(--msg-copper)]">{introRequests.length} Pending</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {introRequests.map((req) => (
              <div
                key={req.id}
                className="bg-[var(--msg-panel-inset)] border border-[var(--msg-border)] rounded-lg p-3.5 flex flex-col justify-between space-y-3 hover:border-[var(--msg-accent)] transition-all"
              >
                <div>
                  <div className="flex items-start justify-between text-[10px] font-mono text-[var(--msg-muted)] mb-2">
                    <span>{req.date}</span>
                    <span className="text-[var(--msg-copper)]">Warm Request</span>
                  </div>

                  <div className="flex items-center gap-2 mb-2 p-1.5 bg-[var(--msg-selected)] rounded-lg border border-[var(--msg-border)]">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <ExecutivePortrait name={req.requesterName} size="sm" />
                      <div className="min-w-0">
                        <div className="msg-thread-name text-xs font-semibold text-[var(--msg-ink)] truncate">{req.requesterName}</div>
                        <div className="text-[10px] text-[var(--msg-muted)] truncate">{req.requesterCompany}</div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[var(--msg-copper)] shrink-0" />
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <ExecutivePortrait name={req.targetName} size="sm" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[var(--msg-ink)] truncate">{req.targetName}</div>
                        <div className="text-[10px] text-[var(--msg-muted)] truncate">{req.targetCompany}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[var(--msg-border)]">
                  <button
                    onClick={() => onReviewIntroRequest(req)}
                    className="msg-primary-action flex-1 py-1 text-xs font-semibold text-[var(--msg-accent-ink)] bg-[var(--msg-accent)] hover:bg-[var(--msg-accent-hover)] rounded transition-colors cursor-pointer text-center"
                  >
                    Review
                  </button>
                  <button
                    onClick={() => onDismissIntroRequest(req.id)}
                    className="px-2.5 py-1 text-xs text-[var(--msg-muted)] hover:text-[var(--msg-ink)] border border-[var(--msg-border)] rounded transition-colors cursor-pointer"
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
        <aside className="lg:col-span-3 bg-[var(--msg-panel)] border border-[var(--msg-border)] rounded-xl p-4 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif-editorial text-base font-bold text-[var(--msg-ink)] tracking-wide">
                Messages
              </h3>
              <button
                onClick={() => {
                  if (conversations[1]) setSelectedThreadId(conversations[1].id);
                }}
                className="msg-primary-action flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[var(--msg-accent-ink)] bg-[var(--msg-accent)] hover:bg-[var(--msg-accent-hover)] rounded-md transition-colors cursor-pointer"
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
                  aria-pressed={activeFolder === f.id}
                  onClick={() => setActiveFolder(f.id as any)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    activeFolder === f.id
                      ? 'bg-[var(--msg-selected)] text-[var(--msg-copper)] font-medium'
                      : 'text-[var(--msg-muted)] hover:bg-[var(--msg-selected)] hover:text-[var(--msg-ink)]'
                  }`}
                >
                  <span>{f.label}</span>
                  {f.count !== undefined && (
                    <span className="font-mono text-[10px] text-[var(--msg-muted)]">{f.count}</span>
                  )}
                </button>
              ))}
            </nav>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--msg-muted)]" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search conversations..."
                className="w-full bg-[var(--msg-panel-inset)] text-xs text-[var(--msg-ink)] placeholder:text-[var(--msg-muted)] rounded-lg pl-8 pr-3 py-1.5 border border-[var(--msg-border)] focus:outline-none focus:border-[var(--msg-accent)]"
              />
            </div>

            {/* Conversation Threads List */}
            <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
              {filteredThreads.map((thread) => {
                const isSelected = thread.id === selectedThreadId;
                return (
                  <div
                    key={thread.id}
                    data-selected={isSelected}
                    onClick={() => setSelectedThreadId(thread.id)}
                    className={`msg-thread-tile p-2.5 rounded-lg cursor-pointer transition-all flex items-start gap-2.5 ${
                      isSelected
                        ? 'bg-[var(--msg-selected)] border border-[var(--msg-accent)] shadow-sm'
                        : 'hover:bg-[var(--msg-hover)] border border-transparent'
                    }`}
                  >
                    <ExecutivePortrait name={thread.memberName} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[var(--msg-ink)] truncate">
                          {thread.memberName}
                        </span>
                        <span className="text-[10px] font-mono text-[var(--msg-muted)] shrink-0">
                          {thread.lastMessageTime}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--msg-muted)] truncate mt-0.5">
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
        <main className="lg:col-span-5 bg-[var(--msg-panel)] border border-[var(--msg-border)] rounded-xl flex flex-col justify-between overflow-hidden shadow-sm">
          {/* Active Chat Header */}
          {activeThread && (
            <div className="p-4 border-b border-[var(--msg-border)] flex items-center justify-between bg-[var(--msg-panel-inset)]">
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
                      className="font-serif-editorial text-sm font-bold text-[var(--msg-ink)] hover:text-[var(--msg-copper)] transition-colors cursor-pointer"
                    >
                      {activeThread.memberName}
                    </h3>
                    {activeThread.verified && (
                      <CheckCircle className="w-3.5 h-3.5 text-[var(--msg-copper)]" />
                    )}
                  </div>
                  <p className="text-xs text-[var(--msg-muted)]">
                    {activeThread.memberTitle}, {activeThread.memberCompany}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {activeThread.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="text-[9px] text-[var(--msg-muted)] bg-[var(--msg-selected)] px-1.5 py-0.2 rounded"
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
                  className="px-3 py-1.5 text-xs text-[var(--msg-muted)] hover:text-[var(--msg-ink)] border border-[var(--msg-border)] hover:border-[var(--msg-accent)] rounded-lg transition-colors cursor-pointer"
                >
                  View Profile
                </button>
                <button className="p-1.5 text-[var(--msg-muted)] hover:text-[var(--msg-ink)] transition-colors cursor-pointer">
                  <Star className="w-4 h-4" />
                </button>
                <button className="p-1.5 text-[var(--msg-muted)] hover:text-[var(--msg-ink)] transition-colors cursor-pointer">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Chat Messages History */}
          <div className="msg-chat-body flex-1 p-5 space-y-4 overflow-y-auto max-h-[460px]">
            <div className="text-center">
              <span className="text-[10px] font-mono text-[var(--msg-muted)] uppercase tracking-wider">
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
                    className={`msg-body-text rounded-2xl p-3.5 leading-relaxed ${
                      msg.isOwn
                        ? 'msg-outgoing bg-[var(--msg-outgoing)] text-[var(--msg-ink)] rounded-br-xs'
                        : 'msg-incoming bg-[var(--msg-incoming)] text-[var(--msg-ink)] border border-[var(--msg-border)] rounded-bl-xs'
                    }`}
                  >
                    {msg.text}
                  </div>

                  <div className={`flex items-center gap-2 text-[10px] text-[var(--msg-muted)] px-1 ${msg.isOwn ? 'justify-end' : 'justify-start'}`}>
                    <span>{msg.timestamp}</span>
                    {msg.reactions && (
                      <span className="bg-[var(--msg-selected)] border border-[var(--msg-border)] px-1.5 py-0.2 rounded text-[10px] text-[var(--msg-ink)]">
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
          <form onSubmit={handleSend} className="p-3 border-t border-[var(--msg-border)] bg-[var(--msg-panel-inset)]">
            <div className="flex items-center gap-2 bg-[var(--msg-panel)] border border-[var(--msg-border)] rounded-xl px-3 py-1.5">
              <button
                type="button"
                className="text-[var(--msg-muted)] hover:text-[var(--msg-ink)] p-1 cursor-pointer"
                title="Add attachment"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <input
                type="text"
                value={draftMessage}
                onChange={(e) => setDraftMessage(e.target.value)}
                placeholder="Write a message..."
                className="flex-1 bg-transparent text-xs text-[var(--msg-ink)] placeholder:text-[var(--msg-muted)] focus:outline-none py-1.5"
              />
              <button
                type="button"
                className="text-[var(--msg-muted)] hover:text-[var(--msg-ink)] p-1 cursor-pointer"
                title="Add emoji"
              >
                <Smile className="w-4 h-4" />
              </button>
              <button
                type="submit"
                disabled={!draftMessage.trim()}
                className="msg-primary-action p-1.5 text-[var(--msg-accent-ink)] bg-[var(--msg-accent)] hover:bg-[var(--msg-accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </main>

        {/* Column 3: Shared Context & AI Brief Panel (Matching Image 3 Right) */}
        <aside className="lg:col-span-4 bg-[var(--msg-panel)] border border-[var(--msg-border)] rounded-xl p-5 space-y-5 flex flex-col justify-between">
          <div className="space-y-5">
            {/* Shared Context */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-mono tracking-widest uppercase text-[var(--msg-muted)] font-semibold mb-2">
                <span>Shared Context</span>
                <span className="text-[var(--msg-copper)] text-[10px]">Verified Fit</span>
              </div>
              <p className="msg-body-text text-[var(--msg-body)] leading-relaxed mb-3">
                {activeThread?.sharedContext.summary}
              </p>

              <div className="space-y-2 text-xs pt-2 border-t border-[var(--msg-border)]">
                <div>
                  <span className="text-[10px] font-mono uppercase text-[var(--msg-muted)] block">
                    Shared Interests:
                  </span>
                  <span className="text-[var(--msg-ink)]">
                    {activeThread?.sharedContext.sharedInterests.join(', ')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-[var(--msg-muted)] block">
                    Shared Goals:
                  </span>
                  <span className="text-[var(--msg-ink)]">
                    {activeThread?.sharedContext.sharedGoals.join(', ')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-[var(--msg-muted)] block">
                    Relevant Topics:
                  </span>
                  <span className="text-[var(--msg-ink)]">
                    {activeThread?.sharedContext.relevantTopics.join(', ')}
                  </span>
                </div>
              </div>
            </div>

            {/* Mutual Connections (3) */}
            <div className="pt-2 border-t border-[var(--msg-border)]">
              <div className="flex items-center justify-between text-[11px] font-mono tracking-widest uppercase text-[var(--msg-muted)] font-semibold mb-2">
                <span>Mutual Connections (3)</span>
                <button
                  onClick={() => onNavigate('people')}
                  className="text-[var(--msg-copper)] hover:underline cursor-pointer"
                >
                  View All →
                </button>
              </div>

              <div className="flex items-center gap-2">
                {['Priya Desai', 'Daniel Kim', 'Elena Rossi'].map((name) => (
                  <div key={name} className="flex items-center gap-1.5 p-1 bg-[var(--msg-selected)] rounded-lg">
                    <ExecutivePortrait name={name} size="sm" />
                    <span className="text-[10px] text-[var(--msg-ink)] truncate max-w-[65px]">{name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Suggested Next Step (AI) */}
            <div className="msg-next-step p-4 bg-[var(--msg-note)] border border-[var(--msg-copper)] rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--msg-copper)] font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Suggested Next Step
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[var(--msg-selected)] text-[var(--msg-copper)]">
                  AI
                </span>
              </div>

              <p className="msg-body-text text-[var(--msg-body)] leading-relaxed">
                {activeThread?.suggestedNextStep.reasoning}
              </p>

              <button
                onClick={() =>
                  onScheduleMeeting(
                    activeThread?.memberName || 'Marcus Lee',
                    activeThread?.memberTitle || 'General Partner'
                  )
                }
                className="msg-primary-action w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-[var(--msg-accent-ink)] bg-[var(--msg-accent)] hover:bg-[var(--msg-accent-hover)] rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                Schedule Meeting
              </button>
            </div>

            {/* AI Introduction Brief (BETA) */}
            <div className="msg-brief-panel p-4 bg-[var(--msg-panel-inset)] border border-[var(--msg-border)] rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--msg-muted)] font-semibold">
                  AI Introduction Brief
                </span>
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[var(--msg-selected)] text-[var(--msg-body)]">
                  BETA
                </span>
              </div>
              <p className="msg-body-text text-[var(--msg-muted)] line-clamp-3 leading-relaxed">
                {activeThread?.aiIntroductionBrief}
              </p>
              <button
                onClick={() => setShowBriefModal(true)}
                className="text-xs text-[var(--msg-copper)] hover:underline cursor-pointer flex items-center gap-1 font-medium pt-1"
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
          <div className="relative w-full max-w-md bg-[var(--msg-panel)] border border-[var(--msg-border)] rounded-2xl p-6 text-[var(--msg-ink)]">
            <h3 className="font-serif-editorial text-2xl font-bold mb-3">Executive Intro Brief</h3>
            <p className="msg-body-text text-[var(--msg-body)] leading-relaxed mb-6">
              {activeThread?.aiIntroductionBrief}
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowBriefModal(false)}
                className="msg-primary-action px-4 py-2 text-xs font-semibold text-[var(--msg-accent-ink)] bg-[var(--msg-accent)] rounded-lg cursor-pointer"
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
