import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isShowcase } from '@/aetheris/showcase';
import { loadBusinessTools, refineBusinessTool, createBusinessImage, saveBusinessTool, deleteBusinessTool } from '@/lib/businessTools.functions';
import { BUSINESS_TOOLS, findBusinessTool } from './catalog';
import { createWorkingDraft, validateToolInput, type ToolDraft, type ToolInputs } from './drafts';
import './business-tools.css';
import { ContentReview } from './ContentReview';
import { hasWebsiteCapture } from '@/lib/businessTools.engine';

export function BusinessTools() {
  const [member,setMember]=useState<string|null>(null);const [checking,setChecking]=useState(true);
  useEffect(()=>{
    let alive=true; let revision=0;
    if(isShowcase()){setChecking(false);return;}
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{revision++;if(alive){setMember(session?.user.id??null);setChecking(false);}});
    void supabase.auth.getSession().then(({data,error})=>{if(alive && revision===0){setMember(error?null:data.session?.user.id??null);setChecking(false);}});
    return()=>{alive=false;subscription.unsubscribe();};
  },[]);
  if(checking)return <section className="business-tools"><p role="status">Opening your business tools…</p></section>;
  if(!member)return <section className="business-tools"><h2>Ask Intros Business Tools</h2><p>Create a profile and sign in to make content, sales scripts, plans, and evidence-based reviews. Your saved work belongs to your account.</p><a href="/auth">Create a profile or sign in</a><div className="bt-catalog">{BUSINESS_TOOLS.map(t=><article key={t.id}><small>{t.category}</small><h3>{t.name}</h3></article>)}</div></section>;
  return <MemberTools key={member}/>;
}
function MemberTools(){
  const [review,setReview]=useState<'calendar'|'post'|null>(null);
  const [toolId,setToolId]=useState('sales-scripts');const tool=findBusinessTool(toolId)!;
  const [image,setImage]=useState('');const [imageAvailable,setImageAvailable]=useState(false);
  const [category,setCategory]=useState('All');const [search,setSearch]=useState('');
  const [inputs,setInputs]=useState<ToolInputs>({});const [output,setOutput]=useState('');const [title,setTitle]=useState('');
  const [drafts,setDrafts]=useState<ToolDraft[]>([]);const [active,setActive]=useState<ToolDraft|null>(null);
  const [profile,setProfile]=useState<{name?:string;company?:string;title?:string;what_i_do?:string}|null>(null);
  const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [aiAvailable,setAI]=useState(false);const [storageReady,setStorageReady]=useState(false);
  const [notice,setNotice]=useState('');const [error,setError]=useState('');const [dirty,setDirty]=useState(false);
  const alive=useRef(true);useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  async function load(){setLoading(true);setError('');try{const result=await loadBusinessTools();if(!alive.current)return;setProfile(result.profile);setDrafts(result.drafts);setAI(result.aiAvailable);setImageAvailable(result.imageAvailable);setStorageReady(!result.storageError);if(result.storageError)setError(result.storageError);}catch(e){if(alive.current)setError(e instanceof Error?e.message:'Could not load your workspace.');}finally{if(alive.current)setLoading(false);}}
  useEffect(()=>{void load();},[]);
  useEffect(()=>{if(!dirty)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
  const mayLeave=()=>!dirty||window.confirm('You have unsaved changes. Discard them and continue?');
  function choose(id:string){if(!mayLeave())return;setImage('');setToolId(id);setInputs({});setOutput('');setTitle('');setActive(null);setDirty(false);setNotice('');setError('');}
  function reopen(draft:ToolDraft){if(!mayLeave())return;setImage('');setToolId(draft.tool_id);setInputs(draft.inputs);setOutput(draft.output);setTitle(draft.title);setActive(draft);setDirty(false);setNotice('Opened saved draft.');setError('');}
  function generate(){try{const values=validateToolInput(tool.id,inputs);setOutput(createWorkingDraft(tool,values));setTitle(title||tool.name);setDirty(true);setNotice('Working draft created. Review and edit before saving or using it.');setError('');}catch(e){setError((e as Error).message);}}
  async function refine(){setError('');try{validateToolInput(tool.id,inputs);setBusy(true);const result=await refineBusinessTool({data:{toolId:tool.id,inputs}});if(!alive.current)return;setOutput(result.output);setTitle(title||tool.name);setDirty(true);setNotice(hasWebsiteCapture(tool.id)?'Public page capture completed. Review the report and its capture scope.':'Content generated. Review before use.');}catch(e){if(alive.current)setError(e instanceof Error?e.message:'AI refinement failed. Your current draft is unchanged.');}finally{if(alive.current)setBusy(false);}}
  async function makeImage(){setError('');try{validateToolInput(tool.id,inputs);setBusy(true);const result=await createBusinessImage({data:{toolId:tool.id,inputs}});if(!alive.current)return;setImage(result.image);setDirty(true);setNotice('Image generated. Download it before leaving; private document saving saves text only.');}catch(e){if(alive.current)setError(e instanceof Error?e.message:'Image generation failed. Your brief is unchanged.');}finally{if(alive.current)setBusy(false);}}
  async function save(){setBusy(true);setError('');try{const saved=await saveBusinessTool({data:{toolId:tool.id,inputs,title:title||tool.name,output,...(active?{id:active.id,version:active.version}:{})}});if(!alive.current)return;setDrafts(old=>[saved,...old.filter(d=>d.id!==saved.id)]);setActive(saved);setDirty(Boolean(image));setNotice(image?'Text saved privately. Download the generated image separately before leaving.':'Saved privately to your Ask Intros profile.');}catch(e){if(alive.current)setError(e instanceof Error?e.message:'Save failed. Your work is still here.');}finally{if(alive.current)setBusy(false);}}
  async function remove(draft:ToolDraft){if(!window.confirm(`Delete “${draft.title}”?`))return;setBusy(true);try{await deleteBusinessTool({data:{id:draft.id,version:draft.version}});if(!alive.current)return;setDrafts(old=>old.filter(d=>d.id!==draft.id));if(active?.id===draft.id){setActive(null);setDirty(true);}setNotice('Saved draft deleted.');}catch(e){if(alive.current)setError((e as Error).message);}finally{if(alive.current)setBusy(false);}}
  const download=()=>{const url=URL.createObjectURL(new Blob([output],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`ask-intros-${tool.id}.${tool.id==='tool-generator'&&/^\s*(<!doctype html|<html)/i.test(output)?'html':'txt'}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setNotice('Draft downloaded.');};
  if(loading)return <section className="business-tools"><p role="status">Loading your private workspace…</p></section>;
  if(!profile)return <section className="business-tools"><p role="alert">{error||'Create your profile to open Business Tools.'}</p><button onClick={()=>void load()}>Retry</button><a href="/onboarding">Complete your profile</a></section>;
  const filtered=BUSINESS_TOOLS.filter(t=>(category==='All'||t.category===category)&&`${t.name} ${t.description}`.toLowerCase().includes(search.toLowerCase()));
  return <section className="business-tools">
    <header><small>ASK INTROS BUSINESS TOOLS</small><h2>Your ideas. Ready for the next step.</h2><p>Private working documents for {profile.name||'your business'}. Create a starting draft, edit it, then save, add content to your calendar, or review and approve a post when ready.</p></header>
    <div className="bt-layout"><aside aria-label="Business tool catalog">
      <label>Find a tool<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tools"/></label>
      <label>Category<select value={category} onChange={e=>setCategory(e.target.value)}>{['All',...new Set(BUSINESS_TOOLS.map(t=>t.category))].map(c=><option key={c}>{c}</option>)}</select></label>
      <nav aria-label="Business tools">{filtered.map(t=><button disabled={busy} key={t.id} aria-pressed={tool.id===t.id} onClick={()=>choose(t.id)}><strong>{t.name}</strong><small>{t.category}</small></button>)}{!filtered.length&&<p>No matching tools.</p>}</nav>
    </aside><div className="bt-editor">
      <h3>{tool.name}</h3><p>{hasWebsiteCapture(tool.id)?'Capture the public pages in your brief and review findings alongside their source evidence.':tool.id==='image-studio'?'Generate an image from your subject and style, or create an editable visual brief.':tool.description}</p>
      <button disabled={busy} onClick={()=>{setInputs(previous=>({...previous,...Object.fromEntries(tool.fields.flatMap(field=>{const value=/^(Company|Prospect company|Business|Brand)$/.test(field)?profile.company:field==='Your role'?profile.title:field==='Offer'?profile.what_i_do:undefined;return value?[[field,value]]:[];}))}));setDirty(true);setNotice('Available profile details filled in. Review them before generating.');}}>Use my profile details</button>
      <fieldset disabled={busy}><legend>Your brief</legend>{tool.fields.map(field=><label key={field}>{field}<textarea aria-label={field} maxLength={16000} value={inputs[field]||''} onChange={e=>{setInputs({...inputs,[field]:e.target.value});setDirty(true);}} rows={field.toLowerCase().includes('paste')?6:2}/></label>)}
      <label>Evidence and context <small>(optional)</small><textarea maxLength={16000} rows={4} value={inputs['Evidence and context']||''} onChange={e=>{setInputs({...inputs,'Evidence and context':e.target.value});setDirty(true);}} placeholder="Paste relevant facts, source excerpts, brand details, or confirmed results."/></label></fieldset>
      <div className="bt-actions"><button disabled={busy} onClick={generate}>Create working draft</button><button disabled={busy||(!aiAvailable&&!hasWebsiteCapture(tool.id))} onClick={()=>void refine()}>{busy?'Working…':hasWebsiteCapture(tool.id)?'Capture and analyze':'Generate content'}</button>{(tool.id==='image-studio'||tool.id==='creation-studio')&&<button disabled={busy||!imageAvailable} onClick={()=>void makeImage()}>Generate image</button>}</div>
      <p className="bt-note">{aiAvailable?'Generation uses your brief, profile, and captured evidence where available. Review results before use.':'AI writing is not connected. Public page capture, working drafts, editing, saving, and downloads remain available.'}</p>
      {(tool.id==='image-studio'||tool.id==='creation-studio')&&!imageAvailable&&<p className="bt-note">Image generation needs an image provider connection. Visual briefs are available.</p>}
      {tool.id==='tool-generator'&&<p className="bt-note">Generate a standalone HTML tool and download its source. Review generated code before opening or deploying it. It is never executed inside your Ask Intros account.</p>}
      {image&&<figure><img src={image} alt="Generated visual from your business brief" style={{maxWidth:'100%',width:512,borderRadius:20}}/><figcaption>Generated image. Download separately; text documents do not include the image.</figcaption><a href={image} download="ask-intros-image.png">Download PNG</a></figure>}
      {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
      <label>Document title<input disabled={busy} maxLength={180} value={title} onChange={e=>{setTitle(e.target.value);setDirty(true);}} placeholder={tool.name}/></label>
      <label>Editable draft<textarea disabled={busy} className="bt-output" maxLength={50000} value={output} onChange={e=>{setOutput(e.target.value);setDirty(true);}} placeholder="Your working document will appear here."/></label>
      <div className="bt-actions"><button disabled={busy||!output||!storageReady} onClick={()=>void save()}>Save privately</button><button disabled={!output||busy} onClick={()=>void navigator.clipboard.writeText(output).then(()=>setNotice('Copied to clipboard.')).catch(()=>setError('Clipboard unavailable. Download your draft instead.'))}>Copy</button><button disabled={!output||busy} onClick={download}>Download</button>{!storageReady&&<button onClick={()=>void load()}>Retry saved work</button>}</div>
      <div className="bt-actions"><button disabled={busy||!output.trim()||!storageReady} onClick={()=>setReview('calendar')}>Review and add to calendar</button><button disabled={busy||!output.trim()||!storageReady} onClick={()=>setReview('post')}>Review and post to Ask Intros</button></div>
      <p className="bt-note">Saving is private. Calendar entries do not publish automatically. You approve each post after reviewing its content.</p>
      {review&&<ContentReview destination={review} toolId={tool.id} title={title||tool.name} output={output} inputs={inputs} onSaved={saved=>setDrafts(old=>[saved,...old.filter(d=>d.id!==saved.id)])} onClose={()=>setReview(null)}/>}
      <p className="bt-note">{dirty?'Unsaved changes. Save or download before leaving.':'Your current document has no unsaved changes.'}</p>
    </div></div>
    <section aria-label="Saved business documents"><h3>Your saved work</h3>{!drafts.length?<p>No saved documents yet.</p>:<div className="bt-saved">{drafts.map(d=><article key={d.id}><strong>{d.title}</strong><small>{findBusinessTool(d.tool_id)?.name} · {new Date(d.updated_at).toLocaleDateString()}</small><button disabled={busy} onClick={()=>reopen(d)}>Review and edit</button><button disabled={busy} onClick={()=>void remove(d)}>Delete</button></article>)}</div>}</section>
  </section>;
}
