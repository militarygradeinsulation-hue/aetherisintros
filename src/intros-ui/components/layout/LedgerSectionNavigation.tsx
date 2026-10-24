import { useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { ExpandingTabs, type ExpandingTabItem } from '@/components/ui/expanding-tabs';
import type { ActivePage } from './TopNavigation';
import { ACCOUNT_SECTIONS, destinationFor, targetMatches, type NavigationTarget } from './workspace-navigation';

export function LedgerSectionNavigation({ activePage, activeTool, onSelect }: { activePage: ActivePage; activeTool?: string | undefined; onSelect: (target: NavigationTarget) => void }) {
  const destination = destinationFor(activePage, activeTool);
  const isAccount = ACCOUNT_SECTIONS.some(t => targetMatches(t, activePage, activeTool));
  const sections = isAccount ? ACCOUNT_SECTIONS : destination?.sections || [];
  const detailsRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => { if (detailsRef.current) detailsRef.current.open = false; }, [activePage, activeTool]);
  if (sections.length < 2) return null;
  const name = isAccount ? 'Account' : destination!.label;
  const render = (target: NavigationTarget) => <button key={target.tool || target.page} type="button" aria-current={targetMatches(target, activePage, activeTool) ? 'page' : undefined}
    onClick={() => onSelect(target)}><target.icon size={16} aria-hidden="true"/><span>{target.label}</span></button>;
  const primary = sections.filter(t => !t.secondary);
  const tabs: ExpandingTabItem[] = primary.map((target, index) => ({
    id: (target.tool || target.page) + '-' + index, label: target.label, icon: target.icon,
  }));
  const selected = primary.findIndex(t => targetMatches(t, activePage, activeTool));
  const secondary = sections.filter(t => t.secondary);
  return <section className="ledger-section-navigation" data-destination={isAccount ? 'account' : destination!.id} aria-label={`${name} sections`}>
    <p className="ledger-section-title">{name}</p>
    <nav className="ledger-section-options ledger-section-expanding" aria-label={`${name} pages`}>
      <ExpandingTabs items={tabs} mode="navigation" ariaLabel={`${name} pages`}
        value={selected >= 0 ? tabs[selected]?.id : ''}
        onValueChange={id => { const index = tabs.findIndex(item => item.id === id); if (index >= 0 && primary[index]) onSelect(primary[index]); }} />
    </nav>
    {secondary.length > 0 && <details ref={detailsRef} className="ledger-section-more">
      <summary>More work tools <ChevronDown size={14} aria-hidden="true"/></summary>
      <nav className="ledger-section-options" aria-label="Specialized work tools">{secondary.map(render)}</nav>
    </details>}
  </section>;
}
