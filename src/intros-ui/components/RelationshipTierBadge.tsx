import React from 'react';
import { Crown, Sparkles, Diamond, Circle, Shield } from 'lucide-react';

export type RelationshipTier = 'inner_circle' | 'strategic' | 'network';

interface RelationshipTierBadgeProps {
  tier?: RelationshipTier;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const RelationshipTierBadge: React.FC<RelationshipTierBadgeProps> = ({
  tier = 'network',
  size = 'sm',
  showLabel = true,
  className = '',
}) => {
  const getTierConfig = () => {
    switch (tier) {
      case 'inner_circle':
        return {
          label: 'Inner Circle',
          icon: Crown,
          textColor: 'text-[#F5A623]',
          bgColor: 'bg-[#F5A623]/15',
          borderColor: 'border-[#F5A623]/40',
          shadow: 'shadow-[0_0_8px_rgba(245,166,35,0.35)]',
          symbol: '▲',
          tooltip: 'Tier 1 Inner Circle: Core syndicate anchors & daily executive touchpoints',
        };
      case 'strategic':
        return {
          label: 'Strategic',
          icon: Diamond,
          textColor: 'text-[#3D6BF2]',
          bgColor: 'bg-[#3D6BF2]/15',
          borderColor: 'border-[#3D6BF2]/40',
          shadow: 'shadow-[0_0_8px_rgba(61,107,242,0.3)]',
          symbol: '◆',
          tooltip: 'Tier 2 Strategic: Institutional allocators & key enterprise mandates',
        };
      case 'network':
      default:
        return {
          label: 'Network',
          icon: Circle,
          textColor: 'text-[#94A3B8]',
          bgColor: 'bg-white/5',
          borderColor: 'border-white/10',
          shadow: '',
          symbol: '●',
          tooltip: 'Tier 3 Network: Broad professional relationship graph & quarterly cadence',
        };
    }
  };

  const config = getTierConfig();
  const IconComponent = config.icon;

  const sizeClasses = {
    xs: 'px-1.5 py-0.2 text-[8px] gap-1',
    sm: 'px-1.5 py-0.5 text-[8.5px] gap-1',
    md: 'px-2 py-0.5 text-[9.5px] gap-1.5',
    lg: 'px-2.5 py-1 text-xs gap-1.5',
  }[size];

  const iconSizes = {
    xs: 8,
    sm: 9,
    md: 11,
    lg: 13,
  }[size];

  return (
    <span
      className={`inline-flex items-center font-mono font-semibold rounded border ${config.bgColor} ${config.borderColor} ${config.textColor} ${config.shadow} ${sizeClasses} ${className} shrink-0 select-none`}
      title={config.tooltip}
    >
      <IconComponent size={iconSizes} className="shrink-0" />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
};
