import React, { useState } from 'react';
import { Zap, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';

export interface SpecterEvidence {
  slot: 'whoIAm' | 'whatIBring' | 'whoImLookingFor';
  sourceUrl: string;
  confidence: number;
  extractedAt: string;
}

export interface SpecterSignal {
  id: string;
  gapType: string;
  description: string;
  confidence: number;
  whoImLookingFor: string;
  evidence: SpecterEvidence[];
}

interface SpecterSignalCardProps {
  signal: SpecterSignal;
  onBuildAsk: (signal: SpecterSignal) => void;
}

function ConfidenceRing({ value }: { value: number }) {
  const r = 14;
  const circ = 2 * Math.PI * r;
  const dash = circ * value;
  return (
    <svg width={36} height={36} viewBox="0 0 36 36" aria-hidden="true" className="shrink-0">
      <circle cx={18} cy={18} r={r} fill="none" stroke="rgba(20,184,166,0.15)" strokeWidth={3} />
      <circle
        cx={18} cy={18} r={r} fill="none"
        stroke="#14B8A6" strokeWidth={3}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 18 18)"
      />
      <text x={18} y={22} textAnchor="middle" fontSize={9} fontWeight={700} fill="#14B8A6">
        {Math.round(value * 100)}
      </text>
    </svg>
  );
}

function SpecterSignalCard({ signal, onBuildAsk }: SpecterSignalCardProps) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-[#0E121A] border border-white/10 rounded-xl p-4 space-y-3 hover:border-teal-500/30 transition-colors">
      <div className="flex items-start gap-3">
        <ConfidenceRing value={signal.confidence} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-white">{signal.gapType}</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/25 uppercase tracking-wider">
              <Zap size={8} />
              Specter
            </span>
          </div>
          <p className="text-[11px] text-[#9CA3AF] mt-0.5 leading-relaxed">{signal.description}</p>
        </div>
      </div>

      {signal.evidence.length > 0 && (
        <button
          type="button"
          className="flex items-center gap-1 text-[10px] text-teal-500/70 hover:text-teal-400 transition-colors"
          onClick={() => setExpanded(v => !v)}
        >
          <Zap size={9} />
          {signal.evidence.length} evidence signal{signal.evidence.length !== 1 ? 's' : ''}
          {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </button>
      )}

      {expanded && (
        <ul className="space-y-1.5 pl-2 border-l border-teal-500/20">
          {signal.evidence.map((ev, i) => (
            <li key={i} className="flex items-center justify-between gap-2 text-[10px]">
              <span className="text-[#9CA3AF] capitalize">{ev.slot.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
              <span className="text-teal-400 font-mono">{Math.round(ev.confidence * 100)}%</span>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => onBuildAsk(signal)}
        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/25 hover:bg-teal-500/20 hover:border-teal-500/40 transition-all cursor-pointer"
      >
        Build Ask from Signal
        <ArrowRight size={12} />
      </button>
    </div>
  );
}

const MOCK_SIGNALS: SpecterSignal[] = [
  {
    id: 'sig-1',
    gapType: 'Enterprise Sales Motion',
    description: 'No GTM leader with enterprise SaaS deal experience on the founding team. Pattern matches 87% of Series A companies that stall at $2M ARR.',
    confidence: 0.87,
    whoImLookingFor: 'Enterprise SaaS GTM leader with $10M+ deal experience',
    evidence: [
      { slot: 'whoImLookingFor', sourceUrl: 'linkedin.com/company/…', confidence: 0.87, extractedAt: new Date().toISOString() },
      { slot: 'whatIBring', sourceUrl: 'crunchbase.com/…', confidence: 0.79, extractedAt: new Date().toISOString() },
    ],
  },
  {
    id: 'sig-2',
    gapType: 'CFO-Level Financial Discipline',
    description: 'Burn rate and unit economics are visible but unoptimized. Signal indicates 81% match with founders who need a fractional CFO before Series B.',
    confidence: 0.81,
    whoImLookingFor: 'Fractional CFO with SaaS metrics and Series B prep background',
    evidence: [
      { slot: 'whoImLookingFor', sourceUrl: 'pitchbook.com/…', confidence: 0.81, extractedAt: new Date().toISOString() },
    ],
  },
  {
    id: 'sig-3',
    gapType: 'Healthcare Distribution Channel',
    description: 'Product–market fit signals in healthcare vertical with no distribution partner. Specter detects 74% probability of missed ARR without channel partner.',
    confidence: 0.74,
    whoImLookingFor: 'Healthcare channel partner or distribution executive in health-tech',
    evidence: [
      { slot: 'whoImLookingFor', sourceUrl: 'linkedin.com/…', confidence: 0.74, extractedAt: new Date().toISOString() },
    ],
  },
];

interface SpecterSignalFeedProps {
  onBuildAsk: (signal: SpecterSignal) => void;
}

export function SpecterSignalFeed({ onBuildAsk }: SpecterSignalFeedProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Zap size={13} className="text-teal-400" />
        <span className="text-[11px] font-mono uppercase tracking-widest text-teal-400">Specter Detection Signals</span>
      </div>
      <div className="space-y-3">
        {MOCK_SIGNALS.map(signal => (
          <SpecterSignalCard key={signal.id} signal={signal} onBuildAsk={onBuildAsk} />
        ))}
      </div>
    </div>
  );
}
