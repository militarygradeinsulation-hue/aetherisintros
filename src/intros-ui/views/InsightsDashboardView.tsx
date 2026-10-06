// @ts-nocheck
import React, { useState } from 'react';
import {
  TrendingUp,
  ArrowUpRight,
  Sparkles,
  Users,
  Building,
  Target,
  CheckCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Download,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  INSIGHTS_FUNNEL_DATA,
  ENGAGEMENT_TRENDS_DATA,
  NetworkMember,
} from '../networkData';
import { ExecutivePortrait } from '../components/shared/ExecutivePortrait';
import { ConstellationGraphic } from '../components/shared/ConstellationGraphic';
import { ActivityHeatmap } from '../components/insights/ActivityHeatmap';
import { ActivePage } from '../components/layout/TopNavigation';

interface InsightsDashboardViewProps {
  onNavigate: (page: ActivePage, memberId?: string) => void;
  onRequestIntro: (member: NetworkMember) => void;
  networkMembers: NetworkMember[];
}

export const InsightsDashboardView: React.FC<InsightsDashboardViewProps> = ({
  onNavigate,
  onRequestIntro,
  networkMembers,
}) => {
  const [timeRange, setTimeRange] = useState('Last 90 Days');
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);

  const sarah = networkMembers.find((m) => m.id === 'sarah-chen') || networkMembers[1];
  const marcus = networkMembers.find((m) => m.id === 'marcus-lee') || networkMembers[0];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-8 animate-fadeIn">
      {/* Top Editorial Hero Banner (Matching Image 7) */}
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#12100C] via-[#12100C] to-[#12100C] p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Hero Left: Headline & Description */}
          <div className="lg:col-span-7 space-y-4">
            <div className="text-[10px] md:text-xs font-mono uppercase tracking-[0.25em] text-[#9CA3AF] font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#F5B027]" />
              Relationship Intelligence
            </div>

            <h1 className="font-serif-editorial text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl text-[#F2EEE6] leading-[1.08] tracking-tight">
              Insights Dashboard
            </h1>

            <h2 className="font-serif-editorial text-2xl sm:text-3xl text-[#FFC85C]">
              Deeper connections.{' '}
              <span className="text-[#F5B027]">Greater possibilities.</span>
            </h2>

            <p className="text-sm md:text-base text-[#9CA3AF] max-w-xl leading-relaxed">
              Turn your network into a strategic advantage. Aetheris reveals opportunities,
              surfaces insights, and helps you take action — powered by AI and your living memory graph.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => onNavigate('intros')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#F5B027] hover:bg-[#C78522] text-white text-xs md:text-sm font-semibold transition-all shadow-md shadow-[#F5B027]/20 cursor-pointer"
              >
                Explore Opportunities →
              </button>
              <button
                onClick={() => onNavigate('people')}
                className="px-5 py-2.5 rounded-lg border border-white/15 hover:border-white/30 text-[#F2EEE6] text-xs md:text-sm font-medium transition-colors cursor-pointer"
              >
                View Network
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-6 sm:gap-10 pt-4 border-t border-white/10 font-mono text-[#F2EEE6]">
              <div>
                <div className="text-xl md:text-2xl font-serif-editorial font-bold text-white">1.2K</div>
                <div className="text-[10px] text-[#9CA3AF] uppercase">Active Relationships</div>
              </div>
              <div className="w-[1px] h-8 bg-white/10" />
              <div>
                <div className="text-xl md:text-2xl font-serif-editorial font-bold text-white">312</div>
                <div className="text-[10px] text-[#9CA3AF] uppercase">Companies</div>
              </div>
              <div className="w-[1px] h-8 bg-white/10" />
              <div>
                <div className="text-xl md:text-2xl font-serif-editorial font-bold text-white">48</div>
                <div className="text-[10px] text-[#9CA3AF] uppercase">Live Opportunities</div>
              </div>
            </div>
          </div>

          {/* Hero Right: "Your Network. Amplified." & 4 Stat Cards */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between text-xs font-mono text-[#9CA3AF]">
              <span className="uppercase tracking-widest text-white font-semibold">
                Your Network. Amplified.
              </span>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="bg-[#12100c] border border-white/10 rounded px-2.5 py-1 text-xs text-white focus:outline-none"
              >
                <option value="Last 30 Days">Last 30 Days</option>
                <option value="Last 90 Days">Last 90 Days</option>
                <option value="All Time">All Time</option>
              </select>
            </div>

            {/* 4 Stat KPI Cards (Matching Image 7) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#12100C] border border-white/10 rounded-xl p-4">
                <div className="text-xs text-[#9CA3AF]">Total People</div>
                <div className="text-2xl font-serif-editorial font-bold text-white mt-1">1,246</div>
                <div className="text-[11px] font-mono text-emerald-400 mt-1 flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" /> ↑ 12%
                </div>
              </div>

              <div className="bg-[#12100C] border border-white/10 rounded-xl p-4">
                <div className="text-xs text-[#9CA3AF]">Companies</div>
                <div className="text-2xl font-serif-editorial font-bold text-white mt-1">312</div>
                <div className="text-[11px] font-mono text-emerald-400 mt-1 flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" /> ↑ 18%
                </div>
              </div>

              <div className="bg-[#12100C] border border-white/10 rounded-xl p-4">
                <div className="text-xs text-[#9CA3AF]">Active Opportunities</div>
                <div className="text-2xl font-serif-editorial font-bold text-white mt-1">48</div>
                <div className="text-[11px] font-mono text-emerald-400 mt-1 flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" /> ↑ 33%
                </div>
              </div>

              <div className="bg-[#12100C] border border-white/10 rounded-xl p-4">
                <div className="text-xs text-[#9CA3AF]">Intro Acceptance Rate</div>
                <div className="text-2xl font-serif-editorial font-bold text-white mt-1">87%</div>
                <div className="text-[11px] font-mono text-emerald-400 mt-1 flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" /> ↑ 6%
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Row 2: Relationship Intelligence Map & Opportunity Clusters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Relationship Intelligence Map (Col 8) */}
        <div className="lg:col-span-8 bg-[#12100C] border border-white/10 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between text-[11px] font-mono tracking-widest uppercase text-[#9CA3AF] font-semibold">
            <span>Relationship Intelligence Map</span>
            <span className="text-[#F5B027]">People · Companies · Opportunities</span>
          </div>

          <ConstellationGraphic
            variant="relationship-map"
            onSelectNode={(lbl) => setSelectedCluster(lbl)}
          />
        </div>

        {/* Opportunity Clusters (Col 4) */}
        <div className="lg:col-span-4 bg-[#12100C] border border-white/10 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between text-[11px] font-mono tracking-widest uppercase text-[#9CA3AF] font-semibold">
            <span>Opportunity Clusters</span>
          </div>

          <div className="space-y-3">
            {[
              { name: 'AI Infrastructure', count: '24 opportunities', color: '#F5B027' },
              { name: 'Enterprise SaaS', count: '11 opportunities', color: '#FFC85C' },
              { name: 'Fintech & Payments', count: '8 opportunities', color: '#F59E0B' },
              { name: 'Climate & Sustainability', count: '5 opportunities', color: '#C78522' },
              { name: 'Consumer & Creator', count: '4 opportunities', color: '#EC4899' },
            ].map((cl) => (
              <div
                key={cl.name}
                onClick={() => setSelectedCluster(cl.name)}
                className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: cl.color }}
                  />
                  <span className="text-xs font-semibold text-white">{cl.name}</span>
                </div>
                <span className="text-[11px] font-mono text-[#9CA3AF]">{cl.count}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => onNavigate('people')}
            className="w-full py-2 text-xs text-[#F5B027] hover:underline cursor-pointer text-center font-medium block"
          >
            View All Clusters →
          </button>
        </div>
      </div>

      {/* Row 3: 30-Day Activity Heatmap */}
      <section aria-label="Network Activity Heatmap">
        <ActivityHeatmap
          networkMembers={networkMembers}
          onSelectMember={(memberId) => onNavigate('profile', memberId)}
          onNavigateToIntros={() => onNavigate('intros')}
        />
      </section>

      {/* Row 4: Intro Conversion Funnel & Engagement Trends Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Intro Conversion Funnel (Col 6) */}
        <div className="lg:col-span-6 bg-[#12100C] border border-white/10 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between text-[11px] font-mono tracking-widest uppercase text-[#9CA3AF] font-semibold">
            <span>Intro Conversion Funnel</span>
            <div className="text-right">
              <span className="text-lg font-serif-editorial font-bold text-[#F5B027] block leading-none">
                28%
              </span>
              <span className="text-[9px] text-emerald-400">↑ 2.4x vs industry average</span>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {INSIGHTS_FUNNEL_DATA.map((item) => (
              <div key={item.stage} className="space-y-1">
                <div className="flex items-center justify-between text-xs text-[#FFC85C]">
                  <span>{item.stage}</span>
                  <span className="font-mono text-white font-bold">{item.count}</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#F5B027] to-[#FFC85C] rounded-full transition-all"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Engagement Trends Chart (Col 6) */}
        <div className="lg:col-span-6 bg-[#12100C] border border-white/10 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between text-[11px] font-mono tracking-widest uppercase text-[#9CA3AF] font-semibold">
            <span>Engagement Trends</span>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1 text-[#FFC85C]">
                <span className="w-2 h-2 rounded-full bg-[#FFC85C]" /> Messages
              </span>
              <span className="flex items-center gap-1 text-[#F59E0B]">
                <span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> Meetings
              </span>
              <span className="flex items-center gap-1 text-[#C78522]">
                <span className="w-2 h-2 rounded-full bg-[#C78522]" /> Opportunities
              </span>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ENGAGEMENT_TRENDS_DATA}>
                <defs>
                  <linearGradient id="msgGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F5B027" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#F5B027" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="meetGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#C78522" fontSize={11} />
                <YAxis stroke="#C78522" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#12100C',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#F2EEE6',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="messages"
                  stroke="#F5B027"
                  fillOpacity={1}
                  fill="url(#msgGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="meetings"
                  stroke="#F59E0B"
                  fillOpacity={1}
                  fill="url(#meetGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="text-right text-[11px] font-mono text-emerald-400">
            +62% More meaningful conversations this quarter
          </div>
        </div>
      </div>

      {/* Row 4: AI Insights Card, Top Opportunities & Memory Graph */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* AI Insights Card (Col 4) */}
        <div className="lg:col-span-4 bg-gradient-to-br from-[#12100c] to-[#12100C] border border-[#F5B027]/30 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#F5B027] font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              AI Insights
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#F5B027]/20 text-[#FFC85C]">
              BETA
            </span>
          </div>

          <p className="font-serif-editorial text-lg text-white italic leading-snug">
            “You’re uniquely positioned to bring together AI infrastructure leaders and enterprise operators in your network.”
          </p>

          <p className="text-xs text-[#9CA3AF] leading-relaxed">
            Based on 17 signals from your network, recent conversations, and market activity,
            we found 3 high-potential opportunities in your network.
          </p>

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => onNavigate('intros')}
              className="flex-1 py-2 text-xs font-semibold text-white bg-[#F5B027] hover:bg-[#C78522] rounded-lg transition-colors cursor-pointer text-center"
            >
              See Opportunities →
            </button>
            <button className="px-3 py-2 text-xs text-[#9CA3AF] hover:text-white border border-white/10 rounded-lg cursor-pointer">
              Why This Matters
            </button>
          </div>
        </div>

        {/* Top Opportunities For You (Col 4) */}
        <div className="lg:col-span-4 bg-[#12100C] border border-white/10 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between text-[11px] font-mono tracking-widest uppercase text-[#9CA3AF] font-semibold">
            <span>Top Opportunities For You</span>
            <span className="text-[#F5B027] text-[10px]">Ranked</span>
          </div>

          <div className="space-y-2.5">
            {[
              {
                title: 'Introduce Sarah Chen ↔ Marcus Lee',
                p1: 'Sarah Chen',
                p2: 'Marcus Lee',
                sub: 'Shared interest in AI infrastructure',
                fit: 'High 92% fit',
                color: 'text-emerald-400',
              },
              {
                title: 'Connect with Carlos Mendes',
                p1: 'Carlos Mendes',
                sub: 'Climate resilience & energy AI lead',
                fit: 'High 88% fit',
                color: 'text-emerald-400',
              },
              {
                title: 'Briefing with Alex Monroe',
                p1: 'Alex Monroe',
                sub: '3 warm enterprise GCC connections',
                fit: 'Medium 76% fit',
                color: 'text-[#F59E0B]',
              },
              {
                title: 'Introduce Daniel Kim ↔ Elena Rossi',
                p1: 'Daniel Kim',
                p2: 'Elena Rossi',
                sub: 'Aligned deep tech operators',
                fit: 'Medium 71% fit',
                color: 'text-[#F59E0B]',
              },
            ].map((opp, idx) => (
              <div
                key={idx}
                onClick={() => onNavigate('intros')}
                className="p-2.5 bg-white/[0.02] hover:bg-white/[0.05] rounded-lg border border-white/5 cursor-pointer transition-colors space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-white">
                  <div className="flex items-center gap-1.5">
                    {opp.p1 && <ExecutivePortrait name={opp.p1} size="sm" />}
                    {opp.p2 && <ExecutivePortrait name={opp.p2} size="sm" />}
                    <span className="truncate">{opp.title}</span>
                  </div>
                  <span className={`text-[10px] font-mono shrink-0 ml-2 ${opp.color}`}>{opp.fit}</span>
                </div>
                <div className="text-[11px] text-[#9CA3AF] pl-1">{opp.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Memory Graph Insights (Col 4) */}
        <div className="lg:col-span-4 bg-[#12100C] border border-white/10 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between text-[11px] font-mono tracking-widest uppercase text-[#9CA3AF] font-semibold">
            <span>Memory Graph Insights</span>
            <span className="text-[#F5B027] text-[10px]">Live Stream</span>
          </div>

          <div className="space-y-3 text-xs text-[#FFC85C]">
            <div className="p-2.5 bg-white/[0.02] rounded-lg border border-white/5 space-y-1">
              <div className="font-semibold text-white">Event Momentum</div>
              <p className="text-[11px] text-[#9CA3AF]">
                You’ve met 14 new people at AI events in the past 2 months; 6 work at companies you follow.
              </p>
            </div>

            <div className="p-2.5 bg-white/[0.02] rounded-lg border border-white/5 space-y-1">
              <div className="font-semibold text-white">Cluster Growth</div>
              <p className="text-[11px] text-[#9CA3AF]">
                Your network strength in enterprise AI has grown 40% since Q2.
              </p>
            </div>

            <div className="p-2.5 bg-white/[0.02] rounded-lg border border-white/5 space-y-1">
              <div className="font-semibold text-white">Synergy Detection</div>
              <p className="text-[11px] text-[#9CA3AF]">
                3 people in your network are exploring similar opportunities and could be introduced.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
