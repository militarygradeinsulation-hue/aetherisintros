// @ts-nocheck
import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  CheckCircle,
  Users,
  MapPin,
  Sparkles,
  LayoutGrid,
  List,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  Building,
  SlidersHorizontal,
  X,
  Orbit,
} from 'lucide-react';
import { NetworkMember, RelationshipTier } from '../networkData';
import { ExecutivePortrait } from '../components/shared/ExecutivePortrait';
import { ConstellationGraphic } from '../components/shared/ConstellationGraphic';
import { FloatingConnectionField } from '../components/shared/FloatingConnectionField';
import { ActivePage } from '../components/layout/TopNavigation';

interface PeopleDirectoryViewProps {
  members: NetworkMember[];
  onNavigate: (page: ActivePage, memberId?: string) => void;
  onRequestIntro: (member: NetworkMember) => void;
  connectedMemberIds: Set<string>;
  onToggleConnect: (memberId: string) => void;
}

export const PeopleDirectoryView: React.FC<PeopleDirectoryViewProps> = ({
  members,
  onNavigate,
  onRequestIntro,
  connectedMemberIds,
  onToggleConnect,
}) => {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedRoleTypes, setSelectedRoleTypes] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState('All');
  const [selectedIndustry, setSelectedIndustry] = useState('All');
  const [selectedTier, setSelectedTier] = useState<'All' | RelationshipTier>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'bubbles'>('grid');
  const [sortBy, setSortBy] = useState<'relevance' | 'match' | 'mutuals'>('relevance');

  // Filter logic
  const filteredMembers = useMemo(() => {
    return members
      .filter((m) => {
        // Keyword match
        if (searchKeyword.trim()) {
          const q = searchKeyword.toLowerCase();
          const matchName = m.name.toLowerCase().includes(q);
          const matchTitle = m.title.toLowerCase().includes(q);
          const matchCompany = m.company.toLowerCase().includes(q);
          const matchLocation = m.location.toLowerCase().includes(q);
          const matchFocus = m.focusAreas.some((f) => f.toLowerCase().includes(q));
          if (!matchName && !matchTitle && !matchCompany && !matchLocation && !matchFocus) {
            return false;
          }
        }
        // Relationship Tier match
        if (selectedTier !== 'All') {
          if (m.tier !== selectedTier) return false;
        }
        // Role checkbox match
        if (selectedRoleTypes.length > 0) {
          if (!selectedRoleTypes.includes(m.roleType)) return false;
        }
        // City match
        if (selectedCity !== 'All') {
          if (!m.location.includes(selectedCity)) return false;
        }
        // Industry match
        if (selectedIndustry !== 'All') {
          const hasIndustry = m.focusAreas.some((f) =>
            f.toLowerCase().includes(selectedIndustry.toLowerCase())
          );
          if (!hasIndustry) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'match') return b.matchScore - a.matchScore;
        if (sortBy === 'mutuals') return b.mutualConnectionsCount - a.mutualConnectionsCount;
        return 0; // relevance preserves default curated ranking
      });
  }, [members, searchKeyword, selectedTier, selectedRoleTypes, selectedCity, selectedIndustry, sortBy]);

  const toggleRoleCheckbox = (role: string) => {
    setSelectedRoleTypes((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleClearFilters = () => {
    setSearchKeyword('');
    setSelectedRoleTypes([]);
    setSelectedCity('All');
    setSelectedIndustry('All');
    setSelectedTier('All');
    setSortBy('relevance');
  };

  // Featured connectors bar (Marcus Lee, Priya Desai, James Okafor)
  const featuredConnectors = members.filter((m) =>
    ['marcus-lee', 'priya-desai', 'james-okafor'].includes(m.id)
  );

  const renderTierBadge = (tier?: RelationshipTier) => {
    if (!tier) return null;
    const styles = {
      Core: 'bg-[#F5B027]/20 text-[#FFC85C] border-[#F5B027]/40',
      Extended: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      Prospect: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    }[tier];

    return (
      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-semibold uppercase tracking-wider border ${styles}`}>
        {tier}
      </span>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-8 animate-fadeIn">
      {/* Top Editorial Hero Banner (Matching Image 5) */}
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0C1017] via-[#090C10] to-[#07090C] p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Hero Left: Large Editorial Headline */}
          <div className="lg:col-span-7 space-y-4">
            <div className="text-[10px] md:text-xs font-mono uppercase tracking-[0.25em] text-[#9CA3AF] font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#F5B027]" />
              People Search
            </div>

            <h1 className="font-serif-editorial text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl text-[#F2EEE6] leading-[1.08] tracking-tight">
              Discover people{' '}
              <span className="text-[#F5B027]">worth knowing.</span>
            </h1>

            <p className="text-sm md:text-base text-[#9CA3AF] max-w-xl leading-relaxed">
              Founders. Operators. Investors. Advisors. A higher standard for professional connections.
            </p>
          </div>

          {/* Hero Right: "A Global Network of Possibility" World Map & Stats */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between text-[10px] font-mono tracking-widest uppercase text-[#9CA3AF] font-semibold">
              <span>A Global Network of Possibility</span>
            </div>

            <ConstellationGraphic
              variant="world-map"
              onSelectNode={(cityName) => setSelectedCity(cityName)}
            />

            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/10 text-center font-mono">
              <div>
                <div className="text-base font-bold text-white">10K+</div>
                <div className="text-[9px] text-[#9CA3AF] uppercase">Professionals</div>
              </div>
              <div>
                <div className="text-base font-bold text-white">312</div>
                <div className="text-[9px] text-[#9CA3AF] uppercase">Companies</div>
              </div>
              <div>
                <div className="text-base font-bold text-white">28</div>
                <div className="text-[9px] text-[#9CA3AF] uppercase">Countries</div>
              </div>
              <div>
                <div className="text-base font-bold text-white">92%</div>
                <div className="text-[9px] text-[#9CA3AF] uppercase">Matches</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Connectors Ribbon (Matching Image 5) */}
      <section className="bg-[#0E121A] border border-white/10 rounded-xl p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-mono tracking-widest uppercase text-[#9CA3AF] font-semibold mb-0.5">
              Featured Connectors
            </div>
            <p className="text-xs text-[#CBD5E1]">
              Work with experienced members to find the right introductions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {featuredConnectors.map((connector) => (
              <div
                key={connector.id}
                onClick={() => onNavigate('profile', connector.id)}
                className="flex items-center gap-3 p-2 pr-3.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 rounded-lg cursor-pointer transition-all group"
              >
                <ExecutivePortrait name={connector.name} avatarUrl={connector.avatarUrl} size="sm" />
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white group-hover:text-[#F5B027]">
                    {connector.name}
                    <CheckCircle className="w-3 h-3 text-[#F5B027]" />
                  </div>
                  <div className="text-[10px] text-[#9CA3AF]">
                    {connector.title} · {connector.company}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Directory Split: Left Filters (Col 3), Center Cards (Col 6), Right Insights (Col 3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Filter Sidebar */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="bg-[#0E121A] border border-white/10 rounded-xl p-4 space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono tracking-widest uppercase text-[#9CA3AF] font-semibold flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filter People
              </span>
              <button
                onClick={handleClearFilters}
                className="text-[11px] text-[#F5B027] hover:underline cursor-pointer"
              >
                Clear All
              </button>
            </div>

            {/* Keyword Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6B7280]" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Name or keyword..."
                className="w-full bg-[#131722] text-xs text-white placeholder-[#6B7280] rounded-lg pl-8 pr-3 py-2 border border-white/10 focus:outline-none focus:border-[#F5B027]"
              />
            </div>

            {/* Relationship Tier Filter */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-[#9CA3AF] font-medium">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#F5B027]" />
                  Relationship Tier
                </span>
                {selectedTier !== 'All' && (
                  <button
                    onClick={() => setSelectedTier('All')}
                    className="text-[10px] text-[#F5B027] hover:underline cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-1">
                {[
                  { id: 'All', label: 'All Members', count: members.length, dot: 'bg-white/40' },
                  { id: 'Core', label: 'Core Circle', count: members.filter((m) => m.tier === 'Core').length, dot: 'bg-[#F5B027]' },
                  { id: 'Extended', label: 'Extended Network', count: members.filter((m) => m.tier === 'Extended').length, dot: 'bg-emerald-400' },
                  { id: 'Prospect', label: 'Prospects & Target', count: members.filter((m) => m.tier === 'Prospect').length, dot: 'bg-amber-400' },
                ].map((tierItem) => (
                  <button
                    key={tierItem.id}
                    onClick={() => setSelectedTier(tierItem.id as any)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer border ${
                      selectedTier === tierItem.id
                        ? 'bg-[#F5B027] text-white border-[#F5B027] font-semibold shadow-sm shadow-[#F5B027]/30'
                        : 'bg-[#131722] hover:bg-[#1A202C] text-[#CBD5E1] border-white/5'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${tierItem.dot}`} />
                      <span>{tierItem.label}</span>
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded ${
                        selectedTier === tierItem.id
                          ? 'bg-white/20 text-white'
                          : 'bg-white/5 text-[#9CA3AF]'
                      }`}
                    >
                      {tierItem.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* City / Location Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#9CA3AF] font-medium flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#6B7280]" />
                City / Location
              </label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full bg-[#131722] text-xs text-white rounded-lg px-3 py-2 border border-white/10 focus:outline-none focus:border-[#F5B027]"
              >
                <option value="All">Any Location</option>
                <option value="San Francisco">San Francisco, CA</option>
                <option value="New York">New York, NY</option>
                <option value="London">London, UK</option>
                <option value="Seattle">Seattle, WA</option>
                <option value="Singapore">Singapore</option>
                <option value="Berlin">Berlin, Germany</option>
                <option value="Dubai">Dubai, UAE</option>
                <option value="Boston">Boston, MA</option>
              </select>
            </div>

            {/* Industry Filter Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#9CA3AF] font-medium flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-[#6B7280]" />
                Industry Focus
              </label>
              <select
                value={selectedIndustry}
                onChange={(e) => setSelectedIndustry(e.target.value)}
                className="w-full bg-[#131722] text-xs text-white rounded-lg px-3 py-2 border border-white/10 focus:outline-none focus:border-[#F5B027]"
              >
                <option value="All">All Industries</option>
                <option value="AI">AI & Machine Learning</option>
                <option value="Infrastructure">Infrastructure & Cloud</option>
                <option value="Enterprise">Enterprise Software</option>
                <option value="Climate">Climate Tech</option>
                <option value="Fintech">Fintech</option>
              </select>
            </div>

            {/* Role Checkboxes */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <label className="text-xs text-[#9CA3AF] font-medium block">Role Classification</label>
              {[
                { id: 'founder', label: 'Founders' },
                { id: 'operator', label: 'Operators' },
                { id: 'investor', label: 'Investors' },
                { id: 'advisor', label: 'Advisors' },
                { id: 'expert', label: 'Experts' },
              ].map((role) => (
                <label
                  key={role.id}
                  className="flex items-center gap-2.5 text-xs text-[#CBD5E1] cursor-pointer hover:text-white"
                >
                  <input
                    type="checkbox"
                    checked={selectedRoleTypes.includes(role.id)}
                    onChange={() => toggleRoleCheckbox(role.id)}
                    className="rounded bg-[#131722] border-white/20 text-[#F5B027] focus:ring-0 focus:ring-offset-0"
                  />
                  <span>{role.label}</span>
                </label>
              ))}
            </div>

            <button
              onClick={handleClearFilters}
              className="w-full py-2 text-xs font-semibold text-white bg-[#F5B027] hover:bg-[#C78522] rounded-lg transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>

          <div className="bg-[#0E121A] border border-white/10 rounded-xl p-4 space-y-3">
            <div className="text-[11px] font-mono tracking-widest uppercase text-[#9CA3AF] font-semibold">Quick searches</div>
            <div className="flex flex-wrap gap-1.5">
              {['AI', 'Infrastructure', 'Fintech', 'Advisory', 'Climate', 'Go-to-Market'].map((t) => (
                <button key={t} onClick={() => setSearchKeyword(t)} className={`text-[11px] px-2.5 py-1 rounded-full border cursor-pointer transition-colors ${searchKeyword === t ? 'border-[#F5B027] text-white bg-[#F5B027]/20' : 'border-white/10 text-[#CBD5E1] hover:border-[#F5B027]'}`}>{t}</button>
              ))}
            </div>
          </div>

          <div className="bg-[#0E121A] border border-white/10 rounded-xl p-4 space-y-2">
            <div className="text-[11px] font-mono tracking-widest uppercase text-[#9CA3AF] font-semibold">Your connections</div>
            <div className="text-2xl font-serif-editorial text-white">{connectedMemberIds.size}</div>
            <p className="text-[11px] text-[#9CA3AF]">People you're connected with here. Connect with the people you want Intros to learn from.</p>
            <button onClick={() => onNavigate('intros')} className="w-full text-xs py-2 rounded-md border border-white/15 hover:border-[#F5B027] text-white cursor-pointer">View intro requests</button>
          </div>
        </aside>

        {/* Center: Directory Header & Member Cards */}
        <main className="lg:col-span-6 space-y-4">
          {/* Bar: Count, Sort Dropdown & Grid/List view toggle */}
          <div className="flex items-center justify-between pb-1">
            <div className="text-xs font-mono text-[#9CA3AF] tracking-wide uppercase">
              <span className="text-white font-bold">{filteredMembers.length}</span> People Found
            </div>

            <div className="flex items-center gap-3">
              {/* Sort selector */}
              <div className="flex items-center gap-1.5 text-xs text-[#9CA3AF]">
                <span>Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-[#0E121A] text-xs text-white rounded px-2 py-1 border border-white/10 focus:outline-none"
                >
                  <option value="relevance">Relevance</option>
                  <option value="match">Highest Fit</option>
                  <option value="mutuals">Most Mutual Connections</option>
                </select>
              </div>

              {/* View Toggle */}
              <div className="flex items-center bg-[#0E121A] border border-white/10 rounded p-0.5">
                <button
                  onClick={() => setViewMode('grid')}
                  title="Grid View"
                  className={`p-1 rounded cursor-pointer ${
                    viewMode === 'grid' ? 'bg-[#F5B027] text-white' : 'text-[#9CA3AF]'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  title="List View"
                  className={`p-1 rounded cursor-pointer ${
                    viewMode === 'list' ? 'bg-[#F5B027] text-white' : 'text-[#9CA3AF]'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('bubbles')}
                  title="Living Floating Connection Bubbles"
                  className={`p-1 rounded cursor-pointer flex items-center gap-1 text-[11px] font-mono px-1.5 ${
                    viewMode === 'bubbles' ? 'bg-[#F5B027] text-white' : 'text-[#9CA3AF] hover:text-white'
                  }`}
                >
                  <Orbit className="w-3.5 h-3.5 text-[#FFC85C]" />
                  <span className="hidden sm:inline">Bubbles</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Relationship Tier Filter Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#9CA3AF] shrink-0">
              Tier Filter:
            </span>
            {[
              { id: 'All', label: 'All', count: members.length },
              { id: 'Core', label: 'Core', count: members.filter((m) => m.tier === 'Core').length },
              { id: 'Extended', label: 'Extended', count: members.filter((m) => m.tier === 'Extended').length },
              { id: 'Prospect', label: 'Prospect', count: members.filter((m) => m.tier === 'Prospect').length },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTier(t.id as any)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono transition-all cursor-pointer shrink-0 border ${
                  selectedTier === t.id
                    ? 'bg-[#F5B027] text-white border-[#F5B027] shadow-sm font-semibold'
                    : 'bg-[#0E121A] text-[#9CA3AF] hover:text-white border-white/10 hover:border-white/25'
                }`}
              >
                <span>{t.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedTier === t.id ? 'bg-white/20 text-white' : 'bg-white/5 text-[#9CA3AF]'
                  }`}
                >
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* Conditional View: Bubbles vs Grid vs List */}
          {viewMode === 'bubbles' ? (
            <div className="bg-[#07090C] border border-white/10 rounded-2xl overflow-hidden p-1 shadow-2xl space-y-2">
              <div className="p-3 border-b border-white/10 bg-black/40 flex items-center justify-between text-xs">
                <span className="font-mono text-[11px] text-[#F5B027] flex items-center gap-1.5 font-semibold">
                  <Orbit className="w-3.5 h-3.5 text-[#F5B027] animate-spin-slow" />
                  Living Radar Web Constellation · {filteredMembers.length} People Active
                </span>
                <span className="text-[11px] text-[#9CA3AF] hidden sm:inline">
                  Click to open · Click & hold for dossier · Radar web connections
                </span>
              </div>
              <div className="h-[520px] w-full">
                <FloatingConnectionField
                  members={filteredMembers}
                  onSelectMember={(id) => onNavigate('profile', id)}
                  onRequestIntro={onRequestIntro}
                  density="interactive"
                  speedMultiplier={0.16}
                  className="w-full h-full"
                />
              </div>
            </div>
          ) : viewMode === 'list' ? (
            <div className="space-y-2.5">
              {filteredMembers.map((member) => {
                const isConnected = connectedMemberIds.has(member.id);
                return (
                  <div
                    key={member.id}
                    className="bg-[#0E121A] border border-white/10 hover:border-[#F5B027]/50 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all group shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        onClick={() => onNavigate('profile', member.id)}
                        className="cursor-pointer shrink-0"
                      >
                        <ExecutivePortrait
                          name={member.name}
                          avatarUrl={member.avatarUrl}
                          size="md"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3
                            onClick={() => onNavigate('profile', member.id)}
                            className="font-serif-editorial text-sm font-bold text-white group-hover:text-[#F5B027] transition-colors cursor-pointer truncate"
                          >
                            {member.name}
                          </h3>
                          {member.verified && (
                            <CheckCircle className="w-3.5 h-3.5 text-[#F5B027] shrink-0" />
                          )}
                          {renderTierBadge(member.tier)}
                          <span className="text-[10px] font-mono text-[#F5B027] bg-[#F5B027]/10 px-1.5 rounded">
                            {member.matchScore}%
                          </span>
                        </div>
                        <p className="text-xs text-[#9CA3AF] truncate">
                          {member.title} · {member.company}
                        </p>
                        <p className="text-[10px] text-[#6B7280]">{member.location}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        onClick={() => onRequestIntro(member)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-[#F5B027] hover:bg-[#C78522] rounded-lg transition-colors cursor-pointer"
                      >
                        Request Intro
                      </button>
                      <button
                        onClick={() => onToggleConnect(member.id)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer border ${
                          isConnected
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'border-white/15 text-white hover:border-white/30'
                        }`}
                      >
                        {isConnected ? 'Connected' : 'Connect'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredMembers.map((member) => {
                const isConnected = connectedMemberIds.has(member.id);

                return (
                  <div
                    key={member.id}
                    className="bg-[#0E121A] border border-white/10 hover:border-[#F5B027]/50 rounded-xl p-4 flex flex-col justify-between transition-all group shadow-sm hover:shadow-lg hover:shadow-[#F5B027]/5"
                  >
                    <div>
                      {/* Top Row: Avatar + Name + Fit Badge */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div
                          onClick={() => onNavigate('profile', member.id)}
                          className="cursor-pointer"
                        >
                          <ExecutivePortrait
                            name={member.name}
                            avatarUrl={member.avatarUrl}
                            size="md"
                          />
                        </div>

                        <div className="text-right flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1.5">
                            {renderTierBadge(member.tier)}
                            <span className="text-[11px] font-mono font-bold text-[#F5B027] block leading-none">
                              {member.matchScore}%
                            </span>
                          </div>
                          <span className="text-[9px] font-mono text-[#9CA3AF] tracking-tight uppercase">
                            {member.matchTier}
                          </span>
                        </div>
                      </div>

                      {/* Member Details */}
                      <div className="mb-2">
                        <div className="flex items-center gap-1.5">
                          <h3
                            onClick={() => onNavigate('profile', member.id)}
                            className="font-serif-editorial text-base font-bold text-white group-hover:text-[#F5B027] transition-colors cursor-pointer"
                          >
                            {member.name}
                          </h3>
                          {member.verified && (
                            <CheckCircle className="w-3.5 h-3.5 text-[#F5B027] shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-[#9CA3AF]">
                          {member.title} · {member.company}
                        </p>
                        <p className="text-[11px] text-[#6B7280] flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-[#6B7280]" />
                          {member.location}
                        </p>
                      </div>

                      {/* Bio Statement */}
                      <p className="text-xs text-[#CBD5E1] line-clamp-2 italic mb-3 leading-relaxed">
                        "{member.bioStatement}"
                      </p>

                      {/* Specialty tags */}
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {member.focusAreas.slice(0, 3).map((area, i) => (
                          <span
                            key={i}
                            className="text-[10px] text-[#9CA3AF] bg-white/5 border border-white/10 px-2 py-0.5 rounded"
                          >
                            {area}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Card Footer: Mutual Connections + Action Buttons */}
                    <div className="pt-3 border-t border-white/5 space-y-2">
                      <div className="flex items-center gap-1.5 text-[11px] text-[#9CA3AF]">
                        <Users className="w-3.5 h-3.5 text-[#F5B027]" />
                        <span>{member.mutualConnectionsCount} mutual connections</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onRequestIntro(member)}
                          className="flex-1 py-1.5 text-xs font-semibold text-white bg-[#F5B027] hover:bg-[#C78522] rounded-lg transition-colors cursor-pointer text-center"
                        >
                          Request Intro
                        </button>
                        <button
                          onClick={() => onToggleConnect(member.id)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer border ${
                            isConnected
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'border-white/15 text-white hover:border-white/30'
                          }`}
                        >
                          {isConnected ? 'Connected' : 'Connect'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* Right Sidebar: Network Insights (Matching Image 5) */}
        <aside className="lg:col-span-3 space-y-5">
          <div className="bg-[#0E121A] border border-white/10 rounded-xl p-4 space-y-5">
            <div className="flex items-center justify-between text-[11px] font-mono tracking-widest uppercase text-[#9CA3AF] font-semibold">
              <span>Network Insights</span>
              <span className="text-[#F5B027]">Global</span>
            </div>

            <div>
              <div className="text-2xl font-serif-editorial font-bold text-white mb-1">
                1,246
              </div>
              <div className="text-xs text-[#9CA3AF]">
                People in your extended network
              </div>
            </div>

            {/* Top Cities */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <div className="text-[10px] font-mono uppercase text-[#9CA3AF] tracking-wider font-semibold">
                Top Cities
              </div>
              {[
                { name: 'San Francisco', count: 248, percent: 100 },
                { name: 'New York', count: 196, percent: 79 },
                { name: 'London', count: 142, percent: 57 },
                { name: 'Singapore', count: 98, percent: 40 },
                { name: 'Berlin', count: 76, percent: 30 },
              ].map((c) => (
                <div
                  key={c.name}
                  onClick={() => setSelectedCity(c.name)}
                  className="space-y-1 cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs text-[#CBD5E1] group-hover:text-white">
                    <span>{c.name}</span>
                    <span className="font-mono text-[11px] text-[#9CA3AF]">{c.count}</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#F5B027] rounded-full transition-all"
                      style={{ width: `${c.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Top Industries */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <div className="text-[10px] font-mono uppercase text-[#9CA3AF] tracking-wider font-semibold">
                Top Industries
              </div>
              {[
                { name: 'AI / Machine Learning', percent: 28 },
                { name: 'Enterprise Software', percent: 18 },
                { name: 'Fintech', percent: 12 },
                { name: 'Infrastructure', percent: 10 },
                { name: 'Healthtech', percent: 8 },
              ].map((ind) => (
                <div key={ind.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-[#CBD5E1]">
                    <span>{ind.name}</span>
                    <span className="font-mono text-[11px] text-[#9CA3AF]">{ind.percent}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#F5B027] rounded-full"
                      style={{ width: `${ind.percent * 2.5}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Editorial Quote Callout */}
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg text-xs text-[#9CA3AF] italic">
              "The best opportunities come from the right people."
              <div className="text-[10px] font-mono text-[#6B7280] not-italic mt-1 uppercase">
                — Aetheris Member
              </div>
            </div>
          </div>

          {/* Active asks — what people need right now */}
          <div className="bg-[#0E121A] border border-white/10 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-[11px] font-mono tracking-widest uppercase text-[#9CA3AF] font-semibold">
              <span>Looking for now</span>
              <span className="text-[#F4A125]">Live</span>
            </div>
            {members.slice(3, 6).map((m) => (
              <button key={m.id} onClick={() => onNavigate('profile', m.id)} className="w-full text-left p-2.5 rounded-lg border border-white/5 hover:border-[#F5B027]/50 bg-white/[0.02] transition-colors cursor-pointer min-w-0">
                <div className="text-xs font-semibold text-white truncate">{m.name}</div>
                <div className="text-[11px] text-[#9CA3AF] line-clamp-2">Seeking people in {m.focusAreas?.[0] ?? 'their field'}{m.focusAreas?.[1] ? ` and ${m.focusAreas[1]}` : ''}.</div>
              </button>
            ))}
          </div>

          {/* Warm paths */}
          <div className="bg-[#0E121A] border border-white/10 rounded-xl p-4 space-y-3">
            <div className="text-[11px] font-mono tracking-widest uppercase text-[#9CA3AF] font-semibold">Warm paths worth taking</div>
            {[...members].filter((m) => !connectedMemberIds.has(m.id)).sort((a, b) => b.matchScore - a.matchScore).slice(0, 3).map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-2 min-w-0">
                <div className="min-w-0">
                  <div className="text-xs text-white truncate">{m.name}</div>
                  <div className="text-[10px] text-[#9CA3AF] truncate">{m.mutualConnectionsCount} mutuals · {m.matchScore}% fit</div>
                </div>
                <button onClick={() => onRequestIntro(m)} className="shrink-0 text-[11px] px-2.5 py-1 rounded-md border border-white/15 hover:border-[#F5B027] text-white cursor-pointer">Intro</button>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl border border-[#F5B027]/30 bg-gradient-to-br from-[#121A2C] to-[#0A0D15]">
            <p className="font-serif-editorial text-lg leading-snug text-[#F2EEE6]">Know who matters. Know why now.</p>
            <p className="text-[11px] text-[#9CA3AF] mt-1">Ask Intros who in your network can help with what you need this week.</p>
            <button onClick={() => onNavigate('workspace')} className="mt-3 w-full text-xs font-semibold py-2 rounded-md bg-[#F5B027] hover:bg-[#C78522] text-white cursor-pointer">Ask Intros</button>
          </div>
        </aside>
      </div>
    </div>
  );
};
