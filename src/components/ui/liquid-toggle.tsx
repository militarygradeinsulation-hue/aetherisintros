import { cn } from '@/lib/utils';

interface LiquidToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
  label?: string;
  disabled?: boolean;
}

/** Accessible, controlled theme switch; an explicit button prevents the
 * native blue checkbox/checkmark artifact in the old SVG-filter control. */
export function LiquidToggle({
  checked, onCheckedChange, className, label = 'Dark mode', disabled = false,
}: LiquidToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={checked ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn('appearance-liquid-toggle', className)}
      disabled={disabled}
      data-state={checked ? 'checked' : 'unchecked'}
      onClick={() => onCheckedChange(!checked)}
    >
      <span className="appearance-liquid-toggle__thumb" aria-hidden="true" />
    </button>
  );
}
