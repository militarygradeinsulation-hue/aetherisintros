import { useEffect, useRef, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { ArrowLeft, Copy, ExternalLink, FileUp, Plus, RefreshCw, Settings2 } from 'lucide-react'
import { loadProspectState,saveProspectState } from '@/lib/prospect.functions'
import { useAccess } from '../access'
import { useOps } from '../crm/store'
import { useMoat } from '../moat-store'
import { Btn,Head } from '../ui'
import SheetImport from '../ledger/SheetImport'
import { canTransition,draftNote,initialWorkflow,openManualProfile,reviewNote,safeLinkedInLink,scoreProspect,starter,statuses,type Icp,type Status,type Workflow } from './core'
import './prospect.css'

type Stored = { version:number; data:Workflow }
const labelStatus = (s: string) => s.replaceAll('_',' ')
export function ProspectEngine({ onBack }: { onBack: () => void }) {
  const { access } = useAccess()
  if (access.loading) return <p>Checking private access…</p>
  if (access.error) return <p role="alert">{access.error}</p>
  if (!access.isAdmin) return <div><p>Prospect Intelligence is private to the owner.</p><Btn kind="secondary" onClick={onBack}>Back to CRM</Btn></div>
  return <PrivateEngine onBack={onBack} ownerId={access.userId ?? ''} />
}
function PrivateEngine({ onBack,ownerId }: { onBack: () => void; ownerId:string }) {
  const ops = useOps(); const moat = useMoat()
  const loadFn = useServerFn(loadProspectState); const saveFn = useServerFn(saveProspectState)
  const [profiles,setProfiles] = useState<Icp[]>([starter]); const [profileId,setProfileId] = useState(starter.id)
  const [profileVersion,setProfileVersion] = useState(0)
  const [workflows,setWorkflows] = useState<Record<string,Stored>>({})
  const [ownedPeople,setOwnedPeople] = useState<string[]>([]); const [ownedCompanies,setOwnedCompanies] = useState<string[]>([])
  const [loading,setLoading] = useState(true); const [error,setError] = useState(''); const [busy,setBusy] = useState(false)
  const lock = useRef(false)
  const [editor,setEditor] = useState(false); const [importing,setImporting] = useState(false)
  const [search,setSearch] = useState(''); const [filter,setFilter] = useState('all'); const [source,setSource] = useState('all'); const [fitOnly,setFitOnly] = useState(false)
  const [selected,setSelected] = useState(''); const [note,setNote] = useState(''); const [consent,setConsent] = useState(false); const [notice,setNotice] = useState('')
  const reload = async () => {
    setLoading(true);setError('')
    try {
      const result = await loadFn(); await ops.refresh()
      setOwnedPeople(result.people);setOwnedCompanies(result.companies)
      const next: Record<string,Stored> = {}
      for (const row of result.rows) {
        if (row.store_key === 'icp:profiles') {
          const value = row.data as unknown as { profiles:Icp[] }
          if (value.profiles?.length) {setProfiles(value.profiles);setProfileId(value.profiles[0]?.id ?? starter.id)}
          setProfileVersion(row.version)
        } else next[row.store_key.slice(11)] = { version:row.version, data:row.data as unknown as Workflow }
      }
      setWorkflows(next)
    } catch (e) {setError(e instanceof Error ? e.message : 'Private records could not be loaded.')}
    finally {setLoading(false)}
  }
  useEffect(() => {void reload()}, [ownerId])
  useEffect(() => {const w=workflows[selected]?.data ?? initialWorkflow;setNote(w.note);setConsent(w.consent)}, [selected,workflows])
  const icp = profiles.find(p => p.id===profileId) ?? profiles[0] ?? starter
  const people = ops.people.filter(p => ownedPeople.includes(p.id) && !p.archived)
  const contactExists = (id:string) => !!people.find(p => p.id===id)?.lastActivityAt || ops.activities.some(a => a.personId===id && ['message','call','email','meeting','intro'].includes(a.kind)) || ['invited','accepted','follow_up'].includes(workflows[id]?.data.status ?? '')
  const ranked = people.map(person => ({person,fit:scoreProspect(icp,person,ops.companies.find(c => c.id===person.companyId && ownedCompanies.includes(c.id)),contactExists(person.id),workflows[person.id]?.data.consent)})).sort((a,b) => b.fit.score-a.fit.score || a.person.id.localeCompare(b.person.id))
  const visible = ranked.filter(({person,fit}) => `${person.fullName} ${person.companyName} ${person.title}`.toLowerCase().includes(search.toLowerCase()) && (filter==='all' || (workflows[person.id]?.data.status ?? 'new')===filter) && (source==='all' || person.source===source) && (!fitOnly || (!fit.excluded && fit.score>=icp.minimumFit)))
  const current = ranked.find(r => r.person.id===selected)
  const state = workflows[selected]?.data ?? initialWorkflow
  const quality = moat.review(note,{channel:'message',authorId:ownerId,duplicateOf:Object.entries(workflows).filter(([id,w]) => id!==selected && ['invited','accepted','follow_up'].includes(w.data.status) && w.data.note.trim()===note.trim()).length,previouslyDeclined:state.status==='not_appropriate'})
  const issues = [...reviewNote(note),...quality.flags.map(f => f.plainLanguage)]
  const run = async (fn: () => Promise<void>) => {
    if (lock.current) return
    lock.current=true;setBusy(true);setError('');setNotice('')
    try {await fn()} catch(e) {setError(e instanceof Error ? e.message : 'That change was not saved.')}
    finally {lock.current=false;setBusy(false)}
  }
  const saveWorkflow = async (status:Status) => {
    if (!current || !canTransition(state.status,status)) throw new Error('Reload before changing this status.')
    if (status==='approved' && (issues.length || !consent || current.fit.excluded || !icp.valueOffer.trim())) throw new Error('Resolve quality, contribution and permission checks before approval.')
    const result = await saveFn({data:{kind:'person',personId:selected,status,note,consent,expected:workflows[selected]?.version ?? 0}})
    const saved = result as unknown as Stored
    setWorkflows(prev => ({...prev,[selected]:saved})); await ops.refresh();setNotice('Saved to your private CRM timeline.')
  }
  const updateProfile = (patch: Partial<Icp>) => setProfiles(prev => prev.map(p => p.id===icp.id ? {...p,...patch} : p))
  if (loading || !ops.ready) return <p>Loading your private prospect records…</p>
  return <section className="prospect-engine">
    <Btn kind="quiet" onClick={onBack}><ArrowLeft size={14}/> CRM</Btn>
    <Head label="PRIVATE / PROSPECT INTELLIGENCE" title="The right people. A reason to connect."
      copy="Define your fit, review the context, and choose your next relationship." proof={`${people.length} canonical CRM people · no automated outreach`}
      action={<Btn kind="secondary" onClick={() => setEditor(!editor)}><Settings2 size={14}/> Ideal profiles</Btn>}/>
    {error && <div role="alert" className="prospect-error">{error}<Btn kind="secondary" onClick={() => void reload()}><RefreshCw size={14}/> Reload</Btn></div>}
    {notice && <p role="status">{notice}</p>}
    <div className="prospect-toolbar">
      <label>Ideal profile<select value={icp.id} onChange={e => setProfileId(e.target.value)}>{profiles.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
      <Btn kind="secondary" onClick={() => setImporting(!importing)}><FileUp size={14}/> Import CSV</Btn>
      <Btn kind="secondary" onClick={onBack}><Plus size={14}/> New CRM person</Btn>
      <Btn kind="quiet" disabled={busy} onClick={() => void reload()}><RefreshCw size={14}/> Refresh</Btn>
    </div>
    {editor && <div className="prospect-editor">
      <label>Label<input value={icp.label} maxLength={120} onChange={e => updateProfile({label:e.target.value})}/></label>
      <label>Objective<select value={icp.objective} onChange={e => updateProfile({objective:e.target.value as Icp['objective']})}>{['client','partner','investor','referral','hire'].map(s => <option key={s}>{s}</option>)}</select></label>
      {([['industries','Industries'],['titles','Role titles'],['employees','Employee bands'],['revenue','Revenue bands'],['locations','Locations'],['keywords','Keywords'],['disqualifiers','Disqualifiers']] as const).map(([key,label]) => <label key={key}>{label}<input value={icp[key]} maxLength={1000} onChange={e => updateProfile({[key]:e.target.value})}/></label>)}
      <label>Minimum fit<input type="number" min={0} max={100} value={icp.minimumFit} onChange={e => updateProfile({minimumFit:Math.max(0,Math.min(100,Number(e.target.value)))})}/></label>
      <label className="wide">Your concrete contribution<textarea value={icp.valueOffer} maxLength={200} onChange={e => updateProfile({valueOffer:e.target.value})}/></label>
      <label><span><input type="checkbox" checked={icp.excludeClients} onChange={e => updateProfile({excludeClients:e.target.checked})}/> Exclude current clients</span></label>
      <label><span><input type="checkbox" checked={icp.excludeContacted} onChange={e => updateProfile({excludeContacted:e.target.checked})}/> Exclude already contacted</span></label>
      <div className="prospect-actions wide"><Btn disabled={busy || !icp.label.trim()} onClick={() => void run(async () => {const result=await saveFn({data:{kind:'profiles',profiles,expected:profileVersion}});setProfileVersion((result as unknown as {version:number}).version);setEditor(false);setNotice('Ideal profiles saved.')} )}>Save profiles</Btn>
      <Btn kind="secondary" disabled={profiles.length>=20} onClick={() => {const p={...starter,id:crypto.randomUUID(),label:'New ideal profile',industries:'',titles:''};setProfiles(prev => [...prev,p]);setProfileId(p.id)}}><Plus size={14}/> Add profile</Btn></div>
    </div>}
    {importing && <SheetImport/>}
    <div className="prospect-toolbar">
      <label>Search<input aria-label="Search prospects" value={search} onChange={e => setSearch(e.target.value)}/></label>
      <label>Status<select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All statuses</option>{statuses.map(s => <option key={s} value={s}>{labelStatus(s)}</option>)}</select></label>
      <label>Source<select value={source} onChange={e => setSource(e.target.value)}><option value="all">All sources</option>{[...new Set(people.map(p => p.source))].map(s => <option key={s} value={s}>{s || 'Unspecified'}</option>)}</select></label>
      <label><input type="checkbox" checked={fitOnly} onChange={e => setFitOnly(e.target.checked)}/> Qualified only</label>
    </div>
    <div className="prospect-layout"><div className="prospect-list">
      {!visible.length && <p>{people.length ? 'No people match these filters.' : 'Your private CRM has no prospects yet. Add a person or preview a CSV import.'}</p>}
      {visible.map(({person,fit}) => <article key={person.id} className={selected===person.id ? 'selected' : ''}>
        <div className="prospect-person-head"><div><b>{person.fullName}</b><p>{person.title || 'Role unknown'}{person.companyName ? ` · ${person.companyName}` : ''}</p></div><strong>{fit.score}<small>/100</small></strong></div>
        <small>{labelStatus(workflows[person.id]?.data.status ?? 'new')} · {person.source || 'Source unspecified'} · coverage {fit.confidence}%</small>
        <small>Last contact: {person.lastActivityAt ? new Date(person.lastActivityAt).toLocaleDateString() : 'Not recorded'}</small>
        {fit.excluded && <p>{fit.excluded}</p>}
        <Btn kind="secondary" onClick={() => setSelected(person.id)}>Review {person.fullName}</Btn>
      </article>)}
    </div><div className="prospect-detail">
      {!current ? <p>Select a prospect for the evidence and review.</p> : <>
        <h2>{current.person.fullName}</h2>
        <dl><div><dt>Why them · recorded data</dt><dd>{current.fit.whyThem}</dd></div><div><dt>Why me · your stated contribution</dt><dd>{current.fit.whyMe}</dd></div><div><dt>Why now · unknown</dt><dd>{current.fit.whyNow}</dd></div><div><dt>Trust &amp; consent</dt><dd>No inferred trust or consent. {consent ? 'Contact permission attested by you.' : 'Permission not recorded.'}</dd></div><div><dt>Next action · recommendation</dt><dd>{current.fit.nextAction}</dd></div></dl>
        <details><summary>Fit breakdown · {current.fit.confidence}% evidence coverage</summary><div className="prospect-breakdown">{current.fit.breakdown.map(b => <div key={b.label}><b>{b.label}: {b.matched ? 'Matched' : b.known ? 'Not matched' : 'Unknown'} · weight {b.weight}</b><span>{b.evidence}</span><small>{b.kind}</small></div>)}</div></details>
        <label>Connection note<textarea aria-label="Connection note" maxLength={300} value={note} onChange={e => setNote(e.target.value)}/><small>{note.length}/300 · {quality.verdict}</small></label>
        <label><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}/> I have an appropriate basis and permission to contact this person.</label>
        {issues.map((issue,i) => <p key={i}>{issue}</p>)}
        <div className="prospect-actions">
          <Btn kind="secondary" disabled={busy || !canTransition(state.status,'shortlisted')} onClick={() => void run(() => saveWorkflow('shortlisted'))}>Shortlist</Btn>
          <Btn kind="secondary" disabled={busy || !canTransition(state.status,'draft')} onClick={() => {setNote(draftNote(current.person,icp));setNotice('Draft generated locally. Edit and save before approval.')}}>Draft note</Btn>
          <Btn kind="secondary" disabled={busy || !canTransition(state.status,'draft')} onClick={() => void run(() => saveWorkflow('draft'))}>Save draft</Btn>
          <Btn disabled={busy || state.status!=='draft' || issues.length>0 || !consent || !!current.fit.excluded || !icp.valueOffer.trim()} onClick={() => void run(() => saveWorkflow('approved'))}>Approve note</Btn>
          <Btn kind="secondary" disabled={!note.trim()} onClick={() => void run(async () => {await navigator.clipboard.writeText(note);setNotice('Note copied. No invitation was sent.')} )}><Copy size={14}/> Copy</Btn>
          {safeLinkedInLink(current.person.linkedinUrl) && <Btn kind="secondary" onClick={() => {openManualProfile(current.person.linkedinUrl,(...args) => window.open(...args));setNotice('Profile opened. Invitation status is unchanged.')}}><ExternalLink size={14}/> Open LinkedIn</Btn>}
        </div>
        <div className="prospect-actions">{(['invited','accepted','follow_up','dismissed','not_appropriate'] as const).filter(s => canTransition(state.status,s)).map(s => <Btn key={s} kind="secondary" disabled={busy || (s==='invited' && (note!==state.note || consent!==state.consent))} onClick={() => {if (['invited','accepted','follow_up'].includes(s) && !window.confirm(`Confirm you manually completed: ${labelStatus(s)}?`)) return;void run(() => saveWorkflow(s))}}>Mark {labelStatus(s)}</Btn>)}</div>
        <details><summary>Private note &amp; contact timeline</summary>{ops.activities.filter(a => a.personId===selected).map(a => <div key={a.id}><b>{a.subject}</b><p>{new Date(a.occurredAt).toLocaleString()} · {a.detail}</p></div>)}</details>
      </>}
    </div></div>
    <div className="prospect-provider"><span>Apollo · available / not connected</span><span>Clay · available / not connected</span><span>LinkedIn · manual actions only</span></div>
  </section>
}