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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0C1017] via-[#090C10] to-[#07090C] p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="text-[10px] md:text-xs font-mono uppercase tracking-[0.25em] text-[#9CA3AF] font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#3D6BF2] animate-pulse" />
              Living Network Constellation
            </div>
            <h1 className="font-serif-editorial text-3xl sm:text-4xl md:text-5xl text-[#F2EEE6] leading-tight">
              Floating Connection <span className="text-[#3D6BF2]">Bubbles</span>
            </h1>
            <p className="text-xs md:text-sm text-[#9CA3AF] max-w-xl">
              People create possibilities. Explore high-signal relationships, mutual alignment,
              and live gravitational pathways with real executive photo bubbles. Drag to interact, hover
              for dossiers, and click to view full profiles.
            </p>
          </div>

          {/* Quick Metrics Cards */}
          <div className="flex items-center gap-4 sm:gap-6 bg-white/[0.02] border border-white/10 rounded-xl p-4 shrink-0">
            <div>
              <div className="text-2xl font-serif-editorial font-bold text-white">
                {filteredMembers.length}
              </div>
              <div className="text-[10px] font-mono text-[#9CA3AF] uppercase">Living Nodes</div>
            </div>
            <div className="w-[1px] h-8 bg-white/10" />
            <div>
              <div className="text-2xl font-serif-editorial font-bold text-[#60A5FA]">
                98%
              </div>
              <div className="text-[10px] font-mono text-[#9CA3AF] uppercase">Top Match Fit</div>
            </div>
            <div className="w-[1px] h-8 bg-white/10" />
            <div>
              <div className="text-2xl font-serif-editorial font-bold text-[#10B981]">
                3.2x
              </div>
              <div className="text-[10px] font-mono text-[#9CA3AF] uppercase">Signal Strength</div>
            </div>
          </div>
        </div>
      </section>

      {/* Filter and Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0E121A] border border-white/10 rounded-xl p-3.5">
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
                  ? 'bg-[#3D6BF2] text-white font-semibold shadow-md shadow-[#3D6BF2]/20'
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
                ? 'bg-[#3D6BF2]/20 border-[#3D6BF2] text-[#60A5FA] font-semibold shadow-sm shadow-[#3D6BF2]/20'
                : 'bg-white/5 border-white/10 text-[#9CA3AF] hover:text-white'
            }`}
            title={isSidebarOpen ? 'Collapse Filtering Sidebar' : 'Expand Filtering Sidebar'}
          >
            {isSidebarOpen ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#3D6BF2] text-white text-[9px] flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setMinFitScore((prev) => (prev === 0 ? 85 : prev === 85 ? 90 : 0))}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all cursor-pointer flex items-center gap-1.5 ${
              minFitScore > 0
                ? 'bg-[#3D6BF2]/20 border-[#3D6BF2] text-[#60A5FA]'
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
              placeholder="Search bubbles..."
              className="pl-8 pr-3 py-1.5 text-xs bg-[#151923] border border-white/10 rounded-lg text-white placeholder-[#6B7280] focus:outline-none focus:border-[#3D6BF2]"
            />
          </div>

          {activeFilterCount > 0 && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 transition-colors cursor-pointer"
              title="Reset all active filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}

          <button
            onClick={handleExportSnapshot}
            disabled={isExporting}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono bg-[#3D6BF2] hover:bg-[#2563EB] text-white shadow-sm shadow-[#3D6BF2]/30 transition-all cursor-pointer font-semibold shrink-0 active:scale-95"
            title="Generate high-resolution cluster representation and save as PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Generating...' : 'Export Network Snapshot'}</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Floating Bubbles Canvas Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Filtering Sidebar: Allows segmenting bubbles by Industry, Company Size, or Mutual Connections Count */}
        {isSidebarOpen && (
          <aside className="lg:col-span-3 bg-[#0E121A] border border-white/10 rounded-2xl p-5 space-y-5 shadow-xl flex flex-col justify-between">
            <div className="space-y-5">
              {/* Sidebar Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#3D6BF2]" />
                  <div>
                    <h2 className="text-xs font-mono uppercase tracking-widest text-white font-bold">
                      Segment Bubbles
                    </h2>
                    <p className="text-[10px] text-[#9CA3AF] font-mono">Radar Constellation Filters</p>
                  </div>
                </div>
                {activeFilterCount > 0 ? (
                  <button
                    onClick={handleResetFilters}
                    className="flex items-center gap-1 text-[10px] font-mono text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500/20 px-2 py-0.5 rounded border border-red-500/30 transition-colors cursor-pointer"
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
                    <Building2 className="w-3.5 h-3.5 text-[#3D6BF2]" />
                    Industry Focus
                  </span>
                  {selectedIndustry !== 'all' && (
                    <button
                      onClick={() => setSelectedIndustry('all')}
                      className="text-[10px] font-mono text-[#60A5FA] hover:underline cursor-pointer"
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
                            ? 'bg-[#3D6BF2] text-white border-[#3D6BF2] font-semibold shadow-sm shadow-[#3D6BF2]/30'
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
                    <Layers className="w-3.5 h-3.5 text-[#10B981]" />
                    Company Size
                  </span>
                  {selectedCompanySize !== 'all' && (
                    <button
                      onClick={() => setSelectedCompanySize('all')}
                      className="text-[10px] font-mono text-[#60A5FA] hover:underline cursor-pointer"
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
                            ? 'bg-[#10B981]/20 text-[#34D399] border-[#10B981] font-bold shadow-sm shadow-[#10B981]/20'
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
                    <Network className="w-3.5 h-3.5 text-[#F59E0B]" />
                    Mutual Connections
                  </span>
                  <span className="text-xs font-mono text-[#F59E0B] font-bold bg-[#F59E0B]/10 px-2 py-0.5 rounded border border-[#F59E0B]/20">
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
                  className="w-full accent-[#F59E0B] cursor-pointer bg-white/10 rounded-lg h-1.5"
                />

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5">
                  {MUTUAL_PRESETS.map((val) => (
                    <button
                      key={val}
                      onClick={() => setMinMutuals(val)}
                      className={`flex-1 py-1 text-[10px] font-mono rounded transition-all cursor-pointer border ${
                        minMutuals === val
                          ? 'bg-[#F59E0B] text-black font-bold border-[#F59E0B]'
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
                    <ShieldCheck className="w-3.5 h-3.5 text-[#60A5FA]" />
                    Relationship Tier
                  </span>
                  {selectedTier !== 'all' && (
                    <button
                      onClick={() => setSelectedTier('all')}
                      className="text-[10px] font-mono text-[#60A5FA] hover:underline cursor-pointer"
                    >
                      All
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {[
                    { id: 'all', label: 'All', dot: 'bg-white' },
                    { id: 'Core', label: 'Core', dot: 'bg-[#3D6BF2]' },
                    { id: 'Extended', label: 'Extended', dot: 'bg-[#10B981]' },
                    { id: 'Prospect', label: 'Prospect', dot: 'bg-[#F59E0B]' },
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
                  className="bg-gradient-to-r from-[#3D6BF2] via-[#60A5FA] to-[#10B981] h-full transition-all duration-300"
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
                  <span className="text-[#60A5FA] font-bold">
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
          } bg-gradient-to-b from-[#090C11] via-[#0E121A] to-[#07090C] border border-white/10 rounded-2xl overflow-hidden relative shadow-2xl flex flex-col`}
        >
          {/* Top Canvas Bar Indicator */}
          <div className="px-4 py-2.5 border-b border-white/10 bg-black/40 flex items-center justify-between text-xs text-[#9CA3AF]">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsPaused(!isPaused)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono border transition-all cursor-pointer ${
                  isPaused
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold'
                    : 'bg-white/5 text-[#9CA3AF] hover:text-white border-white/10'
                }`}
              >
                {isPaused ? <Play className="w-3 h-3 text-amber-300" /> : <Pause className="w-3 h-3 text-[#3D6BF2]" />}
                <span>{isPaused ? 'Paused' : 'Pause Drift'}</span>
              </button>

              <div className="flex items-center gap-1.5 hidden sm:flex">
                <span className={`w-2 h-2 rounded-full ${isPaused ? 'bg-amber-400' : 'bg-[#10B981] animate-ping'}`} />
                <span className="font-mono text-[11px] text-white">
                  {isPaused ? 'Simulation Paused' : 'Tranquil Gentle Drift (Slow Motion)'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono text-[#CBD5E1] hidden md:inline">
                Tip: Drag bubbles · Click & hold for dossier
              </span>
              <button
                onClick={handleExportSnapshot}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono bg-white/5 hover:bg-[#3D6BF2] text-[#CBD5E1] hover:text-white border border-white/10 hover:border-[#3D6BF2] transition-colors cursor-pointer"
                title="Save high-res cluster snapshot as PDF"
              >
                <Printer className="w-3 h-3 text-[#60A5FA]" />
                <span>Save as PDF</span>
              </button>
            </div>
          </div>

          {/* The Canvas */}
          <div className="w-full h-[540px] relative">
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
                <span className="w-2.5 h-2.5 rounded-full bg-[#3D6BF2]" />
                Primary Nodes (Top Synergy)
              </span>
              <span className="flex items-center gap-1.5 text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                Verified Active Status
              </span>
            </div>
            <button
              onClick={() => onNavigate('people')}
              className="text-[#60A5FA] hover:text-white flex items-center gap-1 text-xs font-semibold cursor-pointer"
            >
              Open Standard Directory View <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Selected Member Spotlight Dossier Card */}
        <div
          className={`${
            isSidebarOpen ? 'lg:col-span-3' : 'lg:col-span-4'
          } space-y-4 flex flex-col justify-between`}
        >
          <div className="bg-[#0E121A] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between text-[10px] font-mono tracking-widest uppercase text-[#9CA3AF] font-semibold">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#3D6BF2]" />
                Featured Bubble Dossier
              </span>
              <span className="text-xs font-bold text-[#3D6BF2] bg-[#3D6BF2]/10 border border-[#3D6BF2]/30 px-2 py-0.5 rounded">
                {spotlightMember.matchScore}% Match
              </span>
            </div>

            {/* Large Executive Portrait Artwork */}
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-white/10 bg-black/50">
              <img
                src={getPortraitForName(spotlightMember.name, spotlightMember.avatarUrl)}
                alt={spotlightMember.name}
                className="w-full h-full object-cover grayscale contrast-125 brightness-95"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0E121A] via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-white bg-black/60 px-2 py-1 rounded backdrop-blur-sm border border-white/10">
                  {spotlightMember.company}
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-black/60 px-2 py-1 rounded backdrop-blur-sm border border-white/10 flex items-center gap-1">
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
                    <span className="text-[#60A5FA]">{spotlightMember.industry}</span>
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
                className="flex-1 py-2 px-3 bg-[#3D6BF2] hover:bg-[#2563EB] text-white text-xs font-semibold rounded-lg transition-all shadow-md shadow-[#3D6BF2]/20 cursor-pointer text-center"
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
          <div className="bg-[#0E121A] border border-white/10 rounded-2xl p-4">
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] font-semibold mb-2.5">
              Click to Inspect Active Bubbles:
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {(filteredMembers.length > 0 ? filteredMembers : members).slice(0, 7).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedSpotlightId(m.id)}
                  title={`${m.name} (${m.company})`}
                  className={`relative shrink-0 rounded-full p-0.5 border transition-all cursor-pointer ${
                    m.id === spotlightMember.id
                      ? 'border-[#3D6BF2] ring-2 ring-[#3D6BF2]/40 scale-105'
                      : 'border-white/15 hover:border-white/40'
                  }`}
                >
                  <ExecutivePortrait name={m.name} avatarUrl={m.avatarUrl} size="sm" />
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
