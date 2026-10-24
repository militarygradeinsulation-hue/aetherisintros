import { Button } from '@/components/ui/button';
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
import type { NetworkMember, RelationshipTier } from '../networkData';
import { ExecutivePortrait } from '../components/shared/ExecutivePortrait';
import type { ActivePage } from '../components/layout/TopNavigation';

interface PeopleDirectoryViewProps {
  members: NetworkMember[];
  onNavigate: (page: ActivePage, memberId?: string) => void;
  onRequestIntro: (member: NetworkMember) => void;
  connectedMemberIds: Set<string>;
  onToggleConnect: (memberId: string) => void;
  isLive?: boolean;
}

export const PeopleDirectoryView: React.FC<PeopleDirectoryViewProps> = ({
  members,
  onNavigate,
  onRequestIntro,
  connectedMemberIds,
  onToggleConnect,
  isLive = false,
}) => {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedRoleTypes, setSelectedRoleTypes] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState('All');
  const [selectedIndustry, setSelectedIndustry] = useState('All');
  const [selectedTier, setSelectedTier] = useState<'All' | RelationshipTier>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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
          const needle = selectedIndustry.toLowerCase();
          const hasIndustry = (m.industry ?? '').toLowerCase().includes(needle)
            || m.focusAreas.some((f) => f.toLowerCase().includes(needle));
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

  const companiesCount = useMemo(() => new Set(members.map(m => m.company.trim()).filter(Boolean)).size, [members]);
  const locationsCount = useMemo(() => new Set(members.map(m => m.location.trim()).filter(Boolean)).size, [members]);
  const averageMatch = useMemo(() => members.length ? Math.round(members.reduce((sum, m) => sum + m.matchScore, 0) / members.length) : 0, [members]);
  const liveLocations = useMemo(() => [...new Set(members.map(m => m.location.trim()).filter(Boolean))].sort(), [members]);
  const liveIndustries = useMemo(() => [...new Set(members.map(m => (m.industry ?? '').trim()).filter(Boolean))].sort(), [members]);

  // Demo keeps its curated connectors; live uses actual members who opted into introductions.
  const featuredConnectors = isLive
    ? [...members].filter(m => m.openToIntros).sort((a, b) => b.matchScore - a.matchScore).slice(0, 3)
    : members.filter((m) => ['marcus-lee', 'priya-desai', 'james-okafor'].includes(m.id));

  const renderTierBadge = (tier?: RelationshipTier) => {
    if (!tier) return null;
    const styles = {
      Core: 'bg-primary/20 text-accent-foreground border-primary/40',
      Extended: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      Prospect: 'bg-secondary text-secondary-foreground border-border',
    }[tier];

    return (
      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-semibold uppercase tracking-wider border ${styles}`}>
        {tier}
      </span>
    );
  };

  return (
    <div className="commons-people w-full max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-8 animate-fadeIn">
      <header className="commons-page-head">
        <div><span className="commons-eyebrow">YOUR NETWORK</span><h1>People</h1>
          <p>{members.length} members · {companiesCount} companies · {locationsCount} locations</p></div>
        <Button variant="outline" onClick={() => onNavigate('intros')}>Ask Intros <ArrowRight size={16} /></Button>
      </header>

      {/* Featured Connectors Ribbon (Matching Image 5) */}
      <section className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground font-semibold mb-0.5">
              Featured Connectors
            </div>
            <p className="text-xs text-muted-foreground">
              Work with experienced members to find the right introductions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {featuredConnectors.map((connector) => (
              <Button variant="ghost"
                key={connector.id}
                onClick={() => onNavigate('profile', connector.id)}
                className="flex items-center gap-3 p-2 pr-3.5 bg-muted hover:bg-muted border border-border rounded-lg cursor-pointer transition-all group"
              >
                <span aria-hidden="true" className="commons-person-initial">{connector.name.split(' ').map(part => part[0]).join('').slice(0, 2)}</span>
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground group-hover:text-accent-foreground">
                    {connector.name}
                    <CheckCircle className="w-3 h-3 text-accent-foreground" />
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {connector.title} · {connector.company}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Directory Split: Left Filters (Col 3), Center Cards (Col 6), Right Insights (Col 3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Filter Sidebar */}
        <aside className="lg:col-span-3 space-y-4 commons-people-filters">
          <Button variant="outline" className="commons-mobile-filter-toggle" aria-expanded={mobileFiltersOpen} onClick={() => setMobileFiltersOpen(value => !value)}><SlidersHorizontal size={16} /> Filters</Button>
          <div className={`commons-people-filter-content ${mobileFiltersOpen ? 'is-open' : ''} bg-card border border-border rounded-xl p-4 space-y-5`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono tracking-widest uppercase text-muted-foreground font-semibold flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filter People
              </span>
              <Button variant="ghost"
                onClick={handleClearFilters}
                className="text-[11px] text-accent-foreground hover:underline cursor-pointer"
              >
                Clear All
              </Button>
            </div>

            {/* Keyword Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Name or keyword..."
                className="w-full bg-card text-xs text-foreground placeholder:text-muted-foreground rounded-lg pl-8 pr-3 py-2 border border-border focus:outline-none focus:border-primary"
              />
            </div>

            {/* Relationship Tier Filter */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-accent-foreground" />
                  Relationship Tier
                </span>
                {selectedTier !== 'All' && (
                  <Button variant="ghost"
                    onClick={() => setSelectedTier('All')}
                    className="text-[10px] text-accent-foreground hover:underline cursor-pointer"
                  >
                    Reset
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-1">
                {[
                  { id: 'All', label: 'All Members', count: members.length, dot: 'bg-muted' },
                  { id: 'Core', label: 'Core Circle', count: members.filter((m) => m.tier === 'Core').length, dot: 'bg-primary' },
                  { id: 'Extended', label: 'Extended Network', count: members.filter((m) => m.tier === 'Extended').length, dot: 'bg-emerald-400' },
                  { id: 'Prospect', label: 'Prospects & Target', count: members.filter((m) => m.tier === 'Prospect').length, dot: 'bg-muted-foreground' },
                ].map((tierItem) => (
                  <Button variant="ghost"
                    key={tierItem.id}
                    aria-pressed={selectedTier === tierItem.id}
                    onClick={() => setSelectedTier(tierItem.id as any)}
                    className={`ix-option-tile flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer border ${
                      selectedTier === tierItem.id
                        ? 'bg-primary text-primary-foreground border-primary font-semibold shadow-sm shadow-primary/30'
                        : 'bg-card hover:bg-card text-muted-foreground border-border'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${tierItem.dot}`} />
                      <span>{tierItem.label}</span>
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded ${
                        selectedTier === tierItem.id
                          ? 'bg-muted text-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {tierItem.count}
                    </span>
                  </Button>
                ))}
              </div>
            </div>

            {/* City / Location Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                City / Location
              </label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full bg-card text-xs text-foreground rounded-lg px-3 py-2 border border-border focus:outline-none focus:border-primary"
              >
                <option value="All">Any Location</option>
                {isLive
                  ? liveLocations.map(location => <option key={location} value={location}>{location}</option>)
                  : <>
                    <option value="San Francisco">San Francisco, CA</option>
                    <option value="New York">New York, NY</option>
                    <option value="London">London, UK</option>
                    <option value="Seattle">Seattle, WA</option>
                    <option value="Singapore">Singapore</option>
                    <option value="Berlin">Berlin, Germany</option>
                    <option value="Dubai">Dubai, UAE</option>
                    <option value="Boston">Boston, MA</option>
                  </>}
              </select>
            </div>

            {/* Industry Filter Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-muted-foreground" />
                Industry Focus
              </label>
              <select
                value={selectedIndustry}
                onChange={(e) => setSelectedIndustry(e.target.value)}
                className="w-full bg-card text-xs text-foreground rounded-lg px-3 py-2 border border-border focus:outline-none focus:border-primary"
              >
                <option value="All">All Industries</option>
                {isLive
                  ? liveIndustries.map(industry => <option key={industry} value={industry}>{industry}</option>)
                  : <>
                    <option value="AI">AI & Machine Learning</option>
                    <option value="Infrastructure">Infrastructure & Cloud</option>
                    <option value="Enterprise">Enterprise Software</option>
                    <option value="Climate">Climate Tech</option>
                    <option value="Fintech">Fintech</option>
                  </>}
              </select>
            </div>

            {/* Role Checkboxes */}
            <div className="space-y-2 pt-2 border-t border-border">
              <label className="text-xs text-muted-foreground font-medium block">Role Classification</label>
              {[
                { id: 'founder', label: 'Founders' },
                { id: 'operator', label: 'Operators' },
                { id: 'investor', label: 'Investors' },
                { id: 'advisor', label: 'Advisors' },
                { id: 'expert', label: 'Experts' },
              ].map((role) => (
                <label
                  key={role.id}
                  className="flex items-center gap-2.5 text-xs text-muted-foreground cursor-pointer hover:text-foreground"
                >
                  <input
                    type="checkbox"
                    checked={selectedRoleTypes.includes(role.id)}
                    onChange={() => toggleRoleCheckbox(role.id)}
                    className="rounded bg-card border-border text-accent-foreground focus:ring-0 focus:ring-offset-0"
                  />
                  <span>{role.label}</span>
                </label>
              ))}
            </div>

            <Button variant="ghost"
              onClick={handleClearFilters}
              className="bridge-primary-action w-full py-2 px-3 text-xs font-semibold transition-colors cursor-pointer"
            >
              Reset Filters
            </Button>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="text-[11px] font-mono tracking-widest uppercase text-muted-foreground font-semibold">Quick searches</div>
            <div className="flex flex-wrap gap-1.5">
              {['AI', 'Infrastructure', 'Fintech', 'Advisory', 'Climate', 'Go-to-Market'].map((t) => (
                <Button variant="ghost" key={t} onClick={() => setSearchKeyword(t)} className={`text-[11px] px-2.5 py-1 rounded-full border cursor-pointer transition-colors ${searchKeyword === t ? 'border-primary text-foreground bg-primary/20' : 'border-border text-muted-foreground hover:border-primary'}`}>{t}</Button>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <div className="text-[11px] font-mono tracking-widest uppercase text-muted-foreground font-semibold">Your connections</div>
            <div className="text-2xl font-serif-editorial text-foreground">{connectedMemberIds.size}</div>
            <p className="text-[11px] text-muted-foreground">People you're connected with here. Connect with the people you want Intros to learn from.</p>
            <Button variant="ghost" onClick={() => onNavigate('intros')} className="w-full text-xs py-2 rounded-md border border-border hover:border-primary text-foreground cursor-pointer">View intro requests</Button>
          </div>
        </aside>

        {/* Center: Directory Header & Member Cards */}
        <main className="lg:col-span-6 space-y-4">
          {/* Bar: Count, Sort Dropdown & Grid/List view toggle */}
          <div className="flex items-center justify-between pb-1">
            <div className="text-xs font-mono text-muted-foreground tracking-wide uppercase">
              <span className="text-foreground font-bold">{filteredMembers.length}</span> People Found
            </div>

            <div className="flex items-center gap-3">
              {/* Sort selector */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-card text-xs text-foreground rounded px-2 py-1 border border-border focus:outline-none"
                >
                  <option value="relevance">Relevance</option>
                  <option value="match">Highest Fit</option>
                  <option value="mutuals">Most Mutual Connections</option>
                </select>
              </div>

              {/* View Toggle */}
              <div className="flex items-center bg-card border border-border rounded p-0.5">
                <Button variant="ghost"
                  onClick={() => setViewMode('grid')}
                  title="Grid View"
                  className={`p-1 rounded cursor-pointer ${
                    viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost"
                  onClick={() => setViewMode('list')}
                  title="List View"
                  className={`p-1 rounded cursor-pointer ${
                    viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                </Button>

              </div>
            </div>
          </div>

          {/* Quick Relationship Tier Filter Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground shrink-0">
              Tier Filter:
            </span>
            {[
              { id: 'All', label: 'All', count: members.length },
              { id: 'Core', label: 'Core', count: members.filter((m) => m.tier === 'Core').length },
              { id: 'Extended', label: 'Extended', count: members.filter((m) => m.tier === 'Extended').length },
              { id: 'Prospect', label: 'Prospect', count: members.filter((m) => m.tier === 'Prospect').length },
            ].map((t) => (
              <Button variant="ghost"
                key={t.id}
                onClick={() => setSelectedTier(t.id as any)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono transition-all cursor-pointer shrink-0 border ${
                  selectedTier === t.id
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm font-semibold'
                    : 'bg-card text-muted-foreground hover:text-foreground border-border hover:border-border'
                }`}
              >
                <span>{t.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedTier === t.id ? 'bg-muted text-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {t.count}
                </span>
              </Button>
            ))}
          </div>

          {!filteredMembers.length && <p role="status" className="py-8 text-muted-foreground">No people match these filters.</p>}
          {viewMode === 'list' ? (
            <div className="space-y-2.5">
              {filteredMembers.map((member) => {
                const isConnected = connectedMemberIds.has(member.id);
                return (
                  <div
                    key={member.id}
                    className="commons-person-card bg-card border border-border hover:border-primary/50 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all group shadow-sm"
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
                            className="font-serif-editorial text-sm font-bold text-foreground group-hover:text-accent-foreground transition-colors cursor-pointer truncate"
                          >
                            {member.name}
                          </h3>
                          {member.verified && (
                            <CheckCircle className="w-3.5 h-3.5 text-accent-foreground shrink-0" />
                          )}
                          {renderTierBadge(member.tier)}
                          <span className="text-[10px] font-mono text-accent-foreground bg-primary/10 px-1.5 rounded">
                            {member.matchScore}%
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {member.title} · {member.company}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{member.location}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <Button variant="ghost"
                        onClick={() => onRequestIntro(member)}
                        className="bridge-primary-action px-3 py-2 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Request Intro
                      </Button>
                      <Button variant="ghost"
                        onClick={() => onToggleConnect(member.id)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer border ${
                          isConnected
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'border-border text-foreground hover:border-border'
                        }`}
                      >
                        {isConnected ? 'Connected' : 'Connect'}
                      </Button>
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
                    className="commons-person-card bg-card border border-border hover:border-primary/50 rounded-xl p-6 flex flex-col justify-between transition-all group shadow-sm hover:shadow-lg hover:shadow-primary/5"
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
                            size="lg"
                          />
                        </div>

                        <div className="text-right flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1.5">
                            {renderTierBadge(member.tier)}
                            <span className="text-[11px] font-mono font-bold text-accent-foreground block leading-none">
                              {member.matchScore}%
                            </span>
                          </div>
                          <span className="text-[9px] font-mono text-muted-foreground tracking-tight uppercase">
                            {member.matchTier}
                          </span>
                        </div>
                      </div>

                      {/* Member Details */}
                      <div className="mb-2">
                        <div className="flex items-center gap-1.5">
                          <h3
                            onClick={() => onNavigate('profile', member.id)}
                            className="font-serif-editorial text-base font-bold text-foreground group-hover:text-accent-foreground transition-colors cursor-pointer"
                          >
                            {member.name}
                          </h3>
                          {member.verified && (
                            <CheckCircle className="w-3.5 h-3.5 text-accent-foreground shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {member.title} · {member.company}
                        </p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          {member.location}
                        </p>
                      </div>

                      {/* Bio Statement */}
                      <p className="text-xs text-muted-foreground line-clamp-2 italic mb-3 leading-relaxed">
                        "{member.bioStatement}"
                      </p>

                      {/* Specialty tags */}
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {member.focusAreas.slice(0, 3).map((area, i) => (
                          <span
                            key={i}
                            className="text-[10px] text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded"
                          >
                            {area}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Card Footer: Mutual Connections + Action Buttons */}
                    <div className="pt-3 border-t border-border space-y-2">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Users className="w-3.5 h-3.5 text-accent-foreground" />
                        <span>{member.mutualConnectionsCount} mutual connections</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="ghost"
                          onClick={() => onRequestIntro(member)}
                          className="bridge-primary-action flex-1 min-w-[124px] py-2 px-3 text-xs font-semibold transition-colors cursor-pointer text-center"
                        >
                          Request Intro
                        </Button>
                        <Button variant="ghost"
                          onClick={() => onToggleConnect(member.id)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer border ${
                            isConnected
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'border-border text-foreground hover:border-border'
                          }`}
                        >
                          {isConnected ? 'Connected' : 'Connect'}
                        </Button>
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
          <div className="bg-card border border-border rounded-xl p-4 space-y-5">
            <div className="flex items-center justify-between text-[11px] font-mono tracking-widest uppercase text-muted-foreground font-semibold">
              <span>Network Insights</span>
              <span className="text-accent-foreground">Global</span>
            </div>

            <div>
              <div className="text-2xl font-serif-editorial font-bold text-foreground mb-1">
                1,246
              </div>
              <div className="text-xs text-muted-foreground">
                People in your extended network
              </div>
            </div>

            {/* Top Cities */}
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider font-semibold">
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
                  <div className="flex items-center justify-between text-xs text-muted-foreground group-hover:text-foreground">
                    <span>{c.name}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">{c.count}</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${c.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Top Industries */}
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider font-semibold">
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
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{ind.name}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">{ind.percent}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${ind.percent * 2.5}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Editorial Quote Callout */}
            <div className="p-3 bg-muted border border-border rounded-lg text-xs text-muted-foreground italic">
              "The best opportunities come from the right people."
              <div className="text-[10px] font-mono text-muted-foreground not-italic mt-1 uppercase">
                — Aetheris Member
              </div>
            </div>
          </div>

          {/* Active asks — what people need right now */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-[11px] font-mono tracking-widest uppercase text-muted-foreground font-semibold">
              <span>Looking for now</span>
              <span className="text-accent-foreground">Live</span>
            </div>
            {members.slice(3, 6).map((m) => (
              <Button variant="ghost" key={m.id} onClick={() => onNavigate('profile', m.id)} className="w-full text-left p-2.5 rounded-lg border border-border hover:border-primary/50 bg-muted transition-colors cursor-pointer min-w-0">
                <div className="text-xs font-semibold text-foreground truncate">{m.name}</div>
                <div className="text-[11px] text-muted-foreground line-clamp-2">Seeking people in {m.focusAreas?.[0] ?? 'their field'}{m.focusAreas?.[1] ? ` and ${m.focusAreas[1]}` : ''}.</div>
              </Button>
            ))}
          </div>

          {/* Warm paths */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="text-[11px] font-mono tracking-widest uppercase text-muted-foreground font-semibold">Warm paths worth taking</div>
            {[...members].filter((m) => !connectedMemberIds.has(m.id)).sort((a, b) => b.matchScore - a.matchScore).slice(0, 3).map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-2 min-w-0">
                <div className="min-w-0">
                  <div className="text-xs text-foreground truncate">{m.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{m.mutualConnectionsCount} mutuals · {m.matchScore}% fit</div>
                </div>
                <Button variant="ghost" onClick={() => onRequestIntro(m)} className="shrink-0 text-[11px] px-2.5 py-1 rounded-md border border-border hover:border-primary text-foreground cursor-pointer">Intro</Button>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl border border-primary/30 bg-card">
            <p className="font-serif-editorial text-lg leading-snug text-muted-foreground">Know who matters. Know why now.</p>
            <p className="text-[11px] text-muted-foreground mt-1">Ask Intros who in your network can help with what you need this week.</p>
            <Button variant="ghost" onClick={() => onNavigate('intros')} className="mt-3 w-full text-xs font-semibold py-2 rounded-md bg-primary hover:bg-primary text-primary-foreground cursor-pointer">Ask Intros</Button>
          </div>
        </aside>
      </div>
    </div>
  );
};
