import { Moon, Sun } from 'lucide-react';
import { LiquidToggle } from '@/components/ui/liquid-toggle';
import { useAppearance } from './AppearanceMode';

/** One appearance choice for every Ask Intros surface. */
export function AppearanceToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useAppearance();
  const dark = theme === 'dark';
  return (
    <div className={`appearance-switcher ${className}`} aria-label="Appearance setting">
      <Sun size={15} aria-hidden="true" />
      <LiquidToggle checked={dark} onCheckedChange={(next) => setTheme(next ? 'dark' : 'light')} label="Dark mode" />
      <Moon size={15} aria-hidden="true" />
      <span className="appearance-switcher__label">{dark ? 'Dark' : 'Light'}</span>
    </div>
  );
}
