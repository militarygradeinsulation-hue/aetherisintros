import { useState } from 'react'
import { SearchCheck, X } from 'lucide-react'
import type { CrmPerson } from './types'
import type { ContactLookupResult, WebContactField } from './contact-web-lookup'
import { ContactWebFindings, hasMissingWebFields } from './ContactWebLookup'
import { lookupMissingContactWeb, acceptContactWebSuggestions } from '@/lib/contactWebLookup.functions'
import './bulk-contact-web-lookup.css'

const BATCH_SIZE=5
interface Row {
  contact:CrmPerson
  result:ContactLookupResult|null
  selected:Set<WebContactField>
  saved:boolean
  error:string
}
export const uploadedContactsNeedingResearch=(contacts:readonly Pick<CrmPerson,'id'|'source'|'email'|'phone'|'title'>[]) =>
  contacts.filter(c=>c.source.startsWith('Import · ')&&hasMissingWebFields(c))

/** Explicit opt-in batches. Multiple results are previewed, never silently saved. */
export function BulkContactWebLookup({people,onSaved,onClose}:{
  people:CrmPerson[]
  onSaved:()=>Promise<void>|void
  onClose:()=>void
}) {
  const [scanned,setScanned]=useState<Set<string>>(new Set())
  const [rows,setRows]=useState<Row[]>([])
  const [searching,setSearching]=useState(false)
  const [saving,setSaving]=useState(false)
  const [progress,setProgress]=useState('')
  const [notice,setNotice]=useState('')
  const eligible=uploadedContactsNeedingResearch(people)
  const remaining=eligible.filter(c=>!scanned.has(c.id))
  const pending=rows.filter(row=>row.result?.status==='ok'&&!row.saved&&row.selected.size>0).length
  const change=(id:string,patch:Partial<Row>)=>setRows(current=>current.map(row=>row.contact.id===id?{...row,...patch}:row))
  const scan=async()=>{
    if(searching||saving)return
    if(pending&&!window.confirm('Discard the previous unsaved suggestions and research the next five contacts?'))return
    const batch=remaining.slice(0,BATCH_SIZE)
    if(!batch.length)return
    setSearching(true);setRows(batch.map(contact=>({contact,result:null,selected:new Set(),saved:false,error:''})))
    setNotice('');setProgress('Starting public lookups…')
    setScanned(current=>new Set([...current,...batch.map(p=>p.id)]))
    let done=0
    const queue=[...batch]
    const worker=async()=>{
      for(let contact=queue.shift();contact;contact=queue.shift()){
        try {
          const result=await lookupMissingContactWeb({data:{kind:'crm',recordId:contact.id,confirmed:true}})
          change(contact.id,{result,selected:new Set(result.status==='ok'?result.suggestions.map(s=>s.field):[])})
        } catch(error) {
          change(contact.id,{error:error instanceof Error?error.message:'Lookup unavailable for this record.'})
        } finally {
          done+=1
          setProgress('Research complete for '+done+' of '+batch.length+' contacts')
        }
      }
    }
    try { await Promise.all([worker(),worker()]) }
    finally { setSearching(false) }
  }
  const approve=async(list:Row[])=>{
    if(saving||searching)return
    setSaving(true);setNotice('')
    let saved=0,failed=0
    try{
      for(const row of list){
        if(row.result?.status!=='ok'||row.saved||!row.selected.size)continue
        try{
          const selected=row.result.suggestions.filter(s=>row.selected.has(s.field))
          await acceptContactWebSuggestions({data:{
            kind:'crm',recordId:row.contact.id,expectedUpdatedAt:row.contact.updatedAt,
            confirmed:true,selected,
          }})
          change(row.contact.id,{saved:true,error:''})
          saved+=1
        }catch(error){
          change(row.contact.id,{error:error instanceof Error?error.message:'Could not save this contact.'})
          failed+=1
        }
      }
      if(saved>0)await onSaved()
      setNotice(saved+' contact'+(saved===1?'':'s')+' updated. '+(failed?failed+' need another review.':'No fields were overwritten.'))
    }catch(error){setNotice('Save confirmed for '+saved+' contact(s), but the CRM list could not refresh: '+(error instanceof Error?error.message:'reload and review.'))}
    finally{setSaving(false)}
  }
  return <section className="bulk-contact-lookup" aria-label="Web lookup for uploaded CRM contacts">
    <header>
      <div>
        <h3>Web lookup for uploaded contacts</h3>
        <p>Research up to five contacts at a time; review source-backed work emails, public phone numbers and job titles before any save.</p>
      </div>
      <button type="button" className="bulk-contact-close" onClick={onClose} aria-label="Close bulk web lookup" disabled={searching||saving}><X size={18}/></button>
    </header>
    <div className="bulk-contact-tools">
      <span>{eligible.length.toLocaleString()} uploaded contacts with missing fields · {remaining.length.toLocaleString()} not yet scanned</span>
      <button type="button" disabled={!remaining.length||searching||saving} onClick={()=>void scan()}>
        <SearchCheck size={15}/>{searching?'Researching…':remaining.length?'Find next '+Math.min(BATCH_SIZE,remaining.length)+' contacts':'All eligible contacts scanned'}
      </button>
    </div>
    <p className="bulk-contact-warning">Only the contact’s saved name, company or location is used for lookup. Private email, phone and notes are never searched. Missing values are never guessed, and an empty result stays empty.</p>
    {progress&&<p role="status">{progress}</p>}
    {rows.map(row=><article key={row.contact.id} className="bulk-contact-result">
      <h4>{row.contact.fullName}</h4>
      <p>{row.contact.companyName||row.contact.location||'Company or location missing'}</p>
      {!row.result&&!row.error&&<p role="status">Searching public web…</p>}
      {row.error&&<p role="alert" className="contact-web-error">{row.error}</p>}
      {row.result&&row.result.status!=='ok'&&<p>{row.result.reason}</p>}
      {row.result?.status==='ok'&&<div>
        <ContactWebFindings suggestions={row.result.suggestions} selected={row.selected}
          onSelect={(field,checked)=>{
            const selected=new Set(row.selected)
            if(checked)selected.add(field);else selected.delete(field)
            change(row.contact.id,{selected})
          }}/>
        <button type="button" disabled={searching||saving||row.saved||!row.selected.size}
          onClick={()=>void approve([row])}>
          {row.saved?'Saved':'Save '+row.selected.size+' selected '+(row.selected.size===1?'field':'fields')}
        </button>
      </div>}
    </article>)}
    {rows.length>0&&<div className="bulk-contact-footer">
      <button type="button" disabled={searching||saving||!pending} onClick={()=>void approve(rows)}>
        {saving?'Saving…':'Save reviewed fields across '+pending+' '+(pending===1?'contact':'contacts')}
      </button>
    </div>}
    {notice&&<p role="status" className="contact-web-success">{notice}</p>}
  </section>
}
