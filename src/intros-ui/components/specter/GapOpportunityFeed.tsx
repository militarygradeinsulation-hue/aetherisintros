import React from 'react';
import { TrendingUp, AlertCircle, ArrowRight, Zap } from 'lucide-react';
import type { SpecterSignal, SpecterEvidence } from './SpecterSignalFeed';

export interface GapOpportunity {
  id: string;
  title: string;
  description: string;
  urgency: 'high' | 'medium' | 'low';
  impactEstimate: string;
  matchCount: number;
  whoImLookingFor: string;
  evidence: SpecterEvidence[];
}

interface GapOpportunityCardProps {
  gap: GapOpportunity;
  onBuildAsk: (signal: SpecterSignal) => void;
}

const URGENCY_STYLES = {
  high: 'bg-red-500/10 text-red-400 border-red-500/25',
  medium: 'bg-amber-500/10 text-[#F5B027] border-amber-500/25',
  low: 'bg-white/5 text-[#9CA3AF] border-white/10',
} as const;

function GapOpportunityCard({ gap, onBuildAsk }: GapOpportunityCardProps) {
  const handleBuild = () => {
    onBuildAsk({
      id: gap.id,
      gapType: gap.title,
      description: gap.description,
      confidence: gap.urgency === 'high' ? 0.88 : gap.urgency === 'medium' ? 0.72 : 0.55,
      whoImLookingFor: gap.whoImLookingFor,
      evidence: gap.evidence,
    });
  };

  return (
    <div className="bg-[#0E121A] border border-white/10 rounded-xl p-4 space-y-3 hover:border-teal-500/20 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <TrendingUp size={12} className="text-teal-400 shrink-0" />
            <span className="text-xs font-semibold text-white">{gap.title}</span>
            <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${URGENCY_STYLES[gap.urgency]}`}>
              {gap.urgency === 'high' && <AlertCircle size={8} />}
              {gap.urgency}
            </span>
          </div>
          <p className="text-[11px] text-[#9CA3AF] mt-1 leading-relaxed">{gap.description}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-[10px] text-[#6B7280]">
        <span className="text-[#F5B027] font-mono font-semibold">{gap.impactEstimate} potential</span>
        <span>{gap.matchCount} network match{gap.matchCount !== 1 ? 'es' : ''}</span>
      </div>

      <button
        type="button"
        onClick={handleBuild}
        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/25 hover:bg-teal-500/20 hover:border-teal-500/40 transition-all cursor-pointer"
      >
        Build Ask for this Gap
        <ArrowRight size={12} />
      </button>
    </div>
  );
}

const MOCK_GAPS: GapOpportunity[] = [
  {
    id: 'gap-1',
    title: 'No Enterprise Sales Motion',
    description: 'Product is ready but there\'s no one on the team who has sold a $500K+ enterprise deal. This is blocking Series A.',
    urgency: 'high',
    impactEstimate: '$400K+',
    matchCount: 3,
    whoImLookingFor: 'Enterprise AE or VP Sales with $500K+ deal experience',
    evidence: [
      { slot: 'whoImLookingFor', sourceUrl: 'linkedin.com/company/…', confidence: 0.88, extractedAt: new Date().toISOString() },
    ],
  },
  {
    id: 'gap-2',
    title: 'Healthcare Distribution Gap',
    description: 'Strong product signal in health-tech sector but no distribution or channel partner to move units at scale.',
    urgency: 'medium',
    impactEstimate: '$250K+',
    matchCount: 2,
    whoImLookingFor: 'Healthcare distribution exec or channel partnership leader',
    evidence: [
      { slot: 'whoImLookingFor', sourceUrl: 'pitchbook.com/…', confidence: 0.72, extractedAt: new Date().toISOString() },
    ],
  },
];

interface GapOpportunityFeedProps {
  onBuildAsk: (signal: SpecterSignal) => void;
}

export function GapOpportunityFeed({ onBuildAsk }: GapOpportunityFeedProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Zap size={13} className="text-[#F5B027]" />
        <span className="text-[11px] font-mono uppercase tracking-widest text-[#F5B027]">Gap Opportunities</span>
      </div>
      <div className="space-y-3">
        {MOCK_GAPS.map(gap => (
          <GapOpportunityCard key={gap.id} gap={gap} onBuildAsk={onBuildAsk} />
        ))}
      </div>
    </div>
  );
}
