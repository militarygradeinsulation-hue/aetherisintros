import {useRef,useState} from 'react'
import {searchProspectEvidence} from '@/lib/prospect.functions'
import {useOps} from '../crm/store'
import {isDuplicate,safeLinkedInLink} from './core'
import {publicTarget} from '@/features/specter-detect/investigation'
type Evidence={title:string;url:string;snippet:string}
export function ProspectDiscovery({onSaved}:{onSaved:()=>void}){
 const ops=useOps()
 const [query,setQuery]=useState(''),[results,setResults]=useState<Evidence[]>([]),[busy,setBusy]=useState(false),[msg,setMsg]=useState(''),[checkedAt,setCheckedAt]=useState('')
 const [name,setName]=useState(''),[company,setCompany]=useState(''),[title,setTitle]=useState(''),[linkedin,setLinkedin]=useState(''),[email,setEmail]=useState(''),[source,setSource]=useState(''),[quote,setQuote]=useState(''),[confirmed,setConfirmed]=useState(false)
 const lock=useRef(false)
 const search=async()=>{setBusy(true);setMsg('');try{const r=await searchProspectEvidence({data:{query}});setResults(r.results);setCheckedAt(r.checkedAt);if(!r.results.length)setMsg('No results returned. Open Google or Sales Navigator to continue researching.')}catch(e){setMsg(e instanceof Error?e.message:'Search unavailable.')}finally{setBusy(false)}}
 const save=async()=>{
  if(lock.current)return
  lock.current=true;setBusy(true);setMsg('')
  try{
   if(!confirmed||!name.trim()||!source.trim()||!quote.trim())throw new Error('Review the person and include a source URL and supporting excerpt.')
   const sourceUrl=publicTarget(source),li=linkedin.trim()?safeLinkedInLink(linkedin):''
   if(linkedin.trim()&&!li)throw new Error('Use the public linkedin.com/in/ profile URL. Keep Sales Navigator URLs in the source field.')
   const person={fullName:name.trim(),companyName:company.trim(),title:title.trim(),email:email.trim(),linkedinUrl:li||''}
   if(isDuplicate(person,ops.people))throw new Error('A matching CRM person already exists. Open that record and use its enrichment review to update it.')
   const saved=await ops.createPerson({...person,source:'Reviewed prospect research',notes:'Source: '+sourceUrl+'\nReviewed: '+new Date().toISOString()+'\nEvidence: '+quote.trim()+'\nContact details are user reviewed, not independently verified.'})
   if(!saved)throw new Error('The CRM did not confirm the save. Retry after refreshing.')
   setMsg('Saved '+saved.fullName+' to your CRM.');setConfirmed(false);onSaved()
  }catch(e){setMsg(e instanceof Error?e.message:'Could not save prospect.')}finally{setBusy(false);lock.current=false}
 }
 return <details className="prospect-discovery"><summary>Find people and import research</summary><p>Search public sources, review Sales Navigator leads, then save supported details to your existing CRM.</p><label>Who are you looking for?<input value={query} maxLength={240} onChange={e=>setQuery(e.target.value)} placeholder="Manufacturing owners in Indiana"/></label><div className="prospect-actions"><button type="button" disabled={busy||query.trim().length<3} onClick={()=>void search()}>Search public web</button><a href={'https://www.google.com/search?q='+encodeURIComponent(query+' site:linkedin.com/in/')} target="_blank" rel="noopener noreferrer">Search Google profiles</a><a href="https://www.linkedin.com/sales/home" target="_blank" rel="noopener noreferrer">Open my Sales Navigator</a></div><p>Google opens in your browser. Sales Navigator uses your own LinkedIn session there; direct API sync is not connected. Use Import CSV above for files you are authorized to export.</p>{results.map(r=><article key={r.url}><a href={r.url} target="_blank" rel="noopener noreferrer">{r.title}</a><p>{r.snippet}</p><button type="button" onClick={()=>{setSource(r.url);setQuote(r.snippet);setConfirmed(false)}}>Use as evidence</button></article>)}{checkedAt&&<small>Search retrieved {new Date(checkedAt).toLocaleString()}. Verify each person's identity and current role.</small>}
 <div className="prospect-editor">{([['Full name',name,setName],['Company',company,setCompany],['Role',title,setTitle],['Public LinkedIn URL',linkedin,setLinkedin],['Public business email',email,setEmail],['Source URL',source,setSource]] as const).map(([label,value,setter])=><label key={label}>{label}<input type={label==='Public business email'?'email':'text'} value={value} maxLength={label.includes('URL')?2000:200} onChange={e=>{setter(e.target.value);setConfirmed(false)}}/></label>)}<label className="wide">Supporting source excerpt<textarea value={quote} maxLength={4000} onChange={e=>{setQuote(e.target.value);setConfirmed(false)}}/></label><label className="wide"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> I checked the identity and the source supports these professional details.</label><button type="button" disabled={busy||!confirmed} onClick={()=>void save()}>Save reviewed person to CRM</button></div>{msg&&<p role="status">{msg}</p>}</details>
}
