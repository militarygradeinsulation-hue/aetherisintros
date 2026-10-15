import * as React from 'react';
import { cn } from '@/lib/utils';

export interface GradientButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Keep dimensions responsive by default; override for a specific layout. */
  width?: string;
  height?: string;
}

/**
 * Ask Intros signature action button.
 * Preserves real native button behavior, keyboard, disabled state and forms.
 * The rotating gradient is CSS-only with a reduced-motion fallback.
 */
export const GradientButton = React.forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({ children, width, height, className, style, type = 'button', ...props }, ref) => (
    <button
      {...props}
      ref={ref}
      type={type}
      className={cn('ai-gradient-button', className)}
      style={{ ...style, ...(width ? { width } : {}), ...(height ? { height } : {}) }}
    >
      <span className="ai-gradient-button__content">{children}</span>
    </button>
  ),
);
GradientButton.displayName = 'GradientButton';

export default GradientButton;
