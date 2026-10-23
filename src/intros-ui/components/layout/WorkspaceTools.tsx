import { useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import type { MemberWorkspace } from '@/aetheris/workspace-destinations';

export const WORKSPACE_TOOLS: { id: MemberWorkspace; label: string; group: string }[] = [
  { id: 'crm', label: 'CRM', group: 'Relationships' },
  { id: 'companies', label: 'Companies', group: 'Relationships' },
  { id: 'referrals', label: 'Referrals', group: 'Relationships' },
  { id: 'peergroups', label: 'Peer groups', group: 'Relationships' },
  { id: 'circles', label: 'Circles', group: 'Relationships' },
  { id: 'grid', label: 'Grid', group: 'Relationships' },
  { id: 'business-lobby', label: 'Business Lobby', group: 'Business' },
  { id: 'opportunity-exchange', label: 'Opportunity Exchange', group: 'Business' },
  { id: 'needs', label: 'Needs', group: 'Business' },
  { id: 'opportunities', label: 'Opportunities', group: 'Business' },
  { id: 'deals', label: 'Deals', group: 'Business' },
  { id: 'workspaces', label: 'Private deal workspaces', group: 'Business' },
  { id: 'executivework', label: 'Executive Workbench', group: 'Business' },
  { id: 'providers', label: 'Trusted Providers', group: 'Business' },
  { id: 'marketplace-pilot', label: 'Marketplace pilot', group: 'Business' },
  { id: 'capital', label: 'Capital & advisory', group: 'Business' },
  { id: 'expertise', label: 'Expertise', group: 'Business' },
  { id: 'talent', label: 'Talent', group: 'Business' },
  { id: 'outcomes', label: 'Outcomes', group: 'Business' },
  { id: 'memory', label: 'Memory', group: 'Planning' },
  { id: 'pocket', label: 'Private Library & Blueprints', group: 'Planning' },
  { id: 'calendar', label: 'Calendar', group: 'Planning' },
  { id: 'events', label: 'Events', group: 'Planning' },
  { id: 'briefing', label: 'Meeting briefing', group: 'Planning' },
  { id: 'diagnostic', label: 'Company report', group: 'Planning' },
  { id: 'intelrooms', label: 'Intelligence rooms', group: 'Planning' },
  { id: 'knowledgeassets', label: 'Knowledge assets', group: 'Planning' },
  { id: 'vault', label: 'Vault', group: 'Planning' },
  { id: 'passport', label: 'Passport & track record', group: 'Account' },
  { id: 'profile', label: 'My profile', group: 'Account' },
  { id: 'membership', label: 'Membership', group: 'Account' },
  { id: 'membership-upgrade', label: 'Executive membership', group: 'Account' },
  { id: 'integrations', label: 'Integrations', group: 'Account' },
  { id: 'consent', label: 'Consent & privacy', group: 'Account' },
  { id: 'preferences', label: 'Settings', group: 'Account' },
];

/** Navigation only: each destination keeps its canonical component and access gate. */
export function WorkspaceTools({ active, onNavigate }: { active: string; onNavigate: (id: MemberWorkspace) => void }) {
  const [query, setQuery] = useState('');
  const details = useRef<HTMLDetailsElement>(null);
  const summary = useRef<HTMLElement>(null);
  const label = WORKSPACE_TOOLS.find(tool => tool.id === active)?.label ?? 'Member tools';
  const matches = WORKSPACE_TOOLS.filter(tool => `${tool.label} ${tool.group}`.toLowerCase().includes(query.trim().toLowerCase()));
  const close = () => { if (details.current) details.current.open = false; setQuery(''); summary.current?.focus(); };
  return <details className="ix-tools ix-workspace-tools" ref={details} onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); close(); }
  }} onToggle={event => { if (!event.currentTarget.open) setQuery(''); }}>
    <summary ref={summary}><span><small>MEMBER TOOLS</small><strong>{label}</strong></span><span className="ix-tools-browse">Browse tools <ChevronDown size={16} /></span></summary>
    <div className="ix-tool-picker">
      <label className="ix-tool-search"><Search size={16} /><span className="sr-only">Find a member tool</span><input type="search" placeholder="Find a tool…" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <nav aria-label="All member tools">
        {['Relationships', 'Business', 'Planning', 'Account'].map(group => {
          const tools = matches.filter(tool => tool.group === group);
          return tools.length > 0 && <section key={group}><h2>{group}</h2>{tools.map(tool => <button type="button" key={tool.id} data-tool-id={tool.id} className={active === tool.id ? 'on' : ''} aria-current={active === tool.id ? 'page' : undefined} onClick={() => { onNavigate(tool.id); close(); }}>{tool.label}</button>)}</section>;
        })}
      </nav>
      {!matches.length && <p role="status">No tools match “{query}”. Try another name.</p>}
    </div>
  </details>;
}
