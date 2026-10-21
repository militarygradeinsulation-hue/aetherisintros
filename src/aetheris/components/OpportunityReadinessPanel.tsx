import React from 'react';
import type { OpportunityReadiness } from '../domain/opportunity-intelligence';

const labels: Record<string, string> = {
  profileFit: 'Profile fit', demonstratedNeed: 'Demonstrated need',
  timing: 'Timing', evidenceQuality: 'Evidence quality', engagement: 'Engagement',
};

/** Presentation-only: feed this component consent-checked, authorized opportunity signals. */
export function OpportunityReadinessPanel({ result }: { result: OpportunityReadiness }) {
  return (
    <section aria-label="Opportunity readiness" className="rounded-xl border border-current/20 p-4 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">Opportunity readiness</h3>
        <span aria-live="polite" className="font-semibold">
          {result.score === null ? 'Not enough evidence' : `${result.score}/100 · ${result.band}`}
        </span>
      </div>
      <p className="text-sm opacity-80">A decision aid based on permissioned opportunity signals, not a measure of personal worth.</p>
      {result.factors.map(factor => (
        <div key={factor.key} className="text-sm">
          <div className="flex justify-between gap-2">
            <span>{labels[factor.key] ?? factor.key}</span>
            <span>{factor.score === null ? 'Unknown' : `${factor.score}/100`}</span>
          </div>
          <div className="h-1.5 rounded-full bg-current/10 overflow-hidden" role="progressbar"
            aria-label={labels[factor.key] ?? factor.key} aria-valuemin={0} aria-valuemax={100}
            aria-valuenow={factor.score ?? undefined}>
            <div className="h-full bg-current/70" style={{ width: `${factor.score ?? 0}%` }} />
          </div>
        </div>
      ))}
      <ul className="list-disc pl-5 text-sm space-y-1">{result.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
      <p className="text-sm font-medium">Next step: {result.nextAction}</p>
    </section>
  );
}
