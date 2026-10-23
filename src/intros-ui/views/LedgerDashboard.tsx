/* Absolute Ledger CRM dashboard composition using the active Ask Intros
 * feed/member callbacks. It never imports absolute-ledger-flow fixture records.
 */
import React, { useEffect, useState } from 'react';
import { ArrowRight, Bookmark, Handshake, MessageSquare, Plus, Search, Settings2, Users, X } from 'lucide-react';
import type { FeedPost, NetworkMember } from '@/intros-ui/networkData';
import type { ActivePage } from '@/intros-ui/components/layout/TopNavigation';
import { PageHeader, Panel, StatCard } from '@/intros-ui/components/layout/LedgerUiKit';
import './ledger-dashboard.css';

type PanelKey = 'activity' | 'people' | 'actions' | 'priorities';
const DASHBOARD_PREFERENCES = 'ask-intros.crm.dashboard.panels.v1';
const DEFAULT_PANELS: Record<PanelKey, boolean> = {
  activity: true, people: true, actions: true, priorities: true,
};

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
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [panels, setPanels] = useState(DEFAULT_PANELS);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DASHBOARD_PREFERENCES);
      if (!raw) return;
      const saved: unknown = JSON.parse(raw);
      if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return;
      const values = saved as Record<string, unknown>;
      setPanels({
        activity: typeof values['activity'] === 'boolean' ? values['activity'] : true,
        people: typeof values['people'] === 'boolean' ? values['people'] : true,
        actions: typeof values['actions'] === 'boolean' ? values['actions'] : true,
        priorities: typeof values['priorities'] === 'boolean' ? values['priorities'] : true,
      });
    } catch { /* private browsing and malformed older preferences are safe */ }
  }, []);
  useEffect(() => {
    if (!customizeOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setCustomizeOpen(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [customizeOpen]);
  const setPanel = (key: PanelKey, enabled: boolean) => {
    setPanels(previous => {
      const next = { ...previous, [key]: enabled };
      try { window.localStorage.setItem(DASHBOARD_PREFERENCES, JSON.stringify(next)); } catch { /* optional */ }
      return next;
    });
  };
  const resetPanels = () => {
    setPanels({ ...DEFAULT_PANELS });
    try { window.localStorage.removeItem(DASHBOARD_PREFERENCES); } catch { /* optional */ }
  };
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
        <button type="button" className="ledger-ui-button secondary" onClick={() => setCustomizeOpen(true)}><Settings2 size={15}/> Customize</button>
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
        {panels.activity && <Panel className="ledger-dashboard-feed" title="Network activity"
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
        </Panel>}
      </div>
      <div className="ledger-dashboard-secondary">
        {panels.people && <Panel title="People to know" subtitle="Browse and build meaningful relationships"
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
        </Panel>}
        {panels.actions && <Panel title="Next moves" subtitle="Relationship and deal execution" bodyClassName="ledger-next-moves">
          <button type="button" onClick={() => onNavigate('intros')}><Handshake size={17}/><span><strong>Introduction requests</strong><small>Review consent and open conversations</small></span><ArrowRight size={15}/></button>
          <button type="button" onClick={() => onNavigate('messages')}><MessageSquare size={17}/><span><strong>Messages</strong><small>Continue conversations</small></span><ArrowRight size={15}/></button>
          <button type="button" onClick={() => onOpenTool ? onOpenTool('workspaces') : onNavigate('workspace')}><ArrowRight size={17}/><span><strong>Workspaces</strong><small>Advance deals and projects</small></span><ArrowRight size={15}/></button>
        </Panel>}
        {panels.priorities && actionQueue && <Panel title="Weekly priorities" subtitle="Your live member action queue" bodyClassName="ledger-priorities">{actionQueue}</Panel>}
      </div>
    </div>
    {customizeOpen && <div className="ledger-customize-backdrop" onMouseDown={event => {
      if (event.target === event.currentTarget) setCustomizeOpen(false);
    }}>
      <section role="dialog" aria-modal="true" aria-labelledby="ledger-customize-title" className="ledger-customize-dialog">
        <header><div>
          <span className="ledger-ui-eyebrow">Dashboard / Preferences</span>
          <h2 id="ledger-customize-title">Customize your dashboard</h2>
          <p>Show only the relationship modules you need. Settings stay on this device.</p>
        </div><button type="button" aria-label="Close customization" onClick={() => setCustomizeOpen(false)}><X size={19}/></button></header>
        <div className="ledger-customize-options">
          {([
            ['activity', 'Network activity', 'Updates, shared posts and conversations'],
            ['people', 'People to know', 'Profiles and warm introduction paths'],
            ['actions', 'Next moves', 'Direct links to introductions, messages and deals'],
            ['priorities', 'Weekly priorities', 'Live relationship and activation tasks'],
          ] as [PanelKey, string, string][]).map(([key, label, description]) => <label key={key} className="ledger-customize-option">
            <input type="checkbox" checked={panels[key]} onChange={event => setPanel(key, event.target.checked)}/>
            <span><strong>{label}</strong><small>{description}</small></span>
          </label>)}
        </div>
        <footer>
          <button type="button" className="ledger-ui-button secondary" onClick={resetPanels}>Reset defaults</button>
          <button type="button" className="ledger-ui-button primary" onClick={() => setCustomizeOpen(false)}>Done</button>
        </footer>
      </section>
    </div>}
  </div>;
}
