/* Workspace module navigator matches Absolute Ledger's Operations view while
 * mounting the pre-existing Aetheris feature controllers inside the detail pane.
 */
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Brain, BriefcaseBusiness, CalendarDays, FileText, Handshake, Layers,
  LayoutGrid, Network, Package, Settings, Sparkles, Target, Users } from 'lucide-react';
import { PageHeader } from '@/intros-ui/components/layout/LedgerUiKit';
import { MEMBER_TOOL_DESTINATIONS } from '@/intros-ui/components/layout/AetherisWorkspaceShell';
import './ledger-workspace.css';

const GROUPS: Array<{ title: string; modules: [string, string, LucideIcon][] }> = [
  { title: 'Revenue', modules: [
    ['crm','CRM',Target],['deals','Deals',Handshake],['workspaces','Workspaces',BriefcaseBusiness],
    ['opportunities','Opportunities',Sparkles],['executivework','Workbench',LayoutGrid],
    ['providers','Providers',Users],
  ] },
  { title: 'Intelligence & assets', modules: [
    ['needs','Needs',FileText],['pocket','Private library',Package],['diagnostic','Company report',Brain],
    ['memory','Memory',Brain],['companies','Companies',Target],['grid','Planning grid',LayoutGrid],
  ] },
  { title: 'Collaboration', modules: [
    ['calendar','Calendar',CalendarDays],['peergroups','Peer groups',Network],
    ['circles','Circles',Users],['events','Events',CalendarDays],
  ] },
  { title: 'Admin', modules: [['profile','My profile',Users],['preferences','Settings',Settings]] },
];
// Preserve every real Ask Intros tool introduced after Bridge was branched.
// Each target originates in the production workspace registry and is handled
// by the existing AetherisAppSurface and its authenticated data providers.
const alreadyListed = new Set(GROUPS.flatMap(group => group.modules.map(([id]) => id)));
const additional = MEMBER_TOOL_DESTINATIONS
  .filter(item => item.workspace && !alreadyListed.has(item.workspace))
  .map(item => [item.workspace!, item.label, item.icon] as [string, string, LucideIcon]);
if (additional.length) GROUPS.push({ title: 'More tools', modules: additional });
// Alphabetize module options inside each CRM section on every viewport.
for (const group of GROUPS) {
  group.modules.sort((a, b) => a[1].localeCompare(b[1], 'en', { sensitivity: 'base' }));
}

export function LedgerWorkspace({ activeTool, onChange, crmSection = 'crm', onCrmSectionChange, children }: {
  crmSection?: 'crm' | 'pipeline'; onCrmSectionChange?: (section: 'crm' | 'pipeline') => void;
  activeTool: string; onChange: (tool: string) => void; children: ReactNode;
}) {
  const focused = activeTool === 'crm';
  const groups = focused ? [{ title: 'CRM & Pipeline', modules: [['crm', 'CRM', Users], ['pipeline', 'Pipeline', Target]] as [string, string, LucideIcon][] }] : GROUPS;
  const selectedTool = focused ? crmSection : activeTool;
  const active = groups.flatMap(g=>g.modules).find(module=>module[0]===selectedTool);
  return <div className="ledger-workspace">
    <PageHeader eyebrow={focused ? "Relationships / Revenue" : "Workspace / Operations"} title={focused ? "CRM & Pipeline" : "Business Workspaces"}
      description={focused ? "Manage customer relationships and track opportunities through your pipeline." : "Manage your relationships, opportunities, projects and evidence from one connected operating system."} />
    <div className="ledger-workspace-grid">
      <aside className="ledger-workspace-modules" aria-label={focused ? "CRM and Pipeline navigation" : "Business workspace modules"}>
        {groups.map(group=><nav key={group.title} aria-label={group.title}>
          <h2>{group.title}</h2>
          {group.modules.map(([id,label,Icon])=><button type="button" key={id}
            className={selectedTool===id?'active':''} aria-current={selectedTool===id?'page':undefined}
            onClick={()=>focused ? onCrmSectionChange?.(id as 'crm' | 'pipeline') : onChange(id)}><Icon size={16}/><span>{label}</span></button>)}
        </nav>)}
      </aside>
      <div className="ledger-workspace-detail">
        <header className="ledger-workspace-heading">
          <div><span className="ledger-workspace-eyebrow">CURRENT MODULE</span>
            <h2>{active?.[1] || 'Workspace'}</h2>
          </div>
          <span className="ledger-workspace-live-tag">ASK INTROS ENGINE</span>
        </header>
        <div className="ledger-workspace-body">{children}</div>
      </div>
    </div>
  </div>;
}
