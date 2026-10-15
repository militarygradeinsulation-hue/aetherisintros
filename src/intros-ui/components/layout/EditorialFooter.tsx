import React from 'react';
import HalftoneWordmarkFooter from '@/aetheris/HalftoneWordmarkFooter';
import { useAppearance } from '@/aetheris/AppearanceMode';
import type { ActivePage } from './TopNavigation';

interface EditorialFooterProps {
  onNavigate: (page: ActivePage) => void;
}

const FOOTER_DESTINATIONS: { label: string; page: ActivePage }[] = [
  { label: 'People', page: 'people' },
  { label: 'Connection Bubbles', page: 'bubbles' },
  { label: 'Introductions', page: 'intros' },
  { label: 'Intelligence', page: 'insights' },
];

export const EditorialFooter: React.FC<EditorialFooterProps> = ({ onNavigate }) => {
  const { theme } = useAppearance();
  return (
  <div className="ix-editorial-signoff mt-14 print:hidden">
    <nav className="ix-editorial-signoff-nav" aria-label="Explore Ask Intros">
      <span>PEOPLE × CONTEXT × OPPORTUNITY</span>
      <div>
        {FOOTER_DESTINATIONS.map(({ label, page }) => (
          <button key={page} type="button" onClick={() => onNavigate(page)}>
            {label}
          </button>
        ))}
      </div>
    </nav>
    <HalftoneWordmarkFooter
      className="ix-halftone-footer"
      wordmark="ask intros"
      label="ASK INTROS / THE RELATIONSHIP NETWORK"
      meta="WHY ME · WHY THEM · WHY NOW"
      height="clamp(380px, 39vw, 480px)"
      dotGap={7}
      radius={82}
      grain={0.28}
      palette={theme === 'dark' ? { background: '#0c0c0b', ink: '#e9e4da', warm: '#e9762b' } : { background: '#efebe3', ink: '#17150f', warm: '#c2361c' }}
    />
  </div>
  );
};
