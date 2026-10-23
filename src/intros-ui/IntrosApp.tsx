import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isIntroTargetId, submitIntroRequest } from '@/aetheris/lib/intro-request';
import { useNetwork } from '@/aetheris/store';
import { loadMyProfile } from '@/aetheris/live';
import { WriteFailureNotice } from '@/aetheris/WriteFailureNotice';
import { refreshUnread, useUnreadCounts } from '@/aetheris/read-receipts';
import { reportWriteFailure } from '@/aetheris/write-failures';
import './styles.css';

import {
  NETWORK_MEMBERS,
  INITIAL_FEED_POSTS,
  INITIAL_CONVERSATIONS,
  INITIAL_INTRO_REQUESTS,
  NetworkMember,
  FeedPost,
  ConversationThread,
  IntroRequest,
} from './networkData';
import type { ActivePage } from './components/layout/TopNavigation';
import { LedgerDashboard } from './views/LedgerDashboard';
import { LiveExecutiveOverview } from './components/home/LiveExecutiveOverview';
import { LiveInsightsDashboard } from './views/LiveInsightsDashboard';
import { LedgerDirectory } from './views/LedgerDirectory';
import { ProfileDetailView } from './views/ProfileDetailView';
import { MessagesView } from './views/MessagesView';
import { IntrosHubView } from './views/IntrosHubView';
import { ConnectionBubblesView } from './views/ConnectionBubblesView';
import { RequestIntroModal } from './components/modals/RequestIntroModal';
import { ReviewIntroModal } from './components/modals/ReviewIntroModal';
import { ScheduleMeetingModal } from './components/modals/ScheduleMeetingModal';

import { AetherisAppSurface, AetherisAssistantSurface } from '@/aetheris/App';
import { VoiceBar } from '@/aetheris/VoiceBar';
import { SelectionReader } from '@/aetheris/SelectionReader';
import { LiveMessagesView } from './views/LiveMessagesView';
import '@/aetheris/styles.css';
import '@/aetheris/architectural-system.css';
import './messages-readability.css';
import '@/aetheris/executive-options.css';
import '@/aetheris/messages-master-theme.css';
import { LiveMembers } from './liveMembers';
import { ThisWeekPanel } from '@/aetheris/this-week-ui';
import { ActivationChecklist, recordVisit } from '@/aetheris/activation-ui';
import { GiveGetCard, KeepWarmPanel } from '@/aetheris/reciprocity-ui';
import { LiveNotificationsBell } from '@/aetheris/notifications-bell';
import { MeetingReminderBanner } from '@/aetheris/meetings-ui';
import { MembershipCardMailer } from '@/aetheris/membership-card-ui';
import { InviteCard } from '@/aetheris/InviteCard';
import { QuickMenuHost } from '@/aetheris/quick-menu-ui';
import { QuickNoteHost } from '@/aetheris/quick-note-ui';
import { SpecterDetectView } from './views/SpecterDetectView';
import { MemberIntelligenceView } from './views/MemberIntelligenceView';
import { LedgerBridgeShell } from './components/layout/LedgerBridgeShell';
import { LedgerIntroductions } from './views/LedgerIntroductions';
import { LedgerWorkspace } from './views/LedgerWorkspace';
import './views/aetheris-workspace-pages.css';
import './views/network-viewport-density.css';
import './views/workspace-accent.css';
import './views/workspace-burnt-orange-bento.css';
import './views/mobile-workspace.css';
import './views/dashboard-network-density.css';
import './views/mobile-menu-refinement.css';
import './views/mobile-tactile-dashboard.css';

const SHELL_PAGES: ActivePage[] = ['home', 'people', 'bubbles', 'intros', 'messages', 'insights', 'news', 'workspace', 'memory', 'work', 'meetings', 'specter', 'intelligence'];

export type ExecutiveAction = { label: string; onOpen: () => void };

export default function App({ mode = 'demo', executiveAction, initialPage, initialWorkspace, initialSearch }: { mode?: 'demo' | 'live'; executiveAction?: ExecutiveAction | undefined; initialPage?: ActivePage | undefined; initialWorkspace?: string | undefined; initialSearch?: string | undefined }) {
  const network = useNetwork();
  const unread = useUnreadCounts(mode === 'live');
  const [activePage, setActivePage] = useState<ActivePage>(initialPage ?? 'home');
  const [classicPage, setClassicPage] = useState<string>(initialWorkspace ?? 'memory');
  const [selectedProfileId, setSelectedProfileId] = useState<string>(mode === 'live' ? '' : 'marcus-lee');
  const [members, setMembers] = useState<NetworkMember[]>(mode === 'live' ? [] : NETWORK_MEMBERS);
  const [liveDirectoryError, setLiveDirectoryError] = useState('');
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>(mode === 'live' ? [] : INITIAL_FEED_POSTS);
  const [conversations, setConversations] = useState<ConversationThread[]>(mode === 'live' ? [] : INITIAL_CONVERSATIONS);
  const [introRequests, setIntroRequests] = useState<IntroRequest[]>(mode === 'live' ? [] : INITIAL_INTRO_REQUESTS);
  const [connectedMemberIds, setConnectedMemberIds] = useState<Set<string>>(
    new Set(mode === 'live' ? [] : ['marcus-lee', 'sarah-chen'])
  );
  const [savedMemberIds, setSavedMemberIds] = useState<Set<string>>(new Set(mode === 'live' ? [] : ['marcus-lee']));
  const [searchQuery, setSearchQuery] = useState(() => mode === 'live' ? (initialSearch ?? '').trim().slice(0, 120) : '');
  // A router search update can reuse this shell. Apply explicit entry changes
  // without remounting the providers or discarding member feed drafts.
  useEffect(() => { if (initialPage) setActivePage(initialPage); }, [initialPage]);
  useEffect(() => { if (initialWorkspace) setClassicPage(initialWorkspace); }, [initialWorkspace]);
  useEffect(() => { if (mode === 'live' && initialSearch !== undefined) setSearchQuery(initialSearch.trim().slice(0, 120)); }, [mode, initialSearch]);

  // Modals
  const [requestIntroTarget, setRequestIntroTarget] = useState<NetworkMember | null>(null);
  const [reviewIntroRequest, setReviewIntroRequest] = useState<IntroRequest | null>(null);
  const [scheduleMeetingTarget, setScheduleMeetingTarget] = useState<{
    name: string;
    title: string;
  } | null>(null);

  const [me, setMe] = useState<{ name: string; avatarUrl?: string } | null>(null);
  useEffect(() => {
    if (mode !== 'live') return;
    let off = false;
    const loadMe = async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user || off) return;
      const profile = await loadMyProfile(u.user.id);
      if (!off) {
        const name = profile?.name || u.user.email?.split('@')[0] || '';
        const avatarUrl = profile?.avatar_url || '';
        setMe({ name, ...(avatarUrl ? { avatarUrl } : {}) });
      }
    };
    void loadMe();
    const t = setInterval(loadMe, 30000);
    return () => { off = true; clearInterval(t); };
  }, [mode]);

  const [unreadUnavailable, setUnreadUnavailable] = useState(false);
  useEffect(() => {
    if (mode !== 'live') return;
    const fail = () => setUnreadUnavailable(true);
    const success = () => setUnreadUnavailable(false);
    window.addEventListener('aetheris:unread-unavailable', fail);
    window.addEventListener('aetheris:unread-loaded', success);
    return () => {
      window.removeEventListener('aetheris:unread-unavailable', fail);
      window.removeEventListener('aetheris:unread-loaded', success);
    };
  }, [mode]);

  // Use one canonical member-graph state for connection buttons throughout the
  // live workspace. Demo mode alone owns the local temporary connection set.
  const activeConnectedMemberIds = mode === 'live'
    ? new Set(network.connections)
    : connectedMemberIds;

  // Count today's visit once per device for the admin growth report.
  useEffect(() => { if (mode === 'live') void recordVisit(); }, [mode]);

  // Navigation router — only the right-hand content swaps; the shell stays mounted.
  const handleNavigate = (page: ActivePage, memberId?: string) => {
    if (memberId) {
      setSelectedProfileId(memberId);
      setActivePage('profile');
    } else {
      setActivePage(page);
    }
    requestAnimationFrame(() => {
      document.getElementById('aetheris-workspace-content')?.scrollTo({ top: 0 });
    });
  };

  // Interactions
  const handleToggleConnect = (memberId: string) => {
    if (mode === 'live') {
      // Server-confirmed RLS-protected relationship write. The graph's own
      // retry notice handles errors; don't race a second local connection set.
      network.connect(memberId);
      return;
    }
    setConnectedMemberIds(prev => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId); else next.add(memberId);
      return next;
    });
  };

  const handleToggleSaveMember = (memberId: string) => {
    if (mode === 'live') {
      // A private bookmark is only displayed after the server acknowledges the
      // saved relationship. This is the same write-through graph used elsewhere
      // in the authenticated workspace, not a second client-only bookmark.
      const person = network.members.find(member => member.id === memberId);
      network.toggleSave(memberId, person?.name);
      return;
    }
    setSavedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  };

  const handleLikePost = (postId: string) => {
    setFeedPosts((prev) =>
      prev.map((post) => {
        if (post.id === postId) {
          const isLiked = !post.isLiked;
          return {
            ...post,
            isLiked,
            likes: isLiked ? post.likes + 1 : Math.max(0, post.likes - 1),
          };
        }
        return post;
      })
    );
  };

  const handleSavePost = (postId: string) => {
    setFeedPosts((prev) =>
      prev.map((post) =>
        post.id === postId ? { ...post, isSaved: !post.isSaved } : post
      )
    );
  };

  const handleAddPost = (content: string, badge?: FeedPost['badge']) => {
    const newPost: FeedPost = {
      id: `post-${Date.now()}`,
      authorId: 'sarah-chen',
      authorName: 'Sarah Chen',
      authorTitle: 'Founder & CEO at Vercelity',
      authorCompany: 'Vercelity',
      timeAgo: 'Just now',
      badge: badge || 'Insight',
      content,
      likes: 1,
      shares: 0,
      comments: 0,
      isLiked: true,
      isSaved: false,
    };
    setFeedPosts([newPost, ...feedPosts]);
  };

  const handleSendMessage = (threadId: string, text: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setConversations((prev) =>
      prev.map((thread) => {
        if (thread.id === threadId) {
          const newMsg = {
            id: `msg-${Date.now()}`,
            senderId: 'sarah-chen',
            senderName: 'Sarah Chen',
            text,
            timestamp: timeStr,
            isOwn: true,
          };
          return {
            ...thread,
            lastMessageSnippet: text,
            lastMessageTime: timeStr,
            messages: [...thread.messages, newMsg],
          };
        }
        return thread;
      })
    );
  };

  const handleSendIntroRequest = async (targetId: string, note: string): Promise<'created' | 'existing'> => {
    if (mode === 'live') {
      if (!isIntroTargetId(targetId) || !members.some(member => member.id === targetId)) {
        throw new Error('This person is not in the verified live directory. Reload People before requesting an introduction.')
      }
      return submitIntroRequest(targetId, note);
    }
    // The labelled /demo showcase is not the live member network.
    setIntroRequests(previous => [{ id: `demo-intro-${Date.now()}`, targetId, note } as unknown as IntroRequest, ...previous]);
    return 'created';
  };

  const handleAcceptIntroRequest = (reqId: string) => {
    setIntroRequests((prev) => prev.filter((r) => r.id !== reqId));
  };

  const handleDismissIntroRequest = (reqId: string) => {
    setIntroRequests((prev) => prev.filter((r) => r.id !== reqId));
  };

  // Find active profile
  const currentProfileMember =
    mode === 'live' ? members.find((m) => m.id === selectedProfileId) : (members.find((m) => m.id === selectedProfileId) || members[0]);
  // "Open deal room" anywhere in the product lands on the Deals workspace page.
  useEffect(() => {
    const open = (e: Event) => { e.preventDefault(); setClassicPage('deals'); handleNavigate('workspace'); };
    window.addEventListener('aetheris:open-deals', open);
    return () => window.removeEventListener('aetheris:open-deals', open);
  }, []);
  const classicPages = ['news','workspace','memory','work','insights','meetings','specter', ...(mode === 'live' ? ['home','messages','intros','people'] : [])];

  return (
    <div className="ix-aetheris-workspace-mode ix-root ix-mindprint-bridge ix-absolute-ledger ledger-native-app min-h-screen bg-[#0a0a0a] text-[#f5f5f0] flex flex-col font-sans selection:bg-red-700/30 selection:text-white relative">
      <WriteFailureNotice />
      {/* Right-click quick menu (each member chooses its items) */}
      <QuickMenuHost
        live={mode === 'live'}
        onGo={(t) => {
          if (t.kind === 'workspace') { setClassicPage(t.page); handleNavigate('workspace'); }
          else handleNavigate(t.page);
        }}
        findMember={(id) => { const m = members.find((x) => x.id === id); return m ? { id: m.id, name: m.name } : null; }}
        onOpenMember={(id) => handleNavigate('people', id)}
        onRequestIntro={(id) => { const m = members.find((x) => x.id === id); if (m) setRequestIntroTarget(m); }}
        onSearch={(text) => { setSearchQuery(text); handleNavigate('people'); }}
      />

      <QuickNoteHost />

      {/* Universal Top Navigation Contract */}
      {mode === 'live' && activePage !== 'specter' && unreadUnavailable && <div role="alert" className="mx-4 mt-2 rounded-lg border border-red-400/40 px-3 py-2 text-xs text-[#FFD6D6]">
        Unread counts could not be loaded. Do not assume your inbox is clear.
        <button type="button" className="ml-2 underline font-semibold" onClick={() => void refreshUnread()}>Retry</button>
      </div>}
      {mode === 'live' && activePage !== 'specter' && network.networkLoadError && <section role="alert" aria-live="polite"
        className="mx-3 sm:mx-6 my-3 rounded-xl border border-[#c9a673] bg-[#fff5e4] px-4 py-3 text-[#27343a] shadow-sm">
        <p className="text-sm font-semibold">Live network data is unavailable.</p>
        <p className="mt-1 text-sm">Posts, asks, relationships or messages may not have loaded. No sample profiles are being substituted for real members; do not assume an empty network or a sent request.</p>
        <details className="mt-2 text-xs"><summary className="cursor-pointer font-semibold">Technical details</summary>
          <p className="mt-1 break-words">{network.networkLoadError}</p></details>
        <button type="button" className="mt-2 rounded-md bg-[#28587d] px-3 py-2 text-sm font-semibold text-white" onClick={() => window.location.reload()}>
          Retry network connection
        </button>
      </section>}
      {mode === 'live' && <LiveMembers onMembers={setMembers} onError={setLiveDirectoryError} />}
      {mode === 'live' && activePage !== 'specter' && <MeetingReminderBanner onJoin={() => handleNavigate('meetings')} />}
      {mode === 'live' && activePage !== 'specter' && <MembershipCardMailer />}
      {/* Primary Page Views — one persistent workspace shell; only the right pane swaps. */}
      <LedgerBridgeShell
          activePage={activePage}
          activeTool={classicPage}
          onNavigate={handleNavigate}
          onOpenTool={tool => { setClassicPage(tool); handleNavigate('workspace'); }}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          members={members}
          mode={mode}
          me={mode === 'live' ? me : null}
          onOpenMyProfile={() => { setClassicPage('profile'); handleNavigate('workspace'); }}
          unreadCount={mode === 'live' ? (unread.loaded && !unreadUnavailable ? unread.total : null) : 0}
          executiveAction={executiveAction}
          notifications={mode === 'live' ? <LiveNotificationsBell onOpen={destination => {
            if (destination === 'peergroups' || destination === 'events' || destination === 'deals') {
              setClassicPage(destination);
              handleNavigate('workspace');
            } else handleNavigate(destination);
          }}/> : undefined}
      >
      <main className="flex-1 arch-product-main" data-arch-page={activePage}>
        {activePage === 'home' && (
          <LedgerDashboard
            posts={feedPosts}
            onNavigate={handleNavigate}
            onRequestIntro={(member) => setRequestIntroTarget(member)}
            onLikePost={handleLikePost}
            onSavePost={handleSavePost}
            onAddPost={handleAddPost}
            members={members}
            live={mode === 'live'}
            unreadCount={mode === 'live' ? (unread.loaded && !unreadUnavailable ? unread.total : null) : 0}
            socialFeed={mode === 'live' ? <div className="ix-classic"><AetherisAppSurface  feedOnly  /></div> : undefined}
            liveOverview={mode === 'live' ? <LiveExecutiveOverview onNavigate={handleNavigate} onWorkspace={page => { setClassicPage(page); handleNavigate('workspace'); }} /> : undefined}
            actionQueue={mode === 'live' ? <div className="rc-stack">
              <ActivationChecklist onOpen={(target) => {
                if (target === 'intros') { handleNavigate('intros'); return; }
                setClassicPage(target);
                handleNavigate('workspace');
              }} />
              <ThisWeekPanel onOpen={(target) => {
                if (target === 'intros') { handleNavigate('intros'); return; }
                setClassicPage(target);
                handleNavigate('workspace');
              }} />
              <KeepWarmPanel onMessage={() => handleNavigate('messages')} />
              <GiveGetCard onOpenAsks={() => { setClassicPage('needs'); handleNavigate('workspace'); }} />
            </div> : undefined}
          />
        )}

        {activePage === 'people' && (
          <>
            {mode === 'live' && liveDirectoryError && <div role="alert" className="mx-4 my-3 border border-red-400/40 p-3 text-sm text-red-200">The verified directory did not load: {liveDirectoryError}. Demo profiles are never substituted.</div>}
            <LedgerDirectory
              members={members}
              isLive={mode === 'live'}
              connectedMemberIds={activeConnectedMemberIds}
              savedMemberIds={mode === 'live' ? new Set(network.saved) : savedMemberIds}
              onToggleConnect={handleToggleConnect}
              onToggleSave={handleToggleSaveMember}
              onRequestIntro={member => setRequestIntroTarget(member)}
              onNavigate={handleNavigate}
              searchQuery={searchQuery}
            />
          </>
        )}
        {activePage === 'intros' && (
          <LedgerIntroductions
            requests={introRequests}
            members={members}
            live={mode === 'live'}
            onNavigate={handleNavigate}
            onReview={req => setReviewIntroRequest(req)}
            onDismiss={handleDismissIntroRequest}
            onRequest={member => setRequestIntroTarget(member)}
          >
            {mode === 'live' && <div className="ix-classic"><InviteCard /><AetherisAppSurface key="live-intros" startPage="intros" /></div>}
          </LedgerIntroductions>
        )}

        {activePage === 'bubbles' && (
          <ConnectionBubblesView
            members={members}
            onNavigate={handleNavigate}
            onRequestIntro={(member) => setRequestIntroTarget(member)}
          />
        )}

        {mode === 'live' && activePage === 'profile' && !currentProfileMember && <div role="alert" className="mx-auto my-6 max-w-xl rounded-xl border border-[#cbd7da] bg-[#fffdfa] p-5 text-[#203139]">
          <h2 className="text-lg font-semibold">Select a verified live member.</h2>
          <p className="mt-2 text-sm">This profile is not in the current approved member directory. No sample account or another member was substituted.</p>
          <button className="mt-4 rounded-md bg-[#28587d] px-4 py-2 text-sm font-semibold text-white" onClick={() => handleNavigate('people')}>Back to People</button>
        </div>}
        {activePage === 'profile' && currentProfileMember && (
          <ProfileDetailView
            member={currentProfileMember}
            onBack={() => handleNavigate('people')}
            onNavigate={handleNavigate}
            onRequestIntro={(member) => setRequestIntroTarget(member)}
            isSaved={mode === 'live' ? network.saved.includes(currentProfileMember.id) : savedMemberIds.has(currentProfileMember.id)}
            onToggleSave={handleToggleSaveMember}
          />
        )}

        {mode === 'live' && activePage === 'messages' && <LiveMessagesView onOpenWorkspaces={() => { setClassicPage('workspaces'); handleNavigate('workspace'); }} />}
        {mode !== 'live' && activePage === 'messages' && (
          <MessagesView
            conversations={conversations}
            introRequests={introRequests}
            onNavigate={handleNavigate}
            onReviewIntroRequest={(req) => setReviewIntroRequest(req)}
            onDismissIntroRequest={handleDismissIntroRequest}
            onScheduleMeeting={(name, title) =>
              setScheduleMeetingTarget({ name, title })
            }
            onSendMessage={handleSendMessage}
          />
        )}

        {activePage === 'insights' && (
          mode === 'live' ? <LiveInsightsDashboard onNavigate={handleNavigate} />
            : <div className="ix-classic"><AetherisAppSurface key="demo-insights" startPage="insights" /></div>
        )}

        {activePage === 'news' && <div className="ix-classic"><AetherisAppSurface key="news"  startPage="news"  /></div>}
        {activePage === 'memory' && <div className="ix-classic"><AetherisAppSurface key="memory"  startPage="memory"  /></div>}
        {activePage === 'meetings' && <div className="ix-classic"><AetherisAppSurface key="meetings"  startPage="meetings"  /></div>}
        {activePage === 'work' && <div className="ix-classic"><AetherisAppSurface key="work"  startPage="work"  /></div>}
        {activePage === 'intelligence' && <MemberIntelligenceView live={mode === 'live'} onNavigate={handleNavigate} />}
        {activePage === 'specter' && <SpecterDetectView embedded onNavigate={handleNavigate} onWorkspace={page=>{setClassicPage(page);handleNavigate('workspace');}} onSearch={query=>{setSearchQuery(query);handleNavigate('people');}} searchQuery={searchQuery} onSearchChange={setSearchQuery} member={me} notifications={mode === 'live' ? <LiveNotificationsBell onOpen={destination=>{if(destination==='peergroups'||destination==='events'||destination==='deals'){setClassicPage(destination);handleNavigate('workspace');}else handleNavigate(destination);}}/> : undefined}/> }
        {activePage === 'workspace' && <LedgerWorkspace activeTool={classicPage} onChange={setClassicPage}>
          <div className="ix-classic"><AetherisAppSurface key={classicPage} startPage={classicPage as any} /></div>
        </LedgerWorkspace>}
      </main>
      </LedgerBridgeShell>


      {/* Interactive Modals */}
      <RequestIntroModal
        isOpen={Boolean(requestIntroTarget)}
        onClose={() => setRequestIntroTarget(null)}
        targetMember={requestIntroTarget}
        onSendRequest={handleSendIntroRequest}
      />

      <ReviewIntroModal
        isOpen={Boolean(reviewIntroRequest)}
        onClose={() => setReviewIntroRequest(null)}
        request={reviewIntroRequest}
        onAccept={handleAcceptIntroRequest}
        onDismiss={handleDismissIntroRequest}
      />

      <ScheduleMeetingModal
        isOpen={Boolean(scheduleMeetingTarget)}
        onClose={() => setScheduleMeetingTarget(null)}
        memberName={scheduleMeetingTarget?.name || ''}
        memberTitle={scheduleMeetingTarget?.title || ''}
      />
      {!classicPages.includes(activePage) && (<>
        <AetherisAssistantSurface
          page={activePage}
          onNavigate={(p) => {
            if ((SHELL_PAGES as string[]).includes(p)) handleNavigate(p as ActivePage);
            else { setClassicPage(p); handleNavigate('workspace'); }
          }}
          onOpenMember={(id) => handleNavigate('people', id)}
          onMessageMember={() => handleNavigate('messages')}
          onRequestIntro={(id) => { const m = members.find((x) => x.id === id); if (m) setRequestIntroTarget(m); }}
          onSearch={(text) => { setSearchQuery(text); handleNavigate('people'); }}
        />
        <VoiceBar />
        <SelectionReader />
      </>)}
    </div>
  );
}
