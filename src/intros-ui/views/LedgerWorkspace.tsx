/* Workspace module navigator matches Absolute Ledger's Operations view while
 * mounting the pre-existing Aetheris feature controllers inside the detail pane.
 */
import type { ReactNode } from 'react';
import { Target, Users } from 'lucide-react';
import { PageHeader } from '@/intros-ui/components/layout/LedgerUiKit';
import { targetFor } from '@/intros-ui/components/layout/workspace-navigation';
import './ledger-workspace.css';

export function LedgerWorkspace({ activeTool, onChange, crmSection = 'crm', onCrmSectionChange, children }: {
  crmSection?: 'crm' | 'pipeline'; onCrmSectionChange?: (section: 'crm' | 'pipeline') => void;
  activeTool: string; onChange: (tool: string) => void; children: ReactNode;
}) {
  const focused = activeTool === 'crm';
  const sections = [{ id: 'crm', label: 'CRM', icon: Users }, { id: 'pipeline', label: 'Pipeline', icon: Target }] as const;
  const activeLabel = focused ? (crmSection === 'pipeline' ? 'Pipeline' : 'CRM') : targetFor('workspace', activeTool)?.label || 'Workspace';
  return <div className="ledger-workspace">
    {focused && <PageHeader eyebrow="Relationships / Revenue" title="CRM & Pipeline"
      description="Manage customer relationships and track opportunities through your pipeline." />}
    <div className={'ledger-workspace-grid' + (focused ? '' : ' ledger-workspace-single')}>
      {focused && <aside className="ledger-workspace-modules" aria-label="CRM and Pipeline navigation">
        <nav aria-label="CRM & Pipeline"><h2>CRM & Pipeline</h2>
          {sections.map(({id, label, icon: Icon}) => <button type="button" key={id}
            className={crmSection === id ? 'active' : ''} aria-current={crmSection === id ? 'page' : undefined}
            onClick={() => onCrmSectionChange?.(id)}><Icon size={16}/><span>{label}</span></button>)}
        </nav>
      </aside>}
      <div className="ledger-workspace-detail">
        <header className="ledger-workspace-heading">
          <div><span className="ledger-workspace-eyebrow">CURRENT MODULE</span>
            <h2>{activeLabel}</h2>
          </div>
          <span className="ledger-workspace-live-tag">ASK INTROS ENGINE</span>
        </header>
        <div className="ledger-workspace-body">{children}</div>
      </div>
    </div>
  </div>;
}
