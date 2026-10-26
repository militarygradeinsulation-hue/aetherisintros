import { useEffect, useState } from 'react';
import { HardDriveDownload, RefreshCw, ShieldCheck } from 'lucide-react';
import { useDeviceCache } from './DeviceCacheProvider';

/** A member-owned offline draft, independent of their public posts and relationship notes. */
export function DeviceCacheSettings() {
  const device = useDeviceCache();
  const [draft, setDraft] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!device?.ready || hydrated) return;
    const cached = device.warm?.slices.drafts?.payload;
    const value = cached && typeof cached === 'object' && !Array.isArray(cached)
      ? (cached as Record<string, unknown>)['privateWorkingDraft'] : null;
    if (typeof value === 'string') setDraft(value);
    setHydrated(true);
  }, [device?.ready, device?.warm, hydrated]);

  useEffect(() => {
    if (!hydrated || !device?.ready || !device.save) return;
    const timer = window.setTimeout(() => {
      void device.save('drafts', { privateWorkingDraft: draft })
        .then(() => setMessage('Saved encrypted on this device.'))
        .catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Could not save private draft.'));
    }, 900);
    return () => window.clearTimeout(timer);
  }, [draft, hydrated, device?.ready, device?.save]);

  return <section className="device-cache-settings" aria-label="Encrypted device cache"
    style={{padding:'16px',border:'1px solid var(--line,rgba(128,128,128,.3))',borderRadius:18,marginTop:18}}>
    <h3 style={{display:'flex',alignItems:'center',gap:8}}><HardDriveDownload size={18} /> Encrypted device cache</h3>
    <p>Your private working draft is encrypted on this device and, when connected, syncs to your own Ask Intros account.
      This does not upload other members' private details or replace existing CRM records.</p>
    {!device ? <p role="status">Available after signing in.</p> : <>
      <label style={{display:'block'}}>
        <span>Private working draft</span>
        <textarea rows={3} value={draft} onChange={e => { setDraft(e.target.value); setMessage(''); }}
          disabled={!device.ready || !hydrated} placeholder="Capture an idea. Pick it up on another device once synced."
          aria-label="Private synced working draft" />
      </label>
      <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
        <button type="button" className="btn quiet" onClick={() => void device.syncNow()} disabled={!device.ready}>
          <RefreshCw size={14} /> Sync now
        </button>
        <span role="status">{!device.ready ? 'Opening encrypted cache…'
          : device.pending > 0 ? device.pending + ' change(s) waiting to sync' : 'No queued changes'}</span>
      </div>
      {message && <small role="status">{message}</small>}
      {device.lastSyncError && <p role="alert">Cross-device sync unavailable: {device.lastSyncError}.
        Your encrypted local draft remains on this device.</p>}
    </>}
    <p style={{display:'flex',gap:8,alignItems:'center'}}><ShieldCheck size={16} />
      Saved browser data is cleared when you sign out. Changes still waiting to sync require confirmation before sign-out.</p>
  </section>;
}
