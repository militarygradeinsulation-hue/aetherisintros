import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight } from 'lucide-react';
import { useAetherisNews, newsAge } from '@/aetheris/news';
import { Panel } from '../components/layout/LedgerUiKit';

/** Reuses the canonical publisher feed and its shared cache in both views. */
export function DashboardNewsTile({ social, onOpen }: { social: boolean; onOpen: () => void }) {
  const { data, isPending, isError, refetch } = useAetherisNews();
  const [socialSlot, setSocialSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!social) { setSocialSlot(null); return; }
    const rail = document.querySelector('.ledger-dashboard .commons-rail');
    if (!rail) return;
    const slot = document.createElement('div');
    slot.className = 'dashboard-news-slot';
    rail.prepend(slot);
    setSocialSlot(slot);
    return () => { slot.remove(); };
  }, [social]);
  const items = (data?.items ?? []).slice(0, 5);
  const tile = <Panel className="dashboard-news-tile" title="News feed" subtitle="Latest publisher headlines"
    action={<button type="button" className="ledger-ui-link" onClick={onOpen}>All news <ArrowRight size={13}/></button>}
    bodyClassName="dashboard-news-list">
    {items.map(item => <button key={item.id} type="button" onClick={onOpen} className="dashboard-news-story">
      <span>{item.source} · {newsAge(item.published)}</span><strong>{item.title}</strong>
    </button>)}
    {!items.length && <p role="status">{isPending ? 'Loading headlines…' : isError ? 'Headlines are unavailable right now.' : 'No headlines available yet.'}</p>}
    {isError && <button type="button" className="ledger-ui-link" onClick={() => void refetch()}>Retry headlines</button>}
  </Panel>;
  return social && socialSlot ? createPortal(tile, socialSlot) : tile;
}
