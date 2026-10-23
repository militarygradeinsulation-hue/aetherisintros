/* Absolute Ledger CRM dashboard composition using the active Ask Intros
 * feed/member callbacks. It never imports absolute-ledger-flow fixture records.
 */
import React, { useState } from 'react';
import { ArrowRight, Bookmark, Handshake, MessageSquare, Plus, Search, Users } from 'lucide-react';
import type { FeedPost, NetworkMember } from '@/intros-ui/networkData';
import type { ActivePage } from '@/intros-ui/components/layout/TopNavigation';
import { PageHeader, Panel, StatCard } from '@/intros-ui/components/layout/LedgerUiKit';
import './ledger-dashboard.css';

interface LedgerDashboardProps {
  posts: FeedPost[];
  members: NetworkMember[];
  live: boolean;
  socialFeed?: React.ReactNode;
  actionQueue?: React.ReactNode;
  liveOverview?: React.ReactNode;
  unreadCount: number | null;
  onNavigate: (page: ActivePage, memberId?: string) => void;
  onOpenTool?: (tool: string) => void;
  onRequestIntro: (member: NetworkMember) => void;
  onAddPost: (content: string, badge?: FeedPost['badge']) => void;
  onLikePost: (postId: string) => void;
  onSavePost: (postId: string) => void;
}

export function LedgerDashboard({
  posts, members, live, socialFeed, actionQueue, liveOverview, unreadCount,
  onNavigate, onRequestIntro, onAddPost, onLikePost, onSavePost, onOpenTool,
}: LedgerDashboardProps) {
  const [draft, setDraft] = useState('');
  const [feedTab, setFeedTab] = useState<'all' | 'saved'>('all');
  const filteredPosts = feedTab === 'saved' ? posts.filter(post => post.isSaved) : posts;
  const sendPost = (event: React.FormEvent) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content) return;
    onAddPost(content, 'Insight');
    setDraft('');
  };
  return <div className="ledger-dashboard">
    <PageHeader eyebrow="Workspace / Relationship OS" title="Command Dashboard"
      description="Your relationships, introductions, and next moves in one operating workspace."
      actions={<>
        <button type="button" className="ledger-ui-button secondary" onClick={() => onNavigate('people')}><Search size={15}/> Find people</button>
        <button type="button" className="ledger-ui-button primary" onClick={() => onNavigate('intros')}><Plus size={16}/> Request intro</button>
      </>} />

    <div className="ledger-dashboard-stats">
      <StatCard label="Members in view" value={String(members.length)} hint={live ? 'Verified live directory' : 'Showcase directory'}
        icon={<Users size={17}/>} onClick={() => onNavigate('people')}/>
      <StatCard label="Introductions" value="Open" hint="Review requests and introductions"
        icon={<Handshake size={17}/>} onClick={() => onNavigate('intros')}/>
      <StatCard label="Unread messages" value={unreadCount === null ? '—' : String(unreadCount)}
        hint={live ? 'From your live inbox' : 'Showcase conversations'}
        icon={<MessageSquare size={17}/>} onClick={() => onNavigate('messages')}/>
      <StatCard label="Opportunity work" value="Explore" hint="CRM, deals, proposals and workspaces"
        icon={<ArrowRight size={17}/>} onClick={() => onOpenTool ? onOpenTool('crm') : onNavigate('workspace')}/>
    </div>

    {liveOverview && <details className="ledger-ui-live-overview">
      <summary>Executive overview <span>Expand your live network metrics and recent activity</span></summary>
      <div>{liveOverview}</div>
    </details>}
    <div className="ledger-dashboard-grid">
      <div className="ledger-dashboard-primary">
        <Panel className="ledger-dashboard-feed" title="Network activity"
          subtitle={live ? 'Confirmed activity from your connected network' : 'Sample conversations from the guided showcase'}
          action={<button type="button" className="ledger-ui-link" onClick={() => onNavigate('people')}>Network <ArrowRight size={13}/></button>}
          bodyClassName="ledger-feed-body">
          {socialFeed ? socialFeed : <>
            <form className="ledger-feed-composer" onSubmit={sendPost}>
              <label htmlFor="ledger-post-content">Share an update with your network</label>
              <textarea id="ledger-post-content" value={draft} onChange={event => setDraft(event.target.value)}
                placeholder="Share an offer, a need, or what you're working on…" rows={3}/>
              <div><span>Showcase post · visible in this session</span>
                <button className="ledger-ui-button primary" type="submit" disabled={!draft.trim()}><Plus size={14}/> Post update</button>
              </div>
            </form>
            <div className="ledger-feed-tabs" role="group" aria-label="Filter activity">
              <button type="button" aria-pressed={feedTab === 'all'} onClick={() => setFeedTab('all')}>All activity</button>
              <button type="button" aria-pressed={feedTab === 'saved'} onClick={() => setFeedTab('saved')}>Saved</button>
            </div>
            <div className="ledger-feed-items">
              {filteredPosts.length ? filteredPosts.slice(0, 12).map(post => (
                <article key={post.id} className="ledger-feed-entry">
                  <header>
                    <span className="ledger-feed-initial">{post.authorName.split(' ').map(value => value.charAt(0)).slice(0,2).join('')}</span>
                    <div><strong>{post.authorName}</strong><p>{post.authorTitle} · {post.authorCompany}</p></div>
                    <time>{post.timeAgo}</time>
                  </header>
                  <p className="ledger-feed-content">{post.content}</p>
                  <footer>
                    <span className="ledger-feed-badge">{post.badge}</span>
                    <button type="button" aria-pressed={post.isLiked} onClick={() => onLikePost(post.id)}>
                      {post.isLiked ? 'Liked' : 'Like'} · {post.likes}
                    </button>
                    <button type="button" aria-pressed={post.isSaved} onClick={() => onSavePost(post.id)}>
                      <Bookmark size={14}/> {post.isSaved ? 'Saved' : 'Save'}
                    </button>
                  </footer>
                </article>
              )) : <p className="ledger-ui-empty">No posts for this filter.</p>}
            </div>
          </>}
        </Panel>
      </div>
      <div className="ledger-dashboard-secondary">
        <Panel title="People to know" subtitle="Browse and build meaningful relationships"
          action={<button type="button" className="ledger-ui-link" onClick={() => onNavigate('people')}>All people <ArrowRight size={13}/></button>}
          bodyClassName="ledger-people-list">
          {members.slice(0, 5).map(person => (
            <div className="ledger-person" key={person.id}>
              <button type="button" className="ledger-person-main" onClick={() => onNavigate('people', person.id)}>
                <span className="ledger-person-initial">{person.name.split(' ').map(value => value.charAt(0)).slice(0,2).join('')}</span>
                <span><strong>{person.name}</strong><small>{person.title} · {person.company}</small></span>
              </button>
              <button type="button" className="ledger-person-intro" title={'Request introduction to ' + person.name}
                aria-label={'Request introduction to ' + person.name} onClick={() => onRequestIntro(person)}><Handshake size={16}/></button>
            </div>
          ))}
          {!members.length && <p className="ledger-ui-empty">{live ? 'Loading verified network members…' : 'No members yet.'}</p>}
        </Panel>
        <Panel title="Next moves" subtitle="Relationship and deal execution" bodyClassName="ledger-next-moves">
          <button type="button" onClick={() => onNavigate('intros')}><Handshake size={17}/><span><strong>Introduction requests</strong><small>Review consent and open conversations</small></span><ArrowRight size={15}/></button>
          <button type="button" onClick={() => onNavigate('messages')}><MessageSquare size={17}/><span><strong>Messages</strong><small>Continue conversations</small></span><ArrowRight size={15}/></button>
          <button type="button" onClick={() => onOpenTool ? onOpenTool('workspaces') : onNavigate('workspace')}><ArrowRight size={17}/><span><strong>Workspaces</strong><small>Advance deals and projects</small></span><ArrowRight size={15}/></button>
        </Panel>
        {actionQueue && <Panel title="Weekly priorities" subtitle="Your live member action queue" bodyClassName="ledger-priorities">{actionQueue}</Panel>}
      </div>
    </div>
  </div>;
}
