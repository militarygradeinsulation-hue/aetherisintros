import React, { useEffect, useRef, useState } from 'react';
import { AskIntrosLockup } from '@/aetheris/AskIntrosLockup';
import { Search, Bell, Orbit, LogOut, Home, Users, MessageSquare, MoreHorizontal, Network, Brain, Newspaper, Briefcase, X, Video, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AvatarImage } from '@/aetheris/avatar';
import { signOutMember } from '@/aetheris/sync/workspace-sync';
import { AppearanceToggle } from '@/aetheris/AppearanceToggle';

async function signOut() {
  await signOutMember('/auth');
}

export type ActivePage = 'home' | 'people' | 'bubbles' | 'intros' | 'messages' | 'insights' | 'profile' | 'news' | 'workspace' | 'memory' | 'work' | 'meetings';

interface TopNavigationProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage, memberId?: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  unreadCount?: number;
  onToggleConstellationOverlay?: () => void;
  me?: { name: string; avatarUrl?: string } | null;
  onOpenMyProfile?: () => void;
  bell?: React.ReactNode;
  mode?: 'demo' | 'live';
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
  activePage,
  onNavigate,
  searchQuery,
  onSearchChange,
  unreadCount = 12,
  onToggleConstellationOverlay,
  me,
  onOpenMyProfile,
  bell,
  mode = 'demo',
}) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeMore = () => { setMoreOpen(false); moreRef.current?.focus(); };
  useEffect(() => {
    if (!moreOpen) return;
    sheetRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMoreOpen(false); moreRef.current?.focus(); }
      if (event.key === 'Tab') {
        const buttons = sheetRef.current?.querySelectorAll<HTMLButtonElement>('button');
        const first = buttons?.[0];
        const last = buttons?.[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [moreOpen]);
  // Desktop: five core destinations in the bar, the rest under More.
  const [deskMoreOpen, setDeskMoreOpen] = useState(false);
  const deskMoreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!deskMoreOpen) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !deskMoreRef.current?.contains(event.target as Node)) setDeskMoreOpen(false);
    };
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', close);
    return () => { window.removeEventListener('mousedown', close); window.removeEventListener('keydown', close); };
  }, [deskMoreOpen]);
  const deskExtra = [
    { id: 'insights', label: 'Insights', icon: Network },
    { id: 'news', label: 'News', icon: Newspaper },
    { id: 'work', label: 'Work', icon: Briefcase },
  ] as const;
  const mobileExtra = [
    { id: 'insights', label: 'Insights', icon: Network },
    { id: 'meetings', label: 'Meetings', icon: Video },
    { id: 'news', label: 'News', icon: Newspaper },
    { id: 'work', label: 'Work', icon: Briefcase },
  ] as const;
  const myName = me ? (me.name || 'My profile') : 'Sarah Chen';
  const myInitials = (me?.name || 'Me').split(' ').filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  return (
    <>
    <header className="ix-global-header sticky top-0 z-50 w-full backdrop-blur-md border-b px-2 sm:px-4 md:px-6 transition-colors print:hidden">
      <div className="ix-global-header-inner max-w-[1600px] mx-auto">

        {/* Zone 1: Brand Wordmark */}
        <div className="ix-global-brand min-w-0">
          <Button variant="ghost"
            onClick={() => onNavigate('home')}
            aria-label="Ask Intros home"
            className="official-logo-action"
          >
            <AskIntrosLockup variant="header" />
          </Button>
        </div>

        {/* Zone 2: Navigation Links — always fully visible, shrink text before ever clipping */}
        <nav aria-label="Desktop navigation" className="ix-desktop-main-nav">
            {[
            { id: 'home', label: 'Home' },
            { id: 'people', label: 'People' },
            { id: 'intros', label: 'Ask Intros', isBubbles: true },
            { id: 'meetings', label: 'Meetings' },
            { id: 'messages', label: 'Messages', badge: unreadCount },
          ].map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onNavigate(item.id as ActivePage)}
                className={`ix-desktop-nav-link ${isActive ? 'is-active' : ''} ${item.isBubbles ? 'is-brand-destination' : ''}`}
              >
                <span className="ix-desktop-nav-label">
                  {item.isBubbles && (
                    <Orbit className="w-3.5 h-3.5 text-[var(--acc)]" />
                  )}
                  {item.label}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="ix-desktop-unread-count">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
          {/* Everything else, one click away. */}
          <div className="ix-desktop-more relative" ref={deskMoreRef}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={deskMoreOpen}
              onClick={() => setDeskMoreOpen(v => !v)}
              className={`ix-desktop-nav-link ix-desktop-more-trigger ${deskExtra.some(i => i.id === activePage) ? 'is-active' : ''} `}
            >
              {deskExtra.find(i => i.id === activePage)?.label ?? 'More'} <ChevronDown className="w-3 h-3" aria-hidden="true" />
            </button>
            {deskMoreOpen && (
              <div role="menu" className="ix-desktop-more-menu absolute left-1/2 -translate-x-1/2 top-[calc(100%+10px)] z-50 min-w-[196px] rounded-xl border p-1.5 shadow-2xl">
                {deskExtra.map(({ id, label, icon: Icon }) => (
                  <button key={id} role="menuitem" type="button"
                    onClick={() => { setDeskMoreOpen(false); onNavigate(id as ActivePage); }}
                    className={`ix-desktop-more-item w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[13px] cursor-pointer ${activePage === id ? 'is-active' : ''}`}>
                    <Icon className="w-4 h-4" aria-hidden="true" />{label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Zone 3: Search & account — pinned to the far right */}
        <div className="ix-global-account-actions ml-auto flex items-center gap-1.5 md:gap-2.5 shrink-0">
          {/* Compact search, far right next to logout */}
          <div className="relative hidden xl:block w-24 xl:w-28 shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6B7280]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search..."
              className="w-full bg-[#0F131A] text-xs text-[#F2EEE6] placeholder-[#6B7280] rounded-lg pl-7 pr-2 py-1 border border-white/10 focus:outline-none focus:border-[var(--acc)] focus:ring-1 focus:ring-[var(--acc)] transition-all"
            />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#6B7280] bg-white/5 border border-white/10 px-1 rounded hidden lg:block">
              /
            </kbd>
          </div>

          {/* Notification Bell (live members get the real unread count) */}
          {bell ?? <button
            onClick={() => onNavigate('intros')}
            title="Introduction Requests"
            className="relative p-1.5 md:p-2 text-[#9CA3AF] hover:text-[#F2EEE6] hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--acc)] ring-2 ring-[#07090C]" />
          </button>}

          <AppearanceToggle className="ix-header-appearance" />

          {/* Current User Profile Pill */}
          <button
            onClick={() => (onOpenMyProfile ? onOpenMyProfile() : onNavigate('profile', 'sarah-chen'))}
            title="My profile"
            className="ix-header-profile-action flex items-center gap-2 p-0.5 pl-0.5 pr-1.5 rounded-full hover:bg-white/5 transition-colors cursor-pointer group"
          >
            {me?.avatarUrl
              ? <AvatarImage source={me.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
              : <span className="w-7 h-7 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-[10px] font-semibold text-[#F2EEE6]">{myInitials}</span>}
            <span className="hidden 2xl:inline text-xs font-medium text-[#F2EEE6] group-hover:text-white">
              {myName}
            </span>
          </button>

          {mode === 'live' ? <button onClick={() => void signOut()} title="Log out" aria-label="Log out" className="ix-header-logout-action"><LogOut className="w-4 h-4" /></button> : <a href="/auth" aria-label="Log in">Log in</a>}
        </div>
      </div>
    </header>
    <nav className="ix-mobile-nav print:hidden" aria-label="Mobile navigation">
      {[
        { id: 'home', label: 'Home', icon: Home },
        { id: 'intros', label: 'Ask Intros', icon: Orbit },
        { id: 'people', label: 'People', icon: Users },
        { id: 'messages', label: 'Messages', icon: MessageSquare },
      ].map(({ id, label, icon: Icon }) => <Button key={id} variant="ghost" className="ix-mobile-nav-item" aria-current={activePage === id ? 'page' : undefined} onClick={() => { setMoreOpen(false); onNavigate(id as ActivePage); }}>
        <span className="relative"><Icon aria-hidden="true" />{id === 'messages' && unreadCount > 0 && <span className="ix-mobile-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}</span>
        <span>{label}</span>
      </Button>)}
      <Button ref={moreRef} variant="ghost" className="ix-mobile-nav-item" aria-label="More menu" aria-expanded={moreOpen} aria-controls="mobile-more-menu" aria-current={mobileExtra.some(item => item.id === activePage) ? 'page' : undefined} onClick={() => setMoreOpen(value => !value)}><MoreHorizontal aria-hidden="true" /><span>More</span></Button>
    </nav>
    {moreOpen && <div className="ix-mobile-more print:hidden">
      <Button variant="ghost" className="ix-mobile-scrim" aria-label="Close more menu" onClick={closeMore} />
      <div ref={sheetRef} id="mobile-more-menu" className="ix-mobile-sheet" role="dialog" aria-modal="true" aria-label="More destinations">
        <div className="ix-mobile-sheet-head"><span>More</span><Button variant="ghost" size="icon" aria-label="Close more menu" onClick={closeMore}><X /></Button></div>
        {mobileExtra.map(({ id, label, icon: Icon }) => <Button key={id} variant="ghost" className="ix-mobile-sheet-item" aria-current={activePage === id ? 'page' : undefined} onClick={() => { closeMore(); onNavigate(id); }}><Icon aria-hidden="true" />{label}</Button>)}
        <Button variant="ghost" className="ix-mobile-sheet-item" onClick={() => { closeMore(); if (onOpenMyProfile) onOpenMyProfile(); else onNavigate('profile', 'sarah-chen'); }}><Users aria-hidden="true" />My profile</Button>
        {mode === 'live' ? <Button variant="ghost" className="ix-mobile-sheet-item" onClick={() => { closeMore(); void signOut(); }}><LogOut aria-hidden="true" />Log out</Button> : <a href="/auth" className="ix-mobile-sheet-item flex items-center gap-3 p-3">Log in</a>}
      </div>
    </div>}
    </>
  );
};
