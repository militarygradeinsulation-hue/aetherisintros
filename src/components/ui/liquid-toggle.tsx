import * as React from 'react';
import { cn } from '@/lib/utils';

interface LiquidToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
  label?: string;
  disabled?: boolean;
}

/** Controlled, accessible light/dark gooey switch; no color variants. */
export function LiquidToggle({ checked, onCheckedChange, className, label = 'Dark mode', disabled = false }: LiquidToggleProps) {
  const filterId = React.useId().replace(/:/g, '');
  return (
    <label className={cn('appearance-liquid-toggle', className)} title={checked ? 'Switch to light mode' : 'Switch to dark mode'}>
      <input
        type="checkbox"
        role="switch"
        aria-label={label}
        aria-checked={checked}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onCheckedChange(event.target.checked)}
      />
      <svg viewBox="0 0 52 32" aria-hidden="true" focusable="false">
        <defs>
          <filter id={filterId} x="-30%" y="-40%" width="160%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.9" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
        <g filter={`url(#${filterId})`}>
          <circle className="appearance-liquid-toggle__first" cx="16" cy="16" r="10" style={{ transform: checked ? 'translateX(12px) scale(0)' : 'translateX(0) scale(1)' }} />
          <circle className="appearance-liquid-toggle__second" cx="36" cy="16" r="10" style={{ transform: checked ? 'translateX(0) scale(1)' : 'translateX(-12px) scale(0)' }} />
          <circle className="appearance-liquid-toggle__drop" cx="36" cy="6" r={checked ? 2.5 : 0} />
        </g>
      </svg>
    </label>
  );
}
