import React, { useState } from 'react';
import { Zap, X, Clock, Users } from 'lucide-react';

export interface RelationshipMoment {
  id: string;
  companyName: string;
  event: string;
  eventAmount?: string;
  warmPaths: number;
  windowDays: number;
}

const MOCK_MOMENT: RelationshipMoment = {
  id: 'rm-1',
  companyName: 'Meridian Health AI',
  event: 'Series B',
  eventAmount: '$28M',
  warmPaths: 3,
  windowDays: 11,
};

interface RelationshipMomentBannerProps {
  moment?: RelationshipMoment;
}

export function RelationshipMomentBanner({ moment = MOCK_MOMENT }: RelationshipMomentBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="relative flex items-start gap-3 bg-teal-500/8 border border-teal-500/25 rounded-xl p-4 pr-9">
      <div className="shrink-0 w-8 h-8 rounded-full bg-teal-500/15 border border-teal-500/30 flex items-center justify-center">
        <Zap size={14} className="text-teal-400" />
      </div>

      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-xs font-semibold text-white">
          {moment.companyName} just raised {moment.eventAmount && <span className="text-teal-400">{moment.eventAmount} </span>}
          {moment.event}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[#9CA3AF]">
          <span className="flex items-center gap-1">
            <Users size={9} />
            {moment.warmPaths} warm path{moment.warmPaths !== 1 ? 's' : ''} available
          </span>
          <span className="flex items-center gap-1">
            <Clock size={9} />
            {moment.windowDays}d intro window
          </span>
        </div>
      </div>

      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 text-[#6B7280] hover:text-white transition-colors cursor-pointer"
      >
        <X size={13} />
      </button>
    </div>
  );
}
