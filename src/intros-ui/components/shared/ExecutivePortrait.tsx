// @ts-nocheck
import React from 'react';
import { AvatarImage } from '@/aetheris/avatar';
import { MemberThumbnail } from './MemberThumbnail';
import { memberPhotoSource } from '@/aetheris/member-media';

interface ExecutivePortraitProps {
  name: string;
  avatarUrl?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  showBackdropDetails?: boolean;
}

/** Only an explicit member photo is a portrait; names never resolve to unrelated faces. */
export function getPortraitForName(_name: string, explicitUrl?: string): string {
  return memberPhotoSource(explicitUrl);
}

export const ExecutivePortrait: React.FC<ExecutivePortraitProps> = ({
  name,
  avatarUrl,
  className = '',
  size = 'md',
  showBackdropDetails = false,
}) => {
  // Only the person's real photo (or an explicit demo-character match) — never an invented fallback.
  const resolvedUrl = getPortraitForName(name, avatarUrl);

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
        <div className={`relative w-full h-full ${resolvedUrl ? 'min-h-[380px]' : 'min-h-[120px]'} flex items-center justify-center`}>
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
              className="absolute inset-0 w-full h-full object-cover grayscale contrast-125 brightness-90 filter transition-transform duration-700 hover:scale-105"
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

  return <MemberThumbnail name={name} source={resolvedUrl} className={`${dimensionClass} ${className}`}/>;
};
