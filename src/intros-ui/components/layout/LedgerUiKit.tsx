/* Native Ask Intros counterparts of absolute-ledger-flow/src/components/app/ui-kit.tsx.
 * Panel -> action -> real Bridge controller, never CRM fixture data.
 */
import type { ReactNode } from 'react';

export function PageHeader({ eyebrow, title, description, actions }: {
  eyebrow?: string; title: string; description?: string; actions?: ReactNode;
}) {
  return <header className="ledger-ui-page-header">
    <div>
      {eyebrow && <p className="ledger-ui-eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      {description && <p className="ledger-ui-description">{description}</p>}
    </div>
    {actions && <div className="ledger-ui-header-actions">{actions}</div>}
  </header>;
}
export function Panel({ title, subtitle, action, children, className = '', bodyClassName = '' }: {
  title?: string; subtitle?: string; action?: ReactNode;
  children: ReactNode; className?: string; bodyClassName?: string;
}) {
  return <section className={'ledger-ui-panel ' + className}>
    {title && <header className="ledger-ui-panel-heading">
      <div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}
    </header>}
    <div className={'ledger-ui-panel-body ' + bodyClassName}>{children}</div>
  </section>;
}
export function StatCard({ label, value, hint, icon, onClick }: {
  label: string; value: string; hint?: string; icon?: ReactNode; onClick?: () => void;
}) {
  const inside = <><div className="ledger-ui-stat-title"><span>{label}</span>{icon}</div>
    <strong>{value}</strong>{hint && <p>{hint}</p>}</>;
  return onClick
    ? <button type="button" className="ledger-ui-stat ledger-ui-stat-action" onClick={onClick}>{inside}</button>
    : <article className="ledger-ui-stat">{inside}</article>;
}
