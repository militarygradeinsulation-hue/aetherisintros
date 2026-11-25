import { useEffect, useRef, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { getExecutiveBrief } from '@/lib/executive-brief.functions';
import { approveBriefTask } from '@/lib/reviewed-business-actions.functions';
import { briefTaskPreview } from '@/aetheris/domain/reviewed-business-actions';
import { supabase } from '@/integrations/supabase/client';
import { useOps } from '@/aetheris/crm/store';
import type { Destination, ExecutiveBrief } from '@/aetheris/domain/executive-brief';
import './executive-brief.css';

export function ExecutiveBriefPanel({ onOpen }: { onOpen: (destination: Destination) => void }) {
  const load = useServerFn(getExecutiveBrief);
  const saveTask = useServerFn(approveBriefTask);
  const ops = useOps();
  const [review,setReview] = useState<{owner:string;preview:NonNullable<ReturnType<typeof briefTaskPreview>>}|null>(null);
  const [receipt,setReceipt] = useState('');
  const [saveError,setSaveError] = useState('');
  const [saving,setSaving] = useState(false);
  const saveLock=useRef(false);
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
    setBusy(true); setError(false); setReview(null);
    try {
      const next = await load();
      if (active.current) { setBrief(next); lastRead.current = Date.now(); }
    } catch { if (active.current) setError(true); }
    finally { inFlight.current = false; if (active.current) setBusy(false); }
  };
  const prepare=async(preview:NonNullable<ReturnType<typeof briefTaskPreview>>)=>{
    if(saveLock.current)return;
    setReceipt('');setSaveError('');
    const {data,error}=await supabase.auth.getUser();
    if(!active.current)return;
    if(error||!data.user){setSaveError('Sign in again before approving an action.');return;}
    setReview({owner:data.user.id,preview});
  };
  const approve=async()=>{
    if(!review||saveLock.current)return;
    saveLock.current=true;setSaving(true);setSaveError('');setReceipt('');
    try{
      const result=await saveTask({data:{owner:review.owner,approved:true,source:review.preview.source,recordId:review.preview.recordId,reviewedText:review.preview.detail}});
      if(active.current){setReceipt(result.receipt);setReview(null);void ops.refresh().catch(()=>{});}
    }catch(e){if(active.current)setSaveError(e instanceof Error?e.message:'Task save was not confirmed.');}
    finally{saveLock.current=false;if(active.current)setSaving(false);}
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
        <div className="exec-brief-row-actions"><button type="button" onClick={() => onOpen(a.destination)} aria-label={'Open ' + a.source + ' workspace for ' + a.title}>Open <ArrowRight size={14}/></button>
        {briefTaskPreview(a)&&<button type="button" disabled={saving} onClick={()=>{const draft=briefTaskPreview(a);if(draft)void prepare(draft);}}>Review task</button>}</div>
      </li>)}</ul> : <p>No actions surfaced in the readable sample. This does not mean every record is current.</p>}
      {review&&<section className="exec-brief" aria-label="Review private follow-up task"><strong>{review.preview.title}</strong><p style={{whiteSpace:'pre-wrap'}}>{review.preview.detail}</p><button type="button" disabled={saving} onClick={()=>void approve()}>{saving?'Saving…':'Approve and save task'}</button> <button type="button" disabled={saving} onClick={()=>setReview(null)}>Cancel</button></section>}
      {receipt&&<p role="status">{receipt}</p>}{saveError&&<p role="alert">{saveError}</p>}
      {brief.moreActions && <p>More actions were identified in the sample. Open the source workspaces to review them.</p>}
      <div className="exec-brief-results" aria-label="Recorded relationship results">
        <strong>Relationship outcomes</strong>
        {brief.relationshipResults ? <p>{brief.relationshipResults.recordedOutcomes} introductions with outcomes in your recent recorded sample. Direct: {brief.relationshipResults.direct} · Influenced: {brief.relationshipResults.influenced} · Context only: {brief.relationshipResults.contextual}.{brief.relationshipResults.limited?' More events exist.':''} Member-reported outcomes, not independently verified revenue.</p> : <p>Outcome records are unavailable. No zero or financial value is assumed.</p>}
      </div>
      <p className="exec-brief-note">Relationship and memory sample: {brief.sources.filter(s=>s.key==='connections'||s.key==='notes').map(s=>s.key + ': ' + (s.sample === null ? 'unavailable' : String(s.sample) + (s.limited ? '+' : ''))).join(' · ')}.</p>
      <p className="exec-brief-note">Mindprint: {brief.mindprint === 'available' ? 'approved private baseline available' : brief.mindprint === 'not-recorded' ? 'no approved baseline found' : 'unavailable'}. Memory and relationship evidence remain private; read them directly in Butler when needed.</p>
    </div>}
  </section>;
}
