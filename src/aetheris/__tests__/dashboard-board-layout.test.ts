import { describe, expect, it } from 'vitest';
import { BOARD_WIDGETS, normalizeDashboardBoard } from '@/intros-ui/views/dashboard-board-layout';

describe('Dashboard board preferences', () => {
  it('preserves chosen order and sizes, discards duplicates, and appends new widgets', () => {
    const result = normalizeDashboardBoard({ locked: false, items: [{ id: 'saved', size: 'lg' }, { id: 'pipeline', size: 'tall' }, { id: 'saved', size: 'sm' }, { id: 'removed-widget', size: 'wide' }] });
    expect(result.locked).toBe(false);
    expect(result.items.slice(0, 2).map(item => [item.id, item.size])).toEqual([['saved', 'lg'], ['pipeline', 'tall']]);
    expect(result.items).toHaveLength(BOARD_WIDGETS.length);
    expect(new Set(result.items.map(item => item.id)).size).toBe(BOARD_WIDGETS.length);
  });
  it('reuses known former board IDs and never restores arbitrary labels or malformed sizes', () => {
    const result = normalizeDashboardBoard([{ id: 'updates', size: 'wide', label: 'Private previous member name' }, { id: 'network', size: 'broken' }]);
    expect(result.items[0]).toEqual({ id: 'updates', size: 'wide', label: 'Recent CRM activity' });
    expect(result.items[1]?.size).toBe('lg');
    expect(result.locked).toBe(true);
    expect(JSON.stringify(result)).not.toContain('Private previous member name');
  });
  it('keeps a previously saved compact network card after the larger default is added', () => {
    expect(normalizeDashboardBoard({ items: [{ id: 'network', size: 'wide' }] }).items[0]?.size).toBe('wide');
  });
  it('recovers malformed preferences with a locked, complete board', () => {
    for (const input of [null, 'invalid', { locked: 'false', items: {} }, [null, 4, {}]]) {
      expect(normalizeDashboardBoard(input)).toEqual({ items: BOARD_WIDGETS, locked: true });
    }
  });
});
