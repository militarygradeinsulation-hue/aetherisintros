import { useEffect, useRef, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { getExecutiveBrief } from '@/lib/executive-brief.functions';
import type { Destination, ExecutiveBrief } from '@/aetheris/domain/executive-brief';
import './executive-brief.css';

export function ExecutiveBriefPanel({ onOpen }: { onOpen: (destination: Destination) => void }) {
  const load = useServerFn(getExecutiveBrief);
  const [brief, setBrief] = useState<ExecutiveBrief | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const active = useRef(true);
  const inFlight = useRef(false);
  const lastRead = useRef(0);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const refresh = async () => {
    if (inFlight.current || Date.now() - lastRead.current < 30_000) return;
    inFlight.current = true;
    setBusy(true); setError(false);
    try {
      const next = await load();
      if (active.current) { setBrief(next); lastRead.current = Date.now(); }
    } catch { if (active.current) setError(true); }
    finally { inFlight.current = false; if (active.current) setBusy(false); }
  };
  const gaps = brief?.sources.filter(s => s.state === 'unavailable') ?? [];
  return <section className="exec-brief" aria-label="Private executive brief">
    <header><div><h3>Executive action brief</h3><p>Private, evidence-based next steps from your existing workspace.</p></div>
      <button type="button" className="exec-brief-refresh" onClick={() => void refresh()} disabled={busy}><RefreshCw size={14}/>{busy ? 'Reading…' : brief ? 'Refresh' : 'Generate brief'}</button></header>
    {!brief && !busy && !error && <p className="exec-brief-note">Generated only on request. No AI calls or scheduled scans.</p>}
    {busy && <p role="status">Reading your authorized records…</p>}
    {error && <p role="alert">The brief could not be refreshed. No missing data is treated as zero.{brief ? ' Last successful brief remains below.' : ''}</p>}
    {brief && <div className="exec-brief-content">
      <p className="exec-brief-note">Read {new Date(brief.asOf).toLocaleString()}. Bounded record samples, not complete account totals. Refreshes are limited to once per 30 seconds.</p>
      {gaps.length > 0 && <p role="status">Unavailable sources: {gaps.map(s=>s.key).join(', ')}. Recommendations may be incomplete.</p>}
      {brief.sources.some(s=>s.limited) && <p className="exec-brief-note">More records exist in one or more sources; open the source workspace for the full list.</p>}
      {brief.actions.length ? <ul>{brief.actions.map(a => <li key={a.id}>
        <div><small>{a.urgency.toUpperCase()} · {a.source}</small><strong>{a.title}</strong><p>{a.reason}</p>{a.missingEvidence.length > 0 && <p className="exec-brief-note">Missing: {a.missingEvidence.join(', ')}</p>}</div>
        <button type="button" onClick={() => onOpen(a.destination)} aria-label={'Open ' + a.source + ' workspace for ' + a.title}>Open <ArrowRight size={14}/></button>
      </li>)}</ul> : <p>No actions surfaced in the readable sample. This does not mean every record is current.</p>}
      {brief.moreActions && <p>More actions were identified in the sample. Open the source workspaces to review them.</p>}
      <p className="exec-brief-note">Mindprint: {brief.mindprint === 'available' ? 'approved private baseline available' : brief.mindprint === 'not-recorded' ? 'no approved baseline found' : 'unavailable'}. Memory and relationship evidence remain private; read them directly in Butler when needed.</p>
    </div>}
  </section>;
}
