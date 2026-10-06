// @ts-nocheck
import React, { useState } from 'react';
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
import { LiveMessagesView } from './views/LiveMessagesView';
import '@/aetheris/styles.css';
import { useAetherisNews } from '@/aetheris/news';
import { LiveMembers } from './liveMembers';
import ConstellationField from '@/aetheris/ConstellationField';
import ParticleDrift from '@/aetheris/ParticleDrift';

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
  const classicPages = ['news','workspace','memory','work','insights', ...(mode === 'live' ? ['messages','intros'] : [])];

  return (
    <div className="ix-root min-h-screen bg-[#07090C] text-[#F2EEE6] flex flex-col font-sans selection:bg-[#3D6BF2]/30 selection:text-white relative isolate">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <ParticleDrift className="absolute inset-0 h-full w-full opacity-30" />
        <ConstellationField className="absolute inset-0 h-full w-full opacity-40" />
      </div>
      {/* Universal Top Navigation Contract */}
      <TopNavigation
        activePage={activePage}
        onNavigate={handleNavigate}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        unreadCount={mode === 'live' ? 0 : 12}
        onToggleConstellationOverlay={() => handleNavigate('bubbles')}
      />

      {mode === 'live' && <LiveMembers onMembers={setMembers} />}
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
          />
        )}

        {activePage === 'people' && (
          <PeopleDirectoryView
            members={members}
            onNavigate={handleNavigate}
            onRequestIntro={(member) => setRequestIntroTarget(member)}
            connectedMemberIds={connectedMemberIds}
            onToggleConnect={handleToggleConnect}
          />
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

        {mode === 'live' && activePage === 'messages' && <LiveMessagesView />}
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
        {activePage === 'work' && <div className="ix-classic"><ClassicApp key="work" mode={mode} startPage="work" /></div>}
        {activePage === 'workspace' && <div className="ix-classic">
          <div className="ix-tools">
            {([['memory','Memory'],['crm','CRM'],['diagnostic','Company report'],['pocket','Pocket'],['needs','Needs'],['companies','Companies'],['opportunities','Opportunities'],['calendar','Calendar'],['grid','Grid'],['circles','Circles'],['events','Events'],['profile','My profile'],['preferences','Settings']] as const).map(([id, label]) =>
              <button key={id} className={classicPage === id ? 'on' : ''} onClick={() => setClassicPage(id)}>{label}</button>)}
          </div>
          <ClassicApp key={classicPage} mode={mode} startPage={classicPage as any} />
        </div>}
        {mode === 'live' && activePage === 'intros' && <div className="ix-classic"><ClassicApp key="live-intros" mode={mode} startPage="intros" /></div>}
        {mode !== 'live' && activePage === 'intros' && (
          <IntrosHubView
            introRequests={introRequests}
            networkMembers={members}
            onNavigate={handleNavigate}
            onReviewRequest={(req) => setReviewIntroRequest(req)}
            onDismissRequest={handleDismissIntroRequest}
            onRequestIntro={(member) => setRequestIntroTarget(member)}
          />
        )}
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
      {!classicPages.includes(activePage) && (
        <AetherisAssistant mode={mode} page={activePage} onNavigate={(p) => handleNavigate(p as ActivePage)} />
      )}
    </div>
  );
}
