import { describe, expect, it } from 'vitest';
import { ACCOUNT_SECTIONS, PRIMARY_NAV_GROUPS, SEARCH_DESTINATIONS, WORKSPACE_DESTINATIONS, destinationFor, targetMatches } from '@/intros-ui/components/layout/workspace-navigation';
import { MEMBER_TOOL_DESTINATIONS } from '@/intros-ui/components/layout/AetherisWorkspaceShell';

describe('consolidated navigation preserves production destinations', () => {
  it('provides ten main destinations with account administration outside the primary menu', () => {
    expect(WORKSPACE_DESTINATIONS).toHaveLength(10);
    expect(new Set(WORKSPACE_DESTINATIONS.map(d => d.id)).size).toBe(10);
    for (const section of ACCOUNT_SECTIONS) expect(destinationFor('workspace', section.tool)).toBeUndefined();
    for (const group of PRIMARY_NAV_GROUPS) {
      const labels = group.items.map(t => t.label);
      expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)));
    }
  });
  it('retains every production tool in a section or the account menu and command search', () => {
    const targets = [...WORKSPACE_DESTINATIONS, ...WORKSPACE_DESTINATIONS.flatMap(d => d.sections), ...ACCOUNT_SECTIONS];
    for (const production of MEMBER_TOOL_DESTINATIONS) {
      expect(targets.some(t => t.tool === production.workspace), production.label).toBe(true);
      expect(SEARCH_DESTINATIONS.some(t => t.tool === production.workspace), production.label).toBe(true);
    }
  });
  it('keeps parent navigation selected for child pages, old tool links, and member profiles', () => {
    expect(destinationFor('bubbles')?.id).toBe('introductions');
    expect(destinationFor('profile')?.id).toBe('network');
    expect(destinationFor('specter')?.id).toBe('intelligence');
    expect(destinationFor('workspace', 'briefing')?.id).toBe('meetings');
    expect(destinationFor('workspace', 'providers')?.id).toBe('work');
    expect(destinationFor('workspace', 'memory')?.id).toBe('introductions');
    expect(destinationFor('news')?.id).toBe('dashboard');
  });
  it('keeps deal systems and library permissions behind their original distinct controllers', () => {
    expect(WORKSPACE_DESTINATIONS.find(d => d.id === 'deals')!.sections.map(t => t.tool)).toEqual(['deals', 'workspaces']);
    expect(WORKSPACE_DESTINATIONS.find(d => d.id === 'library')!.sections.map(t => t.tool || t.page)).toEqual(['pocket', 'knowledgeassets', 'vault']);
    expect(WORKSPACE_DESTINATIONS.find(d => d.id === 'crm')!.sections).toEqual([]);
    expect(targetMatches(ACCOUNT_SECTIONS.find(t => t.tool === 'profile')!, 'profile')).toBe(false);
  });
});
