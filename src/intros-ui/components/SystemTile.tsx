// @ts-nocheck
import React from 'react';
import { Mic, AlertTriangle } from 'lucide-react';
import { RelationshipTierBadge, RelationshipTier } from './RelationshipTierBadge';

interface SystemTileProps {
  index: number;
  tileId: string;
  title: string;
  caption: [string, string];
  onClick: () => void;
  children: React.ReactNode;
  engagement?: 'active' | 'dormant' | 'followup';
  tier?: RelationshipTier;
  heatmapActive?: boolean;
  heatmapScore?: number; // 0 to 100
  heatmapLabel?: string;
  onAttachVoiceNote?: () => void;
  isKeyboardFocused?: boolean;
  isInactivityAlerted?: boolean;
  inactivityDays?: number;
  inactivityThreshold?: number;
}

export const SystemTile: React.FC<SystemTileProps> = ({
  index,
  tileId,
  title,
  caption,
  onClick,
  children,
  engagement,
  tier,
  heatmapActive = false,
  heatmapScore,
  heatmapLabel,
  onAttachVoiceNote,
  isKeyboardFocused = false,
  isInactivityAlerted = false,
  inactivityDays,
  inactivityThreshold = 30,
}) => {
  const staggerDelay = `${index * 30}ms`;

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return 'bg-[#C78522]';
      case 'followup': return 'bg-[#F5B027]';
      case 'dormant': return 'bg-[#C78522]';
      default: return 'bg-transparent';
    }
  };

  const getHeatmapStyling = (score: number = 75) => {
    if (score >= 88) {
      return {
        border: 'border-[#F5B027]/50 shadow-[0_0_20px_rgba(249,115,22,0.25)]',
        bg: 'bg-gradient-to-b from-[#F5B027]/10 to-transparent',
        badgeColor: 'bg-[#F5B027]/20 text-[#F5B027] border-[#F5B027]/40',
      };
    }
    if (score >= 75) {
      return {
        border: 'border-[#C78522]/40 shadow-[0_0_15px_rgba(63,179,127,0.2)]',
        bg: 'bg-gradient-to-b from-[#C78522]/10 to-transparent',
        badgeColor: 'bg-[#C78522]/20 text-[#C78522] border-[#C78522]/40',
      };
    }
    if (score >= 60) {
      return {
        border: 'border-[#F5B027]/35 shadow-[0_0_12px_rgba(199, 133, 34,0.15)]',
        bg: 'bg-gradient-to-b from-[#F5B027]/10 to-transparent',
        badgeColor: 'bg-[#F5B027]/20 text-[#F5B027] border-[#F5B027]/40',
      };
    }
    return {
      border: 'border-[#C78522]/30',
      bg: 'bg-gradient-to-b from-[#C78522]/10 to-transparent',
      badgeColor: 'bg-[#C78522]/20 text-[#FFC85C] border-[#C78522]/40',
    };
  };

  const heatStyle = heatmapActive ? getHeatmapStyling(heatmapScore) : null;

  // Split title if it contains newline or long words
  const titleLines = title.includes('\n')
    ? title.split('\n')
    : title.length > 15 && title.includes(' ')
    ? [title.substring(0, title.lastIndexOf(' ')), title.substring(title.lastIndexOf(' ') + 1)]
    : [title];

  return (
    <div
      role="button"
      tabIndex={0}
      id={`tile-${tileId}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        animationDelay: staggerDelay,
      }}
      className={`sys-tile group w-full h-[276px] sm:h-[286px] p-2.5 sm:p-3 flex flex-col justify-between text-left cursor-pointer focus-visible:outline-none select-none transition-all duration-200 hover:shadow-[0_0_15px_rgba(199, 133, 34,0.3)] relative overflow-hidden ${
        isKeyboardFocused
          ? 'ring-2 ring-[#F5B027] shadow-[0_0_24px_rgba(199, 133, 34,0.45)] z-20 scale-[1.01]'
          : ''
      } ${
        isInactivityAlerted
          ? 'border-[#C78522]/90 ring-1 ring-[#C78522]/70 shadow-[0_0_22px_rgba(229,72,77,0.35)]'
          : heatStyle
          ? heatStyle.border
          : ''
      }`}
      aria-label={`Open ${title.replace('\n', ' ')} module${isInactivityAlerted ? ` - Inactivity Alert: ${inactivityDays} days since last interaction` : ''}`}
    >
      {/* Inactivity warning ambient glow */}
      {isInactivityAlerted && (
        <div
          className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#C78522]/15 via-transparent to-transparent opacity-80"
          aria-hidden="true"
        />
      )}

      {/* Heatmap ambient glow overlay */}
      {heatmapActive && heatStyle && !isInactivityAlerted && (
        <div
          className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${heatStyle.bg} opacity-90`}
          aria-hidden="true"
        />
      )}

      {/* 1. Title, uppercase, top-left (two lines allowed) */}
      <div className="w-full flex items-start justify-between min-h-[28px] relative z-10">
        <div className="sys-tile-title group-hover:text-white transition-colors duration-150 text-[10.5px] sm:text-[11px] leading-[1.18] tracking-[0.12em] font-serif-editorial">
          {titleLines.map((line, idx) => (
            <div key={idx} className="block">{line}</div>
          ))}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {isInactivityAlerted && (
            <span
              className="text-[7.5px] font-mono font-bold uppercase px-1 py-0.2 rounded bg-[#C78522]/25 text-[#FF6369] border border-[#C78522]/50 flex items-center gap-0.5 animate-pulse shadow-sm"
              title={`Inactivity Alert: ${inactivityDays}d since last touch (exceeds ${inactivityThreshold}d SLA threshold)`}
            >
              <AlertTriangle size={7.5} />
              <span>{inactivityDays}d Drift</span>
            </span>
          )}
          {tier && (
            <RelationshipTierBadge tier={tier} size="xs" showLabel={false} />
          )}
          {heatmapActive && heatmapLabel && !isInactivityAlerted && (
            <span
              className={`text-[7.5px] font-mono font-bold uppercase px-1 py-0.2 rounded border ${heatStyle?.badgeColor}`}
            >
              {heatmapLabel}
            </span>
          )}
          {isKeyboardFocused && (
            <span className="text-[7px] font-mono uppercase px-1 py-0.2 rounded bg-[#F5B027] text-white font-bold tracking-wider">
              ↵ Focus
            </span>
          )}
          {onAttachVoiceNote && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAttachVoiceNote();
              }}
              className="p-0.5 sm:p-1 rounded bg-white/5 hover:bg-[#F5B027]/25 text-[#F2EEE6]/60 hover:text-white transition-all shrink-0"
              title="Attach Voice Note & Generate AI Meeting Minutes"
              aria-label="Attach Voice Note to Tile"
            >
              <Mic size={9} />
            </button>
          )}
          {engagement && (
            <div
              className={`w-1.5 h-1.5 rounded-full ${getStatusColor(engagement)} shrink-0`}
              title={`Status: ${engagement}`}
            />
          )}
          <div
            className="w-1.5 h-1.5 rounded-full bg-[#F5B027] opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0 mt-0.5"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* 2. Mini-preview, about 60% of tile height */}
      <div className="sys-tile-inner w-full flex-1 my-2 p-2 sm:p-2.5 flex flex-col justify-center overflow-hidden relative bg-[#12100C] rounded-[8px] border border-white/[0.04] z-10">
        {children}
      </div>

      {/* 3. Caption, two short serif lines, centered at bottom */}
      <div className="w-full pt-0.5 flex flex-col items-center justify-center min-h-[30px] relative z-10">
        <span className="sys-tile-caption block truncate w-full text-center text-[10.5px] sm:text-[11px] leading-[1.3] text-[#F2EEE6]/70 font-serif-editorial">
          {caption[0]}
        </span>
        <span className="sys-tile-caption block truncate w-full text-center text-[10.5px] sm:text-[11px] leading-[1.3] text-[#F2EEE6]/70 font-serif-editorial">
          {caption[1]}
        </span>
      </div>
    </div>
  );
};

