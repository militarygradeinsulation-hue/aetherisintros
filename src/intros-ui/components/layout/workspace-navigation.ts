import type { LucideIcon } from 'lucide-react';
import { Brain, BriefcaseBusiness, CalendarDays, ContactRound, FileText, Handshake, House, LayoutGrid, MessageSquare, Network, Newspaper, Radar, Settings, ShieldCheck, Sparkles, Target, UserRound, Users, Bookmark, Lock, Plug, CreditCard } from 'lucide-react';
import type { ActivePage } from './TopNavigation';
import { MEMBER_TOOL_DESTINATIONS } from './AetherisWorkspaceShell';

export type NavigationTarget = { label: string; page: ActivePage; icon: LucideIcon; tool?: string; secondary?: boolean };
export type NavigationDestination = NavigationTarget & { id: string; group: string; sections: NavigationTarget[] };
const tool = (label: string, id: string, icon: LucideIcon, secondary = false): NavigationTarget => ({ label, page: 'workspace', tool: id, icon, secondary });
const page = (label: string, id: ActivePage, icon: LucideIcon): NavigationTarget => ({ label, page: id, icon });

export const ACCOUNT_SECTIONS: NavigationTarget[] = [
  tool('My profile', 'profile', UserRound), tool('Track Record & Passport', 'passport', ShieldCheck),
  tool('Membership', 'membership', CreditCard), tool('Preferences', 'preferences', Settings),
  tool('Integrations', 'integrations', Plug), tool('Consent & Privacy', 'consent', Lock),
].sort((a, b) => a.label.localeCompare(b.label));

// Navigation groups existing controllers; it never combines their data or permissions.
export const WORKSPACE_DESTINATIONS: NavigationDestination[] = [
  { ...page('Dashboard', 'home', House), id: 'dashboard', group: 'Overview', sections: [page('Dashboard', 'home', House), page('Business news', 'news', Newspaper)] },
  { ...page('Network', 'people', Users), id: 'network', group: 'Relationships', sections: [page('People & contacts', 'people', ContactRound), tool('Circles', 'circles', Users), tool('Peer groups', 'peergroups', Users), tool('Companies', 'companies', BriefcaseBusiness), tool('Relationship grid', 'grid', LayoutGrid)] },
  { ...page('Ask Intros', 'intros', Handshake), id: 'introductions', group: 'Relationships', sections: [page('Introductions', 'intros', Handshake), page('Live Signal Radar', 'bubbles', Radar), page('Memory', 'memory', Brain), tool('Referral Engine', 'referrals', Network), tool('Referral Settlement', 'settlements', Handshake)] },
  { ...page('Messages', 'messages', MessageSquare), id: 'messages', group: 'Relationships', sections: [] },
  { ...page('Meetings', 'meetings', CalendarDays), id: 'meetings', group: 'Relationships', sections: [page('Meetings', 'meetings', CalendarDays), tool('Calendar', 'calendar', CalendarDays), tool('Events', 'events', CalendarDays), tool('Meeting Briefing', 'briefing', FileText), tool('Business Lobby', 'business-lobby', Users)] },
  { ...tool('CRM & Pipeline', 'crm', Target), id: 'crm', group: 'Revenue & work', sections: [] },
  { ...tool('Deals & Workspaces', 'deals', Handshake), id: 'deals', group: 'Revenue & work', sections: [tool('Deal Rooms', 'deals', Handshake), tool('Private Workspaces', 'workspaces', LayoutGrid)] },
  { ...page('Intelligence', 'insights', Sparkles), id: 'intelligence', group: 'Overview', sections: [page('Network intelligence', 'insights', Sparkles), page('Member Intelligence', 'intelligence', ShieldCheck), page('Specter Detect', 'specter', Radar), tool('Company Diagnostics', 'diagnostic', FileText), tool('Benchmark Pools', 'benchmarks', FileText), tool('Intelligence Rooms', 'intelrooms', Brain)] },
  { ...page('My Work', 'work', BriefcaseBusiness), id: 'work', group: 'Revenue & work', sections: [page('My Work', 'work', BriefcaseBusiness), tool('Needs & Offers', 'needs', FileText), tool('Opportunities', 'opportunities', Target), tool('Opportunity Exchange', 'opportunity-exchange', Handshake), tool('Business Tools', 'executivework', LayoutGrid), tool('Capacity Exchange', 'capacity', BriefcaseBusiness), tool('Trusted Providers', 'providers', Users, true), tool('Marketplace Pilot', 'marketplace-pilot', Target, true), tool('Capital & Advisory', 'capital', BriefcaseBusiness, true), tool('Expertise & Talent', 'expertise', Users, true)] },
  { ...tool('Library', 'pocket', Bookmark), id: 'library', group: 'Library', sections: [tool('Private Library', 'pocket', Bookmark), tool('Knowledge Assets', 'knowledgeassets', FileText), tool('Private Vault', 'vault', Lock)] },
];

const known = new Set([...WORKSPACE_DESTINATIONS.flatMap(d => [d, ...d.sections]), ...ACCOUNT_SECTIONS].map(t => t.tool || t.page));
// Future production tools retain a discoverable home instead of disappearing.
const extraTools = MEMBER_TOOL_DESTINATIONS.filter(t => t.workspace && !known.has(t.workspace));
WORKSPACE_DESTINATIONS.find(d => d.id === 'work')!.sections.push(...extraTools.map(t => tool(t.label, t.workspace!, t.icon, true)));

export function targetMatches(target: NavigationTarget, activePage: ActivePage, activeTool?: string) {
  return target.tool ? activePage === 'workspace' && activeTool === target.tool
    : activePage === target.page || activePage === 'workspace' && activeTool === target.page;
}
export function destinationFor(activePage: ActivePage, activeTool?: string): NavigationDestination | undefined {
  if (activePage === 'profile') return WORKSPACE_DESTINATIONS.find(d => d.id === 'network');
  return WORKSPACE_DESTINATIONS.find(d => targetMatches(d, activePage, activeTool) || d.sections.some(t => targetMatches(t, activePage, activeTool)));
}
export function targetFor(activePage: ActivePage, activeTool?: string) {
  return [...WORKSPACE_DESTINATIONS.flatMap(d => [...d.sections, d]), ...ACCOUNT_SECTIONS].find(t => targetMatches(t, activePage, activeTool));
}
export const PRIMARY_NAV_GROUPS = ['Overview', 'Relationships', 'Revenue & work', 'Library'].map(title => ({ title, items: WORKSPACE_DESTINATIONS.filter(d => d.group === title).sort((a, b) => a.label.localeCompare(b.label)) }));
const searchable = [...WORKSPACE_DESTINATIONS, ...WORKSPACE_DESTINATIONS.flatMap(d => d.sections), ...ACCOUNT_SECTIONS];
export const SEARCH_DESTINATIONS = searchable.filter((t, i) => searchable.findIndex(s => s.label === t.label && s.page === t.page && s.tool === t.tool) === i);
