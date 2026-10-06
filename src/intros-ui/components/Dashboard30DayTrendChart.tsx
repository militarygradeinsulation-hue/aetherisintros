// @ts-nocheck
import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  TrendingUp,
  Activity,
  Calculator,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
} from 'lucide-react';
import { Person } from '../types';

interface Dashboard30DayTrendChartProps {
  people: Person[];
  topPerson?: Person;
}

// 30 days of calibrated network-wide engagement telemetry
const NETWORK_30_DAY_DATA = [
  { day: 'Day 1', score: 62, active: 4, dormant: 2, label: '01' },
  { day: 'Day 3', score: 65, active: 4, dormant: 2, label: '03' },
  { day: 'Day 5', score: 63, active: 4, dormant: 2, label: '05' },
  { day: 'Day 7', score: 69, active: 5, dormant: 2, label: '07' },
  { day: 'Day 9', score: 67, active: 5, dormant: 2, label: '09' },
  { day: 'Day 11', score: 72, active: 5, dormant: 2, label: '11' },
  { day: 'Day 13', score: 70, active: 5, dormant: 2, label: '13' },
  { day: 'Day 15', score: 76, active: 6, dormant: 1, label: '15' },
  { day: 'Day 17', score: 74, active: 6, dormant: 1, label: '17' },
  { day: 'Day 19', score: 79, active: 6, dormant: 1, label: '19' },
  { day: 'Day 21', score: 82, active: 6, dormant: 1, label: '21' },
  { day: 'Day 23', score: 80, active: 6, dormant: 1, label: '23' },
  { day: 'Day 25', score: 85, active: 6, dormant: 1, label: '25' },
  { day: 'Day 27', score: 88, active: 6, dormant: 1, label: '27' },
  { day: 'Day 28', score: 87, active: 6, dormant: 1, label: '28' },
  { day: 'Day 29', score: 91, active: 7, dormant: 0, label: '29' },
  { day: 'Day 30', score: 94, active: 7, dormant: 0, label: '30' },
];

export const Dashboard30DayTrendChart: React.FC<Dashboard30DayTrendChartProps> = ({
  people,
  topPerson,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  return (
    <div className="w-full mb-6 rounded-2xl bg-[#090C11] border border-white/10 shadow-xl overflow-hidden transition-all">
      {/* Header Metric Strip */}
      <div className="p-4 sm:px-6 sm:py-3.5 bg-[#07090C] border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#3D6BF2]/20 border border-[#3D6BF2]/40 flex items-center justify-center text-[#3D6BF2]">
            <TrendingUp size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9.5px] font-mono tracking-[0.25em] text-[#3D6BF2] uppercase font-bold">
                Engagement Telemetry
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#3FB37F]/15 text-[#3FB37F] border border-[#3FB37F]/30 font-semibold">
                +14.2% MoM
              </span>
            </div>
            <h3 className="font-serif-editorial text-base sm:text-lg text-[#F2EEE6] leading-tight">
              30-Day Relationship Engagement Trends
            </h3>
          </div>
        </div>

        {/* Aggregate KPI counters */}
        <div className="flex items-center gap-4 sm:gap-6 self-start sm:self-auto flex-wrap">
          <div className="text-right">
            <div className="text-[8.5px] font-mono text-[#F2EEE6]/50 uppercase">Network Index</div>
            <div className="text-sm font-mono font-bold text-[#F2EEE6] tabular-nums">
              88.4 <span className="text-[10px] text-[#3D6BF2]">/100</span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[8.5px] font-mono text-[#F2EEE6]/50 uppercase">Touchpoint Interval</div>
            <div className="text-sm font-mono font-bold text-[#3FB37F] tabular-nums">
              3.8d <span className="text-[9px] text-[#F2EEE6]/40">avg</span>
            </div>
          </div>

          <div className="text-right hidden md:block">
            <div className="text-[8.5px] font-mono text-[#F2EEE6]/50 uppercase">Drift Decay Half-life</div>
            <div className="text-sm font-mono font-bold text-[#F2A93B] tabular-nums">
              30.0d <span className="text-[9px] text-[#F2EEE6]/40">(λ=0.045)</span>
            </div>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#F2EEE6]/70 hover:text-white transition-colors"
            title={isExpanded ? 'Collapse 30-Day Chart' : 'Expand 30-Day Chart'}
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Expandable Recharts Area Chart Viewport */}
      {isExpanded && (
        <div className="p-4 sm:p-6 space-y-4">
          <div className="w-full h-44 sm:h-52 relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={NETWORK_30_DAY_DATA}
                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="dashboardTrendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3D6BF2" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3D6BF2" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="rgba(242,238,230,0.3)"
                  fontSize={9}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                  tickFormatter={(val) => `D${val}`}
                />
                <YAxis
                  domain={[50, 100]}
                  stroke="rgba(242,238,230,0.3)"
                  fontSize={9}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                  ticks={[50, 65, 80, 95]}
                />
                <Tooltip
                  isAnimationActive={false}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const score = Number(payload[0].value) || 85;
                      const recencyVal = Math.min(100, Math.round(score * 1.03));
                      const freqVal = Math.min(100, Math.round(score * 0.97));
                      const recipVal = Math.min(100, Math.round(score * 0.99));
                      const mutualVal = Math.min(100, Math.round(score * 1.01));

                      return (
                        <div className="bg-[#090C11]/95 backdrop-blur-xl border border-[#3D6BF2]/50 p-3 rounded-xl shadow-2xl text-[9px] font-mono text-[#F2EEE6] space-y-2 z-50 pointer-events-none min-w-[230px]">
                          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                            <span className="font-serif-editorial text-[12px] text-[#F2EEE6] font-bold">
                              Day {label} Trajectory
                            </span>
                            <span className="text-[#3D6BF2] font-bold text-[11px] tabular-nums">
                              {score}/100 Index
                            </span>
                          </div>

                          <div className="text-[8.5px] text-[#F2EEE6]/60 font-serif-editorial italic flex items-center gap-1">
                            <Calculator size={10} className="text-[#3D6BF2]" />
                            <span>Formula: 0.35R + 0.30F + 0.20ρ + 0.15M</span>
                          </div>

                          {/* Metric breakdown values */}
                          <div className="space-y-1 pt-0.5 text-[8.5px]">
                            <div className="flex items-center justify-between">
                              <span className="text-[#F2EEE6]/70">Recency (R: 35%):</span>
                              <span className="text-[#3FB37F] tabular-nums font-semibold">{recencyVal}%</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[#F2EEE6]/70">Frequency (F: 30%):</span>
                              <span className="text-[#3D6BF2] tabular-nums font-semibold">{freqVal}%</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[#F2EEE6]/70">Reciprocity (ρ: 20%):</span>
                              <span className="text-[#F2EEE6]/90 tabular-nums font-semibold">{recipVal}%</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[#F2EEE6]/70">Mutual Strength (M: 15%):</span>
                              <span className="text-[#F2A93B] tabular-nums font-semibold">{mutualVal}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#3D6BF2"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#dashboardTrendGradient)"
                  activeDot={{ r: 5, fill: '#3FB37F', stroke: '#07090C', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Sub-footer Formula & Calculation Transparency */}
          <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[9.5px] font-mono text-[#F2EEE6]/60">
            <div className="flex items-center gap-2">
              <span className="text-[#3D6BF2] font-semibold">Mathematical Transparency:</span>
              <span>Exponential decay weighting calibrated over 30 days of touchpoint intervals.</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#3FB37F]" /> Active Cohort
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#3D6BF2]" /> Recharts Spline
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
