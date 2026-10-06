// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Keyboard,
  X,
  Search,
  Zap,
  LayoutGrid,
  CheckSquare,
  Share2,
  BookOpen,
  Sparkles,
  Calendar,
  Download,
  Command,
  CornerDownLeft,
} from 'lucide-react';

interface ShortcutItem {
  keys: string[];
  description: string;
  category: 'Navigation' | 'Actions & Automation' | 'Executive Notes & Dossier' | 'Search & Palette';
  actionId?: string;
}

const SHORTCUTS: ShortcutItem[] = [
  // Navigation
  {
    keys: ['↑', '↓', '←', '→'],
    description: 'Navigate focus between the 24 System Grid Tiles in real-time',
    category: 'Navigation',
    actionId: 'navigate_tiles',
  },
  {
    keys: ['Enter'],
    description: 'Open Workspace for currently focused tile',
    category: 'Navigation',
    actionId: 'open_tile',
  },
  {
    keys: ['⌘', 'K'],
    description: 'Open Command Palette & Filter Connections (Tag, Tier, Recency)',
    category: 'Navigation',
    actionId: 'command',
  },
  {
    keys: ['⌘', 'F', 'or', '/'],
    description: 'Full-Text Search Across Profiles, Tags, and Meeting Notes',
    category: 'Search & Palette',
    actionId: 'full_text_search',
  },
  {
    keys: ['⌘', 'I'],
    description: 'Toggle Collapsible Executive Intelligence Sidebar',
    category: 'Navigation',
    actionId: 'sidebar',
  },
  {
    keys: ['⌘', 'P'],
    description: 'Run Predictive LLM Network Analysis & Blind Spot Scan',
    category: 'Navigation',
    actionId: 'predictive',
  },
  {
    keys: ['?', 'or', '⌘', '/'],
    description: 'Open this Keyboard Shortcuts Cheat Sheet',
    category: 'Navigation',
    actionId: 'cheatsheet',
  },
  {
    keys: ['1'],
    description: 'Switch to 24-Tile Intelligence Grid View',
    category: 'Navigation',
    actionId: 'view_grid',
  },
  {
    keys: ['2'],
    description: 'Switch to Central Actionable Inbox View',
    category: 'Navigation',
    actionId: 'view_inbox',
  },
  {
    keys: ['3'],
    description: 'Switch to D3 Network Relationship Graph',
    category: 'Navigation',
    actionId: 'view_graph',
  },
  {
    keys: ['4'],
    description: 'Switch to Cluster Engagement Density Heatmap',
    category: 'Navigation',
    actionId: 'view_heatmap',
  },

  // Actions & Automation
  {
    keys: ['⌘', 'S'],
    description: 'Scan Calendar Events & Auto-Map Engagement Levels',
    category: 'Actions & Automation',
    actionId: 'scan_calendar',
  },
  {
    keys: ['⌘', 'E'],
    description: 'Export Executive Network Report (CSV)',
    category: 'Actions & Automation',
    actionId: 'export_csv',
  },
  {
    keys: ['Esc'],
    description: 'Dismiss open modals, unfocus tiles, or exit drawers',
    category: 'Actions & Automation',
    actionId: 'close',
  },

  // Executive Notes & Dossier
  {
    keys: ['⌘', 'B'],
    description: 'Format selected text as bold in meeting minutes',
    category: 'Executive Notes & Dossier',
  },
  {
    keys: ['⌘', 'I'],
    description: 'Format selected text as italic in meeting minutes',
    category: 'Executive Notes & Dossier',
  },
  {
    keys: ['⌘', 'Enter'],
    description: 'Save and commit structured meeting minutes',
    category: 'Executive Notes & Dossier',
  },

  // Search & Palette
  {
    keys: ['↑', '↓'],
    description: 'Navigate up and down through search results',
    category: 'Search & Palette',
  },
  {
    keys: ['Enter'],
    description: 'Execute highlighted action or inspect connection profile',
    category: 'Search & Palette',
  },
];

interface KeyboardCheatSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteAction?: (actionId: string) => void;
}

export const KeyboardCheatSheetModal: React.FC<KeyboardCheatSheetModalProps> = ({
  isOpen,
  onClose,
  onExecuteAction,
}) => {
  const [filterText, setFilterText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [pressedKey, setPressedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      setPressedKey(e.key.length === 1 ? e.key.toUpperCase() : e.key);
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleKeyUp = () => {
      setPressedKey(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const categories = ['all', 'Navigation', 'Actions & Automation', 'Executive Notes & Dossier', 'Search & Palette'];

  const filteredShortcuts = SHORTCUTS.filter((s) => {
    const matchesCategory = selectedCategory === 'all' || s.category === selectedCategory;
    const matchesQuery =
      s.description.toLowerCase().includes(filterText.toLowerCase()) ||
      s.keys.some((k) => k.toLowerCase().includes(filterText.toLowerCase()));
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        className="w-full max-w-2xl rounded-2xl bg-[#12100C] border border-white/20 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] relative text-[#F2EEE6] select-none"
      >
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.2) 1px, transparent 0)',
            backgroundSize: '18px 18px',
          }}
        />

        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-[#12100C] flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#F5B027]/20 border border-[#F5B027]/40 flex items-center justify-center text-[#F5B027]">
              <Keyboard size={18} />
            </div>
            <div>
              <div className="text-[9.5px] font-mono tracking-[0.28em] text-[#F5B027] uppercase font-bold">
                Executive Cheat Sheet
              </div>
              <h2 id="shortcuts-title" className="font-serif-editorial text-xl sm:text-2xl text-[#F2EEE6] leading-tight">
                Keyboard Shortcuts & Hotkeys
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {pressedKey && (
              <span className="px-2 py-0.5 rounded bg-[#F5B027]/30 border border-[#F5B027] text-[10px] font-mono text-white animate-pulse">
                Key: {pressedKey}
              </span>
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 rounded text-[#F2EEE6]/60 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Filter and Category Pills */}
        <div className="p-3 border-b border-white/10 bg-[#12100C] flex flex-col sm:flex-row items-center justify-between gap-2 relative z-10">
          <div className="relative w-full sm:w-64">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#F2EEE6]/40" />
            <input
              type="text"
              placeholder="Search shortcuts..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full bg-[#12100C] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#F2EEE6] placeholder-[#F2EEE6]/30 focus:outline-none focus:border-[#F5B027]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={`px-2 py-1 rounded text-[10px] font-mono transition-colors whitespace-nowrap ${
                  selectedCategory === c
                    ? 'bg-white/15 text-white font-semibold'
                    : 'text-[#F2EEE6]/60 hover:text-white'
                }`}
              >
                {c === 'all' ? 'All' : c.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Shortcuts List Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 relative z-10 flex-1">
          {filteredShortcuts.length > 0 ? (
            <div className="grid grid-cols-1 gap-2.5">
              {filteredShortcuts.map((s, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    if (s.actionId && onExecuteAction) {
                      onExecuteAction(s.actionId);
                      onClose();
                    }
                  }}
                  className={`p-3 rounded-xl bg-[#12100C]/80 border border-white/5 hover:border-white/20 transition-all flex items-center justify-between gap-4 ${
                    s.actionId ? 'cursor-pointer hover:bg-[#12100c]' : ''
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-[9px] font-mono text-[#F5B027] uppercase font-semibold">
                      {s.category}
                    </div>
                    <div className="text-xs sm:text-[13px] text-[#F2EEE6] font-medium mt-0.5">
                      {s.description}
                    </div>
                  </div>

                  {/* Key Cap Badges */}
                  <div className="flex items-center gap-1 shrink-0">
                    {s.keys.map((k, kIdx) => {
                      if (k === 'or') {
                        return (
                          <span key={kIdx} className="text-[10px] text-[#F2EEE6]/40 font-mono px-0.5">
                            or
                          </span>
                        );
                      }
                      return (
                        <kbd
                          key={kIdx}
                          className="min-w-[24px] h-6 px-1.5 rounded bg-[#12100C] border border-white/20 shadow-[0_2px_0_rgba(0,0,0,0.8)] text-[#F2EEE6] font-mono text-[11px] font-bold flex items-center justify-center leading-none"
                        >
                          {k}
                        </kbd>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-[#F2EEE6]/50">
              No shortcuts found matching &quot;{filterText}&quot;.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/10 bg-[#12100C] flex items-center justify-between text-[10px] font-mono text-[#F2EEE6]/60 relative z-10">
          <div className="flex items-center gap-1.5">
            <Sparkles size={11} className="text-[#F5B027]" />
            <span>Power Tip: Press <kbd className="px-1 py-0.2 rounded bg-white/10 font-bold">?</kbd> anywhere in the dashboard to open this cheat sheet.</span>
          </div>
          <button
            onClick={onClose}
            className="hover:text-white transition-colors"
          >
            Close (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
