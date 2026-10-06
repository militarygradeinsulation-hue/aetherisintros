// @ts-nocheck
import React, { useState, useMemo } from 'react';
import {
  Activity,
  Layers,
  Sparkles,
  User,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Flame,
  Filter,
  BarChart2,
  Eye,
  Crown,
  Diamond,
  Circle,
} from 'lucide-react';
import { Person, CalendarEvent } from '../types';
import { RelationshipTierBadge } from './RelationshipTierBadge';

export interface ClusterData {
  id: string;
  name: string;
  sector: string;
  cadence: 'daily' | 'weekly' | 'biweekly' | 'drift_alert';
  cadenceLabel: string;
  densityScore: number; // 0 to 100
  peopleIds: string[];
  mandateValue: string;
  touchpointsLast30d: number;
  avgScore: number;
  driftWarning?: boolean;
  strategicContext: string;
}

interface NetworkClusterHeatmapViewProps {
  people: Person[];
  calendarEvents?: CalendarEvent[];
  onSelectPerson: (person: Person) => void;
  onOpenSidebar?: () => void;
  onOpenGraph?: () => void;
}

const CLUSTERS: ClusterData[] = [
  {
    id: 'cluster-syndicate',
    name: 'Venture Capital & Syndicate Anchors',
    sector: 'Deep Tech & Capital Formation',
    cadence: 'daily',
    cadenceLabel: 'Daily (<24h)',
    densityScore: 95,
    peopleIds: ['p-1', 'p-4'],
    mandateValue: '$850M Fund V / $3.2B AUM',
    touchpointsLast30d: 28,
    avgScore: 95,
    strategicContext: 'Core syndicate lead for Series B and pro-rata sovereign allocations.',
  },
  {
    id: 'cluster-aerospace',
    name: 'Defense & Orbital Telemetry',
    sector: 'Autonomous Defense & Space',
    cadence: 'weekly',
    cadenceLabel: 'Active (3d Cadence)',
    densityScore: 89,
    peopleIds: ['p-2'],
    mandateValue: '$820M Valuation / $1.8M Deal',
    touchpointsLast30d: 14,
    avgScore: 89,
    strategicContext: 'Deploying high-reliability secure telemetry; expanding orbital sensors.',
  },
  {
    id: 'cluster-sovereign',
    name: 'Sovereign Infrastructure & Governance',
    sector: 'European Critical Infrastructure',
    cadence: 'weekly',
    cadenceLabel: 'Active (5d Cadence)',
    densityScore: 82,
    peopleIds: ['p-3'],
    mandateValue: '€120M Sovereign Mandate',
    touchpointsLast30d: 9,
    avgScore: 82,
    strategicContext: 'European regulatory residency proof-of-concept and sovereign compliance.',
  },
  {
    id: 'cluster-alliances',
    name: 'Enterprise Cloud & Mesh Alliances',
    sector: 'Enterprise Systems & Co-Selling',
    cadence: 'weekly',
    cadenceLabel: 'Active (2d Cadence)',
    densityScore: 88,
    peopleIds: ['p-7'],
    mandateValue: '$3.8M Distribution Channel',
    touchpointsLast30d: 12,
    avgScore: 88,
    strategicContext: 'Joint channel co-selling into Fortune 500 clouds with Microsoft alignment.',
  },
  {
    id: 'cluster-photonic',
    name: 'Photonic Compute & AI Hardware',
    sector: 'Next-Gen Silicon Architectures',
    cadence: 'drift_alert',
    cadenceLabel: 'Drift Alert (64d Silence)',
    densityScore: 58,
    peopleIds: ['p-6'],
    mandateValue: '$2.5M Co-Investment Potential',
    touchpointsLast30d: 2,
    avgScore: 58,
    driftWarning: true,
    strategicContext: 'Pioneered 10x inference efficiency; relationship cooled after pivot.',
  },
  {
    id: 'cluster-health',
    name: 'Enterprise Healthcare Systems',
    sector: 'Institutional Healthcare Providers',
    cadence: 'drift_alert',
    cadenceLabel: 'Drift Alert (48d Silence)',
    densityScore: 47,
    peopleIds: ['p-5'],
    mandateValue: '$1.4M Enterprise Pipeline',
    touchpointsLast30d: 1,
    avgScore: 47,
    driftWarning: true,
    strategicContext: 'Major enterprise network RFP deadline closing without direct executive touchpoint.',
  },
];

export const NetworkClusterHeatmapView: React.FC<NetworkClusterHeatmapViewProps> = ({
  people,
  calendarEvents = [],
  onSelectPerson,
  onOpenSidebar,
  onOpenGraph,
}) => {
  const [selectedClusterId, setSelectedClusterId] = useState<string>('all');
  const [frequencyFilter, setFrequencyFilter] = useState<'all' | 'high' | 'active' | 'drift'>('all');
  const [hoveredClusterId, setHoveredClusterId] = useState<string | null>(null);

  // Filter clusters
  const filteredClusters = useMemo(() => {
    let list = CLUSTERS;
    if (selectedClusterId !== 'all') {
      list = list.filter((c) => c.id === selectedClusterId);
    }
    if (frequencyFilter === 'high') {
      list = list.filter((c) => c.densityScore >= 90);
    } else if (frequencyFilter === 'active') {
      list = list.filter((c) => c.densityScore >= 70 && c.densityScore < 90);
    } else if (frequencyFilter === 'drift') {
      list = list.filter((c) => c.densityScore < 70);
    }
    return list;
  }, [selectedClusterId, frequencyFilter]);

  const getHeatmapColor = (score: number) => {
    if (score >= 90) {
      return {
        bg: 'bg-gradient-to-br from-[#F5B027]/25 to-[#F5B027]/5',
        border: 'border-[#F5B027]/50 shadow-[0_0_20px_rgba(249,115,22,0.2)]',
        badge: 'bg-[#F5B027]/20 text-[#F5B027] border-[#F5B027]/40',
        text: 'text-[#F5B027]',
        label: 'High Velocity',
      };
    }
    if (score >= 80) {
      return {
        bg: 'bg-gradient-to-br from-[#C78522]/25 to-[#C78522]/5',
        border: 'border-[#C78522]/40 shadow-[0_0_15px_rgba(63,179,127,0.18)]',
        badge: 'bg-[#C78522]/20 text-[#C78522] border-[#C78522]/40',
        text: 'text-[#C78522]',
        label: 'Optimal Cadence',
      };
    }
    if (score >= 70) {
      return {
        bg: 'bg-gradient-to-br from-[#F5B027]/20 to-[#F5B027]/5',
        border: 'border-[#F5B027]/35 shadow-[0_0_12px_rgba(199, 133, 34,0.15)]',
        badge: 'bg-[#F5B027]/20 text-[#F5B027] border-[#F5B027]/40',
        text: 'text-[#F5B027]',
        label: 'Steady Cadence',
      };
    }
    return {
      bg: 'bg-gradient-to-br from-[#C78522]/25 to-[#C78522]/5',
      border: 'border-[#C78522]/50 shadow-[0_0_15px_rgba(229,72,77,0.2)]',
      badge: 'bg-[#C78522]/20 text-[#C78522] border-[#C78522]/40',
      text: 'text-[#C78522]',
      label: 'Drift Leak',
    };
  };

  const totalTouchpoints = CLUSTERS.reduce((sum, c) => sum + c.touchpointsLast30d, 0);
  const avgDensity = Math.round(
    CLUSTERS.reduce((sum, c) => sum + c.densityScore, 0) / CLUSTERS.length
  );
  const driftCount = CLUSTERS.filter((c) => c.driftWarning).length;

  return (
    <div className="w-full max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8 animate-in fade-in duration-200">
      {/* 1. Header Banner & High-Level Telemetry */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-[#F5B027] font-bold">
              Network Heatmap Visualization
            </span>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#F5B027]/15 text-[#F5B027] border border-[#F5B027]/30 font-semibold">
              Live Density Matrix
            </span>
          </div>
          <h1 className="font-serif-editorial text-2xl sm:text-4xl text-[#F2EEE6] font-normal tracking-tight mt-1">
            Cluster Engagement <span className="text-[#F5B027] font-semibold">Density Heatmap.</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#F2EEE6]/70 font-serif-editorial max-w-2xl mt-1.5 leading-relaxed">
            Color-coded matrix mapping professional sector clusters by interaction frequency, communication decay half-life, and aggregate syndicate value.
          </p>
        </div>

        {/* Telemetry Stats */}
        <div className="grid grid-cols-3 gap-3 shrink-0">
          <div className="p-3 rounded-xl bg-[#0E1116] border border-white/10 text-center min-w-[100px]">
            <div className="text-[9px] font-mono uppercase text-[#F2EEE6]/60">Avg Density</div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-[#F5B027]">{avgDensity}%</div>
            <div className="text-[8.5px] font-mono text-[#C78522]">+8.2% vs Q3</div>
          </div>
          <div className="p-3 rounded-xl bg-[#0E1116] border border-white/10 text-center min-w-[100px]">
            <div className="text-[9px] font-mono uppercase text-[#F2EEE6]/60">30d Touchpoints</div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-[#F5B027]">{totalTouchpoints}</div>
            <div className="text-[8.5px] font-mono text-[#F2EEE6]/60">across 6 clusters</div>
          </div>
          <div className="p-3 rounded-xl bg-[#0E1116] border border-[#C78522]/40 text-center min-w-[100px]">
            <div className="text-[9px] font-mono uppercase text-[#C78522]">Drift Leaks</div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-[#C78522]">{driftCount}</div>
            <div className="text-[8.5px] font-mono text-[#C78522]/80">&gt;30d communication</div>
          </div>
        </div>
      </div>

      {/* 2. Filter & Controls Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4 p-3 rounded-xl bg-[#0E1116] border border-white/10">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-mono text-[#F2EEE6]/60 uppercase tracking-wider flex items-center gap-1.5 mr-1 shrink-0">
            <Filter size={11} className="text-[#F5B027]" />
            <span>Cadence Lens:</span>
          </span>
          {[
            { id: 'all', label: 'All Clusters (6)' },
            { id: 'high', label: 'High Velocity (>90%)' },
            { id: 'active', label: 'Active Cadence (70–89%)' },
            { id: 'drift', label: 'Drift Warnings (<70%)' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFrequencyFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all shrink-0 ${
                frequencyFilter === f.id
                  ? 'bg-white/15 text-white font-bold border border-white/20 shadow-sm'
                  : 'text-[#F2EEE6]/60 hover:text-white hover:bg-white/5'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[9.5px] font-mono shrink-0">
          <div className="flex items-center gap-1.5 text-[#F5B027]">
            <span className="w-2.5 h-2.5 rounded bg-[#F5B027] shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
            <span>Daily / Lead</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#C78522]">
            <span className="w-2.5 h-2.5 rounded bg-[#C78522]" />
            <span>Active &lt;5d</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#F5B027]">
            <span className="w-2.5 h-2.5 rounded bg-[#F5B027]" />
            <span>Weekly</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#C78522]">
            <span className="w-2.5 h-2.5 rounded bg-[#C78522] shadow-[0_0_8px_rgba(229,72,77,0.8)]" />
            <span>Drift Warning</span>
          </div>
        </div>
      </div>

      {/* 3. Heatmap Density Matrix Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredClusters.map((cluster) => {
          const colors = getHeatmapColor(cluster.densityScore);
          const clusterPeople = people.filter((p) => cluster.peopleIds.includes(p.id));

          return (
            <div
              key={cluster.id}
              onMouseEnter={() => setHoveredClusterId(cluster.id)}
              onMouseLeave={() => setHoveredClusterId(null)}
              className={`rounded-2xl p-5 border transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
                colors.bg
              } ${colors.border} hover:translate-y-[-2px] hover:shadow-2xl`}
            >
              {/* Background Glow */}
              <div
                className={`absolute -top-16 -right-16 w-36 h-36 rounded-full blur-3xl pointer-events-none opacity-20 ${
                  cluster.driftWarning ? 'bg-[#C78522]' : 'bg-[#F5B027]'
                }`}
                aria-hidden="true"
              />

              <div className="space-y-3.5 relative z-10">
                {/* Top Row: Sector & Cadence Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[9.5px] font-mono tracking-wider uppercase text-[#F2EEE6]/60 block truncate">
                      {cluster.sector}
                    </span>
                    <h3 className="font-serif-editorial text-lg sm:text-xl font-bold text-[#F2EEE6] leading-snug mt-0.5">
                      {cluster.name}
                    </h3>
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span
                      className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${colors.badge}`}
                    >
                      {cluster.cadenceLabel}
                    </span>
                    <span className="text-[9px] font-mono text-[#F2EEE6]/50">
                      {cluster.touchpointsLast30d} touchpoints
                    </span>
                  </div>
                </div>

                {/* Density Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-[#F2EEE6]/70">Engagement Density Index</span>
                    <span className={`font-bold ${colors.text}`}>{cluster.densityScore}/100</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-black/50 overflow-hidden border border-white/5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        cluster.densityScore >= 90
                          ? 'bg-gradient-to-r from-[#F5B027] to-[#F5A623]'
                          : cluster.densityScore >= 80
                          ? 'bg-gradient-to-r from-[#C78522] to-[#F5B027]'
                          : cluster.densityScore >= 70
                          ? 'bg-gradient-to-r from-[#F5B027] to-[#FFC85C]'
                          : 'bg-gradient-to-r from-[#C78522] to-[#F87171]'
                      }`}
                      style={{ width: `${cluster.densityScore}%` }}
                    />
                  </div>
                </div>

                {/* Strategic Mandate & Context */}
                <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                  <div className="flex items-center justify-between text-[9px] font-mono">
                    <span className="text-[#F5B027] uppercase font-bold">Aggregate Syndicate Exposure</span>
                    <span className="text-[#F2EEE6] font-semibold">{cluster.mandateValue}</span>
                  </div>
                  <p className="text-xs text-[#F2EEE6]/80 font-serif-editorial leading-relaxed">
                    {cluster.strategicContext}
                  </p>
                </div>

                {/* Connected Executive Nodes */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[9.5px] font-mono text-[#F2EEE6]/60 uppercase tracking-wider">
                    Key Relationship Anchors ({clusterPeople.length})
                  </div>
                  <div className="space-y-1.5">
                    {clusterPeople.map((person) => (
                      <div
                        key={person.id}
                        onClick={() => {
                          onSelectPerson(person);
                          if (onOpenSidebar) onOpenSidebar();
                        }}
                        className="p-2 rounded-lg bg-black/30 hover:bg-[#151922] border border-white/5 hover:border-[#F5B027]/50 transition-all cursor-pointer flex items-center justify-between gap-2.5 group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={person.avatar}
                            alt={person.name}
                            className="w-7 h-7 rounded-full object-cover border border-white/10 shrink-0"
                          />
                          <div className="min-w-0 truncate">
                            <div className="text-xs font-bold text-[#F2EEE6] group-hover:text-[#F5B027] transition-colors truncate flex items-center gap-1.5">
                              <span>{person.name}</span>
                              <span className="text-[9px] font-mono text-[#F2EEE6]/50">
                                ({person.connectionScore})
                              </span>
                            </div>
                            <div className="text-[9px] text-[#F2EEE6]/60 truncate">
                              {person.title} · {person.company}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {person.tier && (
                            <RelationshipTierBadge tier={person.tier} size="xs" showLabel={false} />
                          )}
                          <span className="text-[9px] font-mono text-[#F5B027] opacity-0 group-hover:opacity-100 transition-opacity">
                            Dossier →
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Quick-Action */}
              <div className="pt-4 border-t border-white/10 mt-3 flex items-center justify-between text-xs font-mono">
                {cluster.driftWarning ? (
                  <span className="text-[#C78522] text-[10.5px] flex items-center gap-1 font-semibold">
                    <AlertTriangle size={12} />
                    <span>Communication Decay Risk</span>
                  </span>
                ) : (
                  <span className="text-[#C78522] text-[10.5px] flex items-center gap-1 font-semibold">
                    <CheckCircle2 size={12} />
                    <span>Synchronized Cadence</span>
                  </span>
                )}

                <button
                  onClick={() => {
                    if (clusterPeople[0]) {
                      onSelectPerson(clusterPeople[0]);
                      if (onOpenSidebar) onOpenSidebar();
                    }
                  }}
                  className="text-[#F5B027] hover:text-white flex items-center gap-1 transition-colors text-[11px] font-semibold"
                >
                  <span>Inspect Cluster Dossier</span>
                  <ArrowRight size={11} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
