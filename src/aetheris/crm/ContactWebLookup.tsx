import { useEffect, useRef, useState } from 'react'
import { ExternalLink, SearchCheck, ShieldCheck } from 'lucide-react'
import { acceptContactWebSuggestions, lookupMissingContactWeb } from '@/lib/contactWebLookup.functions'
import type { ContactLookupResult, ContactLookupSuggestion, WebContactField } from './contact-web-lookup'
import './contact-web-lookup.css'

export interface ContactWebRecord {
  id:string; name:string; email:string; phone:string; title:string; updatedAt:string
}
const labels:Record<WebContactField,string>={email:'Work email',phone:'Phone number',title:'Job title'}
export const hasMissingWebFields=(contact:Pick<ContactWebRecord,'email'|'phone'|'title'>) =>
  !contact.email.trim()||!contact.phone.trim()||!contact.title.trim()

export function ContactWebFindings({suggestions,selected,onSelect}:{
  suggestions:readonly ContactLookupSuggestion[]
  selected:ReadonlySet<WebContactField>
  onSelect:(field:WebContactField,checked:boolean)=>void
}) {
  return <div className="contact-web-findings" aria-label="Preview suggested contact details">
    {suggestions.map(item=><label key={item.field} className="contact-web-finding">
      <div className="contact-web-finding-choice">
        <input type="checkbox" checked={selected.has(item.field)} onChange={e=>onSelect(item.field,e.target.checked)}/>
        <span><b>{labels[item.field]}</b><strong>{item.value}</strong></span>
      </div>
      <blockquote>{item.quote}</blockquote>
      <div className="contact-web-source">
        <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={13}/> {item.sourceTitle||'View public source'}
        </a>
        <small>Checked {new Date(item.checkedAt).toLocaleString()}</small>
      </div>
    </label>)}
  </div>
}

/** A human starts each search and explicitly approves the fields to write. */
export function ContactWebLookup({kind,record,onSaved}:{
  kind:'crm'|'library'
  record:ContactWebRecord
  onSaved:()=>Promise<void>|void
}) {
  const [result,setResult]=useState<ContactLookupResult|null>(null)
  const [selected,setSelected]=useState<Set<WebContactField>>(new Set())
  const [busy,setBusy]=useState<'search'|'save'|null>(null)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const request=useRef(0)
  useEffect(()=>{
    request.current+=1
    setResult(null);setSelected(new Set());setBusy(null);setError('');setNotice('')
  },[kind,record.id,record.updatedAt])
  const missing=hasMissingWebFields(record)
  const lookup=async()=>{
    const seq=++request.current
    setBusy('search');setResult(null);setSelected(new Set());setError('');setNotice('')
    try{
      const response=await lookupMissingContactWeb({data:{kind,recordId:record.id,confirmed:true}})
      if(seq!==request.current)return
      setResult(response)
      if(response.status==='ok')setSelected(new Set(response.suggestions.map(item=>item.field)))
    }catch(cause){if(seq===request.current)setError(cause instanceof Error?cause.message:'Public lookup could not be completed.')}
    finally{if(seq===request.current)setBusy(null)}
  }
  const save=async()=>{
    if(result?.status!=='ok'||!selected.size||busy)return
    const chosen=result.suggestions.filter(item=>selected.has(item.field))
    setBusy('save');setError('');setNotice('')
    try{
      await acceptContactWebSuggestions({data:{
        kind,recordId:record.id,expectedUpdatedAt:record.updatedAt,confirmed:true,selected:chosen,
      }})
      setResult(null);setSelected(new Set())
      setNotice('Approved contact fields saved with their public-source links.')
      await onSaved()
    }catch(cause){setError(cause instanceof Error?cause.message:'Selected fields could not be saved.')}
    finally{setBusy(null)}
  }
  return <section className="contact-web-lookup" aria-label={'Public web lookup for '+record.name}>
    <header>
      <div><h3>Find missing contact details</h3>
        <p>Research published work emails, phone numbers and job titles. No guessing and no automatic saving.</p></div>
      <button type="button" disabled={!missing||!!busy} onClick={()=>void lookup()}>
        <SearchCheck size={16}/> {busy==='search'?'Searching public sources…':missing?'Look up missing details':'All fields filled'}
      </button>
    </header>
    <p className="contact-web-privacy"><ShieldCheck size={14}/>
      Searches use the saved name and company or location only. Private emails, phone numbers and notes are never sent to web search.
    </p>
    {busy==='search'&&<p role="status">Checking public pages and quotes for this contact…</p>}
    {result&&result.status!=='ok'&&<p role="status">{result.reason}</p>}
    {result?.status==='ok'&&<div className="contact-web-review">
      <p><b>Review {result.suggestions.length} proposed {result.suggestions.length===1?'field':'fields'}.</b> Every value has a source. Uncheck any field you do not want to save.</p>
      <ContactWebFindings suggestions={result.suggestions} selected={selected}
        onSelect={(field,checked)=>setSelected(current=>{
          const next=new Set(current)
          if(checked)next.add(field);else next.delete(field)
          return next
        })}/>
      <div className="contact-web-actions">
        <button type="button" disabled={!selected.size||!!busy} onClick={()=>void save()}>
          {busy==='save'?'Saving selected details…':'Save '+selected.size+' selected '+(selected.size===1?'field':'fields')}
        </button>
        <button type="button" disabled={!!busy} className="quiet" onClick={()=>{setResult(null);setSelected(new Set())}}>Discard suggestions</button>
      </div>
    </div>}
    {notice&&<p role="status" className="contact-web-success">{notice}</p>}
    {error&&<p role="alert" className="contact-web-error">{error}</p>}
  </section>
}
