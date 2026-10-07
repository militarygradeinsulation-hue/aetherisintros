// @ts-nocheck
import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Users,
  Search,
  Filter,
  ArrowRight,
  Maximize2,
  RefreshCw,
  Zap,
  Target,
  ShieldCheck,
  Pause,
  Play,
  Printer,
  Download,
  SlidersHorizontal,
  Building2,
  Layers,
  Network,
  RotateCcw,
  Check,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react';
import { NetworkMember, RelationshipTier } from '../networkData';
import { FloatingConnectionField } from '../components/shared/FloatingConnectionField';
import { ExecutivePortrait, getPortraitForName } from '../components/shared/ExecutivePortrait';
import { NetworkSnapshotPrintView } from '../components/shared/NetworkSnapshotPrintView';
import { ActivePage } from '../components/layout/TopNavigation';

interface ConnectionBubblesViewProps {
  members: NetworkMember[];
  onNavigate: (page: ActivePage, memberId?: string) => void;
  onRequestIntro: (member: NetworkMember) => void;
}

const INDUSTRIES = [
  { id: 'all', label: 'All Industries' },
  { id: 'AI & Machine Learning', label: 'AI & Machine Learning' },
  { id: 'Enterprise SaaS', label: 'Enterprise SaaS' },
  { id: 'Infrastructure & Cloud', label: 'Infrastructure & Cloud' },
  { id: 'Fintech', label: 'Fintech' },
  { id: 'Climate Tech', label: 'Climate Tech' },
  { id: 'Deep Tech & Robotics', label: 'Deep Tech & Robotics' },
  { id: 'Global Strategy', label: 'Global Strategy' },
];

const COMPANY_SIZES = [
  { id: 'all', label: 'All Sizes', sub: 'Any company stage' },
  { id: '1-10', label: '1–10', sub: 'Seed / Boutique' },
  { id: '11-50', label: '11–50', sub: 'Growth / Venture' },
  { id: '51-250', label: '51–250', sub: 'Scale-Up' },
  { id: '250+', label: '250+', sub: 'Enterprise & Global' },
];

const MUTUAL_PRESETS = [0, 3, 6, 10];

export const ConnectionBubblesView: React.FC<ConnectionBubblesViewProps> = ({
  members,
  onNavigate,
  onRequestIntro,
}) => {
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all');
  const [selectedCompanySize, setSelectedCompanySize] = useState<string>('all');
  const [minMutuals, setMinMutuals] = useState<number>(0);
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [minFitScore, setMinFitScore] = useState<number>(0);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedSpotlightId, setSelectedSpotlightId] = useState<string>('sarah-chen');
  const [isPaused, setIsPaused] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleExportSnapshot = () => {
    setIsExporting(true);
    setTimeout(() => {
      window.print();
      setIsExporting(false);
    }, 120);
  };

  // Computed count maps for filtering sidebar
  const industryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: members.length };
    INDUSTRIES.forEach((ind) => {
      if (ind.id === 'all') return;
      counts[ind.id] = members.filter((m) =>
        m.industry === ind.id ||
        m.focusAreas.some((f) => f.toLowerCase().includes(ind.id.toLowerCase()))
      ).length;
    });
    return counts;
  }, [members]);

  const companySizeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: members.length };
    COMPANY_SIZES.forEach((cs) => {
      if (cs.id === 'all') return;
      counts[cs.id] = members.filter((m) => m.companySize === cs.id).length;
    });
    return counts;
  }, [members]);

  const tierCounts = useMemo(() => {
    return {
      all: members.length,
      Core: members.filter((m) => m.tier === 'Core').length,
      Extended: members.filter((m) => m.tier === 'Extended').length,
      Prospect: members.filter((m) => m.tier === 'Prospect').length,
    };
  }, [members]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedRole !== 'all') count++;
    if (selectedIndustry !== 'all') count++;
    if (selectedCompanySize !== 'all') count++;
    if (minMutuals > 0) count++;
    if (selectedTier !== 'all') count++;
    if (minFitScore > 0) count++;
    if (searchFilter.trim()) count++;
    return count;
  }, [
    selectedRole,
    selectedIndustry,
    selectedCompanySize,
    minMutuals,
    selectedTier,
    minFitScore,
    searchFilter,
  ]);

  const handleResetFilters = () => {
    setSelectedRole('all');
    setSelectedIndustry('all');
    setSelectedCompanySize('all');
    setMinMutuals(0);
    setSelectedTier('all');
    setMinFitScore(0);
    setSearchFilter('');
  };

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (selectedRole !== 'all' && m.roleType !== selectedRole) return false;
      if (minFitScore > 0 && m.matchScore < minFitScore) return false;
      if (selectedTier !== 'all' && m.tier !== selectedTier) return false;
      if (selectedCompanySize !== 'all' && m.companySize !== selectedCompanySize) return false;
      if (m.mutualConnectionsCount < minMutuals) return false;
      if (selectedIndustry !== 'all') {
        const matchInd =
          m.industry === selectedIndustry ||
          m.focusAreas.some((f) => f.toLowerCase().includes(selectedIndustry.toLowerCase()));
        if (!matchInd) return false;
      }
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        return (
          m.name.toLowerCase().includes(q) ||
          m.company.toLowerCase().includes(q) ||
          m.title.toLowerCase().includes(q) ||
          m.location.toLowerCase().includes(q) ||
          (m.industry && m.industry.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [
    members,
    selectedRole,
    minFitScore,
    selectedTier,
    selectedCompanySize,
    minMutuals,
    selectedIndustry,
    searchFilter,
  ]);

  const spotlightMember =
    filteredMembers.find((m) => m.id === selectedSpotlightId) ||
    filteredMembers[0] ||
    members.find((m) => m.id === selectedSpotlightId) ||
    members[0];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6 animate-fadeIn">
      {/* On-screen interactive interface (hidden during print) */}
      <div className="print:hidden space-y-6">
        {/* Editorial Header */}
        <section className="relative border-b border-white/10 pb-6 pt-2">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#9EA4AC]">
                Network · Live Constellation
              </div>
              <h1 className="font-serif-editorial text-4xl sm:text-5xl md:text-6xl text-[#F1EFE9] leading-[1.02] tracking-tight">
                The people around you, <em className="text-[#F5B027] not-italic">in motion.</em>
              </h1>
              <p className="text-sm text-[#9EA4AC] max-w-lg leading-relaxed">
                Every bubble is a person worth knowing. Closer means stronger context. Select anyone to see why they matter now.
              </p>
            </div>
            <div className="flex items-end gap-8 shrink-0">
              <div>
                <div className="font-serif-editorial text-5xl text-[#F1EFE9] leading-none">{filteredMembers.length}</div>
                <div className="mt-2 text-[10px] font-mono uppercase tracking-[0.2em] text-[#9EA4AC]">People in view</div>
              </div>
              <div className="w-px h-12 bg-white/10" />
              <div>
                <div className="font-serif-editorial text-5xl text-[#C78522] leading-none">{tierCounts.Core}</div>
                <div className="mt-2 text-[10px] font-mono uppercase tracking-[0.2em] text-[#9EA4AC]">Core relationships</div>
              </div>
            </div>
          </div>
        </section>

      {/* Filter and Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        {/* Role Cluster Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-[#9CA3AF] mr-1 hidden sm:inline">Filter:</span>
          {[
            { id: 'all', label: 'All People' },
            { id: 'founder', label: 'Founders' },
            { id: 'investor', label: 'Investors' },
            { id: 'operator', label: 'Operators' },
            { id: 'advisor', label: 'Advisors' },
          ].map((cluster) => (
            <button
              key={cluster.id}
              onClick={() => setSelectedRole(cluster.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                selectedRole === cluster.id
                  ? 'bg-[#C78522] text-white font-semibold shadow-md shadow-[#C78522]/20'
                  : 'text-[#9CA3AF] hover:text-white hover:bg-white/5'
              }`}
            >
              {cluster.label}
            </button>
          ))}
        </div>

        {/* Fit Filter, Sidebar Toggle, Search & Export Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all cursor-pointer flex items-center gap-1.5 ${
              isSidebarOpen
                ? 'bg-[#C78522]/20 border-[#C78522] text-[#F5B027] font-semibold shadow-sm shadow-[#C78522]/20'
                : 'bg-white/5 border-white/10 text-[#9CA3AF] hover:text-white'
            }`}
            title={isSidebarOpen ? 'Collapse Filtering Sidebar' : 'Expand Filtering Sidebar'}
          >
            {isSidebarOpen ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#C78522] text-white text-[9px] flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setMinFitScore((prev) => (prev === 0 ? 85 : prev === 85 ? 90 : 0))}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all cursor-pointer flex items-center gap-1.5 ${
              minFitScore > 0
                ? 'bg-[#C78522]/20 border-[#C78522] text-[#F5B027]'
                : 'border-white/10 text-[#9CA3AF] hover:text-white'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>{minFitScore > 0 ? `Fit ≥ ${minFitScore}%` : 'All Fit Tiers'}</span>
          </button>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#6B7280] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search people…"
              className="pl-8 pr-3 py-1.5 text-xs bg-[#151923] border border-white/10 rounded-lg text-white placeholder-[#6B7280] focus:outline-none focus:border-[#C78522]"
            />
          </div>

          {activeFilterCount > 0 && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono text-[#9EA4AC] hover:text-white border border-white/10 transition-colors cursor-pointer"
              title="Reset all active filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}

          <button
            onClick={handleExportSnapshot}
            disabled={isExporting}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono bg-[#C78522] hover:bg-[#A96F1B] text-white shadow-sm shadow-[#C78522]/30 transition-all cursor-pointer font-semibold shrink-0 active:scale-95"
            title="Generate high-resolution cluster representation and save as PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Generating...' : 'Export'}</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Floating Bubbles Canvas Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Filtering Sidebar: Allows segmenting bubbles by Industry, Company Size, or Mutual Connections Count */}
        {isSidebarOpen && (
          <aside className="lg:col-span-3 bg-[#0E121A] border border-white/10 rounded-xl p-5 space-y-5 shadow-xl flex flex-col justify-between">
            <div className="space-y-5">
              {/* Sidebar Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#C78522]" />
                  <div>
                    <h2 className="text-xs font-mono uppercase tracking-widest text-white font-bold">
                      Refine
                    </h2>
                    <p className="text-[10px] text-[#9CA3AF] font-mono">Narrow who appears</p>
                  </div>
                </div>
                {activeFilterCount > 0 ? (
                  <button
                    onClick={handleResetFilters}
                    className="flex items-center gap-1 text-[10px] font-mono text-[#9EA4AC] hover:text-white px-2 py-0.5 rounded border border-white/10 transition-colors cursor-pointer"
                    title="Clear all segments"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Clear</span>
                  </button>
                ) : (
                  <span className="text-[9px] font-mono text-[#9CA3AF] bg-white/5 px-2 py-0.5 rounded border border-white/5">
                    Live
                  </span>
                )}
              </div>

              {/* 1. Industry Focus Segmentation */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="flex items-center gap-1.5 font-mono text-[11px] text-[#CBD5E1] uppercase tracking-wider font-semibold">
                    <Building2 className="w-3.5 h-3.5 text-[#C78522]" />
                    Industry Focus
                  </span>
                  {selectedIndustry !== 'all' && (
                    <button
                      onClick={() => setSelectedIndustry('all')}
                      className="text-[10px] font-mono text-[#F5B027] hover:underline cursor-pointer"
                    >
                      All
                    </button>
                  )}
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {INDUSTRIES.map((ind) => {
                    const isSelected = selectedIndustry === ind.id;
                    const count = industryCounts[ind.id] || 0;
                    return (
                      <button
                        key={ind.id}
                        onClick={() => setSelectedIndustry(ind.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer border text-left ${
                          isSelected
                            ? 'bg-[#C78522] text-white border-[#C78522] font-semibold shadow-sm shadow-[#C78522]/30'
                            : 'bg-[#131722] hover:bg-[#1A202C] text-[#CBD5E1] border-white/5 hover:border-white/10'
                        }`}
                      >
                        <span className="truncate pr-2">{ind.label}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded shrink-0 ${
                            isSelected
                              ? 'bg-white/20 text-white font-bold'
                              : 'bg-white/5 text-[#9CA3AF]'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Company Size Segmentation */}
              <div className="space-y-2 pt-3 border-t border-white/5">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="flex items-center gap-1.5 font-mono text-[11px] text-[#CBD5E1] uppercase tracking-wider font-semibold">
                    <Layers className="w-3.5 h-3.5 text-[#F5B027]" />
                    Company Size
                  </span>
                  {selectedCompanySize !== 'all' && (
                    <button
                      onClick={() => setSelectedCompanySize('all')}
                      className="text-[10px] font-mono text-[#F5B027] hover:underline cursor-pointer"
                    >
                      All
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {COMPANY_SIZES.map((cs) => {
                    const isSelected = selectedCompanySize === cs.id;
                    const count = companySizeCounts[cs.id] || 0;
                    return (
                      <button
                        key={cs.id}
                        onClick={() => setSelectedCompanySize(cs.id)}
                        className={`flex flex-col items-start px-2 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-[#C78522]/20 text-[#F1EFE9] border-[#C78522] font-semibold'
                            : 'bg-[#131722] hover:bg-[#1A202C] text-[#CBD5E1] border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-bold">{cs.label}</span>
                          <span className="text-[10px] opacity-70">({count})</span>
                        </div>
                        <span className="text-[9px] text-[#9CA3AF] font-sans truncate w-full text-left">
                          {cs.sub}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Mutual Connections Count Segmentation */}
              <div className="space-y-2.5 pt-3 border-t border-white/5">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="flex items-center gap-1.5 font-mono text-[11px] text-[#CBD5E1] uppercase tracking-wider font-semibold">
                    <Network className="w-3.5 h-3.5 text-[#C78522]" />
                    Mutual Connections
                  </span>
                  <span className="text-xs font-mono text-[#C78522] font-bold bg-[#C78522]/10 px-2 py-0.5 rounded border border-[#C78522]/20">
                    {minMutuals > 0 ? `≥ ${minMutuals} Connections` : 'Any (0+)'}
                  </span>
                </div>

                {/* Range Slider */}
                <input
                  type="range"
                  min="0"
                  max="14"
                  step="1"
                  value={minMutuals}
                  onChange={(e) => setMinMutuals(Number(e.target.value))}
                  className="w-full accent-[#C78522] cursor-pointer bg-white/10 rounded-lg h-1.5"
                />

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5">
                  {MUTUAL_PRESETS.map((val) => (
                    <button
                      key={val}
                      onClick={() => setMinMutuals(val)}
                      className={`flex-1 py-1 text-[10px] font-mono rounded transition-all cursor-pointer border ${
                        minMutuals === val
                          ? 'bg-[#C78522] text-black font-semibold border-[#C78522]'
                          : 'bg-[#131722] text-[#9CA3AF] hover:text-white border-white/5'
                      }`}
                    >
                      {val === 0 ? 'All' : `${val}+`}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Relationship Tier Filter */}
              <div className="space-y-2 pt-3 border-t border-white/5">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="flex items-center gap-1.5 font-mono text-[11px] text-[#CBD5E1] uppercase tracking-wider font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#F5B027]" />
                    Relationship Tier
                  </span>
                  {selectedTier !== 'all' && (
                    <button
                      onClick={() => setSelectedTier('all')}
                      className="text-[10px] font-mono text-[#F5B027] hover:underline cursor-pointer"
                    >
                      All
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {[
                    { id: 'all', label: 'All', dot: 'bg-white' },
                    { id: 'Core', label: 'Core', dot: 'bg-[#C78522]' },
                    { id: 'Extended', label: 'Extended', dot: 'bg-[#F5B027]' },
                    { id: 'Prospect', label: 'Prospect', dot: 'bg-[#C78522]' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTier(t.id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-1.5 text-[10px] font-mono rounded transition-all cursor-pointer border ${
                        selectedTier === t.id
                          ? 'bg-white/15 text-white font-bold border-white/30'
                          : 'bg-[#131722] text-[#9CA3AF] hover:text-white border-white/5'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar Bottom Radar Cluster Metrics Bar */}
            <div className="pt-4 border-t border-white/10 space-y-2 mt-4">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-[#9CA3AF]">Active Radar Nodes:</span>
                <span className="text-white font-bold">
                  {filteredMembers.length} / {members.length}
                </span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#C78522] to-[#F5B027] h-full transition-all duration-300"
                  style={{
                    width: `${Math.max(
                      8,
                      (filteredMembers.length / Math.max(members.length, 1)) * 100
                    )}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[9px] font-mono text-[#9CA3AF]">
                <span>
                  {Math.round((filteredMembers.length / Math.max(members.length, 1)) * 100)}% Constellation Web
                </span>
                {activeFilterCount > 0 && (
                  <span className="text-[#F5B027] font-bold">
                    {activeFilterCount} active filter{activeFilterCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </aside>
        )}

        {/* Center: The Large Interactive Floating Canvas */}
        <div
          className={`${
            isSidebarOpen ? 'lg:col-span-6' : 'lg:col-span-8'
          } bg-gradient-to-b from-[#090C11] via-[#0E121A] to-[#07090C] border border-white/10 rounded-xl overflow-hidden relative  flex flex-col`}
        >
          {/* Top Canvas Bar Indicator */}
          <div className="px-4 py-2.5 border-b border-white/10 bg-black/40 flex items-center justify-between text-xs text-[#9CA3AF]">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsPaused(!isPaused)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono border transition-all cursor-pointer ${
                  isPaused
                    ? 'bg-[#C78522]/15 text-[#F4A125] border-[#C78522]/40'
                    : 'bg-white/5 text-[#9CA3AF] hover:text-white border-white/10'
                }`}
              >
                {isPaused ? <Play className="w-3 h-3 text-[#F4A125]" /> : <Pause className="w-3 h-3 text-[#C78522]" />}
                <span>{isPaused ? 'Paused' : 'Pause Drift'}</span>
              </button>

              <div className="flex items-center gap-1.5 hidden sm:flex">
                <span className={`w-2 h-2 rounded-full ${isPaused ? 'bg-[#C78522]' : 'bg-[#F5B027] animate-pulse'}`} />
                <span className="font-mono text-[11px] text-white">
                  {isPaused ? 'Simulation Paused' : 'Live drift'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono text-[#CBD5E1] hidden md:inline">
                Drag to explore · Click to open
              </span>
            </div>
          </div>

          {/* The Canvas */}
          <div className="w-full h-[600px] relative">
            <FloatingConnectionField
              members={filteredMembers}
              onSelectMember={(memberId) => {
                setSelectedSpotlightId(memberId);
                onNavigate('profile', memberId);
              }}
              onRequestIntro={onRequestIntro}
              density="fullscreen"
              speedMultiplier={0.16}
              isPaused={isPaused}
              className="w-full h-full"
            />
          </div>

          {/* Bottom Bar: Instructions & Quick Actions */}
          <div className="px-5 py-3 border-t border-white/10 bg-black/40 flex items-center justify-between text-xs text-[#9CA3AF]">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C78522]" />
                Strongest fit
              </span>
              <span className="flex items-center gap-1.5 text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F5B027]" />
                Verified member
              </span>
            </div>
            <button
              onClick={() => onNavigate('people')}
              className="text-[#F5B027] hover:text-white flex items-center gap-1 text-xs font-semibold cursor-pointer"
            >
              View as directory <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Selected Member Spotlight Dossier Card */}
        <div
          className={`${
            isSidebarOpen ? 'lg:col-span-3' : 'lg:col-span-4'
          } space-y-4 flex flex-col justify-between`}
        >
          <div className="bg-[#0E121A] border border-white/10 rounded-xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between text-[10px] font-mono tracking-widest uppercase text-[#9CA3AF] font-semibold">
              <span className="flex items-center gap-1.5">
                
                In focus
              </span>
              <span className="text-xs font-bold text-[#C78522] bg-[#C78522]/10 border border-[#C78522]/30 px-2 py-0.5 rounded">
                {spotlightMember.matchScore}% Match
              </span>
            </div>

            {/* Large Executive Portrait Artwork */}
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-white/10 bg-black/50">
              {(() => {
                const u = getPortraitForName(spotlightMember.name, spotlightMember.avatarUrl);
                return u ? (
                  <img
                    src={u}
                    alt={spotlightMember.name}
                    className="w-full h-full object-cover grayscale contrast-125 brightness-95"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-serif-editorial text-5xl text-white/40">
                    {spotlightMember.name.split(' ').filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                );
              })()}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0E121A] via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-white bg-black/60 px-2 py-1 rounded backdrop-blur-sm border border-white/10">
                  {spotlightMember.company}
                </span>
                <span className="text-[10px] font-mono text-[#C78522] bg-black/60 px-2 py-1 rounded backdrop-blur-sm border border-white/10 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Verified
                </span>
              </div>
            </div>

            {/* Name, Role & Location */}
            <div>
              <h3 className="font-serif-editorial text-xl font-bold text-white leading-tight">
                {spotlightMember.name}
              </h3>
              <p className="text-xs text-[#9CA3AF] mt-0.5">
                {spotlightMember.title} · {spotlightMember.company}
              </p>
              <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-[#6B7280]">
                <span>{spotlightMember.location}</span>
                {spotlightMember.industry && (
                  <>
                    <span>·</span>
                    <span className="text-[#F5B027]">{spotlightMember.industry}</span>
                  </>
                )}
              </div>
            </div>

            {/* Editorial Quote */}
            <blockquote className="text-xs text-[#CBD5E1] italic bg-white/[0.02] p-3 rounded-lg border border-white/5 leading-relaxed">
              "{spotlightMember.quote || spotlightMember.bioStatement}"
            </blockquote>

            {/* Focus Areas */}
            <div>
              <div className="text-[10px] font-mono uppercase text-[#9CA3AF] tracking-wider mb-1.5">
                Focus Areas
              </div>
              <div className="flex flex-wrap gap-1">
                {spotlightMember.focusAreas.slice(0, 4).map((area, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] text-[#CBD5E1] bg-white/5 border border-white/10 px-2 py-0.5 rounded"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="pt-2 border-t border-white/10 flex items-center gap-2">
              <button
                onClick={() => onRequestIntro(spotlightMember)}
                className="flex-1 py-2 px-3 bg-[#C78522] hover:bg-[#A96F1B] text-white text-xs font-semibold rounded-lg transition-all shadow-md shadow-[#C78522]/20 cursor-pointer text-center"
              >
                Request Intro
              </button>
              <button
                onClick={() => onNavigate('profile', spotlightMember.id)}
                className="py-2 px-3 bg-white/5 hover:bg-white/10 border border-white/15 text-[#F2EEE6] text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                Profile
              </button>
            </div>
          </div>

          {/* Quick Switcher Thumbnails Row */}
          <div className="bg-[#0E121A] border border-white/10 rounded-xl p-4">
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] font-semibold mb-2.5">
              Also in view
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {(filteredMembers.length > 0 ? filteredMembers : members).slice(0, 7).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedSpotlightId(m.id)}
                  title={`${m.name} (${m.company})`}
                  className={`relative shrink-0 rounded-full p-0.5 border transition-all cursor-pointer ${
                    m.id === spotlightMember.id
                      ? 'border-[#C78522] ring-2 ring-[#C78522]/40 scale-105'
                      : 'border-white/15 hover:border-white/40'
                  }`}
                >
                  <span className="w-9 h-9 rounded-full bg-[#1A1F25] text-[#F1EFE9] text-[11px] font-mono flex items-center justify-center">{m.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* End of print:hidden interactive UI */}
      </div>

      {/* High-Resolution Printable Snapshot of Active Network Cluster for PDF Export */}
      <NetworkSnapshotPrintView
        members={filteredMembers}
        activeCluster={selectedRole}
        minFitScore={minFitScore}
        searchFilter={searchFilter}
      />
    </div>
  );
};
