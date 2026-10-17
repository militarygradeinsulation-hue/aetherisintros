import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const bootstrap = readFileSync(new URL('../../../public/appearance-init.js', import.meta.url), 'utf8');
const initialize = (saved: string | null, legacy: string | null, storageAvailable = true) => {
  const classes = new Set<string>();
  const root = {
    dataset: {} as Record<string, string>,
    style: {} as Record<string, string>,
    classList: {
      toggle(name: string, enabled: boolean) {
        if (enabled) classes.add(name);
        else classes.delete(name);
      },
    },
  };
  runInNewContext(bootstrap, {
    window: {
      localStorage: {
        getItem(key: string) {
          if (!storageAvailable) throw new Error('blocked');
          return key === 'ask-intros.appearance' ? saved : legacy;
        },
      },
    },
    document: { documentElement: root },
  });
  return { theme: root.dataset['theme'], colorScheme: root.style['colorScheme'], classes };
};

describe('Ask Intros initial appearance', () => {
  it('defaults to dark for first-time visitors', () => {
    const result = initialize(null, null);
    expect(result.theme).toBe('dark');
    expect(result.colorScheme).toBe('dark');
    expect(result.classes.has('dark')).toBe(true);
    expect(result.classes.has('light')).toBe(false);
  });
  it('retains an explicit light-mode preference', () => {
    const result = initialize('light', null);
    expect(result.theme).toBe('light');
    expect(result.classes.has('light')).toBe(true);
  });
  it('prefers the current setting over a legacy setting', () => {
    expect(initialize('dark', 'light').theme).toBe('dark');
    expect(initialize('light', 'dark').theme).toBe('light');
  });
  it('preserves a previous light-mode choice during migration', () => {
    expect(initialize(null, 'light').theme).toBe('light');
  });
  it('defaults to dark when local storage is blocked or invalid', () => {
    expect(initialize(null, null, false).theme).toBe('dark');
    expect(initialize('invalid', 'invalid').theme).toBe('dark');
  });
});
