import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  Zap,
  ArrowRight,
  Filter,
  ArrowUpDown,
  Calendar,
  Download,
  Share2,
  Sparkles,
  Keyboard,
  X,
  CheckCircle2,
  User,
  Activity,
  Tag,
  Clock,
  Crown,
  Diamond,
  Circle,
  AlertTriangle,
} from 'lucide-react';
import { Person } from '../types';
import { SortMode } from '../utils/reportExport';
import { RelationshipTierBadge, RelationshipTier } from './RelationshipTierBadge';

export type ActivityHistoryFilter = 'all' | 'last_24h' | 'last_3d' | 'this_week' | 'drift_30d';

interface PersistentGridCommandPaletteProps {
  people: Person[];
  selectedPerson?: Person | null;
  onSelectPerson: (person: Person) => void;
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
  onScanCalendar: () => void;
  onDownloadReport: () => void;
  onSwitchView: (view: 'grid' | 'inbox' | 'graph' | 'heatmap') => void;
  onOpenCheatSheet: () => void;
  onOpenPredictiveInsights: () => void;
  filterStatus: 'all' | 'active' | 'followup' | 'dormant';
  onFilterStatusChange: (status: 'all' | 'active' | 'followup' | 'dormant') => void;
  tierFilter?: 'all' | 'inner_circle' | 'strategic' | 'network';
  onTierFilterChange?: (tier: 'all' | 'inner_circle' | 'strategic' | 'network') => void;
  selectedTag?: string | null;
  onSelectTag?: (tag: string | null) => void;
  activityHistoryFilter?: ActivityHistoryFilter;
  onActivityHistoryFilterChange?: (filter: ActivityHistoryFilter) => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onOpenFullTextSearch?: () => void;
  heatmapActive?: boolean;
  onToggleHeatmap?: () => void;
  heatmapMode?: 'sector' | 'frequency';
  onToggleHeatmapMode?: () => void;
}

interface GridPredictiveItem {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  type: 'person' | 'action';
  person?: Person;
  action?: () => void;
}

const CURATED_TAGS = [
  'Syndicate',
  'Sovereign',
  'Defense',
  'DeepTech',
  'Growth',
  'Health Systems',
  'Photonic',
  'Alliances',
  'Board',
];

export const PersistentGridCommandPalette: React.FC<PersistentGridCommandPaletteProps> = ({
  people,
  selectedPerson,
  onSelectPerson,
  sortMode,
  onSortChange,
  onScanCalendar,
  onDownloadReport,
  onSwitchView,
  onOpenCheatSheet,
  onOpenPredictiveInsights,
  filterStatus,
  onFilterStatusChange,
  tierFilter = 'all',
  onTierFilterChange,
  selectedTag = null,
  onSelectTag,
  activityHistoryFilter = 'all',
  onActivityHistoryFilterChange,
  searchQuery,
  onSearchQueryChange,
  onOpenFullTextSearch,
  heatmapActive = false,
  onToggleHeatmap,
  heatmapMode = 'sector',
  onToggleHeatmapMode,
}) => {
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const [showExtendedFilters, setShowExtendedFilters] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Focus input when Cmd+K or Ctrl+K is pressed
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsFocused(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Extract all distinct tags from people
  const allAvailableTags = useMemo(() => {
    const set = new Set<string>();
    CURATED_TAGS.forEach((t) => set.add(t));
    people.forEach((p) => {
      p.tags?.forEach((t) => set.add(t));
    });
    return Array.from(set);
  }, [people]);

  // Real-time predictive matches for contacts and contextual actions
  const predictiveMatches = useMemo<GridPredictiveItem[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      // Suggest top contacts when input is empty
      return people.slice(0, 5).map((p) => ({
        id: `p-${p.id}`,
        title: p.name,
        subtitle: `${p.title} · ${p.company} • ${p.lastTouchpoint}`,
        badge: `${p.tier ? p.tier.replace('_', ' ') : 'Active'} · ${p.connectionScore}/100`,
        type: 'person',
        person: p,
      }));
    }

    const matches: GridPredictiveItem[] = [];

    // Filter people by query (name, company, title, tags, notes)
    people.forEach((p) => {
      const matchName = p.name.toLowerCase().includes(q);
      const matchCompany = p.company.toLowerCase().includes(q);
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchNotes = (p.notes || '').toLowerCase().includes(q);
      const matchTag = p.tags?.some((t) => t.toLowerCase().includes(q.replace('#', '')));
      const matchTier = p.tier?.toLowerCase().includes(q);

      if (matchName || matchCompany || matchTitle || matchNotes || matchTag || matchTier) {
        matches.push({
          id: `person-${p.id}`,
          title: p.name,
          subtitle: `${p.title} · ${p.company} • ${p.lastTouchpoint} ${
            p.tags && p.tags.length > 0 ? `• [${p.tags.slice(0, 2).join(', ')}]` : ''
          }`,
          badge: `${p.tier ? p.tier.replace('_', ' ') : 'Network'} · ${p.connectionScore} Score`,
          type: 'person',
          person: p,
        });

        // Contextual action
        matches.push({
          id: `action-${p.id}`,
          title: `Inspect Dossier & Priority Meetings for ${p.name}`,
          subtitle: `View recent news, strategic priorities, and calendar briefings`,
          badge: `Executive Brief`,
          type: 'action',
          person: p,
          action: () => {
            onSelectPerson(p);
            setIsFocused(false);
          },
        });
      }
    });

    // Tag matches if typing '#'
    if (q.startsWith('#')) {
      const tagSearch = q.slice(1);
      allAvailableTags
        .filter((t) => t.toLowerCase().includes(tagSearch))
        .forEach((tag) => {
          matches.push({
            id: `tag-${tag}`,
            title: `Filter by Tag: #${tag}`,
            subtitle: `Show all connections matching the #${tag} mandate`,
            badge: 'Tag Filter',
            type: 'action',
            action: () => {
              if (onSelectTag) onSelectTag(tag);
              onSearchQueryChange('');
              setIsFocused(false);
            },
          });
        });
    }

    // System Navigation matches
    if ('heatmap'.includes(q) || 'density'.includes(q) || 'cluster'.includes(q)) {
      matches.push({
        id: 'sys-heatmap',
        title: 'Open Network-Wide Engagement Density Heatmap',
        subtitle: 'Color-coded matrix of professional clusters by interaction cadence',
        badge: 'View Switcher',
        type: 'action',
        action: () => {
          onSwitchView('heatmap');
          setIsFocused(false);
        },
      });
    }

    if ('graph'.includes(q) || 'd3'.includes(q) || 'nodes'.includes(q)) {
      matches.push({
        id: 'sys-graph',
        title: 'Switch to D3 Network Relationship Graph',
        subtitle: 'Visual node-link topology of executive connections',
        badge: 'View Switcher',
        type: 'action',
        action: () => {
          onSwitchView('graph');
          setIsFocused(false);
        },
      });
    }

    if ('inbox'.includes(q) || 'tasks'.includes(q) || 'approvals'.includes(q)) {
      matches.push({
        id: 'sys-inbox',
        title: 'Switch to Central Actionable Inbox',
        subtitle: '8 pending executive commitments and SLA items',
        badge: 'View Switcher',
        type: 'action',
        action: () => {
          onSwitchView('inbox');
          setIsFocused(false);
        },
      });
    }

    if ('scan'.includes(q) || 'calendar'.includes(q)) {
      matches.push({
        id: 'sys-scan',
        title: 'Scan Calendar & Map Priority Touchpoints',
        subtitle: 'Automatically sync briefings and calculate half-life decay',
        badge: 'Calendar Integration',
        type: 'action',
        action: () => {
          onScanCalendar();
          setIsFocused(false);
        },
      });
    }

    return matches.slice(0, 8);
  }, [people, searchQuery, allAvailableTags, onSelectPerson, onSelectTag, onSearchQueryChange, onSwitchView, onScanCalendar]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < predictiveMatches.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : predictiveMatches.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = predictiveMatches[highlightedIndex];
      if (current) {
        if (current.type === 'person' && current.person) {
          onSelectPerson(current.person);
        } else if (current.action) {
          current.action();
        }
        setIsFocused(false);
      }
    } else if (e.key === 'Escape') {
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  const hasActiveFilters =
    filterStatus !== 'all' ||
    tierFilter !== 'all' ||
    selectedTag !== null ||
    activityHistoryFilter !== 'all' ||
    searchQuery.trim().length > 0;

  const handleClearAllFilters = () => {
    onFilterStatusChange('all');
    if (onTierFilterChange) onTierFilterChange('all');
    if (onSelectTag) onSelectTag(null);
    if (onActivityHistoryFilterChange) onActivityHistoryFilterChange('all');
    onSearchQueryChange('');
  };

  return (
    <div ref={containerRef} className="relative w-full mb-4 z-30">
      {/* 1. Main Persistent Input Bar */}
      <div className="w-full rounded-2xl bg-[#090C11]/90 backdrop-blur-xl border border-white/15 shadow-xl p-2 sm:p-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5 transition-all focus-within:border-[#3D6BF2]/60 focus-within:shadow-[0_0_25px_rgba(61,107,242,0.2)]">
        {/* Left: Search & Filter Input */}
        <div className="flex items-center gap-2 flex-1 min-w-0 px-2">
          <div className="text-[#3D6BF2] shrink-0">
            <Search size={15} />
          </div>

          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              onSearchQueryChange(e.target.value);
              setIsFocused(true);
            }}
            onFocus={() => setIsFocused(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search connections by name, #tag, tier (Cmd+K), or recent activity history..."
            className="w-full bg-transparent text-xs sm:text-[13px] text-[#F2EEE6] placeholder-[#F2EEE6]/40 focus:outline-none font-sans py-1.5"
          />

          {searchQuery && (
            <button
              onClick={() => {
                onSearchQueryChange('');
                inputRef.current?.focus();
              }}
              className="p-1 rounded text-[#F2EEE6]/50 hover:text-white mr-1"
              title="Clear text search"
            >
              <X size={13} />
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1.5 shrink-0 pr-1">
            {onOpenFullTextSearch && (
              <button
                type="button"
                onClick={onOpenFullTextSearch}
                className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-[#3D6BF2]/20 border border-white/10 text-[9.5px] font-mono text-[#60A5FA] flex items-center gap-1 transition-all cursor-pointer"
                title="Open Modal Full-Text Search Across All Profiles, Notes & Tags (⌘F)"
              >
                <span>Full-Text</span>
                <kbd className="text-[8.5px] px-1 py-0.2 bg-white/10 rounded border border-white/15 text-white/90">⌘F</kbd>
              </button>
            )}
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-[10px] font-mono text-[#F2EEE6]/70 shadow-sm">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Center: Quick Tier & Status Controls */}
        <div className="flex items-center gap-1 border-t md:border-t-0 md:border-l border-white/10 pt-2 md:pt-0 md:pl-2.5 overflow-x-auto no-scrollbar">
          {/* Tier Filter Selector */}
          {onTierFilterChange && (
            <select
              value={tierFilter}
              onChange={(e) => onTierFilterChange(e.target.value as any)}
              className="bg-[#0E1116] text-[#F2EEE6] border border-white/10 rounded-lg px-2 py-1 text-[10.5px] font-mono focus:outline-none cursor-pointer"
              title="Filter by Relationship Tier"
            >
              <option value="all" className="bg-[#090C11]">All Tiers</option>
              <option value="inner_circle" className="bg-[#090C11]">▲ Inner Circle</option>
              <option value="strategic" className="bg-[#090C11]">◆ Strategic</option>
              <option value="network" className="bg-[#090C11]">● Network</option>
            </select>
          )}

          {/* Activity History Filter Selector */}
          {onActivityHistoryFilterChange && (
            <select
              value={activityHistoryFilter}
              onChange={(e) => onActivityHistoryFilterChange(e.target.value as ActivityHistoryFilter)}
              className="bg-[#0E1116] text-[#F2EEE6] border border-white/10 rounded-lg px-2 py-1 text-[10.5px] font-mono focus:outline-none cursor-pointer"
              title="Filter by Recent Activity History"
            >
              <option value="all" className="bg-[#090C11]">All Activity</option>
              <option value="last_24h" className="bg-[#090C11]">⚡ Last 24h</option>
              <option value="last_3d" className="bg-[#090C11]">3d Active</option>
              <option value="this_week" className="bg-[#090C11]">7d Cadence</option>
              <option value="drift_30d" className="bg-[#090C11]">⚠️ 30d+ Drift</option>
            </select>
          )}

          {/* Extended Tag Filters Toggle */}
          <button
            onClick={() => setShowExtendedFilters((prev) => !prev)}
            className={`px-2.5 py-1 rounded-lg text-[10.5px] font-mono flex items-center gap-1 transition-all ${
              showExtendedFilters || selectedTag
                ? 'bg-[#3D6BF2]/20 text-[#3D6BF2] border border-[#3D6BF2]/40 font-bold'
                : 'text-[#F2EEE6]/60 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
            title="Toggle tag filtering drawer"
          >
            <Tag size={11} />
            <span>Tags {selectedTag ? `(#${selectedTag})` : ''}</span>
          </button>
        </div>

        {/* Right: Quick Action Launchers */}
        <div className="flex items-center gap-1.5 border-t md:border-t-0 md:border-l border-white/10 pt-2 md:pt-0 md:pl-2.5 shrink-0 flex-wrap">
          {/* Heatmap Overlay Toggle Button */}
          {onToggleHeatmap && (
            <button
              onClick={onToggleHeatmap}
              className={`px-2 py-1 rounded text-[10px] font-mono flex items-center gap-1 transition-all ${
                heatmapActive
                  ? 'bg-[#F97316]/25 border border-[#F97316]/60 text-[#F97316] font-bold shadow-[0_0_12px_rgba(249,115,22,0.3)]'
                  : 'bg-white/5 border border-white/10 text-[#F2EEE6]/70 hover:text-white hover:bg-white/10'
              }`}
              title="Toggle Activity Density & Cadence Heatmap Overlay"
            >
              <span>🔥</span>
              <span>Heatmap</span>
            </button>
          )}

          <button
            onClick={() => onSwitchView('heatmap')}
            className="px-2 py-1 rounded bg-[#F97316]/15 hover:bg-[#F97316]/25 border border-[#F97316]/35 text-[#F2EEE6] text-[10px] font-mono flex items-center gap-1 transition-colors"
            title="Open Network Cluster Heatmap View"
          >
            <Activity size={11} className="text-[#F97316]" />
            <span>Clusters</span>
          </button>

          <button
            onClick={() => onSwitchView('graph')}
            className="px-2 py-1 rounded bg-[#3D6BF2]/15 hover:bg-[#3D6BF2]/25 border border-[#3D6BF2]/40 text-[#F2EEE6] text-[10px] font-mono flex items-center gap-1 transition-colors"
            title="Open D3 Network Graph Visualization"
          >
            <Share2 size={11} className="text-[#3D6BF2]" />
            <span>Graph</span>
          </button>

          <button
            onClick={onScanCalendar}
            className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-[#F2EEE6]/70 hover:text-white transition-colors"
            title="Scan calendar touchpoints"
          >
            <Calendar size={12} className="text-[#3D6BF2]" />
          </button>

          <button
            onClick={onDownloadReport}
            className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-[#F2EEE6]/70 hover:text-white transition-colors"
            title="Export Network Report CSV"
          >
            <Download size={12} className="text-[#3D6BF2]" />
          </button>

          <button
            onClick={onOpenCheatSheet}
            className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-[#F2EEE6]/70 hover:text-white transition-colors"
            title="Keyboard Shortcuts Cheat Sheet (⌘/ or ?)"
          >
            <Keyboard size={12} className="text-[#3D6BF2]" />
          </button>
        </div>
      </div>

      {/* 2. Tag Filter Chips Drawer */}
      {(showExtendedFilters || selectedTag) && (
        <div className="mt-2 p-2.5 rounded-xl bg-[#0B0E14] border border-white/10 shadow-md flex items-center gap-2 flex-wrap animate-in slide-in-from-top-1 duration-150">
          <span className="text-[10px] font-mono text-[#F2EEE6]/60 uppercase tracking-wider flex items-center gap-1 shrink-0">
            <Tag size={10} className="text-[#3D6BF2]" />
            <span>Filter by Tag:</span>
          </span>

          <button
            onClick={() => onSelectTag && onSelectTag(null)}
            className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
              selectedTag === null
                ? 'bg-white/20 text-white font-bold'
                : 'text-[#F2EEE6]/60 hover:text-white hover:bg-white/5'
            }`}
          >
            All Tags
          </button>

          {allAvailableTags.map((tag) => {
            const isSelected = selectedTag === tag;
            return (
              <button
                key={tag}
                onClick={() => onSelectTag && onSelectTag(isSelected ? null : tag)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all flex items-center gap-1 ${
                  isSelected
                    ? 'bg-[#3D6BF2] text-white font-bold shadow-[0_0_8px_rgba(61,107,242,0.5)]'
                    : 'bg-white/5 text-[#F2EEE6]/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span>#{tag}</span>
                {isSelected && <X size={9} />}
              </button>
            );
          })}
        </div>
      )}

      {/* 3. Active Filter Summary Indicator */}
      {hasActiveFilters && (
        <div className="mt-2 px-3 py-1.5 rounded-lg bg-[#0E1116] border border-white/10 flex items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[#3D6BF2] font-semibold">Active Palette Filters:</span>
            {tierFilter !== 'all' && (
              <span className="px-1.5 py-0.2 rounded bg-white/10 text-white flex items-center gap-1">
                <span>Tier: {tierFilter.replace('_', ' ')}</span>
                <button onClick={() => onTierFilterChange && onTierFilterChange('all')}>
                  <X size={10} />
                </button>
              </span>
            )}
            {selectedTag && (
              <span className="px-1.5 py-0.2 rounded bg-[#3D6BF2]/20 border border-[#3D6BF2]/40 text-[#3D6BF2] flex items-center gap-1">
                <span>#{selectedTag}</span>
                <button onClick={() => onSelectTag && onSelectTag(null)}>
                  <X size={10} />
                </button>
              </span>
            )}
            {activityHistoryFilter !== 'all' && (
              <span className="px-1.5 py-0.2 rounded bg-white/10 text-white flex items-center gap-1">
                <Clock size={10} />
                <span>
                  {activityHistoryFilter === 'last_24h'
                    ? 'Last 24 Hours'
                    : activityHistoryFilter === 'last_3d'
                    ? 'Active (≤ 3 Days)'
                    : activityHistoryFilter === 'this_week'
                    ? 'Within 7 Days'
                    : '30d+ Drift Alert'}
                </span>
                <button onClick={() => onActivityHistoryFilterChange && onActivityHistoryFilterChange('all')}>
                  <X size={10} />
                </button>
              </span>
            )}
            {searchQuery && (
              <span className="px-1.5 py-0.2 rounded bg-white/10 text-[#F2EEE6] flex items-center gap-1">
                <span>"{searchQuery}"</span>
                <button onClick={() => onSearchQueryChange('')}>
                  <X size={10} />
                </button>
              </span>
            )}
          </div>

          <button
            onClick={handleClearAllFilters}
            className="text-[10px] text-[#F2EEE6]/60 hover:text-white underline shrink-0"
          >
            Clear All
          </button>
        </div>
      )}

      {/* 4. Real-time Predictive Dropdown Menu anchored beneath the persistent command palette */}
      {isFocused && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl bg-[#090C11]/95 backdrop-blur-2xl border border-white/20 shadow-2xl p-2.5 space-y-1 animate-in fade-in duration-150 z-50 max-h-80 overflow-y-auto">
          <div className="px-2 py-1 flex items-center justify-between text-[9px] font-mono uppercase tracking-wider text-[#3D6BF2] font-bold border-b border-white/5 pb-1.5">
            <span className="flex items-center gap-1">
              <Zap size={10} className="text-[#3FB37F]" />
              <span>Predictive Search & Filter Matches ({predictiveMatches.length})</span>
            </span>
            <span className="text-[#F2EEE6]/40">Press ↵ to select · Esc to close</span>
          </div>

          {predictiveMatches.length > 0 ? (
            predictiveMatches.map((item, idx) => {
              const isSelected = idx === highlightedIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.type === 'person' && item.person) {
                      onSelectPerson(item.person);
                    } else if (item.action) {
                      item.action();
                    }
                    setIsFocused(false);
                  }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between gap-3 transition-all ${
                    isSelected
                      ? 'bg-[#151922] border border-[#3D6BF2]/60 shadow-md translate-x-0.5'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {item.person ? (
                      <div className="relative shrink-0">
                        <img
                          src={item.person.avatar}
                          alt={item.person.name}
                          className="w-7 h-7 rounded-full object-cover border border-white/15"
                        />
                        {item.person.tier && (
                          <div className="absolute -bottom-1 -right-1 scale-75">
                            <RelationshipTierBadge tier={item.person.tier} size="xs" showLabel={false} />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-[#3D6BF2]/20 border border-[#3D6BF2]/40 flex items-center justify-center text-[#3D6BF2] shrink-0">
                        <Zap size={12} />
                      </div>
                    )}
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#F2EEE6] truncate">
                          {item.title}
                        </span>
                        <span className="text-[8.5px] font-mono px-1.5 py-0.2 rounded bg-white/5 text-[#3D6BF2] border border-white/5 shrink-0">
                          {item.badge}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#F2EEE6]/60 truncate font-mono">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] font-mono text-[#F2EEE6]/40 flex items-center gap-1 shrink-0">
                    <span>Execute</span>
                    <ArrowRight size={11} className="text-[#3D6BF2]" />
                  </div>
                </button>
              );
            })
          ) : (
            <div className="py-6 text-center text-xs font-mono text-[#F2EEE6]/50">
              No matching connections or actions found for "{searchQuery}".
            </div>
          )}
        </div>
      )}
    </div>
  );
};
