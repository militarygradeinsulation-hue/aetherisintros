import { TopNavigation as BridgeTopNavigation } from './SocialTopNavigation';
import { BusinessExplainerTicker } from '../business/BusinessExplainerTicker'
import { OnboardingGuide } from '../../onboarding/OnboardingGuide';
import { CompactExperienceSwitch } from '../../experience/CompactExperienceSwitch';
import { OnboardingMenuPortal } from '../../onboarding/OnboardingMenuPortal';
import type { ExperienceView } from '../../experience/preference';
/* Native port of absolute-ledger-flow/src/components/app/app-shell.tsx.
 * Owns the member frame; all records/actions remain Ask Intros, never the CRM seed data.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import './ledger-bridge-shell.css';
import './more-menu-readability.css';
import { MemberThumbnail } from '../shared/MemberThumbnail';
import './raised-surfaces.css';
import './command-surfaces.css';
import { Bell, ChevronDown, ChevronLeft, ChevronRight, Command, House, Menu, MessageSquare, Search, UserRound, Users, X, LogOut } from 'lucide-react';
import { AppearanceToggle } from '@/aetheris/AppearanceToggle';
import { signOutMember } from '@/aetheris/sync/workspace-sync';
import type { NetworkMember } from '@/intros-ui/networkData';
import type { ActivePage } from '@/intros-ui/components/layout/TopNavigation';

import { PRIMARY_NAV_GROUPS as NAV_GROUPS, ACCOUNT_SECTIONS, SEARCH_DESTINATIONS, destinationFor, targetFor, type NavigationTarget } from './workspace-navigation';
import { LedgerSectionNavigation } from './LedgerSectionNavigation';
import { MacOsDock, type DockApp } from '@/components/ui/macos-dock';
import { ShineBorder } from '@/components/ui/shine-border';
import { WORKSPACE_DESTINATIONS } from './workspace-navigation';
import { useAppearance } from '@/aetheris/AppearanceMode';
type Item = NavigationTarget;

export interface LedgerBridgeShellProps {
  experience: ExperienceView;
  onExperienceChange: (value: ExperienceView) => void;
  children: React.ReactNode;
  activePage: ActivePage;
  activeTool?: string;
  onNavigate: (page: ActivePage, memberId?: string) => void;
  onOpenTool: (tool: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  members: NetworkMember[];
  mode: 'demo' | 'live';
  me: { name: string; avatarUrl?: string } | null;
  onOpenMyProfile: () => void;
  unreadCount: number | null;
  notifications?: React.ReactNode;
  executiveAction?: { label: string; onOpen: () => void } | undefined;
}

const STORAGE_KEY = 'ask-intros.absolute-ledger.sidebar';
function persistedCollapsed() {
  try { return localStorage.getItem(STORAGE_KEY) === 'collapsed'; } catch { return false; }
}

export function LedgerBridgeShell({
  experience, onExperienceChange, children, activePage, activeTool, onNavigate, onOpenTool, searchQuery,
  onSearchChange, members, mode, me, onOpenMyProfile, unreadCount, notifications, executiveAction,
}: LedgerBridgeShellProps) {
  const { toggleTheme } = useAppearance();
  const [collapsed, setCollapsed] = useState(persistedCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [query, setQuery] = useState(searchQuery);
  const searchRef = useRef<HTMLInputElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, collapsed ? 'collapsed' : 'expanded'); } catch { /* optional */ }
  }, [collapsed]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(open => !open);
      }
      if (event.key === 'Escape') {
        setDrawerOpen(false); setPaletteOpen(false); setUserOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    if (paletteOpen) searchRef.current?.focus();
  }, [paletteOpen]);
  const closeAll = () => { setDrawerOpen(false); setPaletteOpen(false); setUserOpen(false); };
  const startOnboarding = () => { closeAll(); window.dispatchEvent(new Event('ask-intros:onboarding')); };
  const navigate = (item: Item) => {
    closeAll();
    if (item.tool) onOpenTool(item.tool);
    else onNavigate(item.page);
  };
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return { pages: NAV_GROUPS.flatMap(g => g.items), people: [] as NetworkMember[] };
    const pages = SEARCH_DESTINATIONS.filter(item => item.label.toLowerCase().includes(needle));
    const people = members.filter(member =>
      [member.name, member.title, member.company, member.location].some(value => value?.toLowerCase().includes(needle))
    ).slice(0, 8);
    return { pages, people };
  }, [query, members]);
  const displayName = me?.name || (mode === 'live' ? 'My account' : 'Guest showcase');
  const initials = displayName.split(' ').filter(Boolean).map(piece => piece[0]).join('').slice(0, 2).toUpperCase();
  const dockTargets = WORKSPACE_DESTINATIONS.filter(item => ['dashboard', 'introductions', 'network', 'messages', 'meetings', 'crm'].includes(item.id));
  const dockItems: DockApp[] = dockTargets.map(item => ({
    id: item.id, label: item.label, icon: <item.icon size={22} strokeWidth={1.8} aria-hidden="true" />,
    ...(item.id === 'messages' && unreadCount !== null && unreadCount > 0 ? { badge: unreadCount } : {}),
  }));
  const dockActiveId = destinationFor(activePage, activeTool)?.id;
  const openPalette = () => { setQuery(searchQuery); setPaletteOpen(true); };
  const quickCommands = [
    { id: 'onboarding', label: 'Onboarding walkthrough', onSelect: startOnboarding },
    { id: 'search', label: 'Search people & tools', shortcut: '⌘K', onSelect: openPalette },
    { id: 'assistant', label: 'Ask Intros assistant', onSelect: () => window.dispatchEvent(new CustomEvent('aetheris:open-assistant')) },
    { id: 'intro', label: 'Find an introduction', onSelect: () => { closeAll(); onNavigate('intros'); } },
    { id: 'theme', label: 'Switch light / dark', onSelect: toggleTheme },
  ];
  const Nav = ({ mobile = false }: { mobile?: boolean }) => (
    <nav className="ledger-native-nav ix-desktop-main-nav" aria-label={mobile ? 'Mobile workspace navigation' : 'Desktop navigation'}>
      {NAV_GROUPS.map(group => <div className="ledger-native-group" key={group.title}>
        <p className="ledger-native-group-label">{group.title}</p>
        {group.items.map(item => {
          const Icon = item.icon;
          const selected = destinationFor(activePage, activeTool)?.id === item.id;
          return <button key={item.label} type="button" title={item.label} aria-label={item.label}
            className={'ix-desktop-nav-link ledger-native-nav-item' + (selected ? ' is-active' : '')}
            aria-current={selected ? 'page' : undefined} onClick={() => navigate(item)}>
            <Icon size={16} aria-hidden="true" />
            <span className="ledger-native-nav-label">{item.label}</span>
            {item.page === 'messages' && !item.tool && unreadCount !== null && unreadCount > 0 &&
              <span className="ledger-native-count">{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </button>;
        })}
      </div>)}
    </nav>
  );
  const AccountMenu = () => <div className="ledger-native-account-dropdown" role="menu">
    <div className="ledger-native-account-name">{displayName}</div><button type="button" role="menuitem" onClick={startOnboarding}>Onboarding walkthrough</button>
    {ACCOUNT_SECTIONS.map(item => <button type="button" role="menuitem" key={item.tool} onClick={() => item.tool === 'profile' ? (closeAll(), onOpenMyProfile()) : navigate(item)}>
      <item.icon size={16} aria-hidden="true"/><span>{item.label}</span>
    </button>)}
    {mode === 'live'
      ? <button type="button" role="menuitem" aria-label="Log out" onClick={() => { closeAll(); void signOutMember('/auth'); }}>
          <LogOut size={15} /> Log out
        </button>
      : <a role="menuitem" href="/auth">Log in</a>}
  </div>;
  return <div className={'ledger-crm-shell' + (collapsed ? ' ledger-crm-collapsed' : '')} data-layout-source="absolute-ledger-flow/app-shell">
    <aside className="ledger-crm-sidebar ix-global-header" aria-label="Workspace sidebar">
      <div className="ledger-native-brand">
        <button type="button" onClick={() => { closeAll(); onNavigate('home'); }}
          aria-label="Ask Intros home" title="Ask Intros home" className="ledger-native-logo"><span aria-hidden="true" className="ledger-ai-mono"><span>A</span><span>I</span></span></button>
        <button type="button" className="ledger-native-brand-name" onClick={() => { closeAll(); onNavigate('home'); }}>
          <strong>ASK INTROS</strong><small>RELATIONSHIP OS</small>
        </button>
        <button className="ledger-native-collapse" type="button" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed} onClick={() => setCollapsed(value => !value)}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
      <Nav /><button type="button" className="ledger-native-nav-item" aria-label="Onboarding walkthrough" title="Onboarding walkthrough" onClick={startOnboarding}><span aria-hidden="true">?</span><span className="ledger-native-nav-label">Onboarding</span></button>
    </aside>

    {drawerOpen && <div className="ledger-native-drawer-backdrop">
      <button type="button" className="ledger-native-drawer-scrim" aria-label="Close navigation" onClick={() => setDrawerOpen(false)} />
      <aside className="ledger-native-mobile-sidebar" aria-label="Mobile workspace sidebar">
        <div className="ledger-native-brand"><span className="ledger-native-logo"><span aria-hidden="true" className="ledger-ai-mono"><span>A</span><span>I</span></span></span><strong>ASK INTROS</strong>
          <button type="button" aria-label="Close navigation" onClick={() => setDrawerOpen(false)}><X size={20}/></button>
        </div>
        <Nav mobile />
        <div className="ledger-native-mobile-account" aria-label="Account options"><button type="button" onClick={startOnboarding}>Onboarding walkthrough</button>
          <details className="ledger-native-mobile-account-options">
            <summary>Account <ChevronDown size={15} aria-hidden="true"/></summary>
            {ACCOUNT_SECTIONS.map(item => <button type="button" key={item.tool} onClick={() => navigate(item)}><item.icon size={16} aria-hidden="true"/><span>{item.label}</span></button>)}
          </details>
          {mode === 'live' && executiveAction && <button type="button" onClick={() => { setDrawerOpen(false); executiveAction.onOpen(); }}>{executiveAction.label}</button>}
          {mode === 'live'
            ? <button type="button" onClick={() => { closeAll(); void signOutMember('/auth'); }}><LogOut size={16} /> Log out</button>
            : <a href="/auth">Log in</a>}
        </div>
      </aside>
    </div>}

    <div className="ledger-crm-body">
      <div className="workspace-navigation-row">
      <div className="bridge-navigation-host" hidden={experience !== 'social'}><BridgeTopNavigation mode={mode}
        activePage={activePage === 'intelligence' || activePage === 'specter' ? 'workspace' : activePage}
        onNavigate={onNavigate} searchQuery={searchQuery} onSearchChange={onSearchChange}
        unreadCount={unreadCount ?? 0} me={me} onOpenMyProfile={onOpenMyProfile}
        bell={<>{notifications || <button type="button" aria-label="Introduction requests" onClick={() => onNavigate('intros')}><Bell size={17}/></button>}</>} onToggleConstellationOverlay={() => onNavigate('bubbles')}/>
      </div>
      <header className="ledger-crm-topbar" hidden={experience === 'social'}>
        <button type="button" className="ledger-native-menu" aria-label="Open navigation" onClick={() => setDrawerOpen(true)}>
          <Menu size={20} />
        </button>
        <div className="ledger-native-breadcrumb"><span>Ask Intros</span><ChevronRight size={13}/><b>{targetFor(activePage, activeTool)?.label || 'Network'}</b></div>
        <ShineBorder className="ledger-native-search-frame" borderRadius={18} borderWidth={1} duration={22} color={experience === 'social' ? ['#3b82f6','#a8c7ff','#3b82f6'] : ['#EF4444','#B76CD9','#EF4444']}>
          <button type="button" className="ledger-native-search" aria-label="Search records, people, modules and contacts" onClick={openPalette}>
            <Search size={15} /> <span>Search people, modules, relationships…</span><kbd><Command size={12}/> K</kbd>
          </button>
        </ShineBorder>
        {notifications || <button type="button" className="ledger-native-icon" aria-label="Introduction requests" onClick={() => onNavigate('intros')}><Bell size={17}/></button>}
        <AppearanceToggle className="ledger-native-appearance" />
        {mode === 'live' && executiveAction && <button type="button" className="ledger-native-auth-shortcut" onClick={executiveAction.onOpen}>{executiveAction.label}</button>}
        {mode === 'live'
          ? <button type="button" className="ledger-native-auth-shortcut" aria-label="Log out"
              onClick={() => { closeAll(); void signOutMember('/auth'); }}><LogOut size={15}/> Log out</button>
          : <a href="/auth" className="ledger-native-auth-shortcut">Log in</a>}
        <div className="ledger-native-user-wrap">
          <button type="button" className="ledger-native-user" aria-label="Account menu" aria-expanded={userOpen}
            onClick={() => { setUserOpen(open => !open); }}>
            <MemberThumbnail name={displayName} source={me?.avatarUrl} className="ledger-native-avatar"/><span className="ledger-native-user-label">{displayName}</span><ChevronDown size={13}/>
          </button>
          {userOpen && <AccountMenu/>}
        </div>
      </header>
      <div className="workspace-view-toggle"><CompactExperienceSwitch value={experience} onChange={onExperienceChange}/></div>
      </div>
      <OnboardingMenuPortal/>
      <OnboardingGuide onNavigate={navigate} mode={mode} />
      <div id="aetheris-workspace-content" className="ledger-native-content"><div hidden={experience === 'social'}><BusinessExplainerTicker /><LedgerSectionNavigation activePage={activePage} activeTool={activeTool} onSelect={navigate}/></div>{children}</div>
    </div>

    <div className="ledger-native-quick-dock" aria-label="Desktop quick launch tools">
      <MacOsDock
        items={dockItems}
        activeIds={dockActiveId ? [dockActiveId] : []}
        onSelect={app => { const item = dockTargets.find(target => target.id === app.id); if (item) navigate(item); }}
        commands={quickCommands}
        onCommand={openPalette}
      />
    </div>

    <nav hidden={experience === 'social'} className="ledger-native-bottom ix-mobile-nav" aria-label="Mobile navigation">
      {([
        { label: 'Dashboard', page: 'home', icon: House },
        { label: 'Messages', page: 'messages', icon: MessageSquare },
        { label: 'Network', page: 'people', icon: Users },
      ] as const).map(item => {
        const Icon = item.icon;
        return <button key={item.page} type="button" className="ix-mobile-nav-item"
          aria-current={destinationFor(activePage, activeTool)?.page === item.page ? 'page' : undefined} onClick={() => onNavigate(item.page)}>
          <Icon size={18}/><span>{item.label}</span>
        </button>;
      })}
      <button type="button" className="ix-mobile-nav-item" aria-label="More menu" onClick={() => setDrawerOpen(true)}>
        <Menu size={18}/><span>More</span>
      </button>
    </nav>

    {paletteOpen && <div className="ledger-native-palette-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setPaletteOpen(false); }}>
      <section ref={paletteRef} role="dialog" aria-modal="true" aria-label="Search Ask Intros" className="ledger-native-palette">
        <div className="ledger-native-palette-head">
          <Search size={18}/><input ref={searchRef} type="search" placeholder="Find a person, company or tool" value={query}
            onChange={event => { setQuery(event.target.value); onSearchChange(event.target.value); }}
            onKeyDown={event => { if (event.key === 'Enter') { const person=filtered.people[0]; if (person) { closeAll(); onNavigate('people',person.id); } else if (filtered.pages[0]) navigate(filtered.pages[0]); } }} />
          <button type="button" aria-label="Close search" onClick={() => setPaletteOpen(false)}><X size={18}/></button>
        </div>
        <div className="ledger-native-palette-results">
          {filtered.pages.length > 0 && <p className="ledger-native-group-label">Modules</p>}
          {filtered.pages.map(item => <button type="button" key={item.label} onClick={() => navigate(item)}>
            <item.icon size={16} />{item.label}<span className="ledger-native-result-type">MODULE</span>
          </button>)}
          {filtered.people.length > 0 && <p className="ledger-native-group-label">People</p>}
          {filtered.people.map(person => <button type="button" key={person.id} onClick={() => { closeAll(); onNavigate('people', person.id); }}>
            <UserRound size={16}/><span>{person.name}<small>{person.title} · {person.company}</small></span>
            <span className="ledger-native-result-type">PERSON</span>
          </button>)}
          {!filtered.pages.length && !filtered.people.length && <p className="ledger-native-empty">No matching tools or members.</p>}
        </div>
      </section>
    </div>}
  </div>;
}
