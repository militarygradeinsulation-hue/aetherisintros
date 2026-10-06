// @ts-nocheck
import React, { useMemo } from 'react';
import { NetworkMember, RelationshipTier } from '../../networkData';
import { getPortraitForName } from './ExecutivePortrait';
import {
  ShieldCheck,
  Target,
  Users,
  Compass,
  Radio,
  Sparkles,
  Award,
  Hash,
} from 'lucide-react';

interface NetworkSnapshotPrintViewProps {
  members: NetworkMember[];
  activeCluster: string;
  minFitScore: number;
  searchFilter: string;
}

export const NetworkSnapshotPrintView: React.FC<NetworkSnapshotPrintViewProps> = ({
  members,
  activeCluster,
  minFitScore,
  searchFilter,
}) => {
  const currentDate = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  }, []);

  const snapshotId = useMemo(() => {
    return `AETH-SNAP-${Math.floor(100000 + Math.random() * 900000)}`;
  }, []);

  const coreCount = members.filter((m) => m.tier === 'Core').length;
  const extendedCount = members.filter((m) => m.tier === 'Extended').length;
  const prospectCount = members.filter((m) => m.tier === 'Prospect').length;

  const avgMatchScore = useMemo(() => {
    if (members.length === 0) return 0;
    const sum = members.reduce((acc, m) => acc + m.matchScore, 0);
    return Math.round(sum / members.length);
  }, [members]);

  // Generate deterministic 2D coordinates for vector web rendering
  const width = 800;
  const height = 480;
  const cx = width / 2;
  const cy = height / 2;

  const orbitalNodes = useMemo(() => {
    return members.map((m, idx) => {
      const total = Math.max(members.length, 1);
      const angle = (idx / total) * Math.PI * 2 - Math.PI / 2;
      // Stagger radius so it looks like an authentic cosmic cluster
      const rDist = idx % 2 === 0 ? 165 : 195;
      const x = cx + Math.cos(angle) * rDist;
      const y = cy + Math.sin(angle) * rDist;

      return {
        member: m,
        x,
        y,
        radius: idx < 3 ? 28 : 24,
        ringColor: m.tier === 'Core' ? '#F5B027' : m.tier === 'Extended' ? '#C78522' : '#F59E0B',
      };
    });
  }, [members, cx, cy]);

  return (
    <div className="hidden print:block print-snapshot-container w-full bg-[#07090C] text-[#F2EEE6] p-6 space-y-6">
      {/* 1. Executive Letterhead & Document Metadata */}
      <header className="border-b-2 border-[#F5B027] pb-4 flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.25em] text-[#F5B027] font-semibold">
            <Radio className="w-3.5 h-3.5 text-[#F5B027]" />
            <span>AETHERIS // RELATIONSHIP INTELLIGENCE SYSTEM</span>
          </div>
          <h1 className="font-serif-editorial text-2xl font-bold text-white tracking-tight">
            Executive Network Snapshot
          </h1>
          <p className="text-xs text-[#9CA3AF] max-w-xl">
            High-Resolution Active Cluster Constellation & Live Connection Web Dossier
          </p>
        </div>

        <div className="text-right space-y-1 font-mono text-[10px] text-[#9CA3AF]">
          <div className="text-white font-bold text-xs">{snapshotId}</div>
          <div>{currentDate}</div>
          <div className="text-emerald-400 font-semibold">CLASSIFIED · INTERNAL USE ONLY</div>
        </div>
      </header>

      {/* 2. Snapshot Filter & Scope Summary Bar */}
      <div className="grid grid-cols-4 gap-3 bg-[#0E121A] border border-white/10 rounded-xl p-3.5 text-xs">
        <div>
          <div className="text-[10px] font-mono text-[#9CA3AF] uppercase">Active Cluster</div>
          <div className="text-sm font-bold text-white mt-0.5 capitalize">{activeCluster} Cluster</div>
        </div>
        <div>
          <div className="text-[10px] font-mono text-[#9CA3AF] uppercase">Total Active Nodes</div>
          <div className="text-sm font-bold text-[#FFC85C] mt-0.5">{members.length} Verified People</div>
        </div>
        <div>
          <div className="text-[10px] font-mono text-[#9CA3AF] uppercase">Mean Affinity Fit</div>
          <div className="text-sm font-bold text-emerald-400 mt-0.5">{avgMatchScore}% Synergy</div>
        </div>
        <div>
          <div className="text-[10px] font-mono text-[#9CA3AF] uppercase">Tier Breakdown</div>
          <div className="text-xs font-mono text-[#CBD5E1] mt-0.5">
            {coreCount} Core · {extendedCount} Ext · {prospectCount} Prosp
          </div>
        </div>
      </div>

      {/* 3. High-Resolution Visual Vector Web / Radar Constellation */}
      <div className="bg-[#090C11] border border-white/10 rounded-xl p-4 overflow-hidden relative shadow-lg print-break-inside-avoid">
        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#9CA3AF] mb-2 border-b border-white/5 pb-1.5">
          <span className="flex items-center gap-1.5 text-[#F5B027] font-semibold">
            <Compass className="w-3.5 h-3.5" />
            300 DPI Vector Cluster Topology · Orbital Radar Coordinates
          </span>
          <span>Scale 1:1 · Infinite Vector Resolution</span>
        </div>

        <div className="relative w-full h-[480px] bg-[#07090C] rounded-lg overflow-hidden border border-white/5">
          {/* SVG Background Radar Rings & Primary Connection Strands */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${width} ${height}`}>
            <defs>
              <radialGradient id="printRadarGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#F5B027" stopOpacity="0.12" />
                <stop offset="60%" stopColor="#F5B027" stopOpacity="0.03" />
                <stop offset="100%" stopColor="#07090C" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Radar Center Fill */}
            <circle cx={cx} cy={cy} r={220} fill="url(#printRadarGrad)" />

            {/* Concentric Range Rings */}
            {[55, 110, 165, 220].map((r, i) => (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke="rgba(199, 133, 34, 0.18)"
                strokeWidth="1"
                strokeDasharray={i % 2 === 0 ? '4 4' : undefined}
              />
            ))}

            {/* Crosshair Radial Spokes */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
              const rad = (deg * Math.PI) / 180;
              return (
                <line
                  key={deg}
                  x1={cx}
                  y1={cy}
                  x2={cx + Math.cos(rad) * 220}
                  y2={cy + Math.sin(rad) * 220}
                  stroke="rgba(199, 133, 34, 0.12)"
                  strokeWidth="0.8"
                />
              );
            })}

            {/* Connection Web Strands between nearby nodes */}
            {orbitalNodes.map((n1, i) =>
              orbitalNodes.slice(i + 1).map((n2, j) => {
                const dist = Math.sqrt((n1.x - n2.x) ** 2 + (n1.y - n2.y) ** 2);
                if (dist < 220) {
                  return (
                    <line
                      key={`${i}-${j}`}
                      x1={n1.x}
                      y1={n1.y}
                      x2={n2.x}
                      y2={n2.y}
                      stroke="rgba(255, 200, 92, 0.45)"
                      strokeWidth="1.2"
                    />
                  );
                }
                return null;
              })
            )}

            {/* Micro connection satellite nodes */}
            {[
              { x: cx - 90, y: cy - 70, label: 'Series B Syndicate' },
              { x: cx + 110, y: cy - 60, label: 'Stanford Alum' },
              { x: cx - 60, y: cy + 100, label: 'OpenAI Ecosystem' },
              { x: cx + 80, y: cy + 90, label: 'Enterprise GTM' },
            ].map((micro, idx) => (
              <g key={idx}>
                <circle cx={micro.x} cy={micro.y} r={3} fill="#FFC85C" />
                <text
                  x={micro.x + 6}
                  y={micro.y + 3}
                  fill="#9CA3AF"
                  fontSize="7.5"
                  fontFamily="monospace"
                >
                  {micro.label}
                </text>
              </g>
            ))}
          </svg>

          {/* HTML Rendered High-Resolution Person Bubbles on top of Vector Web */}
          {orbitalNodes.map(({ member, x, y, radius, ringColor }) => {
            const portraitUrl = getPortraitForName(member.name, member.avatarUrl);

            return (
              <div
                key={member.id}
                style={{
                  left: `${x}px`,
                  top: `${y}px`,
                  transform: 'translate(-50%, -50%)',
                }}
                className="absolute flex flex-col items-center pointer-events-none"
              >
                {/* Circular Photo Bubble with Tier Ring */}
                <div
                  style={{
                    width: `${radius * 2}px`,
                    height: `${radius * 2}px`,
                    borderColor: ringColor,
                  }}
                  className="relative rounded-full border-2 bg-[#0E121A] overflow-hidden shadow-lg shadow-black/80"
                >
                  <img
                    src={portraitUrl}
                    alt={member.name}
                    className="w-full h-full object-cover grayscale contrast-110"
                  />
                  {/* Match Score Badge */}
                  <span
                    style={{ backgroundColor: ringColor }}
                    className="absolute top-0 right-0 transform translate-x-1 -translate-y-1 text-[8px] font-mono font-bold text-white px-1 py-0.2 rounded-full border border-black"
                  >
                    {member.matchScore}%
                  </span>
                </div>

                {/* Name & Title Label Pill */}
                <div className="mt-1.5 flex flex-col items-center">
                  <span className="bg-[#0E121A] border border-white/20 text-white font-semibold text-[9.5px] px-2 py-0.5 rounded-md whitespace-nowrap shadow-sm">
                    {member.name}
                  </span>
                  <span className="text-[8px] text-[#9CA3AF] whitespace-nowrap mt-0.5">
                    {member.company}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Active Cluster Executive Roster Table */}
      <section className="space-y-3 print-break-inside-avoid">
        <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-[#9CA3AF] border-b border-white/10 pb-1">
          <span className="font-bold text-white">Cluster Members & Strategic Profiles</span>
          <span>{members.length} Documented Executives</span>
        </div>

        <div className="border border-white/10 rounded-xl overflow-hidden bg-[#090C11]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0E121A] border-b border-white/10 text-[10px] font-mono text-[#9CA3AF] uppercase">
                <th className="p-2.5">Member</th>
                <th className="p-2.5">Title & Organization</th>
                <th className="p-2.5">Tier</th>
                <th className="p-2.5">Synergy</th>
                <th className="p-2.5">Mutuals</th>
                <th className="p-2.5">Specializations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-[11px]">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-white/[0.02]">
                  <td className="p-2.5 flex items-center gap-2">
                    <img
                      src={getPortraitForName(m.name, m.avatarUrl)}
                      alt={m.name}
                      className="w-7 h-7 rounded-full object-cover border border-[#F5B027]/40 grayscale"
                    />
                    <div>
                      <div className="font-bold text-white">{m.name}</div>
                      <div className="text-[9px] text-[#9CA3AF]">{m.location}</div>
                    </div>
                  </td>
                  <td className="p-2.5">
                    <div className="text-white font-medium">{m.title}</div>
                    <div className="text-[10px] text-[#FFC85C]">{m.company}</div>
                  </td>
                  <td className="p-2.5">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-bold border ${
                        m.tier === 'Core'
                          ? 'bg-[#F5B027]/20 text-[#FFC85C] border-[#F5B027]/40'
                          : m.tier === 'Extended'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}
                    >
                      {m.tier || 'Prospect'}
                    </span>
                  </td>
                  <td className="p-2.5 font-mono text-white font-bold">
                    {m.matchScore}%
                  </td>
                  <td className="p-2.5 font-mono text-[#9CA3AF]">
                    {m.mutualConnectionsCount} mutual
                  </td>
                  <td className="p-2.5">
                    <div className="flex flex-wrap gap-1">
                      {m.focusAreas.slice(0, 2).map((fa, i) => (
                        <span key={i} className="text-[9px] text-[#CBD5E1] bg-white/5 px-1.5 py-0.2 rounded border border-white/5">
                          {fa}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. Print Footer Verification */}
      <footer className="pt-4 border-t border-white/10 flex items-center justify-between text-[9px] font-mono text-[#6B7280]">
        <div>CONFIDENTIAL // AETHERIS INTELLIGENCE GRAPH // GENERATED FOR EXECUTIVE RECORD</div>
        <div>VERIFIED BY LIVING MEMORY ENGINE · 300 DPI VECTOR EXPORT</div>
      </footer>
    </div>
  );
};
