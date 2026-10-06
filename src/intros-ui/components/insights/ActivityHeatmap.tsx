// @ts-nocheck
import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Sparkles,
  TrendingUp,
  MessageSquare,
  Users,
  ChevronRight,
  Filter,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Info,
} from 'lucide-react';
import { NetworkMember, RelationshipTier } from '../../networkData';
import { ExecutivePortrait } from '../shared/ExecutivePortrait';

interface ActivityHeatmapProps {
  networkMembers: NetworkMember[];
  onSelectMember?: (memberId: string) => void;
  onNavigateToIntros?: () => void;
}

interface DayActivity {
  dayIndex: number; // 0 to 29 (0 = 30 days ago, 29 = today)
  dateStr: string;
  dayOfMonth: number;
  dayOfWeek: string;
  count: number;
  details: string[];
}

interface MemberActivityData {
  member: NetworkMember;
  days: DayActivity[];
  totalTouchpoints: number;
  lastContactDaysAgo: number;
  velocityScore: number; // trend
}

// Deterministic seed helper to generate realistic, consistent 30-day communication logs
function generate30DayActivity(member: NetworkMember): DayActivity[] {
  const days: DayActivity[] = [];
  const today = new Date();

  // Seed based on member id characters
  let seed = member.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

  // Different baselines according to tier
  const tierWeight = member.tier === 'Core' ? 0.65 : member.tier === 'Extended' ? 0.4 : 0.22;

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);

    const dayOfMonth = d.getDate();
    const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // pseudo-random generation based on seed and day index
    seed = (seed * 9301 + 49297) % 233280;
    const rnd = seed / 233280;

    let count = 0;
    const details: string[] = [];

    // Is active day?
    if (rnd < tierWeight) {
      if (rnd < tierWeight * 0.25) {
        count = Math.floor(rnd * 10) % 3 + 3; // 3 to 5
      } else if (rnd < tierWeight * 0.6) {
        count = 2;
      } else {
        count = 1;
      }

      // Generate context for interactions
      if (count >= 1) details.push('Direct message exchange');
      if (count >= 2) {
        if (member.roleType === 'investor') details.push('Investment thesis alignment');
        else if (member.roleType === 'founder') details.push('Product architecture check-in');
        else details.push('Strategy briefing sync');
      }
      if (count >= 3) details.push('Shared portfolio introduction request');
      if (count >= 4) details.push('Scheduled 45-min Zoom debrief');
    }

    days.push({
      dayIndex: 29 - i,
      dateStr,
      dayOfMonth,
      dayOfWeek,
      count,
      details,
    });
  }

  return days;
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({
  networkMembers,
  onSelectMember,
  onNavigateToIntros,
}) => {
  const [selectedTier, setSelectedTier] = useState<'All' | RelationshipTier>('All');
  const [sortBy, setSortBy] = useState<'touchpoints' | 'recent' | 'tier'>('touchpoints');
  const [hoveredCell, setHoveredCell] = useState<{
    member: NetworkMember;
    day: DayActivity;
    x: number;
    y: number;
  } | null>(null);

  // Compute all activity records
  const memberActivities = useMemo<MemberActivityData[]>(() => {
    return networkMembers.map((member) => {
      const days = generate30DayActivity(member);
      const totalTouchpoints = days.reduce((sum, d) => sum + d.count, 0);

      // Find last day with activity
      let lastContactDaysAgo = 30;
      for (let i = days.length - 1; i >= 0; i--) {
        if (days[i].count > 0) {
          lastContactDaysAgo = 29 - days[i].dayIndex;
          break;
        }
      }

      const recentWeek = days.slice(23).reduce((sum, d) => sum + d.count, 0);
      const prevWeek = days.slice(16, 23).reduce((sum, d) => sum + d.count, 0);
      const velocityScore = recentWeek - prevWeek;

      return {
        member,
        days,
        totalTouchpoints,
        lastContactDaysAgo,
        velocityScore,
      };
    });
  }, [networkMembers]);

  // Filter & sort
  const filteredActivities = useMemo(() => {
    return memberActivities
      .filter((item) => {
        if (selectedTier === 'All') return true;
        return item.member.tier === selectedTier;
      })
      .sort((a, b) => {
        if (sortBy === 'touchpoints') return b.totalTouchpoints - a.totalTouchpoints;
        if (sortBy === 'recent') return a.lastContactDaysAgo - b.lastContactDaysAgo;
        if (sortBy === 'tier') {
          const tierWeight: Record<string, number> = { Core: 3, Extended: 2, Prospect: 1 };
          return (tierWeight[b.member.tier || 'Prospect'] || 0) - (tierWeight[a.member.tier || 'Prospect'] || 0);
        }
        return 0;
      });
  }, [memberActivities, selectedTier, sortBy]);

  // Aggregate stats
  const totalNetworkTouchpoints = useMemo(
    () => memberActivities.reduce((acc, item) => acc + item.totalTouchpoints, 0),
    [memberActivities]
  );

  const activeMemberCount = useMemo(
    () => memberActivities.filter((item) => item.lastContactDaysAgo <= 14).length,
    [memberActivities]
  );

  // Color intensity helper
  const getCellColor = (count: number) => {
    if (count === 0) return 'bg-[#121620] border-white/[0.04] hover:border-white/20';
    if (count === 1) return 'bg-[#1E3A8A]/80 border-[#F5B027]/40 hover:bg-[#C78522] text-white';
    if (count === 2) return 'bg-[#C78522] border-[#FFC85C]/60 hover:bg-[#3B82F6] shadow-sm shadow-[#C78522]/40';
    if (count === 3) return 'bg-[#F5B027] border-[#93C5FD] hover:bg-[#FFC85C] shadow-sm shadow-[#F5B027]/60';
    return 'bg-[#FFC85C] border-white hover:bg-white text-black shadow-md shadow-[#FFC85C]/70';
  };

  const getTierBadge = (tier?: RelationshipTier) => {
    switch (tier) {
      case 'Core':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold uppercase tracking-wider bg-[#F5B027]/20 text-[#FFC85C] border border-[#F5B027]/40">
            Core
          </span>
        );
      case 'Extended':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Extended
          </span>
        );
      case 'Prospect':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
            Prospect
          </span>
        );
      default:
        return null;
    }
  };

  // Day columns sample dates (every 5 days)
  const sampleDays = memberActivities[0]?.days || [];

  return (
    <div className="bg-[#0E121A] border border-white/10 rounded-xl p-5 md:p-6 space-y-6 relative">
      {/* Header with Title and Tier Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF] font-semibold">
            <Calendar className="w-3.5 h-3.5 text-[#F5B027]" />
            <span>30-Day Communication Frequency</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-[10px] lowercase">live telemetry</span>
          </div>
          <h3 className="font-serif-editorial text-xl sm:text-2xl text-[#F2EEE6]">
            Network Activity Heatmap
          </h3>
          <p className="text-xs text-[#9CA3AF] max-w-xl">
            Visualize interaction cadence, message velocity, and touchpoints across key relationships over the past 30 days.
          </p>
        </div>

        {/* Action Controls & Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Tier Pills */}
          <div className="flex items-center bg-[#131722] border border-white/10 rounded-lg p-1 text-xs">
            {(['All', 'Core', 'Extended', 'Prospect'] as const).map((tier) => (
              <button
                key={tier}
                onClick={() => setSelectedTier(tier)}
                className={`px-3 py-1 rounded-md font-mono text-[11px] transition-all cursor-pointer ${
                  selectedTier === tier
                    ? 'bg-[#F5B027] text-white shadow-sm font-semibold'
                    : 'text-[#9CA3AF] hover:text-white'
                }`}
              >
                {tier}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 text-xs text-[#9CA3AF]">
            <span className="text-[11px] font-mono uppercase">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#131722] text-xs text-white rounded px-2.5 py-1.5 border border-white/10 focus:outline-none focus:border-[#F5B027]"
            >
              <option value="touchpoints">Total Interactions</option>
              <option value="recent">Most Recently Active</option>
              <option value="tier">Relationship Tier</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4 Summary Metric Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#121620] border border-white/5 rounded-lg p-3 space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#9CA3AF]">30D Touchpoints</div>
          <div className="text-2xl font-serif-editorial font-bold text-white flex items-center gap-1.5">
            {totalNetworkTouchpoints}
            <span className="text-[11px] font-mono text-emerald-400 font-normal">↑ 18%</span>
          </div>
          <div className="text-[11px] text-[#9CA3AF]">Across all classified members</div>
        </div>

        <div className="bg-[#121620] border border-white/5 rounded-lg p-3 space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#9CA3AF]">Active Cadence</div>
          <div className="text-2xl font-serif-editorial font-bold text-[#FFC85C]">
            {activeMemberCount} / {networkMembers.length}
          </div>
          <div className="text-[11px] text-[#9CA3AF]">Contacted within last 14 days</div>
        </div>

        <div className="bg-[#121620] border border-white/5 rounded-lg p-3 space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#9CA3AF]">Top Member Cadence</div>
          <div className="text-lg font-serif-editorial font-bold text-white truncate">
            {memberActivities[0]?.member.name || 'Sarah Chen'}
          </div>
          <div className="text-[11px] font-mono text-emerald-400">
            {memberActivities[0]?.totalTouchpoints || 28} touchpoints logged
          </div>
        </div>

        <div className="bg-[#121620] border border-white/5 rounded-lg p-3 space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#9CA3AF]">Cadence Health</div>
          <div className="text-2xl font-serif-editorial font-bold text-emerald-400">
            92%
          </div>
          <div className="text-[11px] text-[#9CA3AF]">On-track relationship velocity</div>
        </div>
      </div>

      {/* Heatmap Grid Area */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[760px] space-y-2">
          {/* Timeline Header (Days 30 ago to Today) */}
          <div className="grid grid-cols-12 items-center gap-2 pb-2 text-[10px] font-mono text-[#9CA3AF] border-b border-white/5">
            <div className="col-span-4 pl-2 uppercase tracking-wider">
              Network Member ({filteredActivities.length})
            </div>
            <div className="col-span-6 flex items-center justify-between px-1">
              <span>-30 Days</span>
              <span>-20 Days</span>
              <span>-10 Days</span>
              <span className="text-[#F5B027] font-bold">Today</span>
            </div>
            <div className="col-span-2 text-right pr-2 uppercase tracking-wider">
              Frequency
            </div>
          </div>

          {/* Member Rows */}
          <div className="space-y-2">
            {filteredActivities.map((item) => (
              <div
                key={item.member.id}
                className="grid grid-cols-12 items-center gap-2 p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 transition-colors group"
              >
                {/* Member Dossier Col */}
                <div
                  onClick={() => onSelectMember && onSelectMember(item.member.id)}
                  className="col-span-4 flex items-center gap-2.5 cursor-pointer min-w-0"
                >
                  <ExecutivePortrait
                    name={item.member.name}
                    avatarUrl={item.member.avatarUrl}
                    size="sm"
                    className="shrink-0"
                  />
                  <div className="truncate min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white group-hover:text-[#FFC85C] transition-colors truncate">
                        {item.member.name}
                      </span>
                      {getTierBadge(item.member.tier)}
                    </div>
                    <div className="text-[11px] text-[#9CA3AF] truncate">
                      {item.member.title} · {item.member.company}
                    </div>
                  </div>
                </div>

                {/* 30-Day Heatmap Squares Col */}
                <div className="col-span-6 flex items-center gap-1 justify-between px-1">
                  {item.days.map((day) => (
                    <div
                      key={day.dayIndex}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredCell({
                          member: item.member,
                          day,
                          x: rect.left + rect.width / 2,
                          y: rect.top,
                        });
                      }}
                      onMouseLeave={() => setHoveredCell(null)}
                      className={`w-3.5 h-6 rounded-xs border transition-all cursor-pointer ${getCellColor(
                        day.count
                      )} ${day.count > 0 ? 'hover:scale-125 hover:z-10' : ''}`}
                    />
                  ))}
                </div>

                {/* Frequency Stats & Action Col */}
                <div className="col-span-2 flex items-center justify-end gap-3 pr-2 text-right">
                  <div>
                    <div className="text-xs font-mono font-bold text-white">
                      {item.totalTouchpoints} <span className="text-[10px] text-[#9CA3AF] font-normal">pts</span>
                    </div>
                    <div className="text-[10px] text-[#9CA3AF] font-mono">
                      {item.lastContactDaysAgo === 0
                        ? 'Today'
                        : item.lastContactDaysAgo === 1
                        ? 'Yesterday'
                        : `${item.lastContactDaysAgo}d ago`}
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectMember && onSelectMember(item.member.id)}
                    className="p-1.5 rounded-md bg-white/5 hover:bg-[#F5B027] text-[#9CA3AF] hover:text-white transition-colors cursor-pointer"
                    title="View Member Dossier"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Heatmap Legend & Recommendation Footer */}
      <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-[#9CA3AF]">
        {/* Color Scale Legend */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono">Intensity:</span>
          <span className="text-[10px] text-[#6B7280]">0</span>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-xs bg-[#121620] border border-white/10" title="0 interactions" />
            <span className="w-3 h-3 rounded-xs bg-[#1E3A8A] border border-[#F5B027]/40" title="1 interaction" />
            <span className="w-3 h-3 rounded-xs bg-[#C78522] border border-[#FFC85C]/60" title="2 interactions" />
            <span className="w-3 h-3 rounded-xs bg-[#F5B027] border border-[#93C5FD]" title="3 interactions" />
            <span className="w-3 h-3 rounded-xs bg-[#FFC85C] border border-white" title="4+ interactions" />
          </div>
          <span className="text-[10px] text-[#6B7280]">4+ interactions</span>
        </div>

        {/* Insight Prompt */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-[#CBD5E1]">
            💡 Suggested: Reconnect with Carlos Mendes (last touchpoint 12d ago)
          </span>
          {onNavigateToIntros && (
            <button
              onClick={onNavigateToIntros}
              className="text-[11px] text-[#F5B027] hover:underline font-semibold cursor-pointer"
            >
              Curate Intro →
            </button>
          )}
        </div>
      </div>

      {/* Interactive Tooltip Card on Hover */}
      {hoveredCell && (
        <div
          className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2 bg-[#0A0D14]/95 border border-[#F5B027]/40 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs space-y-1.5 w-64 animate-in fade-in zoom-in-95 duration-100"
          style={{
            left: `${hoveredCell.x}px`,
            top: `${hoveredCell.y - 8}px`,
          }}
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
            <div className="flex items-center gap-1.5">
              <ExecutivePortrait name={hoveredCell.member.name} size="sm" />
              <div>
                <div className="font-semibold text-white">{hoveredCell.member.name}</div>
                <div className="text-[10px] text-[#9CA3AF]">{hoveredCell.member.tier} Tier</div>
              </div>
            </div>
            <div className="text-right font-mono text-[10px] text-[#FFC85C]">
              {hoveredCell.day.dateStr}
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#9CA3AF]">Communication Volume:</span>
            <span className="font-mono font-bold text-white">
              {hoveredCell.day.count} {hoveredCell.day.count === 1 ? 'touchpoint' : 'touchpoints'}
            </span>
          </div>

          {hoveredCell.day.count > 0 ? (
            <div className="space-y-1 pt-1 border-t border-white/5">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#9CA3AF]">Activity Log:</div>
              {hoveredCell.day.details.map((detail, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-[11px] text-[#CBD5E1]">
                  <span className="w-1 h-1 rounded-full bg-[#F5B027]" />
                  <span>{detail}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[10px] text-[#6B7280] italic">
              No communication recorded on this day.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
