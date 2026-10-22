import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isIntroTargetId, submitIntroRequest } from '@/aetheris/lib/intro-request';
import { useNetwork } from '@/aetheris/store';
import { loadMyProfile } from '@/aetheris/live';
import { WriteFailureNotice } from '@/aetheris/WriteFailureNotice';
import { refreshUnread } from '@/aetheris/read-receipts';
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
import { AetherisAppSurface, AetherisAssistantSurface } from '@/aetheris/App';
import { VoiceBar } from '@/aetheris/VoiceBar';
import { SelectionReader } from '@/aetheris/SelectionReader';
import { LiveMessagesView } from './views/LiveMessagesView';
import { InteractiveRelationshipTour } from '@/aetheris/InteractiveRelationshipTour';
import { useUnreadCounts } from '@/aetheris/read-receipts';
import '@/aetheris/styles.css';
import '@/aetheris/architectural-system.css';
import './messages-readability.css';
import '@/aetheris/executive-options.css';
import '@/aetheris/messages-master-theme.css';
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
import { SpecterDetectView } from './views/SpecterDetectView';

const SHELL_PAGES: ActivePage[] = ['home', 'people', 'bubbles', 'intros', 'messages', 'insights', 'news', 'workspace', 'memory', 'work', 'meetings', 'specter'];

function NewsTicker({ onOpen }: { onOpen: () => void }) {
  const { data } = useAetherisNews();
  const items = (data?.items ?? []).slice(0, 8);
  if (!items.length) return null;
  return <button type="button" onClick={onOpen} aria-label="Open live news" className="ix-news-ticker w-full overflow-hidden border-b border-white/10 bg-[#0E1116] py-2 text-left">
    <div className="ix-news-ticker-track">
      {[0, 1].map(copy => <div key={copy} className="ix-news-ticker-group" aria-hidden={copy === 1 ? true : undefined}>
        <span className="font-mono tracking-[0.2em] text-[#F4A125]">LIVE NEWS</span>
        {items.map((n: any) => <span key={n.id}><b className="text-[#F2EEE6] font-medium">{n.title}</b> · {n.source}</span>)}
      </div>)}
    </div>
  </button>;
}

export default function App({ mode = 'demo' }: { mode?: 'demo' | 'live' }) {
  const network = useNetwork();
  const [activePage, setActivePage] = useState<ActivePage>('home');
  const [classicPage, setClassicPage] = useState<string>('memory');
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

  // Restore saved connections on reload instead of presenting them as absent.
  useEffect(() => {
    if (mode !== 'live') return;
    let cancelled = false;
    const loadConnections = async () => {
      const { data: identity } = await supabase.auth.getUser();
      if (!identity.user) return;
      const { data, error } = await supabase.from('follows').select('followee_id')
        .eq('follower_id', identity.user.id).eq('kind', 'connection');
      if (!cancelled && !error) setConnectedMemberIds(new Set((data ?? []).map(row => row.followee_id)));
    };
    void loadConnections();
    return () => { cancelled = true };
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
    const on = !connectedMemberIds.has(memberId);
    const persist = async () => {
      if (mode === 'live') {
        const { data: identity, error: authError } = await supabase.auth.getUser();
        if (authError || !identity.user) throw new Error('Sign in to save a connection.');
        const query = on
          ? supabase.from('follows').upsert({ follower_id: identity.user.id, followee_id: memberId, kind: 'connection' }, { onConflict: 'follower_id,followee_id,kind' })
          : supabase.from('follows').delete().eq('follower_id', identity.user.id).eq('followee_id', memberId).eq('kind', 'connection');
        const { error } = await query;
        if (error) throw new Error('The server did not confirm this connection change.');
      }
      setConnectedMemberIds(prev => {
        const next = new Set(prev);
        if (on) next.add(memberId); else next.delete(memberId);
        return next;
      });
    };
    const attempt = async () => {
      try { await persist(); }
      catch (error) {
        reportWriteFailure({ title: 'Connection not saved', message: error instanceof Error ? error.message : 'No confirmation received.', retry: attempt });
      }
    };
    void attempt();
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
  const liveUnread = useUnreadCounts(mode === 'live');
  // "Open deal room" anywhere in the product lands on the Deals workspace page.
  useEffect(() => {
    const open = (e: Event) => { e.preventDefault(); setClassicPage('deals'); handleNavigate('workspace'); };
    window.addEventListener('aetheris:open-deals', open);
    return () => window.removeEventListener('aetheris:open-deals', open);
  }, []);
  const classicPages = ['news','workspace','memory','work','insights','meetings','specter', ...(mode === 'live' ? ['home','messages','intros','people'] : [])];

  return (
    <div className={`${activePage === 'specter' ? 'ix-specter-mode ' : ''}ix-root min-h-screen bg-[#07090C] text-[#F2EEE6] flex flex-col font-sans selection:bg-[#F5B027]/30 selection:text-white relative`}>
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
      {activePage !== 'specter' && <TopNavigation
        activePage={activePage}
        onNavigate={handleNavigate}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        unreadCount={mode === 'live' ? liveUnread.total : 12}
        onToggleConstellationOverlay={() => handleNavigate('bubbles')}
        me={mode === 'live' ? me : null}
        {...(mode === 'live' ? { onOpenMyProfile: () => { setClassicPage('profile'); handleNavigate('workspace'); } } : {})}
        bell={mode === 'live' ? <LiveNotificationsBell onOpen={(destination) => {
          if (destination === 'peergroups' || destination === 'events' || destination === 'deals') { setClassicPage(destination); handleNavigate('workspace'); return; }
          handleNavigate(destination);
        }} /> : undefined}
      />}

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
      {mode !== 'live' && activePage !== 'specter' && <InteractiveRelationshipTour />}
      {mode === 'live' && <LiveMembers onMembers={setMembers} onError={setLiveDirectoryError} />}
      {mode === 'live' && activePage !== 'specter' && <MeetingReminderBanner onJoin={() => handleNavigate('meetings')} />}
      {mode === 'live' && activePage !== 'specter' && <MembershipCardMailer />}
      {activePage !== 'specter' && <NewsTicker onOpen={() => handleNavigate('news')} />}
      {/* Primary Page Views */}
      <main className="flex-1 arch-product-main" data-arch-page={activePage}>
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
            socialFeed={mode === 'live' ? <div className="ix-classic"><AetherisAppSurface  feedOnly  /></div> : undefined}
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
            me={mode === 'live' ? me : null}
          />
        )}

        {(activePage === 'people' || activePage === 'intros') && (
          <>
            {mode === 'live'
              ? <div className="ix-classic"><InviteCard /><AetherisAppSurface key="live-intros"  startPage="intros"  /></div>
              : <IntrosHubView
                  introRequests={introRequests}
                  networkMembers={members}
                  onNavigate={handleNavigate}
                  onReviewRequest={(req) => setReviewIntroRequest(req)}
                  onDismissRequest={handleDismissIntroRequest}
                  onRequestIntro={(member) => setRequestIntroTarget(member)}
                />}
            <div className="border-t border-white/10">
              {mode === 'live' && liveDirectoryError && <div role="alert" className="mx-4 my-3 rounded-xl border border-red-400/40 p-3 text-sm text-red-200">The verified member directory did not load: {liveDirectoryError} Reopen this screen to retry. Demo profiles are never substituted.</div>}
              <PeopleDirectoryView
                members={members}
                onNavigate={handleNavigate}
                onRequestIntro={(member) => setRequestIntroTarget(member)}
                connectedMemberIds={connectedMemberIds}
                onToggleConnect={handleToggleConnect}
                isLive={mode === 'live'}
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
            isSaved={savedMemberIds.has(currentProfileMember.id)}
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

        {activePage === 'insights' && <div className="ix-classic"><AetherisAppSurface key="live-insights"  startPage="insights"  /></div>}
        {false && (
          <InsightsDashboardView
            onNavigate={handleNavigate}
            onRequestIntro={(member) => setRequestIntroTarget(member)}
            networkMembers={members}
          />
        )}

        {activePage === 'news' && <div className="ix-classic"><AetherisAppSurface key="news"  startPage="news"  /></div>}
        {activePage === 'memory' && <div className="ix-classic"><AetherisAppSurface key="memory"  startPage="memory"  /></div>}
        {activePage === 'meetings' && <div className="ix-classic"><AetherisAppSurface key="meetings"  startPage="meetings"  /></div>}
        {activePage === 'work' && <div className="ix-classic"><AetherisAppSurface key="work"  startPage="work"  /></div>}
        {activePage === 'specter' && <SpecterDetectView onNavigate={handleNavigate} onWorkspace={page=>{setClassicPage(page);handleNavigate('workspace');}} onSearch={query=>{setSearchQuery(query);handleNavigate('people');}} member={me} notifications={mode === 'live' ? <LiveNotificationsBell onOpen={destination=>{if(destination==='peergroups'||destination==='events'||destination==='deals'){setClassicPage(destination);handleNavigate('workspace');}else handleNavigate(destination);}}/> : undefined}/> }
        {activePage === 'workspace' && <div className="ix-classic">
          <div className="ix-tools">
            {([['memory','Memory'],['crm','CRM'],['diagnostic','Company report'],['pocket','Private Library & Blueprints'],['executivework','Executive Workbench'],['providers','Trusted Providers'],['needs','Needs'],['companies','Companies'],['opportunities','Opportunities'],['deals','Deals'],['referrals','Referrals'],['workspaces','Workspaces'],['calendar','Calendar'],['grid','Grid'],['circles','Circles'],['peergroups','Peer groups'],['events','Events'],['profile','My profile'],['preferences','Settings']] as const).map(([id, label]) =>
              <button key={id} className={classicPage === id ? 'on' : ''} onClick={() => setClassicPage(id)}>{label}</button>)}
          </div>
          <AetherisAppSurface key={classicPage}  startPage={classicPage as any}  />
        </div>}
      </main>

      {/* Editorial Footer */}
      {activePage !== 'specter' && <EditorialFooter onNavigate={handleNavigate} />}

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
