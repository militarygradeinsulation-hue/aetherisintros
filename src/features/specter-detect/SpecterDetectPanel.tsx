import { useState } from 'react';
import { ArrowLeft, ArrowRight, RefreshCw, Globe, Search, Download, ExternalLink, FileText, Link2, List, ShieldCheck, AlertTriangle, Building2 } from 'lucide-react';
import { CaseWorkspace } from './CaseWorkspace';
import { detectPublicPage } from './diagnostics';
import { validatePublicSnapshot, redactSensitiveText } from './snapshot-validation';
import type { SpecterFinding } from './types';
import './specter-workspace.css';

type Tab = 'analysis' | 'evidence' | 'facts' | 'links';
export function SpecterDetectPanel() {
  const [url, setUrl] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');
  const [title, setTitle] = useState('');
  const [headings, setHeadings] = useState('');
  const [links, setLinks] = useState('');
  const [findings, setFindings] = useState<SpecterFinding[]>([]);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('analysis');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showManual, setShowManual] = useState(false);
  function analyze() {
    setError(''); setFindings([]);
    try {
      const parsed = new URL(url);
      if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('Enter a public HTTP(S) website URL without credentials.');
      if (['localhost','127.0.0.1','::1'].includes(parsed.hostname) || parsed.hostname.endsWith('.local')) throw new Error('Use a public website URL.');
      if (!title.trim() && !headings.trim() && !links.trim()) throw new Error('Automated browser capture is not connected yet. Open the evidence editor and enter observed page information.');
      const result = detectPublicPage(validatePublicSnapshot({
        url: parsed.href, title: redactSensitiveText(title.trim().slice(0,300)),
        headings: headings.split('\n').map(s=>redactSensitiveText(s.trim())).filter(Boolean).slice(0,100),
        links: links.split('\n').map(s=>redactSensitiveText(s.trim())).filter(Boolean).slice(0,100).map(text=>({text,href:''})),
        capturedAt: new Date().toISOString()
      }));
      setCurrentUrl(parsed.origin + parsed.pathname);
      setHistory(previous=>[...previous.slice(0,historyIndex+1),parsed.origin+parsed.pathname]);
      setHistoryIndex(previous=>previous+1);
      setFindings(result.findings); setTab('analysis');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to analyze website evidence.'); }
  }
  const headingList = headings.split('\n').map(s=>s.trim()).filter(Boolean);
  const linkList = links.split('\n').map(s=>s.trim()).filter(Boolean);
  const exportSnapshot = () => {
    const payload = {source:currentUrl, title, headings:headingList, links:linkList, findings, exportedAt:new Date().toISOString(), provenance:'manual-user-supplied'};
    const objectUrl = URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
    const anchor=document.createElement('a');anchor.href=objectUrl;anchor.download='specter-evidence.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(objectUrl),1000);
  };
  return <div className="specter-shell">
    <header className="specter-title"><div><p className="specter-kicker">AETHERIS / INVESTIGATION WORKSPACE</p><h1>SPECTER <span>DETECT</span></h1><p>Investigate companies. Verify evidence. Make informed decisions.</p></div><span className="specter-mode">MANUAL EVIDENCE MODE</span></header>
    <form className="specter-search" onSubmit={e=>{e.preventDefault();analyze();}}>
      <Globe size={20} aria-hidden="true"/><input aria-label="Website URL" placeholder="https://company.example" type="url" required value={url} onChange={e=>setUrl(e.target.value)}/>
      <button className="specter-primary" type="submit"><Search size={18}/>Analyze Evidence</button>
      <button className="specter-icon-button" type="button" title="Export evidence" aria-label="Export evidence" disabled={!currentUrl} onClick={exportSnapshot}><Download size={19}/></button>
    </form>
    {error && <p className="specter-error" role="alert">{error}</p>}
    <div className="specter-grid">
      <div className="specter-browser">
        <div className="specter-browser-tabs"><button type="button" onClick={()=>{if(historyIndex>0){setHistoryIndex(historyIndex-1);setCurrentUrl(history[historyIndex-1] ?? '');}}} disabled={historyIndex<=0} aria-label="Previous analyzed URL"><ArrowLeft size={17}/></button><button type="button" disabled={historyIndex>=history.length-1} onClick={()=>{setHistoryIndex(historyIndex+1);setCurrentUrl(history[historyIndex+1] ?? '');}} aria-label="Next analyzed URL"><ArrowRight size={17}/></button><span className="specter-tab">◈ Website evidence</span><button type="button" onClick={()=>setShowManual(v=>!v)} title="Toggle evidence editor"><RefreshCw size={15}/></button></div>
        <div className="specter-address"><ShieldCheck size={16}/><span>{currentUrl || 'Enter a public URL to begin an investigation'}</span>{currentUrl && <a href={currentUrl} target="_blank" rel="noopener noreferrer" aria-label="Open original website in new tab"><ExternalLink size={16}/></a>}</div>
        <div className="specter-viewport"><div className="specter-viewport-mark"><Globe size={46}/><h2>{title || 'Website investigation'}</h2><p>{currentUrl ? 'Source recorded. Browser-rendered website preview requires the secure capture service.' : 'Enter a URL and capture website evidence to begin.'}</p>{currentUrl && <a href={currentUrl} target="_blank" rel="noopener noreferrer">Open live website <ExternalLink size={14}/></a>}</div></div>
        <section className="specter-extracted"><h3>Extracted information <span>USER-SUPPLIED EVIDENCE</span></h3><div className="specter-metrics"><div><List/><strong>{headingList.length}</strong><small>Headings</small></div><div><Link2/><strong>{linkList.length}</strong><small>Links</small></div><div><FileText/><strong>{findings.length}</strong><small>Findings</small></div></div></section>
        <section className="specter-editor"><button type="button" className="specter-editor-toggle" onClick={()=>setShowManual(v=>!v)} aria-expanded={showManual}>{showManual?'Hide':'Edit'} captured evidence</button>{showManual && <div className="specter-fields"><label>Page title<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={300}/></label><label>Headings, one per line<textarea value={headings} onChange={e=>setHeadings(e.target.value)} rows={4}/></label><label>Link labels, one per line<textarea value={links} onChange={e=>setLinks(e.target.value)} rows={4}/></label><p>These fields are manual until the isolated browser capture endpoint is deployed. No site data is fabricated.</p></div>}</section>
      </div>
      <aside className="specter-insights"><div className="specter-tabs" role="tablist" aria-label="Investigation results">{([['analysis','Analysis'],['evidence','Evidence'],['facts','Key Facts'],['links','Links']] as const).map(([id,label])=><button type="button" key={id} role="tab" aria-selected={tab===id} onClick={()=>setTab(id)} className={tab===id?'active':''}>{label}</button>)}</div>
        {tab==='analysis' && <><section className="specter-card"><h3>Company Overview <span>OBSERVED</span></h3><div className="specter-company"><Building2/><div><strong>{title || 'Company not analyzed'}</strong><small>{currentUrl || 'No source URL'}</small></div></div><p>Information shown here comes only from entered evidence. Verified company facts will appear after a browser capture integration is available.</p></section><section className="specter-card"><h3>Key Findings</h3>{findings.length ? findings.map(f=><div className="specter-finding" key={f.id}><AlertTriangle size={17}/><div><strong>{f.title}</strong><p>{f.recommendation}</p><small>{Math.round(f.confidence*100)}% rule confidence · confirm against full website</small></div></div>) : <p>No findings yet. Enter observed evidence and analyze.</p>}</section></>}
        {tab==='evidence' && <section className="specter-card"><h3>Evidence</h3><p>{headings || links ? 'Captured manually by the member, not verified by automated browsing.' : 'No evidence recorded yet.'}</p>{headingList.map((h,i)=><p key={i} className="specter-line">{h}</p>)}</section>}
        {tab==='facts' && <section className="specter-card"><h3>Key Facts</h3><p>Source: {currentUrl || 'Not provided'}</p><p>Title: {title || 'Not provided'}</p><p>Business details such as ownership, employee count and funding are not inferred without sources.</p></section>}
        {tab==='links' && <section className="specter-card"><h3>Observed Link Labels ({linkList.length})</h3>{linkList.length ? linkList.map((l,i)=><p key={i} className="specter-line">{l}</p>):<p>No links recorded.</p>}</section>}
        <section className="specter-card specter-actions"><h3>Quick Actions</h3><CaseWorkspace target={currentUrl} findings={findings}/></section>
      </aside>
    </div>
  </div>;
}
