// @ts-nocheck
import React from 'react';
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
const PORTRAIT_MAP: Record<string, string> = {
  'marcus lee': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
  'sarah chen': 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
  'elena rossi': 'https://images.unsplash.com/photo-1580489944761-15a19d654952?w=400&auto=format&fit=crop&q=80',
  'daniel kim': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
  'lisa tran': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  'lisa zhang': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  'alex monroe': 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80',
  'alex rivera': 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80',
  'maya patel': 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=400&auto=format&fit=crop&q=80',
  'carlos mendes': 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80',
  'nina park': 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
  'nina vance': 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
  'priya desai': 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
  'james okafor': 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80',
  'julian vance': 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&auto=format&fit=crop&q=80',
  'claire thorne': 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
  'david sterling': 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop&q=80',
  'sophia moreau': 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&auto=format&fit=crop&q=80',
  'michael chang': 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80',
  'rachel adams': 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
  'tariq al-mansoor': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
  'henrik lindqvist': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
};

/**
 * Resolves the portrait for a person: their real photo when one is on file
 * (direct URL or private storage object), otherwise a demo-character match,
 * otherwise '' — callers must show initials, never a stock photo.
 */
export function getPortraitForName(name: string, explicitUrl?: string): string {
  const explicit = (explicitUrl || '').trim();
  if (explicit) return explicit;
  const lower = (name || '').toLowerCase().trim();
  if (PORTRAIT_MAP[lower]) return PORTRAIT_MAP[lower];

  for (const [key, url] of Object.entries(PORTRAIT_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return url;
  }

  // No real photo and no demo match — return empty so the caller renders initials.
  return '';
}

export const ExecutivePortrait: React.FC<ExecutivePortraitProps> = ({
  name,
  avatarUrl,
  className = '',
  size = 'md',
  showBackdropDetails = false,
}) => {
  // Only the person's real photo (or an explicit demo-character match) — never an invented fallback.
  const resolvedUrl = (avatarUrl && String(avatarUrl).trim()) || getPortraitForName(name);

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

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full border border-white/20 bg-gradient-to-br from-[#1C2230] to-[#0A0D14] flex items-center justify-center text-[#F2EEE6] font-semibold select-none shadow-sm ${dimensionClass} ${className}`}
    >
      <span className="relative z-10 tracking-wider font-mono text-white/90">
        {initials}
      </span>
      {resolvedUrl && (
        <AvatarImage
          source={resolvedUrl}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover grayscale contrast-110 brightness-95"
        />
      )}
    </div>
  );
};
