import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, RefreshCw, Globe, Search, Download, ExternalLink, Link2, List, Building2, Image as ImageIcon, FileText, Bookmark, CheckCircle2, CircleAlert, Radar, Maximize2, Minimize2 } from 'lucide-react';
import { scanSpecterWebsite } from '@/lib/specter.functions';
import { supabase } from '@/integrations/supabase/client';
import { detectPublicPage } from './diagnostics';
import { publicTarget, type Investigation } from './investigation';
import { validatePublicSnapshot } from './snapshot-validation';
import './specter-workspace.css';

type Tab = 'analysis' | 'evidence' | 'facts' | 'links' | 'images';
function CapturedImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  return <a href={src} target="_blank" rel="noopener noreferrer" className="specter-image">{!failed && <img src={src} alt={alt || 'Captured website image'} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)}/>}<span>{failed ? 'Preview unavailable · open source' : alt || 'Open image source'}</span></a>;
}
function CapturedPagePreview({ src, title, onLive }: { src: string; title: string; onLive: () => void }) {
  const [failed, setFailed] = useState(false);
  return <div className="specter-page-capture">{failed ? <div className="specter-viewport"><p>The captured view expired. Refresh the scan or open the live website.</p></div> : <img src={src} alt={`Captured website: ${title}`} referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>}<div className="specter-capture-caption"><span>Captured website view</span><button onClick={onLive}>Open interactive preview <ExternalLink size={13}/></button></div></div>;
}
function CapturedEvidence({ investigation }: { investigation: Investigation }) {
  const { snapshot, description } = investigation;
  return <section className="specter-reader" aria-label="Captured page evidence">
    <h2>Captured page evidence</h2>
    <p className="specter-reader-source">{snapshot.title || new URL(snapshot.url).hostname}</p>
    <p>This is the saved capture. Open the full browser to use the original website.</p>
    {description && <p>{description}</p>}
    {!!snapshot.headings.length && <ul>{snapshot.headings.slice(0, 12).map((heading, index) => <li key={index}>{heading}</li>)}</ul>}
    {!!snapshot.links.length && <nav aria-label="Captured website links">{snapshot.links.slice(0, 12).map((link, index) =>
      <a key={index} href={link.href} target="_blank" rel="noopener noreferrer">{link.text || link.href}<ExternalLink size={13}/></a>)}</nav>}
  </section>;
}
function InteractiveWebsite({ url, title, onCapture }: { url: string; title: string; onCapture: () => void }) {
  const [failed, setFailed] = useState(false);
  return <div className="specter-live-preview">
    <div className="specter-live-actions">
      <a className="specter-primary" href={url} target="_blank" rel="noopener noreferrer">Open full browser <ExternalLink size={15}/></a>
      <button type="button" onClick={onCapture}>Return to captured page</button>
    </div>
    <p className="specter-preview-note">This embedded view works only when the website allows it. If it is blank or refuses to connect, open the full browser. Your captured evidence stays here.</p>
    {failed ? <div className="specter-viewport" role="status"><p>The embedded preview is unavailable. Open the full browser to use this website, or return to the captured page.</p></div> :
      <iframe className="specter-live-frame" title={`Interactive website: ${title || url}`} src={url}
        sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
        referrerPolicy="no-referrer" onError={() => setFailed(true)}/>}
  </div>;
}
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
  const [browserExpanded, setBrowserExpanded] = useState(false);
  const [tracking, setTracking] = useState(false);
  const generation = useRef(0);
  const currentOwner = useRef(owner);
  currentOwner.current = owner;
  useEffect(() => {
    generation.current++; setHistory([]); setIndex(-1); setUrl(''); setBusy(false); setError(''); setMessage(''); setShowPreview(false);
    return () => { generation.current++; };
  }, [owner]);
  const current = history[index];
  const snapshot = current?.snapshot;
  const contacts = snapshot?.links.filter(link => /contact|consultant|sales|support|call|appointment/i.test(link.text + ' ' + link.href)) || [];
  const documents = snapshot?.links.filter(link => /\.(?:pdf|docx?|xlsx?|pptx?)(?:[?#]|$)/i.test(link.href) || /download|brochure|guide|book/i.test(link.text)) || [];
  useEffect(() => {
    try { const tracked: unknown = JSON.parse(localStorage.getItem(`specter-tracked:${owner}`) || '[]'); setTracking(Array.isArray(tracked) && tracked.includes(snapshot?.url)); } catch { setTracking(false); }
  }, [owner, snapshot?.url]);
  const leadership = snapshot?.links.find(link => /leadership|our.team|management|founder/i.test(link.text+' '+link.href));
  const news = snapshot?.links.find(link => /news|blog|press/i.test(link.text+' '+link.href));
  const result = snapshot ? detectPublicPage(snapshot) : { findings: [], evidence: [] };
  async function scan(target = url) {
    const request = ++generation.current;
    const requestOwner = owner;
    setError(''); setMessage('');
    try {
      if (!owner) throw new Error('Sign in to scan public websites.');
      const normalized = publicTarget(target);
      setUrl(normalized); setBusy(true);
      const captured = await scanSpecterWebsite({ data: { url: normalized } });
      if (request !== generation.current || currentOwner.current !== requestOwner) return;
      setHistory(previous => [...previous.slice(0, index + 1), captured].slice(-20));
      setIndex(Math.min(index + 1, 19)); setTab('analysis'); setShowPreview(false);
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
    const objectUrl = URL.createObjectURL(new Blob([JSON.stringify({ ...current, previewUrl: undefined, ...result }, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = objectUrl; anchor.download = 'specter-report.json'; anchor.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }
  function saveCase() {
    if (!current || !owner) return;
    try {
      const key = `specter-cases:${owner}`;
      const stored: unknown = JSON.parse(localStorage.getItem(key) || '[]');
      const cases = Array.isArray(stored) ? stored : [];
      localStorage.setItem(key, JSON.stringify([{...current, previewUrl: undefined}, ...cases.filter(c => c?.snapshot?.url !== snapshot?.url)].slice(0, 20)));
      setMessage('Case saved on this device. Use Saved Cases to reopen it.');
    } catch { setMessage('Device storage is unavailable. Export the report to keep a copy.'); }
  }
  function trackCompany() {
    if (!current || !owner) return;
    try {
      const key = `specter-tracked:${owner}`;
      const stored: unknown = JSON.parse(localStorage.getItem(key) || '[]');
      const values: string[] = Array.isArray(stored) ? stored.filter((v): v is string => typeof v === 'string') : [];
      const next = tracking ? values.filter(v=>v!==snapshot!.url) : [snapshot!.url, ...values].slice(0,20);
      localStorage.setItem(key, JSON.stringify(next));
      if (!tracking) saveCase();
      setTracking(!tracking);
      setMessage(tracking ? 'Company removed from this device watchlist.' : 'Company saved to this device watchlist. Open Saved Cases and refresh to check for updates; background monitoring is not enabled.');
    } catch { setMessage('Device storage is unavailable. Export the report to keep this capture.'); }
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
  let browseTarget = '';
  try { if (url.trim()) browseTarget = publicTarget(url); } catch { /* Keep invalid URLs out of browser links. */ }
  return <section className="specter-shell" data-browser-expanded={browserExpanded} aria-label="Specter Detect">
    <header className="specter-title"><div><p className="specter-kicker">ASK INTROS / AETHERIS</p><h1>SPECTER <span>DETECT</span></h1><p>Investigate companies. Verify information. Make informed decisions.</p></div><button className="specter-mode" onClick={openSaved} disabled={!owner || busy}>Saved Cases</button></header>
    <form className="specter-search" onSubmit={e => { e.preventDefault(); void scan(); }}>
      <Globe size={20}/><input aria-label="Website URL" placeholder="https://www.company.com" value={url} onChange={e => setUrl(e.target.value)} disabled={busy} required maxLength={2000}/>
      <button className="specter-primary" type="submit" disabled={busy || !url.trim()}><Search size={18}/>{busy ? 'Scanning…' : 'Scan Website'}</button>
      {browseTarget && <a className="specter-open-browser" href={browseTarget} target="_blank" rel="noopener noreferrer">Open full browser <ExternalLink size={16}/></a>}
      <button className="specter-icon-button" type="button" aria-label="Export report" disabled={!current || busy} onClick={exportReport}><Download size={19}/></button>
    </form>
    {!owner && <p className="specter-preview-note">Sign in to capture real website evidence. <a href="/auth">Sign in to Ask Intros</a></p>}
    {error && <p className="specter-error" role="alert">{error}{current ? ` Showing the previous capture from ${snapshot!.url}` : ''}</p>}
    <p className="specter-status" role="status">{busy ? 'Capturing public website evidence…' : message || (current ? `${current.mode === 'browser' ? 'Browser capture' : 'Website reader capture'} · ${new Date(snapshot!.capturedAt).toLocaleString()}` : 'Enter a public company website to begin.')}</p>
    <div className="specter-grid" aria-busy={busy}>
      <div className="specter-browser">
        <div className="specter-browser-tabs">
          <button type="button" onClick={() => navigate(index - 1)} disabled={busy || index <= 0} aria-label="Previous investigation"><ArrowLeft size={17}/></button>
          <button type="button" onClick={() => navigate(index + 1)} disabled={busy || index >= history.length - 1} aria-label="Next investigation"><ArrowRight size={17}/></button>
          <span className="specter-tab">{snapshot?.title || 'Website investigation'}</span>
          <button type="button" onClick={() => void scan(snapshot?.url)} disabled={busy || !snapshot} aria-label="Refresh website capture"><RefreshCw size={16}/></button>
          <button type="button" aria-label={browserExpanded ? 'Restore split view' : 'Expand browser'} aria-pressed={browserExpanded} onClick={() => setBrowserExpanded(value => !value)}>{browserExpanded ? <Minimize2 size={17}/> : <Maximize2 size={17}/>}</button>
          <div className="specter-browser-view-switch" role="group" aria-label="Website view">
            <button type="button" className={showPreview ? 'active' : ''} aria-pressed={showPreview} disabled={!snapshot} onClick={() => setShowPreview(true)}>Interact</button>
            <button type="button" className={!showPreview ? 'active' : ''} aria-pressed={!showPreview} disabled={!current} onClick={() => setShowPreview(false)}>Capture</button>
          </div>
        </div>
        <div className="specter-address"><Globe size={16}/><span>{snapshot?.url || 'No website loaded'}</span>{snapshot && <a href={snapshot.url} target="_blank" rel="noopener noreferrer" aria-label="Open original website"><ExternalLink size={16}/></a>}</div>
        <div className="specter-browser-content">
          {showPreview && snapshot ? <InteractiveWebsite key={snapshot.url + snapshot.capturedAt} url={snapshot.url} title={snapshot.title} onCapture={() => setShowPreview(false)}/> :
            current ? <>
              <div className="specter-live-actions"><a className="specter-primary" href={current.snapshot.url} target="_blank" rel="noopener noreferrer">Open full browser <ExternalLink size={15}/></a><button type="button" onClick={() => setShowPreview(true)}>Try embedded view</button></div>
              {current.previewUrl && <CapturedPagePreview key={current.previewUrl} src={current.previewUrl} title={snapshot?.title || 'Website'} onLive={() => setShowPreview(true)}/>}
              <CapturedEvidence investigation={current}/>
            </> : <div className="specter-viewport"><div className="specter-viewport-mark"><Globe size={46}/><h2>Explore a company</h2><p>Enter a website address to open it in the full browser, or scan it to collect public evidence.</p></div></div>}

        </div>
        <section className="specter-extracted"><h3>Extracted Information <span>{current ? 'CAPTURED EVIDENCE' : 'AWAITING SCAN'}</span></h3><div className="specter-metrics">{[[List, snapshot?.headings.length || 0, 'Headings'], [Link2, snapshot?.links.length || 0, 'Links'], [ImageIcon, current?.images.length || 0, 'Images'], [Bookmark, contacts.length, 'Contact links'], [FileText, documents.length, 'Documents / guides']].map(([Icon, count, label]) => { const MetricIcon = Icon as typeof List; return <div key={String(label)}><MetricIcon/><strong>{String(count)}</strong><small>{String(label)}</small></div>; })}</div></section>
      </div>
      <aside className="specter-insights"><div className="specter-tabs" role="tablist" aria-label="Investigation results">{(['analysis', 'evidence', 'facts', 'links', 'images'] as const).map(id => <button key={id} id={`specter-tab-${id}`} role="tab" aria-selected={tab === id} aria-controls="specter-results" onClick={() => setTab(id)} className={tab === id ? 'active' : ''}>{({ analysis: 'Analysis', evidence: 'Evidence', facts: 'Key Facts', links: 'Links', images: 'Images' })[id]}{id === 'links' ? ` (${snapshot?.links.length || 0})` : ''}</button>)}</div>
        <div id="specter-results" role="tabpanel" aria-labelledby={`specter-tab-${tab}`}>
        {tab === 'analysis' && <><section className="specter-card"><h3>Company Overview <span>SOURCE OBSERVATIONS</span></h3><div className="specter-company"><Building2/><div><h4 className="specter-company-name">{snapshot?.title || 'No company scanned'}</h4><small>{snapshot ? new URL(snapshot.url).hostname : 'Scan a website to begin'}</small></div></div><p>{current?.description || 'Company details appear when supported by captured website content.'}</p></section><section className="specter-card"><h3>Key Findings <span>PAGE EVIDENCE</span></h3>{!current ? <p>Scan a website to review its public evidence.</p> : <div className="specter-facts-list">{[
          {label:'Business Model', text:(current.description.length > 180 ? current.description.slice(0,180)+'…' : current.description) || snapshot?.title || 'Not established by this capture.', observed:!!current.description},
          {label:'Target Market', text:'Requires evidence identifying the customers served.', observed:false},
          {label:'Leadership', text:leadership ? leadership.text || 'Leadership source found' : 'No leadership source identified in this capture.', href:leadership?.href, observed:!!leadership},
          {label:'Funding', text:'No funding evidence established by this page capture.', observed:false},
          {label:'Recent News', text:news ? news.text || 'News source found; review dates at source' : 'No news source identified in this capture.', href:news?.href, observed:!!news},
          {label:'Potential Risks', text:result.findings.length ? result.findings.map(f=>f.title).join('; ') : 'No heading or contact-link issue identified. Broader risks require further review.', observed:false},
        ].map(row=><div className="specter-fact-row" key={row.label}><span>{row.label}</span>{row.observed ? <CheckCircle2 size={18} className="specter-observed"/> : <CircleAlert size={18} className="specter-unverified"/>}<p>{row.href ? <a href={row.href} target="_blank" rel="noopener noreferrer">{row.text}</a> : row.text}</p></div>)}<small>Source claims and captured links require independent verification. Unavailable facts are not inferred.</small></div>}</section></>}
        {tab === 'evidence' && <section className="specter-card"><h3>Captured Evidence</h3><p>{current ? `Source: ${snapshot!.url}` : 'No capture yet.'}</p>{snapshot?.headings.map((h,i) => <p className="specter-line" key={i}>{h}</p>)}{current && <><h3>Contact links ({contacts.length})</h3>{contacts.map((l,i)=><p className="specter-line" key={`c${i}`}><a href={l.href} target="_blank" rel="noopener noreferrer">{l.text || l.href}</a></p>)}{!contacts.length && <p>No contact links were found in this capture.</p>}<h3>Documents and guide links ({documents.length})</h3>{documents.map((l,i)=><p className="specter-line" key={`d${i}`}><a href={l.href} target="_blank" rel="noopener noreferrer">{l.text || l.href}</a></p>)}{!documents.length && <p>No document or guide links were found in this capture.</p>}</>}</section>}
        {tab === 'facts' && <section className="specter-card"><h3>Key Facts</h3><p>Title: {snapshot?.title || 'Unavailable'}</p><p>Source: {snapshot?.url || 'Unavailable'}</p><p>Capture method: {current?.mode || 'Unavailable'}</p><p>Ownership, funding, employee counts and revenue require additional sources.</p></section>}
        {tab === 'links' && <section className="specter-card"><h3>Captured Links</h3>{snapshot?.links.length ? snapshot.links.map((l,i) => <p className="specter-line" key={i}><a href={l.href} target="_blank" rel="noopener noreferrer">{l.text || l.href} <ExternalLink size={12}/></a></p>) : <p>No links captured.</p>}</section>}
        {tab === 'images' && <section className="specter-card"><h3>Captured Images</h3><p>Open an image source to review it.</p>{current?.images.length ? <div className="specter-image-grid">{current.images.map((img,i) => <CapturedImage key={img.src} src={img.src} alt={img.alt || `Image ${i+1}`}/>)}</div> : <p>No images captured by this capture method.</p>}</section>}
        </div>
        <section className="specter-card specter-actions"><h3>Quick Actions</h3><div className="specter-action-row"><button disabled={!current || busy} onClick={saveCase}><Bookmark size={17}/> Save Case</button><button disabled={!current || busy} onClick={exportReport}><Download size={17}/> Export Report</button><button disabled={!current || busy} onClick={trackCompany} aria-pressed={tracking}><Radar size={17}/> {tracking ? 'Tracking on device' : 'Track Company'}</button></div><p>Cases are saved privately on this device under your signed-in account.</p></section>
      </aside>
    </div>
  </section>;
}
