import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import {
  ArrowRight, Bell, Bookmark, Brain, BriefcaseBusiness, CalendarDays, ChevronDown,
  CircleHelp, ClipboardList, ContactRound, Crown, Fingerprint, Home, Menu,
  MessageSquare, Newspaper, PanelLeftClose, PanelLeftOpen, Search,
  Settings, UserRound, Users, X,
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
  { label: 'Member Intelligence', icon: Fingerprint, page: 'intelligence' },
  { label: 'Saved', icon: Bookmark, workspace: 'pocket' },
  { label: 'My Account', icon: UserRound, workspace: 'profile' },
  { label: 'Settings', icon: Settings, workspace: 'preferences' },
  { label: 'Help & Support', icon: CircleHelp },
];

/** Existing member workspaces exposed through the new UI, not cloned pages.
 * Every destination is implemented by the already-shared AetherisAppSurface,
 * inside the same verified-user shell and database-backed providers.
 */
export const MEMBER_TOOL_DESTINATIONS: readonly WorkspaceDestination[] = [
  { label: 'CRM & Contacts', icon: ContactRound, workspace: 'crm' },
  { label: 'Need / Offer Feed', icon: BriefcaseBusiness, workspace: 'needs' },
  { label: 'Opportunities', icon: ClipboardList, workspace: 'opportunities' },
  { label: 'Deal Rooms', icon: BriefcaseBusiness, workspace: 'deals' },
  { label: 'Private Workspaces', icon: Users, workspace: 'workspaces' },
  { label: 'Referral Engine', icon: Network, workspace: 'referrals' },
  { label: 'Peer Groups', icon: Users, workspace: 'peergroups' },
  { label: 'Calendar', icon: CalendarDays, workspace: 'calendar' },
  { label: 'Events', icon: CalendarDays, workspace: 'events' },
  { label: 'Private Library', icon: Bookmark, workspace: 'pocket' },
  { label: 'Company Diagnostics', icon: ClipboardList, workspace: 'diagnostic' },
  { label: 'Companies', icon: BriefcaseBusiness, workspace: 'companies' },
  { label: 'Trusted Providers', icon: Users, workspace: 'providers' },
  { label: 'Circles', icon: Users, workspace: 'circles' },
  { label: 'Relationship Grid', icon: Network, workspace: 'grid' },
  { label: 'Executive Workbench', icon: BriefcaseBusiness, workspace: 'executivework' },
] as const

export type WorkspaceShellProps = {
  activePage: ActivePage;
  /** Workspace subpage currently shown inside the Workspace host, for nav highlight. */
  activeWorkspace?: string | undefined;
  onNavigate: (page: ActivePage) => void;
  onWorkspace: (page: string) => void;
  onSearch: (query: string) => void;
  searchQuery?: string | undefined;
  onSearchChange?: ((value: string) => void) | undefined;
  member?: { name: string; avatarUrl?: string } | null | undefined;
  notifications?: ReactNode | undefined;
  children: ReactNode;
  /** When false, preserve the existing page content without a second host. */
  enabled?: boolean | undefined;
  scrollContent?: boolean | undefined;
  onHelp?: (() => void) | undefined;
  /** Optional membership action (e.g. Executive access) shown as a sidebar nav
   * item. Omitted entirely when the member has no applicable action. */
  executiveAction?: { label: string; onOpen: () => void } | undefined;
};

const SIDEBAR_STORAGE_KEY = 'aetheris.sidebar.collapsed';
const SIDEBAR_ID = 'aetheris-workspace-sidebar';

export function AetherisWorkspaceShell({
  activePage, activeWorkspace, onNavigate, onWorkspace, onSearch, searchQuery, onSearchChange, member, notifications,
  children, enabled = true, scrollContent = false, onHelp, executiveAction,
}: WorkspaceShellProps) {
  const [localQuery, setLocalQuery] = useState('');
  const query = searchQuery ?? localQuery;
  const changeQuery = onSearchChange ?? setLocalQuery;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(() => Boolean(activeWorkspace && MEMBER_TOOL_DESTINATIONS.some(item => item.workspace === activeWorkspace)));
  useEffect(() => { if (activeWorkspace && MEMBER_TOOL_DESTINATIONS.some(item => item.workspace === activeWorkspace)) setToolsOpen(true); }, [activeWorkspace]);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileDialogRef = useRef<HTMLDivElement>(null);
  // Render expanded during SSR/first paint, then adopt the saved preference.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  useEffect(() => {
    try { setSidebarCollapsed(window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1'); } catch { /* storage unavailable */ }
  }, []);
  const toggleSidebar = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
    try { window.localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? '1' : '0'); } catch { /* storage unavailable */ }
  };
  useEffect(() => { setMobileMenuOpen(false); }, [activePage, activeWorkspace]);
  // Navigating between root sections resets the right pane to the top so the
  // member always lands on the page header, not mid-feed.
  useEffect(() => {
    document.querySelector('.aetheris-workspace-content')?.scrollTo({ top: 0, behavior: 'auto' });
  }, [activePage, activeWorkspace]);
  useEffect(() => {
    if (!mobileMenuOpen) return;
    // Focus the drawer's visible close action without popping the mobile keyboard.
    const drawer = mobileDialogRef.current;
    drawer?.querySelector<HTMLButtonElement>('.specter-mobile-menu-close')?.focus({ preventScroll: true });
    // Changing to desktop while the menu is open must not leave a hidden modal.
    const desktop = window.matchMedia('(min-width: 761px)');
    const closeOnDesktop = () => { if (desktop.matches) setMobileMenuOpen(false); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, [mobileMenuOpen]);

  function closeMobileMenu(restoreFocus = false) {
    setMobileMenuOpen(false);
    if (restoreFocus) menuButtonRef.current?.focus({ preventScroll: true });
  }

  function handleMobileMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMobileMenu(true);
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...(mobileDialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
    ) ?? [])].filter(element => element.getClientRects().length > 0);
    if (!focusable.length) return;
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

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
      {WORKSPACE_DESTINATIONS.filter(item => item.label !== 'Help & Support' || onHelp).map(item => {
        const Icon = item.icon;
        const active = (item.page !== undefined && item.page === activePage)
          || (item.workspace !== undefined && activePage === 'workspace' && item.workspace === activeWorkspace);
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
      <button type="button" className="specter-tools-toggle"
        aria-expanded={toolsOpen} aria-controls={mobile ? 'specter-mobile-tools' : 'specter-desktop-tools'}
        onClick={() => setToolsOpen(open => !open)}>
        <BriefcaseBusiness size={18}/><span>Business Tools</span><ChevronDown className={toolsOpen ? 'specter-tools-chevron is-open' : 'specter-tools-chevron'} size={15}/>
      </button>
      {toolsOpen && <div id={mobile ? 'specter-mobile-tools' : 'specter-desktop-tools'} className="specter-tools-list" role="group" aria-label="Business and relationship tools">
        {MEMBER_TOOL_DESTINATIONS.map(item => {
          const Icon = item.icon;
          const active = item.workspace === activeWorkspace && activePage === 'workspace';
          return <button type="button" key={item.label} className={active ? 'active' : ''}
            aria-current={active ? 'page' : undefined} onClick={() => destination(item)}>
            <Icon size={16}/><span>{item.label}</span>
          </button>;
        })}
      </div>}
      {executiveAction && <button type="button" className="specter-executive-action"
        aria-haspopup="dialog"
        onClick={() => { setMobileMenuOpen(false); executiveAction.onOpen(); }}>
        <Crown size={18}/><span>{executiveAction.label}</span>
      </button>}
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
        onChange={event => changeQuery(event.target.value)}
      />
    </form>;
  }

  if (!enabled) return <>{children}</>;

  return <div className={`specter-app aetheris-workspace-shell${sidebarCollapsed ? ' sidebar-collapsed' : ''}`} data-workspace-view={activePage}>
    <header className="specter-app-header">
      {sidebarCollapsed && <button type="button" className="specter-sidebar-expand"
        aria-label="Show sidebar" aria-expanded={false} aria-controls={SIDEBAR_ID}
        onClick={() => toggleSidebar(false)}>
        <PanelLeftOpen size={18}/>
      </button>}
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
        <button ref={menuButtonRef} className="specter-mobile-menu-toggle" type="button" aria-expanded={mobileMenuOpen}
          aria-haspopup="dialog" aria-controls="specter-mobile-navigation"
          aria-label={mobileMenuOpen ? 'Close workspace menu' : 'Open workspace menu'}
          onClick={() => mobileMenuOpen ? closeMobileMenu(true) : setMobileMenuOpen(true)}>
          {mobileMenuOpen ? <X size={20} aria-hidden="true"/> : <Menu size={20} aria-hidden="true"/>}
          <span>Menu</span>
        </button>
      </div>
    </header>

    {!sidebarCollapsed && <aside className="specter-app-sidebar" id={SIDEBAR_ID}>
      <button type="button" className="specter-sidebar-toggle"
        aria-label="Hide sidebar" aria-expanded={true} aria-controls={SIDEBAR_ID}
        onClick={() => toggleSidebar(true)}>
        <PanelLeftClose size={15}/><span>Hide panel</span>
      </button>
      {memberSearch(false)}
      {navigation(false)}
    </aside>}

    {mobileMenuOpen && <>
      <button type="button" className="specter-mobile-menu-scrim" aria-label="Close navigation menu" tabIndex={-1}
        onClick={() => closeMobileMenu(true)} />
      <div className="specter-mobile-menu" id="specter-mobile-navigation"
        ref={mobileDialogRef} role="dialog" aria-modal="true" aria-labelledby="specter-mobile-menu-heading"
        onKeyDown={handleMobileMenuKeyDown}>
        <div className="specter-mobile-menu-heading">
          <div>
            <span className="specter-mobile-menu-kicker">ASK INTROS / WORKSPACE</span>
            <h2 id="specter-mobile-menu-heading">Navigate</h2>
          </div>
          <button type="button" className="specter-mobile-menu-close" onClick={() => closeMobileMenu(true)}
            aria-label="Close navigation"><X size={19} aria-hidden="true"/> <span>Close</span></button>
        </div>
        {memberSearch(true)}
        <p className="specter-mobile-menu-section">YOUR WORKSPACE</p>
        {navigation(true)}
      </div>
    </>}

    <div className="specter-app-canvas" id="aetheris-workspace-content">
      {scrollContent ? <div className="aetheris-workspace-content">{children}</div> : children}
    </div>
  </div>;
}
