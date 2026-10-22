import { useState, type ReactNode, type FormEvent } from 'react';
import {
  Home, ContactRound, Users, ClipboardList, Fingerprint, Search, MessageSquare,
  Bookmark, UserRound, Settings, CircleHelp, Bell, Menu, X, BriefcaseBusiness,
  Brain, CalendarDays, Newspaper, ArrowRight,
} from 'lucide-react';
import { SpecterDetectPanel } from '@/features/specter-detect/SpecterDetectPanel';
import type { ActivePage } from '../components/layout/TopNavigation';
import logoAsset from '@/assets/aetheris-logo.jpg.asset.json';
import './specter-app.css';

interface Props {
  onNavigate: (page: ActivePage) => void;
  onWorkspace: (page: string) => void;
  onSearch: (query: string) => void;
  member?: { name: string; avatarUrl?: string } | null;
  notifications?: ReactNode;
}

/**
 * Shared workspace destinations use the real Ask Intros handlers.  Specter is
 * only a content module: its navigation belongs to the same product.
 */
export function SpecterDetectView({ onNavigate, onWorkspace, onSearch, member, notifications }: Props) {
  const [query, setQuery] = useState('');
  const [help, setHelp] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const initials = member?.name.split(' ').filter(Boolean).map(s => s[0]).join('').slice(0, 2) || 'AI';

  const items = [
    { label: 'Dashboard', icon: Home, action: () => onNavigate('home') },
    { label: 'Find Introductions', icon: ContactRound, action: () => onNavigate('intros') },
    { label: 'Member Network', icon: Users, action: () => onNavigate('people') },
    { label: 'Specter Detect', icon: Search, action: () => document.querySelector('.specter-search input')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), active: true },
    { label: 'Messages', icon: MessageSquare, action: () => onNavigate('messages') },
    { label: 'Meetings', icon: CalendarDays, action: () => onNavigate('meetings') },
    { label: 'Insights', icon: Fingerprint, action: () => onNavigate('insights') },
    { label: 'Memory', icon: Brain, action: () => onNavigate('memory') },
    { label: 'Work', icon: BriefcaseBusiness, action: () => onNavigate('work') },
    { label: 'News', icon: Newspaper, action: () => onNavigate('news') },
    { label: 'Golden Reports', icon: ClipboardList, action: () => onWorkspace('diagnostic') },
    { label: 'Member Intelligence', icon: Fingerprint, href: '/member-intelligence' },
    { label: 'Saved', icon: Bookmark, action: () => onWorkspace('pocket') },
    { label: 'My Account', icon: UserRound, action: () => onWorkspace('profile') },
    { label: 'Settings', icon: Settings, action: () => onWorkspace('preferences') },
    { label: 'Help & Support', icon: CircleHelp, action: () => setHelp(v => !v) },
  ];

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!query.trim()) return;
    setMobileMenuOpen(false);
    onSearch(query.trim());
  }

  const navigation = (mobile: boolean) => (
    <nav aria-label={mobile ? 'Mobile workspace navigation' : 'Workspace navigation'}>
      {items.map(({ label, icon: Icon, action, href, active }) => href
        ? <a key={label} href={href} onClick={() => setMobileMenuOpen(false)}>
            <Icon size={18} /><span>{label}</span>
          </a>
        : <button type="button" key={label} onClick={() => { action?.(); setMobileMenuOpen(false); }}
            aria-current={active ? 'page' : undefined} className={active ? 'active' : ''}>
            <Icon size={18} /><span>{label}</span>
          </button>,
      )}
    </nav>
  );

  const memberSearch = (mobile: boolean) => (
    <form className={mobile ? 'specter-app-member-search specter-mobile-search' : 'specter-app-member-search specter-sidebar-search'} onSubmit={submitSearch}>
      <Search size={16} aria-hidden="true" />
      <input aria-label={mobile ? 'Search members on mobile' : 'Search members, companies, or keywords'}
        placeholder="Search the network..." value={query} onChange={event => setQuery(event.target.value)} />
    </form>
  );

  return (
    <div className="specter-app">
      <header className="specter-app-header">
        <button className="specter-app-brand" aria-label="Ask Intros dashboard" onClick={() => onNavigate('home')}>
          <img src={logoAsset.url} alt="" />
          <span><strong>ASK <b>INTROS</b></strong><small>AETHERIS WORKSPACE</small></span>
        </button>

        <nav className="specter-header-links" aria-label="Workspace shortcuts">
          <button type="button" onClick={() => onNavigate('home')}>Dashboard</button>
          <button type="button" onClick={() => onNavigate('people')}>Network</button>
          <button type="button" aria-current="page" onClick={() => document.querySelector<HTMLInputElement>('.specter-search input')?.focus()}>Specter Detect</button>
        </nav>

        <div className="specter-app-account">
          {notifications || <button className="specter-notification" aria-label="Open inbox" onClick={() => onNavigate('messages')}><Bell size={19}/></button>}
          <button className="specter-account-button" aria-label="My account" onClick={() => onWorkspace('profile')}>
            {member?.avatarUrl
              ? <img src={member.avatarUrl} alt="" />
              : <span className="specter-account-initials">{initials}</span>}
            <span>{member?.name || 'My account'}</span>
          </button>
          <button className="specter-header-cta" onClick={() => onNavigate('workspace')}>
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

      {mobileMenuOpen && (
        <div className="specter-mobile-menu" id="specter-mobile-navigation">
          {memberSearch(true)}
          {navigation(true)}
        </div>
      )}

      <div className="specter-app-canvas">
        <div className="specter-how">
          <button type="button" onClick={() => setHelp(v => !v)} aria-expanded={help}>
            <CircleHelp size={17}/> How it works
          </button>
        </div>
        {help && <section className="specter-help">
          <h2>Investigate a public company website</h2>
          <p>Enter a URL and scan to collect public evidence. The interactive view lets you use the website where it permits embedding; sites that block frames must be opened in a separate browser tab. Scanned evidence remains separate from live navigation.</p>
          <button type="button" onClick={() => setHelp(false)}>Close help</button>
        </section>}
        <SpecterDetectPanel />
      </div>
    </div>
  );
}
