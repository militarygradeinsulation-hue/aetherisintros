import type { WidgetItem, WidgetSize } from '@/components/ui/widget-board';

export const DASHBOARD_BOARD_KEY = 'ask-intros.dashboard.widgets.v1';
export const BOARD_WIDGETS: WidgetItem[] = [
  { id: 'pipeline', size: 'wide', label: 'Open pipeline' },
  { id: 'network', size: 'wide', label: 'Member network' },
  { id: 'conversations', size: 'sm', label: 'Inbox' },
  { id: 'crm', size: 'sm', label: 'CRM contacts' },
  { id: 'tasks', size: 'sm', label: 'CRM tasks' },
  { id: 'updates', size: 'wide', label: 'Recent CRM activity' },
  { id: 'saved', size: 'sm', label: 'Private library' },
  { id: 'specter', size: 'wide', label: 'Specter Detect' },
];
export interface DashboardBoardLayout { items: WidgetItem[]; locked: boolean }
export function normalizeDashboardBoard(raw: unknown): DashboardBoardLayout {
  const saved = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const entries = Array.isArray(raw) ? raw : Array.isArray(saved['items']) ? saved['items'] : [];
  const found = new Set<string>();
  const items: WidgetItem[] = [];
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    const value = entry as Record<string, unknown>;
    const known = BOARD_WIDGETS.find(item => item.id === value['id']);
    if (!known || found.has(known.id)) continue;
    found.add(known.id);
    const size = ['sm', 'wide', 'tall', 'lg'].includes(String(value['size'])) ? value['size'] as WidgetSize : known.size;
    items.push({ ...known, size });
  }
  // New widgets append; old order, stable IDs and chosen sizes survive upgrades.
  return { items: [...items, ...BOARD_WIDGETS.filter(item => !found.has(item.id)).map(item => ({ ...item }))], locked: typeof saved['locked'] === 'boolean' ? saved['locked'] : true };
}
