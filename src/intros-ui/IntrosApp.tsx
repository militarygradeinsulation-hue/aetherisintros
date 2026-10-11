// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import './styles.css';
import { AccentProvider } from './AccentMode';
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
import { TopNavigation, ActivePage } from './components/layout/TopNavigation';
import { EditorialFooter } from './components/layout/EditorialFooter';
import { HomeFeedView } from './views/HomeFeedView';
import { PeopleDirectoryView } from './views/PeopleDirectoryView';
import { ProfileDetailView } from './views/ProfileDetailView';
import { MessagesView } from './views/MessagesView';
import { InsightsDashboardView } from './views/InsightsDashboardView';
import { IntrosHubView } from './views/IntrosHubView';
import { ConnectionBubblesView } from './views/ConnectionBubblesView';
import { RequestIntroModal } from './components/modals/RequestIntroModal';
import { ReviewIntroModal } from './components/modals/ReviewIntroModal';
import { ScheduleMeetingModal } from './components/modals/ScheduleMeetingModal';
import { FloatingConnectionField } from './components/shared/FloatingConnectionField';
import { X, Orbit } from 'lucide-react';
import ClassicApp, { AetherisAssistant } from '@/aetheris/App';
import { VoiceBar } from '@/aetheris/VoiceBar';
import { SelectionReader } from '@/aetheris/SelectionReader';
import { LiveMessagesView } from './views/LiveMessagesView';
import { useUnreadCounts } from '@/aetheris/read-receipts';
import '@/aetheris/styles.css';
import { useAetherisNews } from '@/aetheris/news';
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

const SHELL_PAGES: ActivePage[] = ['home', 'people', 'bubbles', 'intros', 'messages', 'insights', 'news', 'workspace', 'memory', 'work', 'meetings'];

function NewsTicker({ onOpen }: { onOpen: () => void }) {
  const { data } = useAetherisNews();
  const items = (data?.items ?? []).slice(0, 8);
  if (!items.length) return null;
  return <button onClick={onOpen} className="w-full overflow-hidden border-b border-white/10 bg-[#0E1116] py-2 text-left">
    <div className="flex gap-10 whitespace-nowrap px-4 text-xs text-[#9CA3AF] animate-[ixmarquee_60s_linear_infinite]">
      <span className="font-mono tracking-[0.2em] text-[#F4A125]">LIVE NEWS</span>
      {items.map((n: any) => <span key={n.id}><b className="text-[#F2EEE6] font-medium">{n.title}</b> · {n.source}</span>)}
    </div>
  </button>;
}

export default function App({ mode = 'demo' }: { mode?: 'demo' | 'live' }) {
  const [activePage, setActivePage] = useState<ActivePage>('home');
  const [classicPage, setClassicPage] = useState<string>('memory');
  const [selectedProfileId, setSelectedProfileId] = useState<string>('marcus-lee');
  const [members, setMembers] = useState<NetworkMember[]>(mode === 'live' ? [] : NETWORK_MEMBERS);
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>(mode === 'live' ? [] : INITIAL_FEED_POSTS);
  const [conversations, setConversations] = useState<ConversationThread[]>(mode === 'live' ? [] : INITIAL_CONVERSATIONS);
  const [introRequests, setIntroRequests] = useState<IntroRequest[]>(mode === 'live' ? [] : INITIAL_INTRO_REQUESTS);
  const [connectedMemberIds, setConnectedMemberIds] = useState<Set<string>>(
    new Set(mode === 'live' ? [] : ['marcus-lee', 'sarah-chen'])
  );
  const [savedMemberIds, setSavedMemberIds] = useState<Set<string>>(new Set(mode === 'live' ? [] : ['marcus-lee']));
  const [searchQuery, setSearchQuery] = useState('');
  const [showConstellationOverlay, setShowConstellationOverlay] = useState(false);

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
      const { data } = await supabase.from('profiles').select('name, avatar_url').eq('id', u.user.id).maybeSingle();
      if (!off) setMe({ name: data?.name || u.user.email?.split('@')[0] || '', avatarUrl: data?.avatar_url || undefined });
    };
    void loadMe();
    const t = setInterval(loadMe, 30000);
    return () => { off = true; clearInterval(t); };
  }, [mode]);

  // Count today's visit once per device for the admin growth report.
  useEffect(() => { if (mode === 'live') void recordVisit(); }, [mode]);

  // Navigation router
  const handleNavigate = (page: ActivePage, memberId?: string) => {
    if (memberId) {
      setSelectedProfileId(memberId);
      setActivePage('profile');
    } else {
      setActivePage(page);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Interactions
  const handleToggleConnect = (memberId: string) => {
    setConnectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  };

  const handleToggleSaveMember = (memberId: string) => {
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

  const handleSendIntroRequest = (targetId: string, note: string) => {
    // Successfully handled
  };

  const handleAcceptIntroRequest = (reqId: string) => {
    setIntroRequests((prev) => prev.filter((r) => r.id !== reqId));
  };

  const handleDismissIntroRequest = (reqId: string) => {
    setIntroRequests((prev) => prev.filter((r) => r.id !== reqId));
  };

  // Find active profile
  const currentProfileMember =
    members.find((m) => m.id === selectedProfileId) || members[0];
  const liveUnread = useUnreadCounts(mode === 'live');
  const classicPages = ['news','workspace','memory','work','insights','meetings', ...(mode === 'live' ? ['home','messages','intros','people'] : [])];

  return (
    <AccentProvider>
    <div className="ix-root min-h-screen bg-[#07090C] text-[#F2EEE6] flex flex-col font-sans selection:bg-[#F5B027]/30 selection:text-white relative">
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
      <TopNavigation
        activePage={activePage}
        onNavigate={handleNavigate}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        unreadCount={mode === 'live' ? liveUnread.total : 12}
        onToggleConstellationOverlay={() => handleNavigate('bubbles')}
        me={mode === 'live' ? me : undefined}
        onOpenMyProfile={mode === 'live' ? () => { setClassicPage('profile'); handleNavigate('workspace'); } : undefined}
        bell={mode === 'live' ? <LiveNotificationsBell onOpen={(destination) => {
          if (destination === 'peergroups' || destination === 'events') { setClassicPage(destination); handleNavigate('workspace'); return; }
          handleNavigate(destination);
        }} /> : undefined}
      />

      {mode === 'live' && <LiveMembers onMembers={setMembers} />}
      {mode === 'live' && <MeetingReminderBanner onJoin={() => handleNavigate('meetings')} />}
      {mode === 'live' && <MembershipCardMailer />}
      <NewsTicker onOpen={() => handleNavigate('news')} />
      {/* Primary Page Views */}
      <main className="flex-1">
        {activePage === 'home' && (
          <HomeFeedView
            posts={feedPosts}
            onNavigate={handleNavigate}
            onRequestIntro={(member) => setRequestIntroTarget(member)}
            onLikePost={handleLikePost}
            onSavePost={handleSavePost}
            onAddPost={handleAddPost}
            networkMembers={members}
            isLive={mode === 'live'}
            socialFeed={mode === 'live' ? <div className="ix-classic"><ClassicApp mode="live" feedOnly /></div> : undefined}
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
            me={mode === 'live' ? me : undefined}
          />
        )}

        {(activePage === 'people' || activePage === 'intros') && (
          <>
            {mode === 'live'
              ? <div className="ix-classic"><InviteCard /><ClassicApp key="live-intros" mode={mode} startPage="intros" /></div>
              : <IntrosHubView
                  introRequests={introRequests}
                  networkMembers={members}
                  onNavigate={handleNavigate}
                  onReviewRequest={(req) => setReviewIntroRequest(req)}
                  onDismissRequest={handleDismissIntroRequest}
                  onRequestIntro={(member) => setRequestIntroTarget(member)}
                />}
            <div className="border-t border-white/10">
              <PeopleDirectoryView
                members={members}
                onNavigate={handleNavigate}
                onRequestIntro={(member) => setRequestIntroTarget(member)}
                connectedMemberIds={connectedMemberIds}
                onToggleConnect={handleToggleConnect}
              />
            </div>
          </>
        )}

        {activePage === 'bubbles' && (
          <ConnectionBubblesView
            members={members}
            onNavigate={handleNavigate}
            onRequestIntro={(member) => setRequestIntroTarget(member)}
          />
        )}

        {activePage === 'profile' && currentProfileMember && (
          <ProfileDetailView
            member={currentProfileMember}
            onBack={() => handleNavigate('people')}
            onNavigate={handleNavigate}
            onRequestIntro={(member) => setRequestIntroTarget(member)}
            isSaved={savedMemberIds.has(currentProfileMember.id)}
            onToggleSave={handleToggleSaveMember}
          />
        )}

        {mode === 'live' && activePage === 'messages' && <LiveMessagesView onOpenCrm={() => { setClassicPage('crm'); handleNavigate('workspace'); }} />}
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

        {activePage === 'insights' && <div className="ix-classic"><ClassicApp key="live-insights" mode={mode} startPage="insights" /></div>}
        {false && (
          <InsightsDashboardView
            onNavigate={handleNavigate}
            onRequestIntro={(member) => setRequestIntroTarget(member)}
            networkMembers={members}
          />
        )}

        {activePage === 'news' && <div className="ix-classic"><ClassicApp key="news" mode={mode} startPage="news" /></div>}
        {activePage === 'memory' && <div className="ix-classic"><ClassicApp key="memory" mode={mode} startPage="memory" /></div>}
        {activePage === 'meetings' && <div className="ix-classic"><ClassicApp key="meetings" mode={mode} startPage="meetings" /></div>}
        {activePage === 'work' && <div className="ix-classic"><ClassicApp key="work" mode={mode} startPage="work" /></div>}
        {activePage === 'workspace' && <div className="ix-classic">
          <div className="ix-tools">
            {([['memory','Memory'],['crm','CRM'],['diagnostic','Company report'],['pocket','Pocket'],['providers','Trusted Providers'],['needs','Needs'],['companies','Companies'],['opportunities','Opportunities'],['calendar','Calendar'],['grid','Grid'],['circles','Circles'],['peergroups','Peer groups'],['events','Events'],['profile','My profile'],['preferences','Settings']] as const).map(([id, label]) =>
              <button key={id} className={classicPage === id ? 'on' : ''} onClick={() => setClassicPage(id)}>{label}</button>)}
          </div>
          <ClassicApp key={classicPage} mode={mode} startPage={classicPage as any} />
        </div>}
      </main>

      {/* Editorial Footer */}
      <EditorialFooter onNavigate={handleNavigate} />

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
        <AetherisAssistant
          mode={mode}
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
    </AccentProvider>
  );
}
