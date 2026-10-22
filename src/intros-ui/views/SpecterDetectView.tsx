import { useState, type ReactNode } from 'react';
import { Home, ContactRound, Users, ClipboardList, Fingerprint, Search, MessageSquare, Bookmark, UserRound, Settings, CircleHelp, ChevronDown, Bell } from 'lucide-react';
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

export function SpecterDetectView({ onNavigate, onWorkspace, onSearch, member, notifications }: Props) {
  const [query, setQuery] = useState('');
  const [help, setHelp] = useState(false);
  const initials = member?.name.split(' ').filter(Boolean).map(s => s[0]).join('').slice(0, 2) || 'AI';
  const items = [
    { label: 'Dashboard',          icon: Home,          action: () => onNavigate('home') },
    { label: 'Find Introductions', icon: ContactRound,  action: () => onNavigate('intros') },
    { label: 'Member Network',     icon: Users,         action: () => onNavigate('people') },
    { label: 'Golden Reports',     icon: ClipboardList, action: () => onWorkspace('diagnostic') },
    { label: 'Member Intelligence',icon: Fingerprint,   href: '/member-intelligence' },
    { label: 'Specter Detect',     icon: Search,        action: () => window.scrollTo({ top: 0 }), active: true },
    { label: 'Messages',           icon: MessageSquare, action: () => onNavigate('messages') },
    { label: 'Saved',              icon: Bookmark,      action: () => onWorkspace('pocket') },
    { label: 'My Account',         icon: UserRound,     action: () => onWorkspace('profile') },
    { label: 'Settings',           icon: Settings,      action: () => onWorkspace('preferences') },
    { label: 'Help & Support',     icon: CircleHelp,    action: () => setHelp(v => !v) },
  ] as const;

  return (
    <div className="specter-app">
      {/* Top header */}
      <header className="specter-app-header">
        <button
          className="specter-app-brand"
          aria-label="Ask Intros home"
          onClick={() => onNavigate('home')}
        >
          <img src={logoAsset.url} alt="" />
          <span>
            <strong>ASK <b>INTROS</b></strong>
            <small>AETHERIS</small>
          </span>
        </button>

        <form
          className="specter-app-member-search"
          onSubmit={e => { e.preventDefault(); if (query.trim()) onSearch(query.trim()); }}
        >
          <Search size={19} />
          <input
            aria-label="Search members, companies, or keywords"
            placeholder="Search members, companies, or keywords..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </form>

        <div className="specter-app-account">
          {notifications || (
            <button aria-label="Open inbox" onClick={() => onNavigate('messages')}>
              <Bell size={23} />
            </button>
          )}
          <button aria-label="My account" onClick={() => onWorkspace('profile')}>
            {member?.avatarUrl
              ? <img src={member.avatarUrl} alt="" />
              : <span className="specter-account-initials">{initials}</span>
            }
            <span>
              <strong>{member?.name || 'Ask Intros'}</strong>
              <small>{member ? 'Member' : 'Guest'}</small>
            </span>
            <ChevronDown size={17} />
          </button>
        </div>
      </header>

      {/* Left sidebar */}
      <aside className="specter-app-sidebar">
        <nav aria-label="Specter workspace navigation">
          {items.map(({ label, icon: Icon, action, href, active }: { label: string; icon: React.ComponentType<{size:number}>; action?: ()=>void; href?: string; active?: boolean }) =>
            href
              ? <a key={label} href={href}><Icon size={23} /><span>{label}</span></a>
              : <button type="button" key={label} onClick={action} aria-current={active ? 'page' : undefined} className={active ? 'active' : ''}>
                  <Icon size={23} /><span>{label}</span>
                </button>
          )}
        </nav>
        <div className="specter-app-terrain" aria-hidden="true">
          <svg viewBox="0 0 236 260" preserveAspectRatio="none">
            {Array.from({ length: 14 }, (_, i) => (
              <path
                key={i}
                d={`M-20 ${100 + i * 12} Q30 ${-10 + i * 10} 90 ${110 + i * 6} T250 ${140 + i * 10}`}
                fill="none"
                stroke="#c85b13"
                strokeWidth=".6"
                opacity={0.2 + i * 0.02}
              />
            ))}
          </svg>
          <span>VETERANS<br />BUSINESS<br />RESULTS</span>
        </div>
      </aside>

      {/* Main canvas */}
      <div className="specter-app-canvas">
        <div className="specter-how">
          <button onClick={() => setHelp(v => !v)} aria-expanded={help}>
            <CircleHelp size={20} /> How it works
          </button>
        </div>
        {help && (
          <section className="specter-help">
            <h2>Investigate a public company website</h2>
            <p>Sign in, enter a URL and choose Scan Website. Review captured evidence, images and source links. Save cases on this device or export a report. Websites may block embedded viewing; use Open original website to verify the full page.</p>
            <button onClick={() => setHelp(false)}>Close help</button>
          </section>
        )}
        <SpecterDetectPanel />
      </div>
    </div>
  );
}
