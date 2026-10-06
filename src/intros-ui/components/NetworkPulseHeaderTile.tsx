// @ts-nocheck
import React from 'react';
import { Activity, Sparkles, TrendingUp, Zap } from 'lucide-react';
import { Person } from '../types';

interface NetworkPulseHeaderTileProps {
  people: Person[];
  onOpenGraph: () => void;
  onOpenHeatmap: () => void;
}

export const NetworkPulseHeaderTile: React.FC<NetworkPulseHeaderTileProps> = ({
  people,
  onOpenGraph,
  onOpenHeatmap,
}) => {
  // Sparkline points simulating weekly connection activity velocity
  const sparklineValues = [42, 58, 65, 88, 74, 96, 112, 128, 142];
  const maxVal = Math.max(...sparklineValues);
  const minVal = Math.min(...sparklineValues);

  return (
    <div className="w-full mb-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#12100C] via-[#12100c] to-[#12100C] border border-[#F5B027]/40 shadow-[0_0_30px_rgba(199, 133, 34,0.15)] flex flex-col lg:flex-row lg:items-center justify-between gap-4 select-none relative overflow-hidden">
      {/* Background glow accent */}
      <div className="absolute -right-20 -top-20 w-60 h-60 bg-[#F5B027]/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

      {/* Left: Title & Executive Summary */}
      <div className="flex items-start gap-3.5 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-[#F5B027]/20 border border-[#F5B027]/50 flex items-center justify-center text-[#F5B027] shrink-0 shadow-sm">
          <Activity size={20} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono tracking-[0.2em] uppercase font-bold text-[#F5B027]">
              Network Pulse &amp; Activity Velocity
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#C78522]/20 text-[#C78522] text-[9.5px] font-mono font-bold flex items-center gap-1">
              <TrendingUp size={10} />
              <span>+342% ROI Velocity</span>
            </span>
          </div>
          <h3 className="font-serif-editorial text-lg sm:text-xl text-[#F2EEE6] font-normal mt-0.5">
            Active Touchpoints, Syndicate Commitments &amp; Real-Time Telemetry
          </h3>
          <p className="text-xs text-[#F2EEE6]/70 font-sans-clean mt-0.5 truncate">
            {people.length} executive connection dossiers synchronized across venture syndicates, sovereign allocators &amp; enterprise clusters.
          </p>
        </div>
      </div>

      {/* Center: Sparkline Chart Preview */}
      <div className="flex items-center gap-4 bg-[#12100C] border border-white/10 rounded-xl px-4 py-3 shrink-0">
        <div className="flex flex-col">
          <span className="text-[9.5px] font-mono text-[#F2EEE6]/50 uppercase tracking-wider">Weekly Activity</span>
          <span className="text-base font-serif-editorial text-[#C78522] font-semibold">+48 Touchpoints</span>
        </div>

        {/* SVG Sparkline */}
        <div className="w-32 h-10 flex items-end gap-1.5 pt-2">
          {sparklineValues.map((val, idx) => {
            const heightPct = Math.round(((val - minVal) / (maxVal - minVal || 1)) * 75 + 25);
            const isLatest = idx === sparklineValues.length - 1;
            return (
              <div
                key={idx}
                style={{ height: `${heightPct}%` }}
                className={`w-2.5 rounded-t transition-all ${
                  isLatest
                    ? 'bg-[#F5B027] shadow-[0_0_10px_rgba(199, 133, 34,0.8)]'
                    : 'bg-white/25 hover:bg-white/40'
                }`}
                title={`Day ${idx + 1}: ${val} interactions`}
              />
            );
          })}
        </div>
      </div>

      {/* Right: Quick Visualization Switchers */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onOpenGraph}
          className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[#F2EEE6] text-xs font-mono flex items-center gap-1.5 transition-all"
          title="Open D3 Network Graph"
        >
          <Sparkles size={13} className="text-[#F5B027]" />
          <span>Network Graph</span>
        </button>
        <button
          onClick={onOpenHeatmap}
          className="px-3 py-2 rounded-xl bg-[#F5B027]/20 hover:bg-[#F5B027]/30 border border-[#F5B027]/40 text-white text-xs font-mono flex items-center gap-1.5 transition-all shadow-sm"
          title="Open Cluster Heatmap"
        >
          <Zap size={13} className="text-[#F5B027]" />
          <span>Cluster Heatmap</span>
        </button>
      </div>
    </div>
  );
};
