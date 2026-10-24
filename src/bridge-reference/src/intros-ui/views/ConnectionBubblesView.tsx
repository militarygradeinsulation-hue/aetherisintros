// @ts-nocheck
import { Button } from '@/components/ui/button';
import { AvatarImage } from '@/aetheris/avatar';
import ParticleDrift from '@/aetheris/ParticleDrift';
import React, { useState, useMemo, useEffect } from 'react';
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
  embedded?: boolean;
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
  embedded = false,
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
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setIsPaused(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
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
    <div className={`commons-radar ${embedded ? 'commons-radar-embedded' : 'w-full max-w-7xl mx-auto px-4 md:px-8 py-6'} space-y-6 animate-fadeIn`}>
      {/* On-screen interactive interface (hidden during print) */}
      <div className="print:hidden space-y-6">
        {/* Editorial Header */}
        <section hidden={embedded} className="relative border-b border-border pb-6 pt-2">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground">
                Network · Live Constellation
              </div>
              <h1 className="font-serif-editorial text-4xl sm:text-5xl md:text-6xl text-muted-foreground leading-[1.02] tracking-tight">
                The people around you, <em className="text-accent-foreground not-italic">in motion.</em>
              </h1>
              <p className="text-sm text-muted-foreground max-w-lg leading-relaxed">
                Every bubble is a person worth knowing. Closer means stronger context. Select anyone to see why they matter now.
              </p>
            </div>
            <div className="flex items-end gap-8 shrink-0">
              <div>
                <div className="font-serif-editorial text-5xl text-muted-foreground leading-none">{filteredMembers.length}</div>
                <div className="mt-2 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">People in view</div>
              </div>
              <div className="w-px h-12 bg-muted" />
              <div>
                <div className="font-serif-editorial text-5xl text-accent-foreground leading-none">{tierCounts.Core}</div>
                <div className="mt-2 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">Core relationships</div>
              </div>
            </div>
          </div>
        </section>

      {/* Filter and Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        {/* Role Cluster Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground mr-1 hidden sm:inline">Filter:</span>
          {[
            { id: 'all', label: 'All People' },
            { id: 'founder', label: 'Founders' },
            { id: 'investor', label: 'Investors' },
            { id: 'operator', label: 'Operators' },
            { id: 'advisor', label: 'Advisors' },
          ].map((cluster) => (
            <Button variant="ghost"
              key={cluster.id}
              onClick={() => setSelectedRole(cluster.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                selectedRole === cluster.id
                  ? 'bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {cluster.label}
            </Button>
          ))}
        </div>

        {/* Fit Filter, Sidebar Toggle, Search & Export Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="ghost"
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all cursor-pointer flex items-center gap-1.5 ${
              isSidebarOpen
                ? 'bg-primary/20 border-primary text-accent-foreground font-semibold shadow-sm shadow-primary/20'
                : 'bg-muted border-border text-muted-foreground hover:text-foreground'
            }`}
            title={isSidebarOpen ? 'Collapse Filtering Sidebar' : 'Expand Filtering Sidebar'}
          >
            {isSidebarOpen ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </Button>

          <Button variant="ghost"
            onClick={() => setMinFitScore((prev) => (prev === 0 ? 85 : prev === 85 ? 90 : 0))}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all cursor-pointer flex items-center gap-1.5 ${
              minFitScore > 0
                ? 'bg-primary/20 border-primary text-accent-foreground'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>{minFitScore > 0 ? `Fit ≥ ${minFitScore}%` : 'All Fit Tiers'}</span>
          </Button>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search people…"
              className="pl-8 pr-3 py-1.5 text-xs bg-card border border-border rounded-lg text-foreground placeholder-[#6B7280] focus:outline-none focus:border-primary"
            />
          </div>

          {activeFilterCount > 0 && (
            <Button variant="ghost"
              onClick={handleResetFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono text-muted-foreground hover:text-foreground border border-border transition-colors cursor-pointer"
              title="Reset all active filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Reset</span>
            </Button>
          )}

          <Button variant="ghost"
            onClick={handleExportSnapshot}
            disabled={isExporting}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono bg-primary hover:bg-primary text-primary-foreground shadow-sm shadow-primary/30 transition-all cursor-pointer font-semibold shrink-0 active:scale-95"
            title="Generate high-resolution cluster representation and save as PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Generating...' : 'Export'}</span>
          </Button>
        </div>
      </div>

      {/* Main Interactive Floating Bubbles Canvas Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Filtering Sidebar: Allows segmenting bubbles by Industry, Company Size, or Mutual Connections Count */}
        {isSidebarOpen && (
          <aside className="lg:col-span-3 bg-card border border-border rounded-xl p-5 space-y-5 shadow-xl flex flex-col justify-between">
            <div className="space-y-5">
              {/* Sidebar Header */}
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-accent-foreground" />
                  <div>
                    <h2 className="text-xs font-mono uppercase tracking-widest text-foreground font-bold">
                      Refine
                    </h2>
                    <p className="text-[10px] text-muted-foreground font-mono">Narrow who appears</p>
                  </div>
                </div>
                {activeFilterCount > 0 ? (
                  <Button variant="ghost"
                    onClick={handleResetFilters}
                    className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-foreground px-2 py-0.5 rounded border border-border transition-colors cursor-pointer"
                    title="Clear all segments"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Clear</span>
                  </Button>
                ) : (
                  <span className="text-[9px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border">
                    Live
                  </span>
                )}
              </div>

              {/* 1. Industry Focus Segmentation */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                    <Building2 className="w-3.5 h-3.5 text-accent-foreground" />
                    Industry Focus
                  </span>
                  {selectedIndustry !== 'all' && (
                    <Button variant="ghost"
                      onClick={() => setSelectedIndustry('all')}
                      className="text-[10px] font-mono text-accent-foreground hover:underline cursor-pointer"
                    >
                      All
                    </Button>
                  )}
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {INDUSTRIES.map((ind) => {
                    const isSelected = selectedIndustry === ind.id;
                    const count = industryCounts[ind.id] || 0;
                    return (
                      <Button variant="ghost"
                        key={ind.id}
                        onClick={() => setSelectedIndustry(ind.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer border text-left ${
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary font-semibold shadow-sm shadow-primary/30'
                            : 'bg-card hover:bg-card text-muted-foreground border-border hover:border-border'
                        }`}
                      >
                        <span className="truncate pr-2">{ind.label}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded shrink-0 ${
                            isSelected
                              ? 'bg-muted text-foreground font-bold'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {count}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Company Size Segmentation */}
              <div className="space-y-2 pt-3 border-t border-border">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                    <Layers className="w-3.5 h-3.5 text-accent-foreground" />
                    Company Size
                  </span>
                  {selectedCompanySize !== 'all' && (
                    <Button variant="ghost"
                      onClick={() => setSelectedCompanySize('all')}
                      className="text-[10px] font-mono text-accent-foreground hover:underline cursor-pointer"
                    >
                      All
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {COMPANY_SIZES.map((cs) => {
                    const isSelected = selectedCompanySize === cs.id;
                    const count = companySizeCounts[cs.id] || 0;
                    return (
                      <Button variant="ghost"
                        key={cs.id}
                        onClick={() => setSelectedCompanySize(cs.id)}
                        className={`flex flex-col items-start px-2 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-primary/20 text-muted-foreground border-primary font-semibold'
                            : 'bg-card hover:bg-card text-muted-foreground border-border hover:border-border'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-bold">{cs.label}</span>
                          <span className="text-[10px] opacity-70">({count})</span>
                        </div>
                        <span className="text-[9px] text-muted-foreground font-sans truncate w-full text-left">
                          {cs.sub}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Mutual Connections Count Segmentation */}
              <div className="space-y-2.5 pt-3 border-t border-border">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                    <Network className="w-3.5 h-3.5 text-accent-foreground" />
                    Mutual Connections
                  </span>
                  <span className="text-xs font-mono text-accent-foreground font-bold bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
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
                  className="w-full accent-primary cursor-pointer bg-muted rounded-lg h-1.5"
                />

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5">
                  {MUTUAL_PRESETS.map((val) => (
                    <Button variant="ghost"
                      key={val}
                      onClick={() => setMinMutuals(val)}
                      className={`flex-1 py-1 text-[10px] font-mono rounded transition-all cursor-pointer border ${
                        minMutuals === val
                          ? 'bg-primary text-primary-foreground font-semibold border-primary'
                          : 'bg-card text-muted-foreground hover:text-foreground border-border'
                      }`}
                    >
                      {val === 0 ? 'All' : `${val}+`}
                    </Button>
                  ))}
                </div>
              </div>

              {/* 4. Relationship Tier Filter */}
              <div className="space-y-2 pt-3 border-t border-border">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5 text-accent-foreground" />
                    Relationship Tier
                  </span>
                  {selectedTier !== 'all' && (
                    <Button variant="ghost"
                      onClick={() => setSelectedTier('all')}
                      className="text-[10px] font-mono text-accent-foreground hover:underline cursor-pointer"
                    >
                      All
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {[
                    { id: 'all', label: 'All', dot: 'bg-muted' },
                    { id: 'Core', label: 'Core', dot: 'bg-primary' },
                    { id: 'Extended', label: 'Extended', dot: 'bg-primary' },
                    { id: 'Prospect', label: 'Prospect', dot: 'bg-primary' },
                  ].map((t) => (
                    <Button variant="ghost"
                      key={t.id}
                      onClick={() => setSelectedTier(t.id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-1.5 text-[10px] font-mono rounded transition-all cursor-pointer border ${
                        selectedTier === t.id
                          ? 'bg-muted text-foreground font-bold border-border'
                          : 'bg-card text-muted-foreground hover:text-foreground border-border'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
                      <span>{t.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar Bottom Radar Cluster Metrics Bar */}
            <div className="pt-4 border-t border-border space-y-2 mt-4">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-muted-foreground">Active Radar Nodes:</span>
                <span className="text-foreground font-bold">
                  {filteredMembers.length} / {members.length}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-300"
                  style={{
                    width: `${Math.max(
                      8,
                      (filteredMembers.length / Math.max(members.length, 1)) * 100
                    )}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground">
                <span>
                  {Math.round((filteredMembers.length / Math.max(members.length, 1)) * 100)}% Constellation Web
                </span>
                {activeFilterCount > 0 && (
                  <span className="text-accent-foreground font-bold">
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
          } bg-card border border-border rounded-xl overflow-hidden relative  flex flex-col`}
        >
          {/* Top Canvas Bar Indicator */}
          <div className="px-4 py-2.5 border-b border-border bg-muted flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <Button variant="ghost"
                onClick={() => setIsPaused(!isPaused)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono border transition-all cursor-pointer ${
                  isPaused
                    ? 'bg-primary/15 text-accent-foreground border-primary/40'
                    : 'bg-muted text-muted-foreground hover:text-foreground border-border'
                }`}
              >
                {isPaused ? <Play className="w-3 h-3 text-accent-foreground" /> : <Pause className="w-3 h-3 text-accent-foreground" />}
                <span>{isPaused ? 'Paused' : 'Pause Drift'}</span>
              </Button>

              <div className="flex items-center gap-1.5 hidden sm:flex">
                <span className={`w-2 h-2 rounded-full ${isPaused ? 'bg-primary' : 'bg-primary animate-pulse'}`} />
                <span className="font-mono text-[11px] text-foreground">
                  {isPaused ? 'Simulation Paused' : 'Live drift'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono text-muted-foreground hidden md:inline">
                Drag to explore · Click to open
              </span>
            </div>
          </div>

          {/* The Canvas */}
          <div className="commons-radar-canvas w-full h-[600px] relative">
            <ParticleDrift speed={isPaused ? 0 : 0.25} className="commons-radar-drift" />
            <FloatingConnectionField
              members={filteredMembers}
              onSelectMember={(memberId) => {
                setSelectedSpotlightId(memberId);
                if (!embedded) onNavigate('profile', memberId);
              }}
              onRequestIntro={onRequestIntro}
              density="fullscreen"
              speedMultiplier={0.16}
              isPaused={isPaused}
              className="commons-radar-people w-full h-full"
            />
          </div>

          {/* Bottom Bar: Instructions & Quick Actions */}
          <div className="px-5 py-3 border-t border-border bg-muted flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                Strongest fit
              </span>
              <span className="flex items-center gap-1.5 text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                Verified member
              </span>
            </div>
            <Button variant="ghost"
              onClick={() => onNavigate('people')}
              className="text-accent-foreground hover:text-foreground flex items-center gap-1 text-xs font-semibold cursor-pointer"
            >
              View as directory <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Right: Selected Member Spotlight Dossier Card */}
        <div
          className={`${
            isSidebarOpen ? 'lg:col-span-3' : 'lg:col-span-4'
          } space-y-4 flex flex-col justify-between`}
        >
          <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between text-[10px] font-mono tracking-widest uppercase text-muted-foreground font-semibold">
              <span className="flex items-center gap-1.5">
                
                In focus
              </span>
              <span className="text-xs font-bold text-accent-foreground bg-primary/10 border border-primary/30 px-2 py-0.5 rounded">
                {spotlightMember.matchScore}% Match
              </span>
            </div>

            <div className="commons-radar-identity"><span aria-label={spotlightMember.name} className="commons-person-initial">{spotlightMember.name.split(' ').filter(Boolean).map(p => p[0]).join('').slice(0,2)}</span><span>{spotlightMember.company}</span></div>

            {/* Name, Role & Location */}
            <div>
              <h3 className="font-serif-editorial text-xl font-bold text-foreground leading-tight">
                {spotlightMember.name}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {spotlightMember.title} · {spotlightMember.company}
              </p>
              <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-muted-foreground">
                <span>{spotlightMember.location}</span>
                {spotlightMember.industry && (
                  <>
                    <span>·</span>
                    <span className="text-accent-foreground">{spotlightMember.industry}</span>
                  </>
                )}
              </div>
            </div>

            {/* Editorial Quote */}
            <blockquote className="text-xs text-muted-foreground italic bg-muted p-3 rounded-lg border border-border leading-relaxed">
              "{spotlightMember.quote || spotlightMember.bioStatement}"
            </blockquote>

            {/* Focus Areas */}
            <div>
              <div className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider mb-1.5">
                Focus Areas
              </div>
              <div className="flex flex-wrap gap-1">
                {spotlightMember.focusAreas.slice(0, 4).map((area, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="pt-2 border-t border-border flex items-center gap-2">
              <Button variant="ghost"
                onClick={() => onRequestIntro(spotlightMember)}
                className="flex-1 py-2 px-3 bg-primary hover:bg-primary text-primary-foreground text-xs font-semibold rounded-lg transition-all shadow-md shadow-primary/20 cursor-pointer text-center"
              >
                Request Intro
              </Button>
              <Button variant="ghost"
                onClick={() => onNavigate('profile', spotlightMember.id)}
                className="py-2 px-3 bg-muted hover:bg-muted border border-border text-muted-foreground text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                Profile
              </Button>
            </div>
          </div>

          {/* Quick Switcher Thumbnails Row */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground font-semibold mb-2.5">
              Also in view
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {(filteredMembers.length > 0 ? filteredMembers : members).slice(0, 7).map((m) => (
                <Button variant="ghost"
                  key={m.id}
                  onClick={() => setSelectedSpotlightId(m.id)}
                  title={`${m.name} (${m.company})`} aria-label={`Focus ${m.name}`} aria-pressed={m.id === spotlightMember.id}
                  className={`relative shrink-0 rounded-full p-0.5 border transition-all cursor-pointer ${
                    m.id === spotlightMember.id
                      ? 'border-primary ring-2 ring-primary/40 scale-105'
                      : 'border-border hover:border-border'
                  }`}
                >
                  <span className="w-9 h-9 rounded-full bg-card text-muted-foreground text-[11px] font-mono flex items-center justify-center">{m.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>
                </Button>
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
