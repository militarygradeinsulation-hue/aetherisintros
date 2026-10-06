// @ts-nocheck
import React from 'react';
import {
  Keyboard,
  Command,
  Search,
  CornerDownLeft,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  LayoutGrid,
  Sparkles,
  HelpCircle,
  SlidersHorizontal,
  Compass,
} from 'lucide-react';

interface PersistentFooterKeyMapProps {
  focusedTileIndex: number | null;
  totalTiles: number;
  focusedTileTitle?: string;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  onOpenFocusedTile: () => void;
  onOpenCommandPalette: () => void;
  onOpenFullTextSearch: () => void;
  onOpenCheatSheet: () => void;
  onSwitchView: (view: 'grid' | 'inbox' | 'graph' | 'heatmap') => void;
  activeView: 'grid' | 'inbox' | 'graph' | 'heatmap';
}

export const PersistentFooterKeyMap: React.FC<PersistentFooterKeyMapProps> = ({
  focusedTileIndex,
  totalTiles,
  focusedTileTitle,
  onNavigatePrev,
  onNavigateNext,
  onOpenFocusedTile,
  onOpenCommandPalette,
  onOpenFullTextSearch,
  onOpenCheatSheet,
  onSwitchView,
  activeView,
}) => {
  return (
    <div
      role="region"
      aria-label="Persistent Visual Keyboard Shortcut Map"
      className="w-full border-t border-white/10 bg-[#07090C]/95 backdrop-blur-md py-3 px-3 sm:px-6 z-20 select-none shadow-[0_-10px_25px_rgba(0,0,0,0.5)]"
    >
      <div className="max-w-[1560px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-3">
        {/* Left: Tile Navigation Feedback & Controls */}
        <div className="flex items-center gap-2.5 flex-wrap justify-center lg:justify-start">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-mono">
            <Keyboard size={13} className="text-[#3D6BF2]" />
            <span className="text-[#F2EEE6]/60 uppercase tracking-wider text-[10px]">
              Key-Map:
            </span>
            {focusedTileIndex !== null ? (
              <span className="text-[#F2EEE6] font-semibold flex items-center gap-1.5">
                <span className="text-[#3D6BF2]">#{focusedTileIndex + 1}/{totalTiles}</span>
                <span className="text-white truncate max-w-[140px] sm:max-w-[200px]">
                  {focusedTileTitle?.replace('\n', ' ') || `Tile ${focusedTileIndex + 1}`}
                </span>
              </span>
            ) : (
              <span className="text-[#F2EEE6]/50 italic">
                Use arrows to navigate
              </span>
            )}
          </div>

          {/* Interactive Navigation Step Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={onNavigatePrev}
              className="p-1 sm:px-2 sm:py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[#F2EEE6] text-[10px] font-mono flex items-center gap-1 transition-all active:scale-95"
              title="Previous Tile (Left Arrow)"
              aria-label="Previous Tile"
            >
              <ArrowLeft size={11} />
              <kbd className="hidden sm:inline px-1 py-0.2 bg-white/10 rounded text-[8.5px]">←</kbd>
            </button>

            <button
              onClick={onNavigateNext}
              className="p-1 sm:px-2 sm:py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[#F2EEE6] text-[10px] font-mono flex items-center gap-1 transition-all active:scale-95"
              title="Next Tile (Right Arrow)"
              aria-label="Next Tile"
            >
              <kbd className="hidden sm:inline px-1 py-0.2 bg-white/10 rounded text-[8.5px]">→</kbd>
              <ArrowRight size={11} />
            </button>

            {focusedTileIndex !== null && (
              <button
                onClick={onOpenFocusedTile}
                className="px-2 py-1 rounded bg-[#3D6BF2]/20 hover:bg-[#3D6BF2]/30 border border-[#3D6BF2]/50 text-white text-[10px] font-mono flex items-center gap-1 transition-all shadow-sm active:scale-95"
                title="Open Workspace for Selected Tile (Enter / Space)"
              >
                <span>Open Tile</span>
                <CornerDownLeft size={10} className="text-[#3D6BF2]" />
                <kbd className="px-1 py-0.2 bg-white/15 rounded text-[8.5px]">↵</kbd>
              </button>
            )}
          </div>
        </div>

        {/* Center: Persistent Keyboard Shortcut Badges */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center text-[10.5px] font-mono">
          {/* Tile Navigation Arrows */}
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-white/[0.03] border border-white/5 text-[#F2EEE6]/75">
            <span className="text-[#F2EEE6]/50 mr-1 text-[9.5px]">Navigate:</span>
            <span className="flex items-center gap-0.5">
              <kbd className="px-1 py-0.2 bg-white/10 rounded border border-white/15 text-[9px] text-white">↑</kbd>
              <kbd className="px-1 py-0.2 bg-white/10 rounded border border-white/15 text-[9px] text-white">↓</kbd>
              <kbd className="px-1 py-0.2 bg-white/10 rounded border border-white/15 text-[9px] text-white">←</kbd>
              <kbd className="px-1 py-0.2 bg-white/10 rounded border border-white/15 text-[9px] text-white">→</kbd>
            </span>
          </div>

          {/* Command Palette (⌘K) */}
          <button
            onClick={onOpenCommandPalette}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/[0.04] hover:bg-[#3D6BF2]/20 border border-white/10 hover:border-[#3D6BF2]/40 text-[#F2EEE6] transition-all cursor-pointer"
            title="Open Command Palette (⌘K / Ctrl+K)"
          >
            <Command size={11} className="text-[#3D6BF2]" />
            <span>Command</span>
            <kbd className="px-1.5 py-0.2 bg-white/10 rounded border border-white/15 text-[9px] text-white font-bold">
              ⌘K
            </kbd>
          </button>

          {/* Full-Text Search (⌘F) */}
          <button
            onClick={onOpenFullTextSearch}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/[0.04] hover:bg-[#3D6BF2]/20 border border-white/10 hover:border-[#3D6BF2]/40 text-[#F2EEE6] transition-all cursor-pointer"
            title="Open Full-Text Search Across Profiles, Tags & Notes (⌘F / /)"
          >
            <Search size={11} className="text-[#3D6BF2]" />
            <span>Search</span>
            <kbd className="px-1.5 py-0.2 bg-white/10 rounded border border-white/15 text-[9px] text-white font-bold">
              ⌘F
            </kbd>
          </button>

          {/* Views Switching 1-4 */}
          <div className="hidden md:flex items-center gap-1 px-2 py-1 rounded bg-white/[0.03] border border-white/5 text-[#F2EEE6]/75">
            <span className="text-[#F2EEE6]/50 mr-1 text-[9.5px]">Views:</span>
            <button
              onClick={() => onSwitchView('grid')}
              className={`px-1 rounded hover:bg-white/10 transition-colors ${activeView === 'grid' ? 'text-[#3D6BF2] font-bold' : ''}`}
              title="Intelligence Grid View (1)"
            >
              <kbd className="px-1 py-0.2 bg-white/10 rounded border border-white/15 text-[9px]">1</kbd> Grid
            </button>
            <button
              onClick={() => onSwitchView('inbox')}
              className={`px-1 rounded hover:bg-white/10 transition-colors ${activeView === 'inbox' ? 'text-[#3D6BF2] font-bold' : ''}`}
              title="Actionable Inbox View (2)"
            >
              <kbd className="px-1 py-0.2 bg-white/10 rounded border border-white/15 text-[9px]">2</kbd> Inbox
            </button>
            <button
              onClick={() => onSwitchView('graph')}
              className={`px-1 rounded hover:bg-white/10 transition-colors ${activeView === 'graph' ? 'text-[#3D6BF2] font-bold' : ''}`}
              title="D3 Network Graph View (3)"
            >
              <kbd className="px-1 py-0.2 bg-white/10 rounded border border-white/15 text-[9px]">3</kbd> Graph
            </button>
            <button
              onClick={() => onSwitchView('heatmap')}
              className={`px-1 rounded hover:bg-white/10 transition-colors ${activeView === 'heatmap' ? 'text-[#F97316] font-bold' : ''}`}
              title="Cluster Heatmap View (4)"
            >
              <kbd className="px-1 py-0.2 bg-white/10 rounded border border-white/15 text-[9px]">4</kbd> Heatmap
            </button>
          </div>

          {/* Shortcuts Cheat Sheet (?) */}
          <button
            onClick={onOpenCheatSheet}
            className="flex items-center gap-1 px-2 py-1 rounded bg-white/[0.04] hover:bg-white/10 border border-white/10 text-[#F2EEE6]/75 hover:text-white transition-all cursor-pointer"
            title="Open Complete Keyboard Cheat Sheet (?)"
          >
            <HelpCircle size={11} className="text-[#F2EEE6]/60" />
            <kbd className="px-1 py-0.2 bg-white/10 rounded border border-white/15 text-[9px] text-white">
              ?
            </kbd>
          </button>
        </div>

        {/* Right: Status & Executive Brand */}
        <div className="flex items-center gap-2 text-[10px] font-mono text-[#F2EEE6]/50">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3FB37F] animate-pulse" />
          <span>Aetheris Key-Nav Active</span>
          <span className="text-white/20">|</span>
          <span className="text-[#3D6BF2]">CEOs Operating System</span>
        </div>
      </div>
    </div>
  );
};
