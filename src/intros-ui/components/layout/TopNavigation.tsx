// @ts-nocheck
import React from 'react';
import { AskIntrosLockup } from '@/aetheris/AskIntrosLockup';
import { Search, Bell, Orbit, LogOut } from 'lucide-react';
import { ExecutivePortrait } from '../shared/ExecutivePortrait';
import { supabase } from '@/integrations/supabase/client';
import { AccentSwitch } from '../../AccentMode';

async function signOut() {
  try { await supabase.auth.signOut(); } finally {
    try { Object.keys(localStorage).filter(k => k.startsWith('aetheris.')).forEach(k => localStorage.removeItem(k)); } catch { /* ignore */ }
    window.location.replace('/auth');
  }
}

export type ActivePage = 'home' | 'people' | 'bubbles' | 'intros' | 'messages' | 'insights' | 'profile' | 'news' | 'workspace' | 'memory' | 'work';

interface TopNavigationProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage, memberId?: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  unreadCount?: number;
  onToggleConstellationOverlay?: () => void;
  me?: { name: string; avatarUrl?: string } | null;
  onOpenMyProfile?: () => void;
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
}) => {
  const myName = me ? (me.name || 'My profile') : 'Sarah Chen';
  return (
    <header className="sticky top-0 z-50 w-full bg-[#07090C]/95 backdrop-blur-md border-b border-white/10 px-2 sm:px-4 md:px-6 py-2.5 transition-colors print:hidden">
      <div className="max-w-[1600px] mx-auto flex flex-wrap items-center gap-x-2 gap-y-1">

        {/* Zone 1: Brand Wordmark */}
        <div className="shrink-0">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-none"
          >
            <AskIntrosLockup variant="compact" />
          </button>
        </div>

        {/* Zone 2: Navigation Links — always fully visible, shrink text before ever clipping */}
        <nav className="order-3 md:order-none w-full md:w-auto md:flex-1 flex flex-wrap items-center justify-start md:justify-center gap-x-2.5 gap-y-1 md:gap-x-4 py-0.5">
            {[
            { id: 'workspace', label: 'Ask Intros', isBubbles: true },
            { id: 'bubbles', label: 'Bubbles', isBubbles: true },
            { id: 'home', label: 'Home' },
            { id: 'insights', label: 'Insights' },
            { id: 'intros', label: 'Intros' },
            { id: 'memory', label: 'Memory' },
            { id: 'messages', label: 'Messages', badge: unreadCount },
            { id: 'news', label: 'News' },
            { id: 'people', label: 'People' },
            { id: 'work', label: 'Work' },
          ].map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id as ActivePage)}
                className={`relative py-0.5 text-[10px] sm:text-[11px] md:text-xs lg:text-[13px] font-medium tracking-wide transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'text-white font-semibold'
                    : item.isBubbles
                      ? 'text-[var(--acc)] hover:text-white'
                      : 'text-[#9CA3AF] hover:text-[#F2EEE6]'
                }`}
              >
                <span className="flex items-center gap-1">
                  {item.isBubbles && (
                    <Orbit className="w-3 h-3 text-[var(--acc)] animate-spin-slow" />
                  )}
                  {item.label}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="inline-flex items-center justify-center text-[9px] font-mono px-1 py-[1px] rounded-full bg-[var(--acc)] text-[#0B0D0F] font-semibold">
                      {item.badge}
                    </span>
                  )}
                </span>
                {isActive && (
                  <span className="absolute bottom-[-6px] left-0 right-0 h-[2px] bg-[var(--acc)] shadow-[0_0_8px_var(--acc)]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Search & account — pinned to the far right */}
        <div className="order-2 md:order-none ml-auto flex items-center gap-1.5 md:gap-2.5 shrink-0">
          {/* Compact search, far right next to logout */}
          <div className="relative hidden md:block w-36 lg:w-48 xl:w-56 shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6B7280]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search..."
              className="w-full bg-[#0F131A] text-xs text-[#F2EEE6] placeholder-[#6B7280] rounded-lg pl-8 pr-7 py-1.5 border border-white/10 focus:outline-none focus:border-[var(--acc)] focus:ring-1 focus:ring-[var(--acc)] transition-all"
            />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#6B7280] bg-white/5 border border-white/10 px-1 rounded hidden lg:block">
              /
            </kbd>
          </div>

          {/* Notification Bell */}
          <button
            onClick={() => onNavigate('intros')}
            title="Introduction Requests"
            className="relative p-1.5 md:p-2 text-[#9CA3AF] hover:text-[#F2EEE6] hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--acc)] ring-2 ring-[#07090C]" />
          </button>

          <AccentSwitch />

          {/* Current User Profile Pill */}
          <button
            onClick={() => (onOpenMyProfile ? onOpenMyProfile() : onNavigate('profile', 'sarah-chen'))}
            title="My profile"
            className="flex items-center gap-2 p-0.5 pl-0.5 pr-1.5 rounded-full hover:bg-white/5 transition-colors cursor-pointer group"
          >
            {me?.avatarUrl ? <img src={me.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" /> : <ExecutivePortrait name={myName} size="sm" />}
            <span className="hidden 2xl:inline text-xs font-medium text-[#F2EEE6] group-hover:text-white">
              {myName}
            </span>
          </button>

          <button
            onClick={signOut}
            title="Log out"
            aria-label="Log out"
            className="flex items-center gap-1.5 p-1.5 md:p-2 text-[#9CA3AF] hover:text-[#F2EEE6] hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden xl:inline text-xs">Log out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
