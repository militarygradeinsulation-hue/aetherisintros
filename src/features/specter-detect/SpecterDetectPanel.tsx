import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, RefreshCw, Globe, Search, Download, ExternalLink, Link2, List, Building2, Image as ImageIcon, FileText, Bookmark } from 'lucide-react';
import { scanSpecterWebsite } from '@/lib/specter.functions';
import { supabase } from '@/integrations/supabase/client';
import { detectPublicPage } from './diagnostics';
import { publicTarget, type Investigation } from './investigation';
import { validatePublicSnapshot } from './snapshot-validation';
import './specter-workspace.css';

type Tab = 'analysis' | 'evidence' | 'facts' | 'links' | 'images';
export function SpecterDetectPanel() {
  const [owner, setOwner] = useState<string | undefined>();
  useEffect(() => {
    let active = true, authEvent = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      authEvent = true;
      if (active) setOwner(session?.user.id);
    });
    void supabase.auth.getSession().then(({ data }) => { if (active && !authEvent) setOwner(data.session?.user.id); });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  const [url, setUrl] = useState('');
  const [history, setHistory] = useState<Investigation[]>([]);
  const [index, setIndex] = useState(-1);
  const [tab, setTab] = useState<Tab>('analysis');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const generation = useRef(0);
  const currentOwner = useRef(owner);
  currentOwner.current = owner;
  useEffect(() => {
    generation.current++; setHistory([]); setIndex(-1); setUrl(''); setBusy(false); setError(''); setMessage(''); setShowPreview(false);
    return () => { generation.current++; };
  }, [owner]);
  const current = history[index];
  const snapshot = current?.snapshot;
  const result = snapshot ? detectPublicPage(snapshot) : { findings: [], evidence: [] };
  async function scan(target = url) {
    const request = ++generation.current;
    const requestOwner = owner;
    setError(''); setMessage(''); setShowPreview(false);
    try {
      if (!owner) throw new Error('Sign in to scan public websites.');
      const normalized = publicTarget(target);
      setUrl(normalized); setBusy(true);
      const captured = await scanSpecterWebsite({ data: { url: normalized } });
      if (request !== generation.current || currentOwner.current !== requestOwner) return;
      setHistory(previous => [...previous.slice(0, index + 1), captured].slice(-20));
      setIndex(Math.min(index + 1, 19)); setTab('analysis');
    } catch (e) {
      if (request === generation.current) setError(e instanceof Error ? e.message : 'Website capture failed. Please try again.');
    } finally { if (request === generation.current) setBusy(false); }
  }
  function navigate(next: number) {
    if (busy || !history[next]) return;
    setIndex(next); setUrl(history[next]!.snapshot.url); setError(''); setMessage(''); setShowPreview(false);
  }
  function exportReport() {
    if (!current) return;
    const objectUrl = URL.createObjectURL(new Blob([JSON.stringify({ ...current, ...result }, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = objectUrl; anchor.download = 'specter-report.json'; anchor.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }
  function saveCase() {
    if (!current || !owner) return;
    try {
      const key = `specter-cases:${owner}`;
      const stored: unknown = JSON.parse(localStorage.getItem(key) || '[]');
      const cases = Array.isArray(stored) ? stored : [];
      localStorage.setItem(key, JSON.stringify([current, ...cases.filter(c => c?.snapshot?.url !== snapshot?.url)].slice(0, 20)));
      setMessage('Case saved on this device. Use Saved Cases to reopen it.');
    } catch { setMessage('Device storage is unavailable. Export the report to keep a copy.'); }
  }
  function openSaved() {
    if (!owner || busy) return;
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(`specter-cases:${owner}`) || '[]');
      if (!Array.isArray(stored)) throw new Error();
      const cases = stored.slice(0,20).flatMap(c => {
        try {
          const snapshot = validatePublicSnapshot(c?.snapshot);
          publicTarget(snapshot.url);
          if (!['browser', 'reader'].includes(c.mode)) return [];
          snapshot.links.forEach(link => publicTarget(link.href));
          return [{ snapshot, mode: c.mode, description: typeof c.description === 'string' ? c.description.slice(0,1200) : '', images: Array.isArray(c.images) ? c.images.slice(0,24).filter((image: {src: string}) => { try { publicTarget(image.src); return true; } catch { return false; } }) : [] } as Investigation];
        } catch { return []; }
      });
      if (!cases.length) { setMessage('No saved cases on this device yet.'); return; }
      setHistory(cases); setIndex(0); setUrl(cases[0]!.snapshot.url); setShowPreview(false); setMessage(`${cases.length} saved cases loaded. Use the arrows to review them.`);
    } catch { setMessage('Saved cases could not be loaded.'); }
  }
  return <section className="specter-shell" aria-label="Specter Detect">
    <header className="specter-title"><div><p className="specter-kicker">ASK INTROS / AETHERIS</p><h1>SPECTER <span>DETECT</span></h1><p>Investigate companies. Verify information. Make informed decisions.</p></div><button className="specter-mode" onClick={openSaved} disabled={!owner || busy}>Saved Cases</button></header>
    <form className="specter-search" onSubmit={e => { e.preventDefault(); void scan(); }}>
      <Globe size={20}/><input aria-label="Website URL" placeholder="https://www.company.com" value={url} onChange={e => setUrl(e.target.value)} disabled={busy} required maxLength={2000}/>
      <button className="specter-primary" type="submit" disabled={busy || !url.trim()}><Search size={18}/>{busy ? 'Scanning…' : 'Scan Website'}</button>
      <button className="specter-icon-button" type="button" aria-label="Export report" disabled={!current || busy} onClick={exportReport}><Download size={19}/></button>
    </form>
    {error && <p className="specter-error" role="alert">{error}</p>}
    <p className="specter-status" role="status">{busy ? 'Capturing public website evidence…' : message || (current ? `${current.mode === 'browser' ? 'Browser capture' : 'Website reader capture'} · ${new Date(snapshot!.capturedAt).toLocaleString()}` : 'Enter a public company website to begin.')}</p>
    <div className="specter-grid" aria-busy={busy}>
      <div className="specter-browser">
        <div className="specter-browser-tabs"><button onClick={() => navigate(index - 1)} disabled={busy || index <= 0} aria-label="Previous investigation"><ArrowLeft size={17}/></button><button onClick={() => navigate(index + 1)} disabled={busy || index >= history.length - 1} aria-label="Next investigation"><ArrowRight size={17}/></button><span className="specter-tab">{snapshot?.title || 'Website investigation'}</span><button onClick={() => void scan(snapshot?.url)} disabled={busy || !snapshot} aria-label="Refresh website capture"><RefreshCw size={16}/></button></div>
        <div className="specter-address"><Globe size={16}/><span>{snapshot?.url || 'No website loaded'}</span>{snapshot && <a href={snapshot.url} target="_blank" rel="noopener noreferrer" aria-label="Open original website"><ExternalLink size={16}/></a>}</div>
        {showPreview && snapshot ? <div><iframe key={snapshot.url} className="specter-live-frame" title="Live website preview" src={snapshot.url} sandbox="allow-scripts" referrerPolicy="no-referrer"/><p className="specter-preview-note">Some sites block embedded previews. <a href={snapshot.url} target="_blank" rel="noopener noreferrer">Open original website</a>. Preview navigation does not update captured evidence.</p></div> : <div className="specter-viewport"><div className="specter-viewport-mark"><Globe size={46}/><h2>{snapshot?.title || 'Explore a company'}</h2><p>{current?.description || (snapshot ? 'Review the captured evidence and open the original website to verify context.' : 'Scan a public website to capture its title, headings, links, and images.')}</p>{snapshot && <button className="specter-primary" onClick={() => setShowPreview(true)}>Open live preview <ExternalLink size={14}/></button>}</div></div>}
        <section className="specter-extracted"><h3>Extracted Information <span>{current ? 'CAPTURED EVIDENCE' : 'AWAITING SCAN'}</span></h3><div className="specter-metrics">{[[List, snapshot?.headings.length || 0, 'Headings'], [Link2, snapshot?.links.length || 0, 'Links'], [ImageIcon, current?.images.length || 0, 'Images']].map(([Icon, count, label]) => { const MetricIcon = Icon as typeof List; return <div key={String(label)}><MetricIcon/><strong>{String(count)}</strong><small>{String(label)}</small></div>; })}</div></section>
      </div>
      <aside className="specter-insights"><div className="specter-tabs" role="tablist" aria-label="Investigation results">{(['analysis', 'evidence', 'facts', 'links', 'images'] as const).map(id => <button key={id} id={`specter-tab-${id}`} role="tab" aria-selected={tab === id} aria-controls="specter-results" onClick={() => setTab(id)} className={tab === id ? 'active' : ''}>{({ analysis: 'Analysis', evidence: 'Evidence', facts: 'Key Facts', links: 'Links', images: 'Images' })[id]}{id === 'links' ? ` (${snapshot?.links.length || 0})` : ''}</button>)}</div>
        <div id="specter-results" role="tabpanel" aria-labelledby={`specter-tab-${tab}`}>
        {tab === 'analysis' && <><section className="specter-card"><h3>Company Overview <span>SOURCE OBSERVATIONS</span></h3><div className="specter-company"><Building2/><div><strong>{snapshot?.title || 'No company scanned'}</strong><small>{snapshot ? new URL(snapshot.url).hostname : 'Scan a website to begin'}</small></div></div><p>{current?.description || 'Company details appear when supported by captured website content.'}</p></section><section className="specter-card"><h3>Key Findings</h3>{!current ? <p>Scan a website to review its public evidence.</p> : result.findings.length ? result.findings.map(f => <div className="specter-finding" key={f.id}><FileText size={18}/><div><strong>{f.title}</strong><p>{f.recommendation}</p><small>Rule based observation from this page capture. Verify against the full website.</small></div></div>) : <p>No issues identified by the current heading and contact link checks. This is a limited page review.</p>}</section></>}
        {tab === 'evidence' && <section className="specter-card"><h3>Captured Evidence</h3><p>{current ? `Source: ${snapshot!.url}` : 'No capture yet.'}</p>{snapshot?.headings.map((h,i) => <p className="specter-line" key={i}>{h}</p>)}</section>}
        {tab === 'facts' && <section className="specter-card"><h3>Key Facts</h3><p>Title: {snapshot?.title || 'Unavailable'}</p><p>Source: {snapshot?.url || 'Unavailable'}</p><p>Capture method: {current?.mode || 'Unavailable'}</p><p>Ownership, funding, employee counts and revenue require additional sources.</p></section>}
        {tab === 'links' && <section className="specter-card"><h3>Captured Links</h3>{snapshot?.links.length ? snapshot.links.map((l,i) => <p className="specter-line" key={i}><a href={l.href} target="_blank" rel="noopener noreferrer">{l.text || l.href} <ExternalLink size={12}/></a></p>) : <p>No links captured.</p>}</section>}
        {tab === 'images' && <section className="specter-card"><h3>Captured Images</h3><p>Open an image source to review it.</p>{current?.images.length ? current.images.map((img,i) => <p className="specter-line" key={i}><a href={img.src} target="_blank" rel="noopener noreferrer">{img.alt || `Image ${i+1}`} <ExternalLink size={12}/></a></p>) : <p>No images captured by this capture method.</p>}</section>}
        </div>
        <section className="specter-card specter-actions"><h3>Quick Actions</h3><div className="specter-action-row"><button disabled={!current || busy} onClick={saveCase}><Bookmark size={17}/> Save Case</button><button disabled={!current || busy} onClick={exportReport}><Download size={17}/> Export Report</button></div><p>Cases are saved privately on this device under your signed-in account.</p></section>
      </aside>
    </div>
  </section>;
}
