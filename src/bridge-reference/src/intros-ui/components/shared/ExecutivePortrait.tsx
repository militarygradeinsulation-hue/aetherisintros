// @ts-nocheck
import React from 'react';
import { NETWORK_MEMBERS } from '../../networkData';
import { AvatarImage } from '@/aetheris/avatar';

interface ExecutivePortraitProps {
  name: string;
  avatarUrl?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  showBackdropDetails?: boolean;
}

// Curated high-contrast editorial executive portraits — demo showcase characters only.
// A real member NEVER gets one of these: no photo on file means initials, never an invented face.
const PORTRAIT_MAP = new Map(NETWORK_MEMBERS.map(member => [member.name.toLowerCase(), member.avatarUrl]));

/**
 * Resolves the portrait for a person: their real photo when one is on file
 * (direct URL or private storage object), otherwise a demo-character match,
 * otherwise '' — callers must show initials, never a stock photo.
 */
export function getPortraitForName(name: string, explicitUrl?: string): string {
  if (explicitUrl !== undefined) return explicitUrl.trim();
  const lower = (name || '').toLowerCase().trim();
  return PORTRAIT_MAP.get(lower) || '';
}

export const ExecutivePortrait: React.FC<ExecutivePortraitProps> = ({
  name,
  avatarUrl,
  className = '',
  size = 'md',
  showBackdropDetails = false,
}) => {
  // Only the person's real photo (or an explicit demo-character match) — never an invented fallback.
  const resolvedUrl = avatarUrl !== undefined ? avatarUrl.trim() : getPortraitForName(name);

  const initials = (name || '')
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'AI';

  if (size === 'hero') {
    return (
      <div
        className={`relative overflow-hidden rounded-xl border border-white/10 bg-[#0B0D12] select-none ${className}`}
      >
        <div className="relative w-full h-full min-h-[380px] flex items-center justify-center">
          {/* Initials sit behind the photo so they show while a private file resolves — or if there is no photo at all */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-[#1E232F] border border-white/10 flex items-center justify-center text-white font-serif-editorial text-3xl font-bold">
              {initials}
            </div>
          </div>
          {resolvedUrl && (
            <AvatarImage
              source={resolvedUrl}
              alt={name}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 hover:scale-105"
            />
          )}
          {/* Cinematic contrast scrim & gradient overlay matching editorial design */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#07090C] via-black/30 to-black/40 pointer-events-none z-10" />
          <div className="absolute inset-0 bg-radial from-transparent via-transparent to-[#07090C]/80 pointer-events-none z-10" />
        </div>
      </div>
    );
  }

  // Small / Medium / Large thumbnail for cards, lists, chats, and headers
  const dimensionClass =
    size === 'sm'
      ? 'w-8 h-8 text-xs'
      : size === 'lg'
      ? 'w-16 h-16 text-lg'
      : 'w-11 h-11 text-sm';

  return (
    <div
      className={`commons-portrait relative shrink-0 overflow-hidden rounded-full border border-border bg-muted flex items-center justify-center text-foreground font-semibold select-none shadow-sm ${dimensionClass} ${className}`}
    >
      <span className="relative tracking-wider font-mono text-muted-foreground">
        {initials}
      </span>
      {resolvedUrl && (
        <AvatarImage
          source={resolvedUrl}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
    </div>
  );
};
