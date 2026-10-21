import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type AppearanceMode = 'light' | 'dark';
const STORAGE_KEY = 'ask-intros.appearance';
type AppearanceValue = {
  theme: AppearanceMode;
  setTheme: (next: AppearanceMode) => void;
  toggleTheme: () => void;
};
const AppearanceContext = createContext<AppearanceValue | null>(null);

function readAppearance(): AppearanceMode {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    // Preserve an existing user's home preference when migrating to one setting.
    const previous = window.localStorage.getItem('aetheris.home.theme');
    if (previous === 'light' || previous === 'dark') return previous;
  } catch { /* Browser may block storage. */ }
  return 'dark';
}

function applyAppearance(theme: AppearanceMode) {
  const root = document.documentElement;
  root.dataset['theme'] = theme;
  root.classList.toggle('dark', theme === 'dark');
  root.classList.toggle('light', theme === 'light');
  root.style.colorScheme = theme;
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  // New visitors start on the dark intelligence baseline; explicit saved choices still win.
  const [theme, setThemeState] = useState<AppearanceMode>('dark');
  useEffect(() => {
    const restored = readAppearance();
    setThemeState(restored);
    applyAppearance(restored);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const next = readAppearance();
      setThemeState(next);
      applyAppearance(next);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setTheme = useCallback((next: AppearanceMode) => {
    setThemeState(next);
    applyAppearance(next);
    try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* Storage optional. */ }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [setTheme, theme]);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);
  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  const value = useContext(AppearanceContext);
  if (!value) throw new Error('useAppearance must be used inside AppearanceProvider');
  return value;
}
