// @ts-nocheck
import React from 'react';
import { AskIntrosLockup } from '@/aetheris/AskIntrosLockup';
import { Search, Bell, Sparkles, Orbit, LogOut } from 'lucide-react';
import { ExecutivePortrait } from '../shared/ExecutivePortrait';
import { supabase } from '@/integrations/supabase/client';

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
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
  activePage,
  onNavigate,
  searchQuery,
  onSearchChange,
  unreadCount = 12,
  onToggleConstellationOverlay,
}) => {
  return (
    <header className="sticky top-0 z-50 w-full bg-[#07090C]/95 backdrop-blur-md border-b border-white/10 px-4 md:px-8 py-3.5 transition-colors print:hidden">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-6 shrink-0">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-none"
          >
            <AskIntrosLockup variant="compact" />
          </button>
        </div>

        {/* Zone 2: Navigation Links (Text Links with subtle bottom active line) */}
        <nav className="flex-1 min-w-0 flex items-center gap-4 md:gap-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-1">
          {[
            { id: 'home', label: 'Home' },
            { id: 'news', label: 'News' },
            { id: 'people', label: 'People' },
            { id: 'intros', label: 'Intros' },
            { id: 'messages', label: 'Messages', badge: unreadCount },
            { id: 'work', label: 'Work' },
            { id: 'memory', label: 'Memory' },
            { id: 'insights', label: 'Insights' },
            { id: 'bubbles', label: 'Bubbles', isBubbles: true },
            { id: 'workspace', label: 'Ask Intros', isBubbles: true },
          ].map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id as ActivePage)}
                className={`relative py-1 text-xs md:text-sm font-medium tracking-wide transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'text-white font-semibold'
                    : item.isBubbles
                    ? 'text-[#60A5FA] hover:text-white'
                    : 'text-[#9CA3AF] hover:text-[#F2EEE6]'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  {item.isBubbles && (
                    <Orbit className="w-3.5 h-3.5 text-[#3D6BF2] animate-spin-slow" />
                  )}
                  {item.label}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="inline-flex items-center justify-center text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#3D6BF2] text-white font-semibold">
                      {item.badge}
                    </span>
                  )}
                </span>
                {isActive && (
                  <span className="absolute bottom-[-14px] left-0 right-0 h-[2px] bg-[#3D6BF2] shadow-[0_0_8px_#3D6BF2]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Search, Notifications & Profile Avatar */}
        <div className="flex items-center gap-3 md:gap-4 shrink-0">
          {/* Search bar input */}
          <div className="relative hidden 2xl:block w-64 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6B7280]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search people, companies, or topics..."
              className="w-full bg-[#0F131A] text-xs text-[#F2EEE6] placeholder-[#6B7280] rounded-lg pl-8 pr-8 py-2 border border-white/10 focus:outline-none focus:border-[#3D6BF2] focus:ring-1 focus:ring-[#3D6BF2] transition-all"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#6B7280] bg-white/5 border border-white/10 px-1 py-0.5 rounded">
              /
            </kbd>
          </div>

          {/* Tagline text for desktop editorial balance */}
          <div className="hidden 2xl:flex flex-col text-right pr-2 border-r border-white/10">
            <span className="text-[9px] font-mono tracking-widest text-[#9CA3AF] uppercase">
              A smarter world is a
            </span>
            <span className="text-[9px] font-mono tracking-widest text-white/80 uppercase">
              more connected one.
            </span>
          </div>

          {/* Notification Bell */}
          <button
            onClick={() => onNavigate('intros')}
            title="Introduction Requests"
            className="relative p-2 text-[#9CA3AF] hover:text-[#F2EEE6] hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#3D6BF2] ring-2 ring-[#07090C]" />
          </button>

          {/* Current User Profile Pill */}
          <button
            onClick={() => onNavigate('profile', 'sarah-chen')}
            className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-full hover:bg-white/5 transition-colors cursor-pointer group"
          >
            <ExecutivePortrait name="Sarah Chen" size="sm" />
            <span className="hidden 2xl:inline text-xs font-medium text-[#F2EEE6] group-hover:text-white">
              Sarah Chen
            </span>
          </button>

          <button
            onClick={signOut}
            title="Log out"
            aria-label="Log out"
            className="flex items-center gap-1.5 p-2 text-[#9CA3AF] hover:text-[#F2EEE6] hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden xl:inline text-xs">Log out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
