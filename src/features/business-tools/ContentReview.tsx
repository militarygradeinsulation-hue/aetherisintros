import { useEffect, useRef, useState } from 'react';
import { deliverBusinessTool, saveBusinessTool } from '@/lib/businessTools.functions';
import type { ToolDraft, ToolInputs } from './drafts';

type Props = {
  destination: 'calendar' | 'post'; toolId: string; title: string; output: string; inputs: ToolInputs;
  onSaved: (draft: ToolDraft) => void; onClose: () => void;
};
export function ContentReview({destination, toolId, title, output, inputs, onSaved, onClose}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const alive = useRef(true);
  const inFlight = useRef(false);
  const [heading, setHeading] = useState(title);
  const [text, setText] = useState(output);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [approved, setApproved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [snapshot, setSnapshot] = useState<ToolDraft | null>(null);
  const [id] = useState(() => crypto.randomUUID());
  const post = destination === 'post';
  useEffect(() => { alive.current = true; dialog.current?.showModal(); return () => { alive.current = false; }; }, []);
  const close = () => {
    if (busy) return;
    if (!done && !window.confirm(snapshot ? 'Your review copy is saved. If completion was uncertain, check your calendar or feed before starting another action. Close review?' : 'Close this review? Your original document is unchanged.')) return;
    onClose();
  };
  async function submit() {
    if (inFlight.current || !approved || done) return;
    setError('');
    if (!heading.trim() || !text.trim()) { setError('Add a title and content first.'); return; }
    if (post && text.length > 10000) { setError('Choose one post of 10,000 characters or fewer. Nothing has been published.'); return; }
    if (!post && (!start || !end || !Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end)) || Date.parse(end) <= Date.parse(start))) { setError('Choose a start and an end time after the start.'); return; }
    inFlight.current = true; setBusy(true);
    try {
      const saved = snapshot ?? await saveBusinessTool({data: {toolId, title: heading.trim(), inputs, output: text}});
      if (!alive.current) return;
      setSnapshot(saved); onSaved(saved);
      await deliverBusinessTool({data: {id, draftId: saved.id, version: saved.version, destination, approved: true, ...(!post ? {startsAt: new Date(start).toISOString(), endsAt: new Date(end).toISOString()} : {})}});
      if (alive.current) { setDone(true); if (post) window.dispatchEvent(new Event('aetheris:business-content-published')); }
    } catch (e) { if (alive.current) setError(e instanceof Error ? e.message : 'Could not complete this action. Your content is still available.'); }
    finally { inFlight.current = false; if (alive.current) setBusy(false); }
  }
  return <dialog ref={dialog} className="bt-review" aria-labelledby="bt-review-title" onCancel={e => {e.preventDefault(); close();}}>
    <h3 id="bt-review-title">{post ? 'Review your Ask Intros post' : 'Review your calendar content'}</h3>
    <p>{post ? 'Publish this text to the Ask Intros member network under your profile. Only the content below will be posted.' : 'Add one content item to your Ask Intros calendar. This is a private planning entry, visible to any calendar delegates you authorize. It will not automatically publish a post.'}</p>
    <p className="bt-note">Edit or select one item from a longer plan. A separate private review copy is saved before continuing. Your original document stays available. Generated images are not included.</p>
    <fieldset disabled={busy || Boolean(snapshot) || done}>
      <label>Review title<input maxLength={180} value={heading} onChange={e => {setHeading(e.target.value); setApproved(false);}}/></label>
      <label>{post ? 'Post content' : 'Calendar content'}<textarea aria-label={post ? 'Post content' : 'Calendar content'} rows={10} maxLength={50000} value={text} onChange={e => {setText(e.target.value); setApproved(false);}}/></label>
      {post ? <small>{text.length.toLocaleString()} / 10,000 characters · Ask Intros member network</small> : <>
        <p>Times use your device timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
        <label>Starts<input type="datetime-local" value={start} onChange={e => {setStart(e.target.value); setApproved(false);}}/></label>
        <label>Ends<input type="datetime-local" value={end} onChange={e => {setEnd(e.target.value); setApproved(false);}}/></label>
      </>}
    </fieldset>
    {!done && <label className="bt-approval"><input type="checkbox" checked={approved} disabled={busy} onChange={e => setApproved(e.target.checked)}/><span>{post ? 'I reviewed this exact content and authorize publishing it now to Ask Intros.' : 'I reviewed this content and these times. Add it to my calendar.'}</span></label>}
    {error && <p role="alert">{error}</p>}
    {done && <p role="status">{post ? 'Published to Ask Intros. You can review, edit, or delete your post in the feed.' : 'Added to your calendar. Open Calendar to review or manage the entry.'} Your private review copy is in Your saved work.</p>}
    <div className="bt-actions">
      {!done && <button disabled={busy || !approved} onClick={() => void submit()}>{busy ? 'Saving…' : snapshot ? 'Retry approved action' : post ? 'Approve and publish now' : 'Add to my calendar'}</button>}
      <button disabled={busy} onClick={close}>{done ? 'Done' : 'Cancel'}</button>
    </div>
  </dialog>;
}
