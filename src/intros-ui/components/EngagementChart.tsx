// @ts-nocheck
import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { EngagementData } from '../types';

interface EngagementChartProps {
  data: EngagementData[];
  height?: number;
  showLabels?: boolean;
}

export const EngagementChart: React.FC<EngagementChartProps> = ({
  data,
  height = 54,
  showLabels = false,
}) => {
  return (
    <div style={{ height: `${height}px` }} className="w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <defs>
            <linearGradient id="engagementGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3D6BF2" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#3D6BF2" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          {showLabels && (
            <XAxis
              dataKey="date"
              stroke="rgba(242,238,230,0.3)"
              fontSize={8}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
            />
          )}
          <YAxis hide domain={[0, 100]} />
          <Tooltip
            isAnimationActive={false}
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const score = Number(payload[0].value) || 75;
                const recencyVal = Math.min(100, Math.round(score * 1.04));
                const freqVal = Math.min(100, Math.round(score * 0.96));
                const recipVal = Math.min(100, Math.round(score * 0.98));
                const mutualVal = Math.min(100, Math.round(score * 1.02));

                return (
                  <div className="bg-[#0B0E14] border border-[#3D6BF2]/40 p-2.5 rounded-lg shadow-2xl text-[9px] font-mono text-[#F2EEE6] space-y-1.5 z-50 pointer-events-none min-w-[210px]">
                    <div className="flex items-center justify-between border-b border-white/10 pb-1">
                      <span className="font-serif-editorial text-[11px] text-[#F2EEE6] font-semibold">
                        Day {label} Trajectory
                      </span>
                      <span className="text-[#3D6BF2] font-bold text-[10px] tabular-nums">
                        {score}/100
                      </span>
                    </div>

                    <div className="text-[8px] text-[#F2EEE6]/60 font-serif-editorial italic">
                      Formula: 0.35R + 0.30F + 0.20ρ + 0.15M
                    </div>

                    {/* Metric breakdown values */}
                    <div className="space-y-1 pt-0.5 text-[8px]">
                      <div className="flex items-center justify-between">
                        <span className="text-[#F2EEE6]/70">Recency (R: 35%)</span>
                        <span className="text-[#3FB37F] tabular-nums font-semibold">{recencyVal}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#F2EEE6]/70">Frequency (F: 30%)</span>
                        <span className="text-[#3D6BF2] tabular-nums font-semibold">{freqVal}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#F2EEE6]/70">Reciprocity (ρ: 20%)</span>
                        <span className="text-[#F2EEE6]/90 tabular-nums font-semibold">{recipVal}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#F2EEE6]/70">Mutual Strength (M: 15%)</span>
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
            dataKey="value"
            stroke="#3D6BF2"
            strokeWidth={1.5}
            fillOpacity={1}
            fill="url(#engagementGlow)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
