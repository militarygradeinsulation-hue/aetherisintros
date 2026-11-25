import { useRef, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { supabase } from '@/integrations/supabase/client';
import { useOps } from '../crm/store';
import { parseGoldenReport, reportActionPreview, type ReportImport, type ReportFinding } from '../domain/reviewed-business-actions';
import { approveReportAction } from '@/lib/reviewed-business-actions.functions';
import './golden-report-actions.css';

const example=JSON.stringify({reportReference:'your-report-reference',company:'Company name',findings:[{
  id:'finding-01',title:'Finding title',evidence:'Evidence from the actual report',proposedAction:'Action to review',metric:'Metric to measure',baseline:'',target:''
}]},null,2);

export function GoldenReportActionPanel() {
  const ops=useOps();
  const save=useServerFn(approveReportAction);
  const [raw,setRaw]=useState('');
  const [parsed,setParsed]=useState<ReportImport|null>(null);
  const [owner,setOwner]=useState<string|null>(null);
  const [companyId,setCompanyId]=useState('');
  const [assignee,setAssignee]=useState('');
  const [review,setReview]=useState<{finding:ReportFinding;kind:'task'|'opportunity'}|null>(null);
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const locked=useRef(false);
  const importReport=async()=>{
    if(locked.current)return;
    locked.current=true;setBusy(true);setError('');setNotice('');setReview(null);setParsed(null);setOwner(null);setCompanyId('');setAssignee('');
    try {
      const report=parseGoldenReport(raw);
      const {data,error}=await supabase.auth.getUser();
      if(error||!data.user)throw new Error('Sign in to review your private report.');
      setOwner(data.user.id);setParsed(report);
    }catch(e){setError(e instanceof Error?e.message:'Report could not be reviewed.');}
    finally{locked.current=false;setBusy(false);}
  };
  const preview=review&&parsed?reportActionPreview({reportReference:parsed.reportReference,company:parsed.company,finding:review.finding,kind:review.kind,assignee}):null;
  const approve=async()=>{
    if(locked.current||!parsed||!owner||!review||!preview)return;
    locked.current=true;setBusy(true);setError('');setNotice('');
    try{
      const receipt=await save({data:{owner,approved:true,reportReference:parsed.reportReference,company:parsed.company,finding:review.finding,kind:review.kind,companyId:companyId||null,assignee:review.kind==='task'?assignee:''}});
      setNotice(receipt.receipt);setReview(null);
      // Refresh only after the server has confirmed the write.
      void ops.refresh().catch(()=>{setNotice(receipt.receipt+' Reopen CRM to refresh its view.');});
      window.dispatchEvent(new Event('aetheris:business-content-published'));
    }catch(e){setError(e instanceof Error?e.message:'The action was not saved.');}
    finally{locked.current=false;setBusy(false);}
  };
  return <details className="golden-actions" aria-label="Golden Report to CRM">
    <summary><strong>Golden Report action import</strong><span>Turn supplied findings into reviewed tasks or opportunities.</span></summary>
    <div className="golden-actions-body">
      <p>Paste actual report findings using the JSON format below. No report is fetched automatically. No external AI call is made, and nothing is saved until you approve an individual action.</p>
      <details><summary>View import format</summary><pre>{example}</pre></details>
      <label>Report findings JSON<textarea value={raw} maxLength={100000} disabled={busy} rows={6} placeholder="Paste your report findings JSON here" onChange={e=>{setRaw(e.target.value);setParsed(null);setOwner(null);setReview(null);setNotice('');setError('');}}/></label>
      <button type="button" className="btn" disabled={busy||!ops.signedIn||!raw.trim()} onClick={()=>void importReport()}>Preview findings</button>
      {parsed&&<><p><strong>{parsed.company}</strong> · {parsed.reportReference} · {parsed.findings.length} findings supplied</p>
        <label>Link to an existing CRM company (optional)<select disabled={busy} value={companyId} onChange={e=>setCompanyId(e.target.value)}><option value="">No company link</option>{ops.companies.filter(c=>!c.archived).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        {parsed.findings.map(finding=><article className="golden-finding" key={finding.id}>
          <strong>{finding.title}</strong><p>{finding.evidence}</p><p>Proposed: {finding.proposedAction}</p><p>Measure: {finding.metric}</p>
          <div className="golden-buttons"><button className="btn" type="button" disabled={busy} onClick={()=>{setReview({finding,kind:'task'});setAssignee('');setError('');setNotice('');}}>Review task</button>
          <button className="btn" type="button" disabled={busy} onClick={()=>{setReview({finding,kind:'opportunity'});setError('');setNotice('');}}>Review opportunity</button></div>
        </article>)}
      </>}
      {review&&preview&&<section className="golden-review" aria-label="Approve report action">
        <h3>Review {review.kind}: {preview.title}</h3>
        {review.kind==='task'&&<label>Responsible person or role (CRM label only)<input maxLength={120} disabled={busy} value={assignee} onChange={e=>setAssignee(e.target.value)}/></label>}
        <pre>{preview.detail}</pre>
        {review.kind==='opportunity'&&<p>New opportunity uses your existing default pipeline. Financial value is unquantified, not estimated.</p>}
        <p>Company link: {companyId?ops.companies.find(c=>c.id===companyId)?.name||'Unavailable':'None'}. This saves only the selected CRM record. No invitation, email or payment is sent.</p>
        <div className="golden-buttons"><button className="btn primary" type="button" disabled={busy} onClick={()=>void approve()}>{busy?'Saving…':'Approve and save '+review.kind}</button><button className="btn" type="button" disabled={busy} onClick={()=>setReview(null)}>Cancel</button></div>
      </section>}
      {notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}
    </div>
  </details>;
}
