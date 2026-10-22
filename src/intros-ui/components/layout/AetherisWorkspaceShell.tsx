import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowRight, Bell, Bookmark, Brain, BriefcaseBusiness, CalendarDays,
  CircleHelp, ClipboardList, ContactRound, Fingerprint, Home, Menu,
  MessageSquare, Newspaper, Search, Settings, UserRound, Users, X,
  type LucideIcon,
} from 'lucide-react';
import type { ActivePage } from './TopNavigation';
import logoAsset from '@/assets/aetheris-logo.jpg.asset.json';
import '../../views/specter-app.css';

type WorkspaceDestination = {
  label: string;
  icon: LucideIcon;
  page?: ActivePage;
  workspace?: string;
  href?: string;
};

/**
 * One navigation contract for Specter and the existing Ask Intros modules.
 * Every link resolves to a real route, workspace page, or existing browser URL.
 */
export const WORKSPACE_DESTINATIONS: readonly WorkspaceDestination[] = [
  { label: 'Dashboard', icon: Home, page: 'home' },
  { label: 'Find Introductions', icon: ContactRound, page: 'intros' },
  { label: 'Member Network', icon: Users, page: 'people' },
  { label: 'Specter Detect', icon: Search, page: 'specter' },
  { label: 'Messages', icon: MessageSquare, page: 'messages' },
  { label: 'Meetings', icon: CalendarDays, page: 'meetings' },
  { label: 'Insights', icon: Fingerprint, page: 'insights' },
  { label: 'Memory', icon: Brain, page: 'memory' },
  { label: 'Work', icon: BriefcaseBusiness, page: 'work' },
  { label: 'News', icon: Newspaper, page: 'news' },
  { label: 'Golden Reports', icon: ClipboardList, workspace: 'diagnostic' },
  { label: 'Member Intelligence', icon: Fingerprint, href: '/member-intelligence' },
  { label: 'Saved', icon: Bookmark, workspace: 'pocket' },
  { label: 'My Account', icon: UserRound, workspace: 'profile' },
  { label: 'Settings', icon: Settings, workspace: 'preferences' },
  { label: 'Help & Support', icon: CircleHelp, href: '/help' },
];

export type WorkspaceShellProps = {
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
  onWorkspace: (page: string) => void;
  onSearch: (query: string) => void;
  member?: { name: string; avatarUrl?: string } | null;
  notifications?: ReactNode;
  children: ReactNode;
  /** When false, preserve the existing page content without a second host. */
  enabled?: boolean;
  onHelp?: () => void;
};

export function AetherisWorkspaceShell({
  activePage, onNavigate, onWorkspace, onSearch, member, notifications,
  children, enabled = true, onHelp,
}: WorkspaceShellProps) {
  const [query, setQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useEffect(() => { setMobileMenuOpen(false); }, [activePage]);
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [mobileMenuOpen]);

  const initials = member?.name.split(' ').filter(Boolean).map(s => s[0]).join('').slice(0, 2) || 'AI';

  function destination(item: WorkspaceDestination) {
    setMobileMenuOpen(false);
    if (item.page) {
      if (item.page === 'specter' && activePage === 'specter') {
        document.querySelector<HTMLInputElement>('.specter-search input')?.focus();
      } else {
        onNavigate(item.page);
      }
    } else if (item.workspace) {
      onWorkspace(item.workspace);
    } else if (item.label === 'Help & Support' && onHelp) {
      onHelp();
    }
  }

  function navigation(mobile: boolean) {
    return <nav aria-label={mobile ? 'Mobile workspace navigation' : 'Workspace navigation'}>
      {WORKSPACE_DESTINATIONS.map(item => {
        const Icon = item.icon;
        const active = item.page === activePage && item.page !== undefined;
        const href = item.label === 'Help & Support' && onHelp ? undefined : item.href;
        return href
          ? <a key={item.label} href={href} onClick={() => setMobileMenuOpen(false)}>
              <Icon size={18}/><span>{item.label}</span>
            </a>
          : <button type="button" key={item.label} className={active ? 'active' : ''}
              aria-current={active ? 'page' : undefined} onClick={() => destination(item)}>
              <Icon size={18}/><span>{item.label}</span>
            </button>;
      })}
    </nav>;
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const search = query.trim();
    if (!search) return;
    setMobileMenuOpen(false);
    onSearch(search);
  }

  function memberSearch(mobile: boolean) {
    return <form className={mobile ? 'specter-app-member-search specter-mobile-search' : 'specter-app-member-search specter-sidebar-search'} onSubmit={submitSearch}>
      <Search size={16} aria-hidden="true"/>
      <input
        aria-label={mobile ? 'Search members on mobile' : 'Search members, companies, or keywords'}
        placeholder="Search the network..."
        value={query}
        onChange={event => setQuery(event.target.value)}
      />
    </form>;
  }

  if (!enabled) return <>{children}</>;

  return <div className="specter-app aetheris-workspace-shell" data-workspace-view={activePage}>
    <header className="specter-app-header">
      <button className="specter-app-brand" aria-label="Ask Intros dashboard" onClick={() => onNavigate('home')}>
        <img src={logoAsset.url} alt=""/>
        <span><strong>ASK <b>INTROS</b></strong><small>AETHERIS WORKSPACE</small></span>
      </button>
      <nav className="specter-header-links" aria-label="Workspace shortcuts">
        <button type="button" aria-current={activePage === 'home' ? 'page' : undefined} onClick={() => onNavigate('home')}>Dashboard</button>
        <button type="button" aria-current={activePage === 'people' ? 'page' : undefined} onClick={() => onNavigate('people')}>Network</button>
        <button type="button" aria-current={activePage === 'specter' ? 'page' : undefined} onClick={() => destination(WORKSPACE_DESTINATIONS[3]!)}>Specter Detect</button>
      </nav>
      <div className="specter-app-account">
        {notifications || <button type="button" className="specter-notification" aria-label="Open inbox" onClick={() => onNavigate('messages')}><Bell size={19}/></button>}
        <button type="button" className="specter-account-button" aria-label="My account" onClick={() => onWorkspace('profile')}>
          {member?.avatarUrl ? <img src={member.avatarUrl} alt=""/> : <span className="specter-account-initials">{initials}</span>}
          <span>{member?.name || 'My account'}</span>
        </button>
        <button type="button" className="specter-header-cta" onClick={() => onNavigate('workspace')}>
          Ask Intros <ArrowRight size={15}/>
        </button>
        <button className="specter-mobile-menu-toggle" type="button" aria-expanded={mobileMenuOpen}
          aria-controls="specter-mobile-navigation" aria-label={mobileMenuOpen ? 'Close workspace menu' : 'Open workspace menu'}
          onClick={() => setMobileMenuOpen(open => !open)}>
          {mobileMenuOpen ? <X size={23}/> : <Menu size={23}/>}
        </button>
      </div>
    </header>

    <aside className="specter-app-sidebar">
      {memberSearch(false)}
      {navigation(false)}
    </aside>

    {mobileMenuOpen && <div className="specter-mobile-menu" id="specter-mobile-navigation">
      {memberSearch(true)}
      {navigation(true)}
    </div>}

    <div className="specter-app-canvas" id="aetheris-workspace-content">
      {children}
    </div>
  </div>;
}
